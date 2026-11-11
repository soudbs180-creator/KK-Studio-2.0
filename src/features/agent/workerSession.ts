import type {
  AgentRole,
  Ticket,
  Mandate,
  ToolResult,
} from "../../domain/agentWorkflow.ts";
import {
  type SubagentFoldbackResult,
  truncateExecutiveSummary,
} from "./delegation/foldbackContract.ts";
import { ToolRegistry } from "./toolRegistry.ts";

export interface SubagentCapabilitySpec {
  readonly role: AgentRole;
  readonly name: string;
  readonly description: string;
  readonly allowedTools: readonly string[];
  readonly defaultMaxSteps: number;
  readonly timeoutMs: number;
  readonly systemPromptTemplate?: string;
}

/**
 * Standard Role Catalog for specialized worker agents.
 */
export const STANDARD_WORKER_SPECS: readonly SubagentCapabilitySpec[] = [
  {
    role: "planner",
    name: "Strategic Planner",
    description:
      "Decomposes complex creative prompts into structured multi-stage plans",
    allowedTools: ["plan_get_stage_status", "plan_patch_stage", "search_index"],
    defaultMaxSteps: 8,
    timeoutMs: 30000,
  },
  {
    role: "prompt_compiler",
    name: "Creative Prompt Compiler",
    description:
      "Compiles natural language briefs and camera optics into structured prompts",
    allowedTools: ["compile_optics", "parse_references", "tokenize_prompt"],
    defaultMaxSteps: 10,
    timeoutMs: 30000,
  },
  {
    role: "reference_analyst",
    name: "Asset & Style Analyst",
    description:
      "Extracts palette, aesthetic tokens, character features from reference images",
    allowedTools: [
      "inspect_asset_metadata",
      "extract_palette",
      "query_ontology",
    ],
    defaultMaxSteps: 10,
    timeoutMs: 30000,
  },
  {
    role: "generation_worker",
    name: "Multi-Modal Generator",
    description:
      "Invokes AI Gateway providers for image, video, audio synthesis",
    allowedTools: [
      "generate_image",
      "generate_video",
      "check_generation_status",
      "canvas_add_node",
    ],
    defaultMaxSteps: 15,
    timeoutMs: 60000,
  },
  {
    role: "reviewer",
    name: "Continuity & QA Auditor",
    description:
      "Checks output against continuity.md and redline rules, detects slop",
    allowedTools: ["verify_character_consistency", "audit_aesthetic_redline"],
    defaultMaxSteps: 8,
    timeoutMs: 30000,
  },
  {
    role: "compositor_exporter",
    name: "Canvas & Layout Compositor",
    description:
      "Places assets onto infinite canvas, creates nodes and bezier edges",
    allowedTools: [
      "canvas_add_node",
      "canvas_connect_nodes",
      "canvas_set_viewport",
    ],
    defaultMaxSteps: 12,
    timeoutMs: 30000,
  },
];

/**
 * Registry of Subagent capabilities.
 */
export class SubagentRegistry {
  readonly #specs = new Map<AgentRole, SubagentCapabilitySpec>();

  constructor(initialSpecs = STANDARD_WORKER_SPECS) {
    for (const spec of initialSpecs) {
      this.#specs.set(spec.role, spec);
    }
  }

  register(spec: SubagentCapabilitySpec): void {
    this.#specs.set(spec.role, spec);
  }

  get(role: AgentRole): SubagentCapabilitySpec | undefined {
    return this.#specs.get(role);
  }

  list(): readonly SubagentCapabilitySpec[] {
    return Array.from(this.#specs.values());
  }

  validateMandate(mandate: Mandate): { valid: boolean; reason?: string } {
    if (!mandate.targetRole) return { valid: true };
    const spec = this.#specs.get(mandate.targetRole);
    if (!spec)
      return { valid: false, reason: `Unknown role: ${mandate.targetRole}` };

    for (const tool of mandate.allowedTools) {
      if (!spec.allowedTools.includes(tool)) {
        return {
          valid: false,
          reason: `Tool ${tool} not supported by role ${mandate.targetRole}`,
        };
      }
    }
    return { valid: true };
  }
}

export interface WorkerSessionOptions {
  ticket: Ticket;
  toolRegistry: ToolRegistry;
  workspaceRoot: string;
}

/**
 * Worker Session:
 * Sandboxed, isolated Level 2 execution space for a single authorized ticket.
 */
export class WorkerSession {
  readonly #ticket: Ticket;
  readonly #toolRegistry: ToolRegistry;
  readonly #workspaceRoot: string;
  readonly #startTime: number;
  #turnsExecuted = 0;

  constructor(options: WorkerSessionOptions) {
    this.#ticket = options.ticket;
    this.#toolRegistry = options.toolRegistry;
    this.#workspaceRoot = options.workspaceRoot;
    this.#startTime = Date.now();
  }

  get ticket(): Ticket {
    return this.#ticket;
  }

  get turnsExecuted(): number {
    return this.#turnsExecuted;
  }

  /**
   * Executes a single authorized tool step within the session.
   */
  async executeStep(
    toolName: string,
    args: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<ToolResult> {
    this.#turnsExecuted += 1;
    const effectiveSignal = signal ?? new AbortController().signal;

    const result = await this.#toolRegistry.invokeTool(toolName, args, {
      callId: `call-${Date.now()}-${this.#turnsExecuted}`,
      taskId: this.#ticket.ticketId,
      workerId: this.#ticket.workerId,
      workspaceRoot: this.#workspaceRoot,
      signal: effectiveSignal,
      mandate: this.#ticket.mandate,
      ticket: this.#ticket,
    });

    return result;
  }

  /**
   * Discovers an out-of-scope sub-requirement and safely hands back to the router.
   */
  handback(
    triggerId: string,
    reason: string,
  ): { handedBack: boolean; ticket: Ticket } {
    this.#ticket.status = "blocked";
    this.#ticket.blockedReason = `Handback: ${reason} (triggerId: ${triggerId})`;
    this.#ticket.updatedAt = new Date().toISOString();
    return { handedBack: true, ticket: this.#ticket };
  }

  /**
   * Completes the worker session, producing a context-safe bounded foldback result.
   */
  complete(
    summary: string,
    artifactRefs?: string[],
    structuredData?: Record<string, unknown>,
  ): SubagentFoldbackResult {
    this.#ticket.status = "completed";
    const boundedSummary = truncateExecutiveSummary(summary);
    this.#ticket.resultSummary = boundedSummary;
    this.#ticket.updatedAt = new Date().toISOString();

    return {
      taskId: this.#ticket.ticketId,
      subagentRole: this.#ticket.workerId,
      status: "success",
      executiveSummary: boundedSummary,
      artifactRefs: artifactRefs ?? [],
      structuredData,
      executionStats: {
        durationMs: Date.now() - this.#startTime,
        intermediateTurns: this.#turnsExecuted,
      },
    };
  }

  /**
   * Fails the worker session, recording error telemetry.
   */
  fail(error: string): SubagentFoldbackResult {
    this.#ticket.status = "failed";
    this.#ticket.error = error;
    this.#ticket.updatedAt = new Date().toISOString();

    return {
      taskId: this.#ticket.ticketId,
      subagentRole: this.#ticket.workerId,
      status: "failed",
      executiveSummary: truncateExecutiveSummary(`Execution failed: ${error}`),
      error,
      executionStats: {
        durationMs: Date.now() - this.#startTime,
        intermediateTurns: this.#turnsExecuted,
      },
    };
  }
}

/**
 * Worker Pool Manager:
 * Enforces worker slot concurrency caps (default max 3 active workers).
 */
export class WorkerPoolManager {
  readonly #activeSessions = new Map<string, WorkerSession>();
  readonly #queue: Array<{ resolve: () => void }> = [];
  #reservedSlots = 0;
  readonly #maxConcurrent: number;

  constructor(maxConcurrent = 3) {
    this.#maxConcurrent = Math.max(1, maxConcurrent);
  }

  get activeCount(): number {
    return this.#activeSessions.size;
  }

  get maxConcurrent(): number {
    return this.#maxConcurrent;
  }

  get queueLength(): number {
    return this.#queue.length;
  }

  canAcquireSlot(): boolean {
    return (
      this.#activeSessions.size + this.#reservedSlots + this.#queue.length <
      this.#maxConcurrent
    );
  }

  acquireSession(options: WorkerSessionOptions): WorkerSession {
    if (!this.canAcquireSlot()) {
      throw new Error(
        `Worker concurrency limit reached (${this.#maxConcurrent} active workers).`,
      );
    }
    const session = new WorkerSession(options);
    this.#activeSessions.set(options.ticket.ticketId, session);
    return session;
  }

  async acquireAsync(options: WorkerSessionOptions): Promise<WorkerSession> {
    if (!this.canAcquireSlot()) {
      await new Promise<void>((resolve) => {
        this.#queue.push({ resolve });
      });
      this.#reservedSlots = Math.max(0, this.#reservedSlots - 1);
    }
    const session = new WorkerSession(options);
    this.#activeSessions.set(options.ticket.ticketId, session);
    return session;
  }

  async enqueueSession(options: WorkerSessionOptions): Promise<WorkerSession> {
    return this.acquireAsync(options);
  }

  releaseSession(ticketId: string): boolean {
    const deleted = this.#activeSessions.delete(ticketId);
    if (deleted && this.#queue.length > 0) {
      this.#reservedSlots += 1;
      const next = this.#queue.shift();
      if (next) {
        next.resolve();
      }
    }
    return deleted;
  }

  getSession(ticketId: string): WorkerSession | undefined {
    return this.#activeSessions.get(ticketId);
  }
}
