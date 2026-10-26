/**
 * Subagent Execution Sandbox
 *
 * Implements context isolation and sandboxed execution for child subagents.
 * Subagents execute with isolated history, a strictly enforced tool whitelist,
 * and zero inheritance of the primary agent's conversation history.
 */

import {
  type SubagentFoldbackResult,
  type SubagentTaskBrief,
  type SubagentStatus,
  createFoldbackResult,
  truncateExecutiveSummary,
} from "./foldbackContract.ts";

export interface SubagentTurn {
  turnIndex: number;
  timestamp: number;
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    args: Record<string, unknown>;
  }>;
  toolResult?: {
    toolCallId: string;
    output: unknown;
    error?: string;
  };
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface SubagentToolDefinition {
  name: string;
  description: string;
  execute: (
    args: Record<string, unknown>,
    context: { sandboxId: string; taskId: string },
  ) => Promise<unknown> | unknown;
}

export interface SandboxExecutionOptions {
  maxTurns?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export type SubagentTurnHandler = (
  history: readonly SubagentTurn[],
  availableTools: readonly SubagentToolDefinition[],
  signal?: AbortSignal,
) => Promise<{
  content?: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    args: Record<string, unknown>;
  }>;
  done?: boolean;
  finalSummary?: string;
  structuredData?: Record<string, unknown>;
}>;

// Disallowed tools to prevent recursive subagent spawning or unauthorized cross-domain actions
const RECURSIVE_DELEGATION_TOOLS = new Set([
  "delegate_task",
  "spawn_subagent",
  "dispatch_subagent",
  "run_subagent",
]);

export class SubagentSandbox {
  readonly id: string;
  readonly brief: SubagentTaskBrief;
  readonly allowedToolNames: Set<string>;

  private _status: "idle" | "running" | "completed" | "failed" | "terminated" =
    "idle";
  private _history: SubagentTurn[] = [];
  private _tools: Map<string, SubagentToolDefinition> = new Map();
  private _artifacts: Set<string> = new Set();
  private _tokensConsumed = 0;
  private _startTime?: number;
  private _endTime?: number;

  constructor(
    brief: SubagentTaskBrief,
    options?: {
      sandboxId?: string;
      tools?: SubagentToolDefinition[];
    },
  ) {
    this.id = options?.sandboxId || `sandbox_${brief.taskId}_${Date.now()}`;
    this.brief = brief;

    // Build tool whitelist from brief or options
    const configuredAllowed = brief.allowedTools
      ? new Set(brief.allowedTools)
      : new Set((options?.tools || []).map((t) => t.name));

    // Filter out recursive delegation tools
    this.allowedToolNames = new Set(
      Array.from(configuredAllowed).filter(
        (name) => !RECURSIVE_DELEGATION_TOOLS.has(name),
      ),
    );

    // Register provided tools if allowed
    if (options?.tools) {
      for (const tool of options.tools) {
        if (this.allowedToolNames.has(tool.name)) {
          this._tools.set(tool.name, tool);
        }
      }
    }

    // Initialize isolated context with system instructions & brief
    this.initializeIsolatedContext();
  }

  get status(): "idle" | "running" | "completed" | "failed" | "terminated" {
    return this._status;
  }

  get history(): readonly SubagentTurn[] {
    return this._history;
  }

  get tokensConsumed(): number {
    return this._tokensConsumed;
  }

  get artifacts(): readonly string[] {
    return Array.from(this._artifacts);
  }

  get startTime(): number | undefined {
    return this._startTime;
  }

  get endTime(): number | undefined {
    return this._endTime;
  }

  /**
   * Register a tool for execution in this sandbox.
   */
  registerTool(tool: SubagentToolDefinition): void {
    if (RECURSIVE_DELEGATION_TOOLS.has(tool.name)) {
      throw new Error(
        `Security violation: tool '${tool.name}' is prohibited to prevent recursive subagent dispatch.`,
      );
    }
    if (!this.allowedToolNames.has(tool.name)) {
      // If allowedToolNames was explicitly limited by brief and doesn't have it, reject
      if (
        this.brief.allowedTools &&
        !this.brief.allowedTools.includes(tool.name)
      ) {
        throw new Error(
          `Tool '${tool.name}' is not in the allowed tool whitelist for task ${this.brief.taskId}.`,
        );
      }
      this.allowedToolNames.add(tool.name);
    }
    this._tools.set(tool.name, tool);
  }

  /**
   * Adds an artifact reference created during subagent execution.
   */
  addArtifact(artifactRef: string): void {
    if (artifactRef && typeof artifactRef === "string") {
      this._artifacts.add(artifactRef);
    }
  }

  /**
   * Execute a single tool inside the sandbox.
   */
  async executeTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<{ output: unknown; error?: string }> {
    if (RECURSIVE_DELEGATION_TOOLS.has(name)) {
      return {
        output: null,
        error: `PermissionDenied: Subagents cannot spawn subagents (${name}).`,
      };
    }

    if (!this.allowedToolNames.has(name)) {
      return {
        output: null,
        error: `ToolNotAllowed: Tool '${name}' is not in the subagent sandbox whitelist.`,
      };
    }

    const tool = this._tools.get(name);
    if (!tool) {
      return {
        output: null,
        error: `ToolNotFound: Tool '${name}' is not registered in this sandbox.`,
      };
    }

    try {
      const output = await tool.execute(args, {
        sandboxId: this.id,
        taskId: this.brief.taskId,
      });

      // Rough token estimation for tool execution
      const serialized = JSON.stringify(output ?? "");
      const estimatedTokens = Math.max(1, Math.ceil(serialized.length / 4));
      this._tokensConsumed += estimatedTokens;

      return { output };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return { output: null, error: errorMessage };
    }
  }

  private appendAssistantTurn(
    content?: string,
    toolCalls?: Array<{
      id: string;
      name: string;
      args: Record<string, unknown>;
    }>,
  ): void {
    if (!content && (!toolCalls || toolCalls.length === 0)) {
      return;
    }
    const assistantTurn: SubagentTurn = {
      turnIndex: this._history.length,
      timestamp: Date.now(),
      role: "assistant",
      content: content || "",
      toolCalls,
    };
    this._history.push(assistantTurn);
    const chars =
      (content?.length || 0) + JSON.stringify(toolCalls || "").length;
    this._tokensConsumed += Math.max(1, Math.ceil(chars / 4));
  }

  private async executeStepTools(
    toolCalls: Array<{
      id: string;
      name: string;
      args: Record<string, unknown>;
    }>,
  ): Promise<void> {
    for (const tc of toolCalls) {
      const toolRes = await this.executeTool(tc.name, tc.args);
      const toolTurn: SubagentTurn = {
        turnIndex: this._history.length,
        timestamp: Date.now(),
        role: "tool",
        content: toolRes.error
          ? `Error: ${toolRes.error}`
          : JSON.stringify(toolRes.output),
        toolResult: {
          toolCallId: tc.id,
          output: toolRes.output,
          error: toolRes.error,
        },
      };
      this._history.push(toolTurn);
    }
  }

  private checkInterruption(
    signal?: AbortSignal,
    timedOut?: boolean,
    timeoutMs?: number,
  ): { interrupted: boolean; status?: SubagentStatus; error?: string } {
    if (signal?.aborted) {
      return {
        interrupted: true,
        status: "failed",
        error: signal.reason?.message || "Execution aborted by caller.",
      };
    }
    if (timedOut) {
      return {
        interrupted: true,
        status: "partial",
        error: `Sandbox execution exceeded timeout of ${timeoutMs}ms.`,
      };
    }
    return { interrupted: false };
  }

  private async processTurnStep(
    step: Awaited<ReturnType<SubagentTurnHandler>>,
  ): Promise<void> {
    this.appendAssistantTurn(step.content, step.toolCalls);
    if (step.toolCalls && step.toolCalls.length > 0) {
      await this.executeStepTools(step.toolCalls);
    }
  }

  private evaluateTurnOutcome(
    step: Awaited<ReturnType<SubagentTurnHandler>>,
    turnCount: number,
    maxTurns: number,
  ): {
    completed: boolean;
    status?: SubagentStatus;
    summary?: string;
    structuredData?: Record<string, unknown>;
  } {
    if (step.done) {
      const summary =
        step.finalSummary || step.content || "Task completed successfully.";
      if (!step.content || step.content !== summary) {
        this.appendAssistantTurn(summary);
      }
      return {
        completed: true,
        status: "success",
        summary,
        structuredData: step.structuredData,
      };
    }
    if (turnCount >= maxTurns) {
      return {
        completed: true,
        status: "partial",
        summary:
          step.finalSummary ||
          `Task partially completed (reached maximum turn limit of ${maxTurns}). ${step.content || ""}`.trim(),
        structuredData: step.structuredData,
      };
    }
    return { completed: false };
  }

  /**
   * Runs the sandbox execution loop with a provided turn handler.
   */
  async run(
    turnHandler: SubagentTurnHandler,
    options?: SandboxExecutionOptions,
  ): Promise<SubagentFoldbackResult> {
    if (this._status === "running") {
      throw new Error(`Sandbox ${this.id} is already running.`);
    }

    this._status = "running";
    this._startTime = Date.now();
    const maxTurns = options?.maxTurns ?? this.brief.maxTurns ?? 20;
    const timeoutMs = options?.timeoutMs ?? this.brief.timeoutMs;
    const signal = options?.signal;

    let timeoutTimer: NodeJS.Timeout | undefined;
    let timedOut = false;

    if (timeoutMs && timeoutMs > 0) {
      timeoutTimer = setTimeout(() => {
        timedOut = true;
      }, timeoutMs);
    }

    let turnCount = 0;
    let finalSummary = "";
    let structuredData: Record<string, unknown> | undefined;
    let outcomeStatus: SubagentStatus = "success";
    let failureError: string | undefined;

    try {
      while (turnCount < maxTurns) {
        const check = this.checkInterruption(signal, timedOut, timeoutMs);
        if (check.interrupted) {
          this._status = "terminated";
          outcomeStatus = check.status!;
          failureError = check.error;
          break;
        }

        turnCount++;
        const activeTools = Array.from(this._tools.values());
        const step = await turnHandler(this._history, activeTools, signal);

        // Check if aborted during turn handler
        if (signal?.aborted) {
          this._status = "terminated";
          outcomeStatus = "failed";
          failureError =
            signal.reason?.message || "Execution aborted by caller.";
          break;
        }

        await this.processTurnStep(step);

        const outcome = this.evaluateTurnOutcome(step, turnCount, maxTurns);
        if (outcome.completed) {
          outcomeStatus = outcome.status!;
          finalSummary = outcome.summary!;
          structuredData = outcome.structuredData;
          break;
        }
      }
    } catch (err) {
      outcomeStatus = "failed";
      this._status = "failed";
      failureError = err instanceof Error ? err.message : String(err);
      finalSummary = `Task failed: ${failureError}`;
    } finally {
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
      }
      this._endTime = Date.now();
      if (this._status !== "failed" && this._status !== "terminated") {
        this._status = "completed";
      }
    }

    return this.compileFoldbackResult({
      status: outcomeStatus,
      executiveSummary: finalSummary,
      structuredData,
      error: failureError,
    });
  }

  /**
   * Compiles the final SubagentFoldbackResult.
   * Compresses the isolated sandbox turns into a compact executive summary
   * and calculates context tokens saved.
   */
  compileFoldbackResult(params: {
    status: SubagentStatus;
    executiveSummary: string;
    structuredData?: Record<string, unknown>;
    error?: string;
  }): SubagentFoldbackResult {
    const durationMs =
      (this._endTime || Date.now()) - (this._startTime || Date.now());
    const rawTokensEstimate = this.estimateRawIntermediateTokens();
    const summaryTokens = Math.max(
      1,
      Math.ceil(params.executiveSummary.length / 4),
    );
    const tokensSaved = Math.max(0, rawTokensEstimate - summaryTokens);

    return createFoldbackResult({
      taskId: this.brief.taskId,
      subagentRole: this.brief.subagentRole,
      status: params.status,
      executiveSummary: truncateExecutiveSummary(params.executiveSummary),
      structuredData: params.structuredData,
      artifactRefs: Array.from(this._artifacts),
      tokensConsumed: this._tokensConsumed,
      executionStats: {
        durationMs,
        intermediateTurns: this._history.length,
        rawTokensEstimate,
        tokensSaved,
      },
      error: params.error,
    });
  }

  /**
   * Calculates the raw token volume that would have polluted the primary context
   * if intermediate tool calls, raw page contents, and verbose logs had been dumped directly.
   */
  private estimateRawIntermediateTokens(): number {
    let totalChars = 0;
    for (const turn of this._history) {
      totalChars += turn.content.length;
      if (turn.toolCalls) {
        totalChars += JSON.stringify(turn.toolCalls).length;
      }
      if (turn.toolResult) {
        totalChars += JSON.stringify(turn.toolResult).length;
      }
    }
    return Math.max(this._tokensConsumed, Math.ceil(totalChars / 4));
  }

  /**
   * Initializes the isolated prompt context from the brief.
   * Strictly avoids importing any prior conversation history.
   */
  private initializeIsolatedContext(): void {
    const systemPrompt = [
      `You are a specialized subagent executing the role: ${this.brief.subagentRole}.`,
      `Your isolated task ID is: ${this.brief.taskId}.`,
      `Task Type: ${this.brief.taskType}.`,
      `Primary Goal: ${this.brief.goal}`,
      ...(this.brief.constraints && this.brief.constraints.length > 0
        ? ["Constraints:", ...this.brief.constraints.map((c) => `- ${c}`)]
        : []),
      ...(this.brief.expectedSchema
        ? [
            "Expected Return Schema:",
            JSON.stringify(this.brief.expectedSchema, null, 2),
          ]
        : []),
      "Anti-Pollution Directive: Your detailed intermediate reasoning and tool outputs remain isolated in your sandbox. Return a clear executive summary (<= 300 words) and structured data.",
    ].join("\n");

    this._history.push({
      turnIndex: 0,
      timestamp: Date.now(),
      role: "system",
      content: systemPrompt,
    });

    if (this.brief.inputs && Object.keys(this.brief.inputs).length > 0) {
      this._history.push({
        turnIndex: 1,
        timestamp: Date.now(),
        role: "user",
        content: `Task Inputs: ${JSON.stringify(this.brief.inputs, null, 2)}`,
      });
    }
  }
}
