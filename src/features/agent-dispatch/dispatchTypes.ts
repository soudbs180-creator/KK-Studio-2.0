/**
 * KK Studio Agent Dispatcher & Quota Signals Types.
 *
 * Grounded in plan-addendum-agent-ui.md Section H.
 * Minimal, strongly typed definitions for agent registry, quota signals,
 * health tracking adapter, and candidate filtering.
 */

/** Supported agent backend kinds. */
export type AgentKind =
  | "codex"
  | "workbuddy"
  | "antigravity"
  | "openai-compat"
  | "ollama"
  | "comfy"
  | "google"
  | "other";

/** Agent orchestration role hint. */
export type AgentRoleHint = "main" | "worker" | "specialist";

/** Approximate cost tier for routing prioritization. */
export type CostTier = "free" | "cheap" | "standard" | "premium";

/** Health status of an agent channel / backend. */
export type HealthStatus = "ok" | "degraded" | "down";

/** Quota and rate-limit tracking state for an agent candidate. */
export interface QuotaState {
  /** Optional explicit remaining count or tokens, if known. */
  remaining?: number;
  /** Timestamp (epoch ms) when quota is scheduled to reset. */
  resetAt?: number;
  /** Whether the quota is marked as exhausted. */
  exhausted: boolean;
  /** Timestamp (epoch ms) until which the candidate is in cooldown. */
  cooldownUntil?: number;
}

/** A candidate worker or agent backend registered in the dispatch pool. */
export interface DispatchCandidate {
  /** Unique identifier for this candidate / channel. */
  id: string;
  /** Backend kind. */
  kind: AgentKind;
  /** Role in orchestration hierarchy. */
  roleHint?: AgentRoleHint;
  /** Capabilities provided by this candidate (e.g. 'text.plan', 'image.generate'). */
  capabilities: string[];
  /** Cost tier (main agent default is premium; local/free defaults to free). */
  costTier?: CostTier;
  /** Quota and rate-limit state. */
  quota: QuotaState;
  /** Health status derived from probing or recent execution outcomes. */
  health: HealthStatus;
  /** Reference to AgentRuntime or providerConnection id. */
  runtimeRef?: string;
  /** User-configured priority bias (higher = preferred). */
  priorityBias?: number;
  /** Additional metadata (secrets MUST NOT be stored in plain text here). */
  metadata?: Record<string, unknown>;
}

/** Unified classification for upstream quota / rate-limit / failure signals. */
export type QuotaSignalType =
  | "RATE_LIMITED" // 429 / Too Many Requests / Throttled
  | "INSUFFICIENT_QUOTA" // Quota exceeded / Balance insufficient / Arrears
  | "AUTH_FAILED" // Invalid API key / Unauthorized / Token revoked
  | "OTHER"; // Upstream server error, timeout, transport, etc.

/** Structured, sanitized quota signal. */
export interface QuotaSignal {
  /** Unified error category. */
  readonly signalType: QuotaSignalType;
  /** Whether the request can be retried (on another candidate or after backoff). */
  readonly retryable: boolean;
  /** Upstream HTTP status code if available. */
  readonly httpStatus?: number;
  /** Cooldown duration suggested in milliseconds. */
  readonly cooldownMs?: number;
  /** Scheduled quota reset timestamp in epoch ms if parsed from upstream. */
  readonly resetAt?: number;
  /** Sanitized error description; GUARANTEED free of raw keys, tokens, and secrets. */
  readonly sanitizedDetail?: string;
  /** Upstream error code or type if present (e.g. 'insufficient_quota', 'rate_limit_exceeded'). */
  readonly upstreamCode?: string;
}

/** Reason why a candidate should be skipped during dispatch. */
export type SkipReason = "exhausted" | "cooling_down" | "health_down";

/** Result of evaluating whether a candidate should be skipped. */
export interface SkipEvaluation {
  /** Whether the candidate should be skipped. */
  skip: boolean;
  /** Skip reason if skip is true. */
  reason?: SkipReason;
  /** Remaining milliseconds until cooldown ends, if currently cooling down. */
  cooldownRemainingMs?: number;
  /** Remaining milliseconds until quota resets, if resetAt is set. */
  resetRemainingMs?: number;
}

/** Narrow adapter interface matching the shape of ChannelHealthTracker. */
export interface HealthTrackerLike {
  recordFailure?(channelId: string, error: unknown): void;
  recordSuccess?(channelId: string): void;
  isAvailable?(channelId: string): boolean;
  state?(channelId: string): {
    consecutiveFailures: number;
    cooldownUntil: number;
    quarantined: boolean;
    healthScore?: number;
  };
}

/** Options for classifying quota signals. */
export interface ClassifySignalOptions {
  /** Known secret strings (e.g. API keys) to explicitly scrub from output strings. */
  readonly knownSecrets?: readonly string[];
  /** Default cooldown milliseconds for rate-limited signals if upstream gives no hint. */
  readonly defaultCooldownMs?: number;
  /** Current time provider (defaults to Date.now()). */
  readonly now?: number;
}

/** Query and filter options for candidate selection in AgentRegistry. */
export interface CandidateFilter {
  /** Capability required (e.g. 'text.plan', 'image.generate'). */
  readonly capability?: string;
  /** Role hint filter (main, worker, specialist). */
  readonly roleHint?: AgentRoleHint;
  /** Backend kind filter (codex, workbuddy, antigravity, etc.). */
  readonly kind?: AgentKind;
  /** Cost tier filter (free, cheap, standard, premium). */
  readonly costTier?: CostTier;
  /** Whether to include exhausted candidates even if not reset/recovered (default: false). */
  readonly includeExhausted?: boolean;
  /** Whether to include candidates currently in cooldown (default: false). */
  readonly includeCoolingDown?: boolean;
  /** Whether to include candidates with health === 'down' (default: false). */
  readonly includeDown?: boolean;
  /** Override current timestamp in epoch ms (defaults to Date.now()). */
  readonly now?: number;
}

/** Configuration options when creating or configuring an AgentRegistry instance. */
export interface AgentRegistryOptions {
  /** Time source provider, returning epoch ms. Defaults to Date.now. */
  readonly now?: () => number;
  /** Known secrets or fake keys to scrub from return values, metadata, and logs. */
  readonly knownSecrets?: readonly string[];
}

/** Work-item billing class from planner / dispatcher. */
export type BudgetClass = "free" | "paid";

/** Machine-readable gate outcome reason. */
export type BudgetGateReason =
  | "free_pass"
  | "within_budget"
  | "zero_budget"
  | "insufficient_budget"
  | "user_confirmed";

/** Snapshot of the user-configured spend budget. */
export interface BudgetSnapshot {
  /** Remaining spendable units (>= 0). Prefer this field. When omitted, derived as max(0, limit - spent). */
  remaining?: number;
  /** Optional hard limit. */
  limit?: number;
  /** Optional already-spent amount. */
  spent?: number;
}

/** Full decision returned by evaluateBudgetGate. */
export interface BudgetGateDecision {
  /** Whether dispatch may proceed without further confirmation UI. */
  allow: boolean;
  /** Whether total confirmation is required before dispatch. */
  needsConfirmation: boolean;
  reason: BudgetGateReason;
  /** Effective cost used for the comparison. */
  effectiveCost: number;
  /** Normalized remaining budget used for the comparison. */
  remaining: number;
}

/** Request payload for selecting or dispatching a candidate. */
export interface DispatchRequest {
  /** Required capability (e.g. 'text.plan', 'image.generate', 'video.generate'). */
  readonly capability: string;
  /** Optional brief / description of the work item. */
  readonly brief?: string;
  /** Billing classification: 'free' or 'paid'. Defaults to 'free'. */
  readonly budgetClass?: BudgetClass;
  /** User spend budget snapshot (used when budgetClass is 'paid'). */
  readonly budget?: BudgetSnapshot;
  /** Estimated cost for this work item. If omitted, budgetGate uses costTier. */
  readonly estimatedCost?: number;
  /** Whether user already gave total (L2) confirmation for paid dispatch. */
  readonly confirmed?: boolean;
  /** Current time override in epoch ms (for testing and reproducible replay). */
  readonly now?: number;
  /** Candidate IDs to exclude from selection (e.g. previously attempted in a fallback chain). */
  readonly excludeCandidateIds?: readonly string[];
  /** Optional map of candidate ID to probe latency in milliseconds. */
  readonly probeLatencies?: Readonly<Record<string, number>>;
  /** Additional metadata for the dispatch request. */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/** Classification for why no candidate could be dispatched. */
export type NoCandidateReason =
  | "unsupported_capability"
  | "all_exhausted"
  | "cooling_down"
  | "all_down"
  | "missing_credentials";

/** Diagnostic counts when evaluating candidate pool. */
export interface NoCandidateDiagnostics {
  /** Total registered candidates in the pool. */
  readonly totalRegistered: number;
  /** Number of candidates matching the required capability. */
  readonly matchedCapabilityCount: number;
  /** Number of matched candidates whose quota is exhausted. */
  readonly exhaustedCount: number;
  /** Number of matched candidates currently in cooldown. */
  readonly coolingDownCount: number;
  /** Number of matched candidates with health === 'down'. */
  readonly downCount: number;
  /** Whether main agent was registered with the capability but rejected for media work. */
  readonly hasMainAgentWithCapability?: boolean;
}

/** Structured explanation of what is missing when dispatch yields no candidate. */
export interface NoCandidateExplanation {
  /** Machine-readable reason category. */
  readonly reason: NoCandidateReason;
  /** Human-readable explanatory message (guaranteed scrubbed of secrets). */
  readonly message: string;
  /** Actionable recommendation for the user or calling agent. */
  readonly suggestion: string;
  /** Diagnostic breakdown of the candidate pool. */
  readonly diagnostics: NoCandidateDiagnostics;
  /** The specific capability that could not be satisfied. */
  readonly missingCapability: string;
}

/** Status outcome of a dispatch selection. */
export type DispatchStatus = "selected" | "needs_confirmation" | "no_candidate";

/** Result returned by the dispatcher when selecting a candidate. */
export interface DispatchResult {
  /** Outcome status of this selection. */
  readonly status: DispatchStatus;
  /** The selected candidate (if status is 'selected' or 'needs_confirmation'). Scrubbed of secrets. */
  readonly candidate?: DispatchCandidate;
  /** Full ordered chain of eligible candidates. Scrubbed of secrets. */
  readonly candidatesChain: readonly DispatchCandidate[];
  /** Budget gate evaluation result (present when budget was evaluated). */
  readonly budgetDecision?: BudgetGateDecision;
  /** Structured explanation when no candidate is available. */
  readonly explanation?: NoCandidateExplanation;
  /** Human-readable explanation or status message. */
  readonly message?: string;
}

/** Result of a fallback chain rotation after a candidate failure or 429. */
export interface FallbackResult {
  /** Unified quota signal classified from the failure. */
  readonly signal: QuotaSignal;
  /** Non-blocking notification message for UI / host (e.g. 'xx 额度用尽，已改走 yy。'). */
  readonly notification: string;
  /** ID of the candidate that failed. */
  readonly previousCandidateId: string;
  /** Dispatch result for the next candidate in the chain. */
  readonly decision: DispatchResult;
  /** The next candidate picked (if any). Scrubbed of secrets. */
  readonly nextCandidate?: DispatchCandidate;
}

/** Configuration options for the Dispatcher. */
export interface DispatcherOptions {
  /** Optional custom time provider returning epoch ms. Defaults to Date.now. */
  readonly now?: () => number;
  /** Known secret strings to scrub from return values, explanations, and logs. */
  readonly knownSecrets?: readonly string[];
  /** Optional hook to retrieve live probe latency for a candidate. */
  readonly getProbeLatency?: (candidate: DispatchCandidate) => number | undefined;
}
