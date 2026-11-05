import { z } from "zod";

/* =========================================================================
 * 1. Agent Roles, Events & Approval Gates
 * ========================================================================= */

export const agentRoleSchema = z.enum([
  "planner",
  "prompt_compiler",
  "reference_analyst",
  "generation_worker",
  "asset_tagger",
  "reviewer",
  "compositor_exporter",
  "router",
  "artist",
  "coder",
  "critic",
  "writer",
]);
export type AgentRole = z.infer<typeof agentRoleSchema>;

export const agentEventTypeSchema = z.enum([
  "TaskPlanned",
  "PromptCompiled",
  "ReferenceAnalyzed",
  "ApprovalRequired",
  "ProviderSelected",
  "GenerationSubmitted",
  "GenerationProgressed",
  "AssetCreated",
  "ReviewRequested",
  "HumanApproved",
  "ExportCompleted",
  "TaskFailed",
  "CheckpointCreated",
  "CheckpointApproved",
  "CheckpointRejected",
  "MandateIssued",
  "TicketCreated",
  "StepExecuted",
  "StepBlocked",
  "TaskCompleted",
]);
export type AgentEventType = z.infer<typeof agentEventTypeSchema>;

export interface AgentEvent {
  id: string;
  taskId: string;
  role: AgentRole;
  type: AgentEventType;
  createdAt: string;
  /** Redacted, bounded details. Secrets and full provider responses are forbidden. */
  details: Record<string, string | number | boolean | null>;
}

export const approvalGateSchema = z.enum([
  "high_cost_batch",
  "remote_transfer",
  "overwrite_original",
  "external_share",
  "account_or_billing_change",
]);
export type ApprovalGate = z.infer<typeof approvalGateSchema>;

export const extendedApprovalGateSchema = z.enum([
  "high_cost_batch",
  "remote_transfer",
  "overwrite_original",
  "external_share",
  "account_or_billing_change",
  "destructive_canvas_delete",
  "privilege_escalation",
]);
export type ExtendedApprovalGate = z.infer<typeof extendedApprovalGateSchema>;

export interface ApprovalGatesInput {
  privacyMode: "local_only" | "byok_local" | "platform_backed";
  requestedOutputs: number;
  providerBaseUrl?: string;
  overwriteOriginal?: boolean;
  externalShare?: boolean;
}

export function requiredApprovalGates(
  input: ApprovalGatesInput,
): ApprovalGate[] {
  const gates: ApprovalGate[] = [];
  let localEndpoint = false;
  try {
    const host = new URL(input.providerBaseUrl ?? "").hostname;
    localEndpoint =
      host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  } catch {
    /* An unknown remote boundary requires approval. */
  }
  if (
    input.privacyMode === "platform_backed" ||
    (input.privacyMode === "byok_local" && !localEndpoint)
  ) {
    gates.push("remote_transfer");
  }
  if (input.requestedOutputs >= 16) gates.push("high_cost_batch");
  if (input.overwriteOriginal) gates.push("overwrite_original");
  if (input.externalShare) gates.push("external_share");
  return gates;
}

/* =========================================================================
 * 2. Mandate & Authorization Tokens
 * ========================================================================= */

/**
 * Immutable authorization credential issued by Router or User.
 */
export interface Mandate {
  /** Unique mandate identifier, format: 'mandate-<timestamp>-<hash>' or 'man_<id>'. */
  readonly id: string;
  /** Issuer authority: Router (autonomous gate admission) or User (explicit prompt/approval). */
  readonly authorizedBy: "Router" | "User";
  /** Exact whitelist of allowed tool names for this execution. */
  readonly allowedTools: readonly string[];
  /** Hard cap on total turns/steps permitted for this ticket. */
  readonly maxStepCount: number;
  /** ISO timestamp of issuance. */
  readonly issuedAt: string;
  /** Optional target worker role authorized to receive this mandate. */
  readonly targetRole?: AgentRole;
  /** Optional ISO timestamp of expiration (default 30 min). */
  readonly expiresAt?: string;
  /** Contextual or workspace scope identifier. */
  readonly scope?: string;
  /** Policy version under which this mandate was evaluated. */
  readonly policyVersion?: string;
  /** Admission strength: explicit user request vs inferred rule match. */
  readonly strength?: "explicit" | "inferred";
  /** Cryptographic / tamper-detection signature string. */
  readonly signature?: string;
  /** Allowed operational directories/workspaces. */
  readonly allowedPaths?: readonly string[];
}

export interface CreateMandateOptions {
  id?: string;
  authorizedBy: "Router" | "User";
  allowedTools: readonly string[];
  maxStepCount: number;
  targetRole?: AgentRole;
  ttlMs?: number;
  scope?: string;
  policyVersion?: string;
  strength?: "explicit" | "inferred";
  allowedPaths?: readonly string[];
}

/**
 * Pure domain factory to create an immutable Scoped Mandate with frozen tools array.
 */
export function createMandate(options: CreateMandateOptions): Mandate {
  const now = Date.now();
  const ttl = options.ttlMs ?? 30 * 60 * 1000;
  const id =
    options.id ??
    `mandate-${now}-${Math.random().toString(36).substring(2, 7)}`;

  return Object.freeze({
    id,
    authorizedBy: options.authorizedBy,
    allowedTools: Object.freeze([...options.allowedTools]),
    maxStepCount: Math.max(0, Math.floor(options.maxStepCount)),
    issuedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttl).toISOString(),
    targetRole: options.targetRole,
    scope: options.scope,
    policyVersion: options.policyVersion ?? "v1.0",
    strength: options.strength ?? "explicit",
    allowedPaths: options.allowedPaths
      ? Object.freeze([...options.allowedPaths])
      : undefined,
    signature: `sig-${id}-${options.authorizedBy}-${options.maxStepCount}`,
  });
}

/**
 * Validates whether a mandate is active, unexpired, within step budget, and permits the tool.
 */
export function validateMandateExecution(
  mandate: Mandate,
  tool: string,
  currentStepsUsed: number,
  nowMs: number = Date.now(),
): { allowed: boolean; reason?: string } {
  if (mandate.expiresAt && nowMs > Date.parse(mandate.expiresAt)) {
    return {
      allowed: false,
      reason: "Mandate authorization token has expired",
    };
  }
  if (!mandate.allowedTools.includes(tool)) {
    return {
      allowed: false,
      reason: `Tool ${tool} not permitted by mandate`,
    };
  }
  if (currentStepsUsed >= mandate.maxStepCount) {
    return {
      allowed: false,
      reason: "Max step budget exhausted",
    };
  }
  return { allowed: true };
}

/* =========================================================================
 * 3. Stateful Ticket Aggregate & Lifecycle
 * ========================================================================= */

export const ticketStatusSchema = z.enum([
  "pending",
  "in_progress",
  "completed",
  "blocked",
  "failed",
  "dropped",
  "stopped",
  "cancelled",
]);
export type TicketStatus = z.infer<typeof ticketStatusSchema>;

export interface TicketAttention {
  readonly id: string;
  readonly question: string;
  readonly reason:
    | "approval_required"
    | "missing_parameter"
    | "ambiguous_intent"
    | "safety_violation";
  readonly associatedGate?: ApprovalGate;
  readonly raisedAt: string;
}

export interface TicketStepLog {
  stepIndex: number;
  tool: string;
  startedAt: string;
  durationMs: number;
  status: "success" | "error" | "blocked";
  error?: string;
}

export type TicketInput =
  | {
      readonly kind: "user_message";
      readonly text: string;
      readonly at: string;
    }
  | {
      readonly kind: "system_feedback";
      readonly text: string;
      readonly at: string;
    }
  | {
      readonly kind: "policy_update";
      readonly policyVersion: string;
      readonly at: string;
    }
  | {
      readonly kind: "handback_rejected";
      readonly reason: string;
      readonly at: string;
    };

/**
 * Stateful Ticket aggregate tracking worker execution.
 */
export interface Ticket {
  readonly ticketId: string;
  readonly mandateId?: string;
  readonly mandate: Mandate;
  readonly workerId: string;
  status: TicketStatus;
  stepsUsed: number;
  currentStepCount?: number;
  currentTool?: string;
  title?: string;
  attention?: TicketAttention;
  resultSummary?: string;
  artifactRefs?: readonly string[];
  blockedReason?: string;
  error?: string;
  inputs?: readonly TicketInput[];
  stepLogs?: TicketStepLog[];
  executionPayload?: unknown;
  createdAt?: string;
  updatedAt?: string;
}

/* =========================================================================
 * 4. 3-Phase Flow State Machine & Checkpoints
 * ========================================================================= */

export const workflowPhaseSchema = z.enum([
  "idle",
  "planning",
  "confirm",
  "execution",
  "completed",
  "blocked",
  "failed",
  "cancelled",
]);
export type WorkflowPhase = z.infer<typeof workflowPhaseSchema>;

export const costTierSchema = z.enum(["zero", "low", "medium", "high"]);
export type CostTier = z.infer<typeof costTierSchema>;

export interface PlanWorkItemPreview {
  id: string;
  kind: "image" | "video" | "audio" | "text" | "canvas_op" | "code";
  goal: string;
  estimatedDurationMs: number;
  toolToUse: string;
  dependencies: string[];
}

export interface StructuredPlan {
  planId: string;
  title: string;
  userPrompt: string;
  items: PlanWorkItemPreview[];
  requestedTools: string[];
  suggestedStepQuota: number;
}

export interface PlanImpactAssessment {
  costTier: CostTier;
  estimatedTokens: number;
  estimatedApiCostUsd?: number;
  triggeredGates: ApprovalGate[];
  reversibility: "full_snapshot_undo" | "partial_undo" | "irreversible";
  affectedNodeIds: string[];
  externalEndpointsContacted: string[];
  securityRiskLevel: "low" | "moderate" | "critical";
}

export interface ConfirmationCheckpoint {
  checkpointId: string;
  planId: string;
  createdAt: string;
  expiresAt: string;
  plan: StructuredPlan;
  impact: PlanImpactAssessment;
  status: "pending" | "approved" | "rejected" | "modified" | "expired";
  decision?: {
    decidedAt: string;
    decidedBy: "user";
    action: "approve" | "reject" | "modify";
    reworkFeedback?: string;
    adjustedToolWhitelist?: string[];
    adjustedStepQuota?: number;
  };
}

export type WorkflowTransitionEvent =
  | { type: "START_PLANNING" }
  | { type: "PLAN_READY"; requiresConfirmation: boolean }
  | { type: "USER_APPROVE" }
  | { type: "USER_REJECT" }
  | { type: "USER_MODIFY" }
  | { type: "STEP_BLOCKED"; reason: string }
  | { type: "UNBLOCK_RESUME" }
  | { type: "EXECUTION_COMPLETE" }
  | { type: "FATAL_ERROR"; error: string }
  | { type: "RESET_IDLE" };

type TransitionHandler = (
  event: WorkflowTransitionEvent,
) => WorkflowPhase | undefined;

const PHASE_TRANSITIONS: Record<WorkflowPhase, TransitionHandler> = {
  idle: (e) => (e.type === "START_PLANNING" ? "planning" : undefined),
  planning: (e) => {
    if (e.type === "PLAN_READY")
      return e.requiresConfirmation ? "confirm" : "execution";
    if (e.type === "FATAL_ERROR") return "failed";
    return undefined;
  },
  confirm: (e) => {
    if (e.type === "USER_APPROVE") return "execution";
    if (e.type === "USER_REJECT") return "cancelled";
    if (e.type === "USER_MODIFY") return "planning";
    if (e.type === "FATAL_ERROR") return "failed";
    return undefined;
  },
  execution: (e) => {
    if (e.type === "STEP_BLOCKED") return "blocked";
    if (e.type === "EXECUTION_COMPLETE") return "completed";
    if (e.type === "FATAL_ERROR") return "failed";
    return undefined;
  },
  blocked: (e) => {
    if (e.type === "UNBLOCK_RESUME") return "execution";
    if (e.type === "FATAL_ERROR") return "failed";
    if (e.type === "USER_REJECT") return "cancelled";
    return undefined;
  },
  completed: (e) =>
    e.type === "START_PLANNING"
      ? "planning"
      : e.type === "RESET_IDLE"
        ? "idle"
        : undefined,
  failed: (e) =>
    e.type === "START_PLANNING"
      ? "planning"
      : e.type === "RESET_IDLE"
        ? "idle"
        : undefined,
  cancelled: (e) =>
    e.type === "START_PLANNING"
      ? "planning"
      : e.type === "RESET_IDLE"
        ? "idle"
        : undefined,
};

/**
 * Pure state machine transition reducer for 3-Phase Flow.
 */
export function transitionWorkflowPhase(
  currentPhase: WorkflowPhase,
  event: WorkflowTransitionEvent,
): WorkflowPhase {
  const handler = PHASE_TRANSITIONS[currentPhase];
  return handler?.(event) ?? currentPhase;
}

/* =========================================================================
 * 5. Router Decision & Gate Evaluation Contracts
 * ========================================================================= */

export type RouterDecisionKind =
  "direct_reply" | "accept" | "attach" | "ignore" | "stop";

export interface RouterDecision {
  readonly kind: RouterDecisionKind;
  readonly reason: string;
  readonly ticketId?: string;
  readonly mandate?: Mandate;
  readonly directResponseText?: string;
  readonly audit: {
    readonly complexityScore: number;
    readonly matchedRole?: AgentRole;
    readonly evaluatedGates: readonly ApprovalGate[];
  };
}

export interface GateEvaluationResult {
  readonly complexityScore: number; // 0 to 100
  readonly requiresWorker: boolean;
  readonly recommendedRole: AgentRole;
  readonly recommendedTools: readonly string[];
  readonly recommendedMaxSteps: number;
  readonly requiredGates: readonly ApprovalGate[];
  readonly rationale: string;
}

/* =========================================================================
 * 6. Tool Calling & PreInvocation Security Types
 * ========================================================================= */

export const toolRiskLevelSchema = z.enum([
  "safe",
  "read_only",
  "mutating",
  "sensitive",
  "destructive",
]);
export type ToolRiskLevel = z.infer<typeof toolRiskLevelSchema>;

export interface ToolExecutionContext {
  readonly callId: string;
  readonly turnId?: string;
  readonly taskId?: string;
  readonly workerId?: string;
  readonly workspaceRoot: string;
  readonly signal: AbortSignal;
  readonly mandate?: Mandate;
  readonly ticket?: Ticket;
  readonly metadata?: Record<string, unknown>;
}

export interface ToolDefinition<
  TArgs = Record<string, unknown>,
  TResult = unknown,
> {
  readonly name: string;
  readonly description: string;
  readonly riskLevel: ToolRiskLevel;
  readonly parameters: z.ZodType<TArgs> | Record<string, unknown>;
  readonly timeoutMs?: number;
  readonly maxOutputBytes?: number;
  readonly execute: (
    args: TArgs,
    context: ToolExecutionContext,
  ) => Promise<TResult> | TResult;
}

export interface ToolResult<T = unknown> {
  readonly ok: boolean;
  readonly callId: string;
  readonly toolName: string;
  readonly data?: T;
  readonly error?: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
  };
  readonly durationMs: number;
  readonly bytesOutput: number;
  readonly truncated: boolean;
}

export interface PreInvocationDecision {
  readonly allow: boolean;
  readonly reason?: string;
  readonly sanitizedPayload?: Record<string, unknown>;
}

export interface PreInvocationContext {
  readonly toolName: string;
  readonly args: Record<string, unknown>;
  readonly ticket?: Ticket;
  readonly mandate?: Mandate;
  readonly workspaceRoot?: string;
}

export type PreInvocationHook = (
  tool: string,
  args: Record<string, unknown>,
  context?: PreInvocationContext,
) => PreInvocationDecision | { allow: boolean; reason?: string };

/* =========================================================================
 * 7. Statusline IPC Telemetry Types
 * ========================================================================= */

export type AgentState =
  | "idle"
  | "thinking"
  | "working"
  | "tool_use"
  | "review"
  | "blocked"
  | "completed"
  | "failed";

export interface StatuslineStatusInput {
  agent: string;
  step: number;
  totalSteps: number;
  currentTool?: string;
  durationMs: number;
  phase?: WorkflowPhase;
  costTier?: CostTier;
  contextUsagePct?: number;
}

export interface StatuslinePayload {
  readonly type: "statusline";
  readonly agent: string;
  readonly progress: number;
  readonly currentTool: string | null;
  readonly durationMs: number;
  readonly timestamp: number;
  readonly phase?: WorkflowPhase;
  readonly step?: number;
  readonly totalSteps?: number;
}

export interface RichStatuslinePayload {
  readonly scope?: string;
  readonly type: "rich_statusline";
  readonly agent: string;
  readonly state: AgentState;
  readonly progress: number;
  readonly step: number;
  readonly totalSteps: number;
  readonly currentTool: string | null;
  readonly durationMs: number;
  readonly contextWindow?: {
    readonly usedPercentage: number;
    readonly totalTokens: number;
    readonly usedTokens: number;
  };
  readonly vcs?: {
    readonly branch: string;
    readonly dirty: boolean;
  };
  readonly sandboxEnabled: boolean;
  readonly artifactCount: number;
  readonly taskCount: number;
  readonly modelDisplayName: string;
  readonly timestamp: number;
}

/**
 * Formats a single-line JSON string telemetry event conforming to the canonical IPC contract.
 */
export function formatStatuslineIPC(status: StatuslineStatusInput): string {
  const progress =
    status.totalSteps <= 0
      ? 0
      : Math.min(
          100,
          Math.max(0, Math.round((status.step / status.totalSteps) * 100)),
        );
  const payload: StatuslinePayload = {
    type: "statusline",
    agent: status.agent,
    progress,
    currentTool:
      status.currentTool && status.currentTool.length > 0
        ? status.currentTool
        : null,
    durationMs: status.durationMs,
    timestamp: Date.now(),
  };
  return JSON.stringify(payload);
}
