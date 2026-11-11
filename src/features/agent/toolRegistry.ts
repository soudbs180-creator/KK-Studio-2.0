import { z } from "zod";
import type {
  ToolDefinition,
  ToolExecutionContext,
  ToolResult,
  Mandate,
} from "../../domain/agentWorkflow.ts";
import { SecurityHookEngine } from "./preInvocation.ts";

export const DEFAULT_TOOL_TIMEOUT_MS = 30000;
export const DEFAULT_MAX_OUTPUT_BYTES = 10 * 1024; // 10 KB

/**
 * Bounds output data to avoid flooding agent context with massive responses.
 */
export function boundOutputData(
  data: unknown,
  maxBytes: number = DEFAULT_MAX_OUTPUT_BYTES,
): { boundedData: unknown; bytesOutput: number; truncated: boolean } {
  if (data === null || data === undefined) {
    return { boundedData: data, bytesOutput: 0, truncated: false };
  }

  let serialized: string;
  try {
    serialized = typeof data === "string" ? data : JSON.stringify(data);
  } catch {
    serialized = String(data);
  }

  const encoded = new TextEncoder().encode(serialized);
  const bytes = encoded.byteLength;
  if (bytes <= maxBytes) {
    return { boundedData: data, bytesOutput: bytes, truncated: false };
  }

  // Truncate to maxBytes
  const sliceLength = Math.max(0, maxBytes - 60);
  const truncatedText =
    new TextDecoder().decode(encoded.slice(0, sliceLength)) +
    `... [TRUNCATED: ${bytes} bytes exceeded limit of ${maxBytes} bytes]`;

  let parsed: unknown = truncatedText;
  if (typeof data !== "string") {
    parsed = {
      _truncated: true,
      originalBytes: bytes,
      maxBytesAllowed: maxBytes,
      preview: truncatedText,
    };
  }

  return { boundedData: parsed, bytesOutput: bytes, truncated: true };
}

/**
 * Unified Tool Registry for Agent tools with security interceptors and execution bounding.
 */
export class ToolRegistry {
  readonly #tools = new Map<string, ToolDefinition>();
  readonly #securityEngine: SecurityHookEngine;

  constructor(securityEngine?: SecurityHookEngine) {
    this.#securityEngine = securityEngine ?? new SecurityHookEngine();
  }

  get securityEngine(): SecurityHookEngine {
    return this.#securityEngine;
  }

  registerTool<TArgs = Record<string, unknown>, TResult = unknown>(
    tool: ToolDefinition<TArgs, TResult>,
  ): void {
    if (this.#tools.has(tool.name)) {
      throw new Error(`Tool with name "${tool.name}" is already registered.`);
    }
    this.#tools.set(tool.name, tool as unknown as ToolDefinition);
  }

  unregisterTool(name: string): boolean {
    return this.#tools.delete(name);
  }

  hasTool(name: string): boolean {
    return this.#tools.has(name);
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.#tools.get(name);
  }

  listTools(): readonly ToolDefinition[] {
    return Array.from(this.#tools.values());
  }

  /**
   * Filters available tools by Mandate authorization whitelist.
   */
  getToolsForMandate(mandate: Mandate): readonly ToolDefinition[] {
    const allowed = new Set(mandate.allowedTools);
    return this.listTools().filter((tool) => allowed.has(tool.name));
  }

  /**
   * Exports tool definitions to OpenAI/Gemini compatible function declaration format.
   */
  toFunctionDeclarations(
    tools?: readonly ToolDefinition[],
  ): Record<string, unknown>[] {
    const targetTools = tools ?? this.listTools();
    return targetTools.map((tool) => {
      let parametersJson: Record<string, unknown> = {
        type: "object",
        properties: {},
      };
      if (typeof tool.parameters === "object" && tool.parameters !== null) {
        parametersJson = tool.parameters as Record<string, unknown>;
      }

      return {
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: parametersJson,
        },
      };
    });
  }

  #checkMandatePermissibility(
    name: string,
    context: ToolExecutionContext,
    startTime: number,
  ): ToolResult | null {
    if (!context.mandate) return null;
    const callId = context.callId;

    if (
      context.mandate.expiresAt &&
      Date.now() > Date.parse(context.mandate.expiresAt)
    ) {
      if (context.ticket) {
        context.ticket.status = "blocked";
        context.ticket.blockedReason =
          "Mandate authorization token has expired";
      }
      return {
        ok: false,
        callId,
        toolName: name,
        error: {
          code: "MANDATE_EXPIRED",
          message: "Mandate authorization token has expired",
        },
        durationMs: Date.now() - startTime,
        bytesOutput: 0,
        truncated: false,
      };
    }

    if (!context.mandate.allowedTools.includes(name)) {
      if (context.ticket) {
        context.ticket.status = "blocked";
        context.ticket.blockedReason = `Tool ${name} not permitted by mandate`;
      }
      return {
        ok: false,
        callId,
        toolName: name,
        error: {
          code: "MANDATE_TOOL_NOT_PERMITTED",
          message: `Tool ${name} not permitted by mandate`,
        },
        durationMs: Date.now() - startTime,
        bytesOutput: 0,
        truncated: false,
      };
    }

    if (
      context.ticket &&
      context.ticket.stepsUsed >= context.mandate.maxStepCount
    ) {
      context.ticket.status = "blocked";
      context.ticket.blockedReason = "Max step budget exhausted";
      return {
        ok: false,
        callId,
        toolName: name,
        error: {
          code: "MANDATE_STEP_BUDGET_EXHAUSTED",
          message: "Max step budget exhausted",
        },
        durationMs: Date.now() - startTime,
        bytesOutput: 0,
        truncated: false,
      };
    }

    if (
      context.ticket &&
      !["pending", "in_progress"].includes(context.ticket.status)
    ) {
      return {
        ok: false,
        callId,
        toolName: name,
        error: {
          code: "TICKET_NOT_EXECUTABLE",
          message: `Ticket is ${context.ticket.status}`,
        },
        durationMs: Date.now() - startTime,
        bytesOutput: 0,
        truncated: false,
      };
    }

    return null;
  }

  #validateToolArguments(
    tool: ToolDefinition,
    rawArgs: Record<string, unknown>,
    callId: string,
    startTime: number,
  ):
    | { ok: true; args: Record<string, unknown> }
    | { ok: false; errorResult: ToolResult } {
    if (tool.parameters instanceof z.ZodType) {
      const parseResult = tool.parameters.safeParse(rawArgs);
      if (!parseResult.success) {
        return {
          ok: false,
          errorResult: {
            ok: false,
            callId,
            toolName: tool.name,
            error: {
              code: "INVALID_ARGUMENTS",
              message: `Invalid arguments for tool ${tool.name}: ${parseResult.error.message}`,
              details: parseResult.error.format(),
            },
            durationMs: Date.now() - startTime,
            bytesOutput: 0,
            truncated: false,
          },
        };
      }
      return { ok: true, args: parseResult.data as Record<string, unknown> };
    }
    return { ok: true, args: rawArgs };
  }

  /**
   * Invokes a tool through the 7-stage security and bounding pipeline.
   */
  async invokeTool(
    name: string,
    rawArgs: Record<string, unknown>,
    context: ToolExecutionContext,
  ): Promise<ToolResult> {
    const startTime = Date.now();
    const callId = context.callId;

    // Stage 1: Mandate Whitelist & Step Quota Check
    const mandateError = this.#checkMandatePermissibility(
      name,
      context,
      startTime,
    );
    if (mandateError) return mandateError;

    // Lookup tool definition
    const tool = this.#tools.get(name);
    if (!tool) {
      return {
        ok: false,
        callId,
        toolName: name,
        error: {
          code: "TOOL_NOT_FOUND",
          message: `Tool "${name}" is not registered.`,
        },
        durationMs: Date.now() - startTime,
        bytesOutput: 0,
        truncated: false,
      };
    }

    // Stage 2: Input Parameter Schema Validation
    const validation = this.#validateToolArguments(
      tool,
      rawArgs,
      callId,
      startTime,
    );
    if (!validation.ok) return validation.errorResult;
    const validatedArgs = validation.args;

    // Stage 3: PreInvocation Security Hooks
    const securityCheck = this.#securityEngine.evaluate(name, validatedArgs, {
      toolName: name,
      args: validatedArgs,
      ticket: context.ticket,
      mandate: context.mandate,
      workspaceRoot: context.workspaceRoot,
    });
    if (!securityCheck.allow) {
      if (context.ticket) {
        context.ticket.status = "blocked";
        context.ticket.blockedReason =
          securityCheck.reason ?? "Blocked by security hook";
      }
      return {
        ok: false,
        callId,
        toolName: name,
        error: {
          code: "PRE_INVOCATION_SECURITY_BLOCKED",
          message: securityCheck.reason ?? "Blocked by security hook",
        },
        durationMs: Date.now() - startTime,
        bytesOutput: 0,
        truncated: false,
      };
    }

    // Check cancellation before invoking
    if (context.signal.aborted) {
      return {
        ok: false,
        callId,
        toolName: name,
        error: {
          code: "ABORTED",
          message: "Tool invocation was aborted prior to execution.",
        },
        durationMs: Date.now() - startTime,
        bytesOutput: 0,
        truncated: false,
      };
    }

    // Stage 5: Execution Under Timeout Boundary
    const timeoutMs = tool.timeoutMs ?? DEFAULT_TOOL_TIMEOUT_MS;
    const timeoutController = new AbortController();
    let rejectAborted!: (reason: Error) => void;
    const abortedPromise = new Promise<never>((_resolve, reject) => {
      rejectAborted = reject;
    });
    const abortHandler = (): void => {
      timeoutController.abort(context.signal.reason);
      rejectAborted(new Error("Tool invocation was cancelled"));
    };
    context.signal.addEventListener("abort", abortHandler, { once: true });

    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        timeoutController.abort(new Error(`Timeout after ${timeoutMs}ms`));
        const err = new Error(`Tool execution timed out after ${timeoutMs}ms`);
        (err as { isTimeout?: boolean }).isTimeout = true;
        reject(err);
      }, timeoutMs);
    });

    try {
      // Increment ticket steps on invocation attempt to prevent infinite retry loops
      if (context.ticket) {
        context.ticket.stepsUsed += 1;
        context.ticket.currentStepCount = context.ticket.stepsUsed;
        context.ticket.currentTool = name;
        context.ticket.status = "in_progress";
        context.ticket.updatedAt = new Date().toISOString();
      }

      const output = await Promise.race([
        Promise.resolve(
          tool.execute(validatedArgs, {
            ...context,
            signal: timeoutController.signal,
          }),
        ),
        timeoutPromise,
        abortedPromise,
      ]);
      context.signal.throwIfAborted();

      // Stage 6: Output Bounding
      const maxBytes = tool.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
      const { boundedData, bytesOutput, truncated } = boundOutputData(
        output,
        maxBytes,
      );

      return {
        ok: true,
        callId,
        toolName: name,
        data: boundedData,
        durationMs: Date.now() - startTime,
        bytesOutput,
        truncated,
      };
    } catch (err: unknown) {
      const isTimeout =
        Boolean((err as { isTimeout?: boolean })?.isTimeout) ||
        (timeoutController.signal.aborted && !context.signal.aborted);
      const errorMessage = isTimeout
        ? `Tool execution timed out after ${timeoutMs}ms`
        : err instanceof Error
          ? err.message
          : String(err);

      return {
        ok: false,
        callId,
        toolName: name,
        error: {
          code: context.signal.aborted
            ? "ABORTED"
            : isTimeout
              ? "TIMEOUT"
              : "EXECUTION_ERROR",
          message: errorMessage,
        },
        durationMs: Date.now() - startTime,
        bytesOutput: 0,
        truncated: false,
      };
    } finally {
      clearTimeout(timer);
      context.signal.removeEventListener("abort", abortHandler);
    }
  }
}
