/**
 * KK Studio Agent Dispatcher (Task 1.11).
 *
 * Implements a pure-logic, table-driven dispatcher:
 * 1. Filter: capability match, health !== 'down', !exhausted (unless resetAt expired), now >= cooldownUntil.
 *    Enforces the rule that main agents do not directly execute image/video generation tasks.
 * 2. Sort: priorityBias (higher first) -> explicit remaining quota -> costTier (lower first) -> probe latency -> stable tie-breaker by id.
 *    (Hardware-adaptive scheduling is intentionally deferred to Phase 2).
 * 3. Budget: paid dispatches consult budgetGate. If over budget or budget is zero, requires L2 confirmation.
 * 4. Fallback chain: on dispatch failure or 429, classifies signal with quotaSignals, records signal in registry,
 *    and rotates to next candidate in the chain with non-blocking notification copy ("xx 额度用尽，已改走 yy。").
 * 5. No candidate: returns structured explanation (missing credentials, switch model suggestion, etc.) without throwing.
 * 6. Pure functions & class: zero network calls, injectable time source, deep secret sanitization.
 *
 * Grounded in plan-addendum-agent-ui.md Section H & task ph1-1.11 specs.
 */

import {
  AgentRegistry,
  sanitizeCandidate,
} from "./agentRegistry.ts";
import {
  evaluateBudgetGate,
  type BudgetGateDecision,
  type BudgetGateInput,
} from "./budgetGate.ts";
import type {
  CostTier,
  DispatchCandidate,
  DispatcherOptions,
  DispatchRequest,
  DispatchResult,
  FallbackResult,
  NoCandidateDiagnostics,
  NoCandidateExplanation,
  NoCandidateReason,
} from "./dispatchTypes.ts";
import {
  classifyQuotaSignal,
  sanitizeSecrets,
} from "./quotaSignals.ts";

/** Numeric ordering for cost tiers: lower cost is preferred. */
export const COST_TIER_RANK: Readonly<Record<CostTier, number>> = {
  free: 0,
  cheap: 1,
  standard: 2,
  premium: 3,
};

/**
 * Checks whether a capability represents a media task (image or video generation).
 * Main agents are prohibited from handling media tasks directly.
 */
export function isMediaCapability(capability: string): boolean {
  if (!capability || typeof capability !== "string") return false;
  const lower = capability.toLowerCase();
  return (
    lower.startsWith("image.") ||
    lower.startsWith("video.") ||
    lower.startsWith("audio.")
  );
}

/**
 * Checks if a candidate is restricted from executing media tasks.
 */
function isMediaRestricted(
  candidate: DispatchCandidate,
  capability: string,
  allowMainForMedia = false,
): boolean {
  if (allowMainForMedia) return false;
  return isMediaCapability(capability) && candidate.roleHint === "main";
}

/**
 * Checks whether a candidate's quota is currently available.
 * If quota is exhausted but resetAt has arrived, it is treated as recovered.
 */
function isQuotaAvailable(candidate: DispatchCandidate, now: number): boolean {
  if (!candidate.quota.exhausted) return true;
  return (
    candidate.quota.resetAt !== undefined && candidate.quota.resetAt <= now
  );
}

/**
 * Checks whether a candidate is currently free of active cooldown.
 */
function isCooldownPassed(candidate: DispatchCandidate, now: number): boolean {
  if (candidate.quota.cooldownUntil === undefined) return true;
  return candidate.quota.cooldownUntil <= now;
}

/**
 * Evaluates whether a candidate satisfies all dispatch eligibility criteria.
 */
export function isCandidateEligible(
  candidate: DispatchCandidate,
  capability: string,
  options?: {
    now?: number;
    excludeCandidateIds?: readonly string[];
    allowMainForMedia?: boolean;
  },
): boolean {
  const now = options?.now ?? Date.now();

  if (options?.excludeCandidateIds?.includes(candidate.id)) {
    return false;
  }

  if (!candidate.capabilities.includes(capability)) {
    return false;
  }

  if (isMediaRestricted(candidate, capability, options?.allowMainForMedia)) {
    return false;
  }

  if (candidate.health === "down") {
    return false;
  }

  if (!isQuotaAvailable(candidate, now)) {
    return false;
  }

  if (!isCooldownPassed(candidate, now)) {
    return false;
  }

  return true;
}

/**
 * Filters a pool of candidates down to those eligible for the specified capability.
 */
export function filterEligibleCandidates(
  candidates: readonly DispatchCandidate[],
  capability: string,
  options?: {
    now?: number;
    excludeCandidateIds?: readonly string[];
    allowMainForMedia?: boolean;
    knownSecrets?: readonly string[];
  },
): DispatchCandidate[] {
  const eligible: DispatchCandidate[] = [];
  for (const candidate of candidates) {
    if (isCandidateEligible(candidate, capability, options)) {
      eligible.push(sanitizeCandidate(candidate, options?.knownSecrets));
    }
  }
  return eligible;
}

/**
 * Resolves probe latency for a candidate in milliseconds.
 * Returns Number.POSITIVE_INFINITY if latency is unknown or not recorded.
 */
export function resolveCandidateLatency(
  candidate: DispatchCandidate,
  options?: {
    getProbeLatency?: (candidate: DispatchCandidate) => number | undefined;
    probeLatencies?: Readonly<Record<string, number>>;
  },
): number {
  if (options?.getProbeLatency) {
    const fromHook = options.getProbeLatency(candidate);
    if (
      typeof fromHook === "number" &&
      Number.isFinite(fromHook) &&
      fromHook >= 0
    ) {
      return fromHook;
    }
  }

  if (options?.probeLatencies) {
    const fromMap = options.probeLatencies[candidate.id];
    if (
      typeof fromMap === "number" &&
      Number.isFinite(fromMap) &&
      fromMap >= 0
    ) {
      return fromMap;
    }
  }

  const metaProbe =
    candidate.metadata?.probeLatencyMs ?? candidate.metadata?.latencyMs;
  if (
    typeof metaProbe === "number" &&
    Number.isFinite(metaProbe) &&
    metaProbe >= 0
  ) {
    return metaProbe;
  }

  return Number.POSITIVE_INFINITY;
}

/**
 * Priority Level 1: user priorityBias comparison (higher is preferred).
 */
function comparePriorityBias(
  a: DispatchCandidate,
  b: DispatchCandidate,
): number {
  const biasA = a.priorityBias ?? 0;
  const biasB = b.priorityBias ?? 0;
  return biasB - biasA;
}

/**
 * Priority Level 2: explicit remaining quota comparison.
 * Candidates with known remaining quota > 0 are preferred over those without.
 */
function compareRemainingQuota(
  a: DispatchCandidate,
  b: DispatchCandidate,
): number {
  const hasQuotaA =
    typeof a.quota.remaining === "number" && a.quota.remaining > 0;
  const hasQuotaB =
    typeof b.quota.remaining === "number" && b.quota.remaining > 0;
  if (hasQuotaA !== hasQuotaB) {
    return hasQuotaA ? -1 : 1;
  }
  return 0;
}

/**
 * Priority Level 3: costTier comparison (lower cost is preferred).
 */
function compareCostTier(a: DispatchCandidate, b: DispatchCandidate): number {
  const defaultTierA: CostTier = a.roleHint === "main" ? "premium" : "standard";
  const defaultTierB: CostTier = b.roleHint === "main" ? "premium" : "standard";
  const rankA = COST_TIER_RANK[a.costTier ?? defaultTierA];
  const rankB = COST_TIER_RANK[b.costTier ?? defaultTierB];
  return rankA - rankB;
}

/**
 * Priority Level 4: probe latency comparison (lower latency is preferred).
 */
function compareLatency(
  a: DispatchCandidate,
  b: DispatchCandidate,
  options?: {
    getProbeLatency?: (candidate: DispatchCandidate) => number | undefined;
    probeLatencies?: Readonly<Record<string, number>>;
  },
): number {
  const latA = resolveCandidateLatency(a, options);
  const latB = resolveCandidateLatency(b, options);
  if (latA !== latB) {
    return latA - latB;
  }
  return 0;
}

/**
 * Builds candidate comparator function executing all 5 sorting levels:
 * 1. user priorityBias (higher first)
 * 2. explicit remaining quota (has quota first)
 * 3. costTier (lower cost first)
 * 4. probe latency (lower latency first)
 * 5. stable tie-breaker by candidate id
 */
export function createCandidateComparator(options?: {
  getProbeLatency?: (candidate: DispatchCandidate) => number | undefined;
  probeLatencies?: Readonly<Record<string, number>>;
}): (a: DispatchCandidate, b: DispatchCandidate) => number {
  return (a: DispatchCandidate, b: DispatchCandidate): number => {
    const biasDiff = comparePriorityBias(a, b);
    if (biasDiff !== 0) return biasDiff;

    const quotaDiff = compareRemainingQuota(a, b);
    if (quotaDiff !== 0) return quotaDiff;

    const costDiff = compareCostTier(a, b);
    if (costDiff !== 0) return costDiff;

    const latDiff = compareLatency(a, b, options);
    if (latDiff !== 0) return latDiff;

    return a.id.localeCompare(b.id);
  };
}

/**
 * Sorts eligible candidates according to the multi-level dispatch priority specification.
 */
export function sortCandidates(
  candidates: readonly DispatchCandidate[],
  options?: {
    getProbeLatency?: (candidate: DispatchCandidate) => number | undefined;
    probeLatencies?: Readonly<Record<string, number>>;
  },
): DispatchCandidate[] {
  const copy = [...candidates];
  const comparator = createCandidateComparator(options);
  copy.sort(comparator);
  return copy;
}

/**
 * Analyzes candidate pool to build diagnostic metrics for structured failure explanation.
 */
function inspectPoolDiagnostics(
  allCandidates: readonly DispatchCandidate[],
  capability: string,
  now: number,
): NoCandidateDiagnostics {
  let matchedCapabilityCount = 0;
  let exhaustedCount = 0;
  let coolingDownCount = 0;
  let downCount = 0;
  let hasMainAgentWithCapability = false;

  for (const candidate of allCandidates) {
    if (candidate.capabilities.includes(capability)) {
      matchedCapabilityCount++;
      if (candidate.roleHint === "main") {
        hasMainAgentWithCapability = true;
      }
      if (candidate.health === "down") {
        downCount++;
      } else if (!isQuotaAvailable(candidate, now)) {
        exhaustedCount++;
      } else if (!isCooldownPassed(candidate, now)) {
        coolingDownCount++;
      }
    }
  }

  return {
    totalRegistered: allCandidates.length,
    matchedCapabilityCount,
    exhaustedCount,
    coolingDownCount,
    downCount,
    hasMainAgentWithCapability,
  };
}

/**
 * Resolves the structured explanation and recommendation when no candidates are available.
 */
function buildNoCandidateExplanation(
  diagnostics: NoCandidateDiagnostics,
  capability: string,
  knownSecrets?: readonly string[],
): NoCandidateExplanation {
  let reason: NoCandidateReason;
  let rawMessage: string;
  let rawSuggestion: string;

  if (diagnostics.matchedCapabilityCount === 0) {
    if (isMediaCapability(capability)) {
      reason = "unsupported_capability";
      rawMessage = `主 Agent 不得直接执行生图或视频任务，且未配置具备能力 "${capability}" 的专用子 Agent`;
      rawSuggestion =
        "建议在模型设置中添加具备生图或视频能力的专用子 Agent（如 comfy、openai-compat 等）";
    } else {
      reason = "missing_credentials";
      rawMessage = `未找到支持能力 "${capability}" 的候选通道，缺少相关配置或凭据`;
      rawSuggestion = "建议在设置中配置相关模型 API Key 或启用对应本地模型";
    }
  } else if (
    isMediaCapability(capability) &&
    diagnostics.hasMainAgentWithCapability &&
    diagnostics.matchedCapabilityCount === 1
  ) {
    reason = "unsupported_capability";
    rawMessage =
      "主 Agent 不得自己硬扛生图或视频任务，请配置具备对应能力的独立子 Agent 或生成模型";
    rawSuggestion =
      "建议添加支持该媒体能力的专用子 Agent 通道，主 Agent 仅负责规划与决策";
  } else if (diagnostics.exhaustedCount >= diagnostics.matchedCapabilityCount) {
    reason = "all_exhausted";
    rawMessage = `所有支持能力 "${capability}" 的候选通道额度均已耗尽`;
    rawSuggestion = "建议补充通道额度、等待重置时间到期或更换备用模型";
  } else if (
    diagnostics.coolingDownCount >= diagnostics.matchedCapabilityCount
  ) {
    reason = "cooling_down";
    rawMessage = `所有支持能力 "${capability}" 的候选通道均处于冷却中`;
    rawSuggestion = "通道暂时受限或遇频控，请稍后重试或切换备用通道";
  } else if (diagnostics.downCount >= diagnostics.matchedCapabilityCount) {
    reason = "all_down";
    rawMessage = `所有支持能力 "${capability}" 的候选通道均处于不可用状态 (health: down)`;
    rawSuggestion = "请检查后端服务连通性、网络代理或重新校验 API 凭据";
  } else {
    reason = "missing_credentials";
    rawMessage = `无可用候选通道可执行能力 "${capability}"`;
    rawSuggestion = "建议在设置中检查模型配置或添加新模型通道";
  }

  return {
    reason,
    message: sanitizeSecrets(rawMessage, knownSecrets),
    suggestion: sanitizeSecrets(rawSuggestion, knownSecrets),
    diagnostics,
    missingCapability: sanitizeSecrets(capability, knownSecrets),
  };
}

/**
 * Pure function: generates structured diagnostic explanation when no candidate is available.
 * Never throws exceptions.
 */
export function explainNoCandidates(
  allCandidates: readonly DispatchCandidate[],
  capability: string,
  options?: { now?: number; knownSecrets?: readonly string[] },
): NoCandidateExplanation {
  const now = options?.now ?? Date.now();
  const diagnostics = inspectPoolDiagnostics(allCandidates, capability, now);
  return buildNoCandidateExplanation(
    diagnostics,
    capability,
    options?.knownSecrets,
  );
}

/**
 * Formats standard non-blocking notification copy for fallback transitions.
 * Format: "某某额度用尽，已改走某某。"
 */
export function formatFallbackNotification(
  failedCandidateId: string,
  nextCandidateId?: string,
  options?: { knownSecrets?: readonly string[] },
): string {
  const safeFailed = sanitizeSecrets(failedCandidateId, options?.knownSecrets);
  if (nextCandidateId) {
    const safeNext = sanitizeSecrets(nextCandidateId, options?.knownSecrets);
    return `${safeFailed} 额度用尽，已改走 ${safeNext}。`;
  }
  return `${safeFailed} 额度用尽，无可用备选通道。`;
}

/**
 * Evaluates budget gate for a selected candidate and request.
 */
function evaluateCandidateBudget(
  candidate: DispatchCandidate,
  request: DispatchRequest,
): BudgetGateDecision {
  const gateInput: BudgetGateInput = {
    budgetClass: request.budgetClass ?? "free",
    budget: request.budget ?? { remaining: 0 },
    estimatedCost: request.estimatedCost,
    costTier: candidate.costTier,
    confirmed: request.confirmed,
  };
  return evaluateBudgetGate(gateInput);
}

/**
 * Core pure function: selects the next candidate according to filtering, sorting, and budget evaluation.
 */
export function selectCandidate(
  candidates: readonly DispatchCandidate[],
  request: DispatchRequest,
  options?: DispatcherOptions,
): DispatchResult {
  const now = request.now ?? options?.now?.() ?? Date.now();
  const knownSecrets = options?.knownSecrets;

  const eligible = filterEligibleCandidates(candidates, request.capability, {
    now,
    excludeCandidateIds: request.excludeCandidateIds,
    knownSecrets,
  });

  if (eligible.length === 0) {
    const explanation = explainNoCandidates(candidates, request.capability, {
      now,
      knownSecrets,
    });
    return {
      status: "no_candidate",
      candidatesChain: [],
      explanation,
      message: explanation.message,
    };
  }

  const sorted = sortCandidates(eligible, {
    getProbeLatency: options?.getProbeLatency,
    probeLatencies: request.probeLatencies,
  });

  const topCandidate = sorted[0];
  const budgetClass = request.budgetClass ?? "free";

  if (budgetClass === "paid") {
    const budgetDecision = evaluateCandidateBudget(topCandidate, request);
    if (budgetDecision.needsConfirmation) {
      const safeId = sanitizeSecrets(topCandidate.id, knownSecrets);
      return {
        status: "needs_confirmation",
        candidate: sanitizeCandidate(topCandidate, knownSecrets),
        candidatesChain: sorted.map((c) =>
          sanitizeCandidate(c, knownSecrets),
        ),
        budgetDecision,
        message: sanitizeSecrets(
          `超出预算限制，派发至 ${safeId} 需要 L2 确认后执行`,
          knownSecrets,
        ),
      };
    }
    return {
      status: "selected",
      candidate: sanitizeCandidate(topCandidate, knownSecrets),
      candidatesChain: sorted.map((c) => sanitizeCandidate(c, knownSecrets)),
      budgetDecision,
    };
  }

  return {
    status: "selected",
    candidate: sanitizeCandidate(topCandidate, knownSecrets),
    candidatesChain: sorted.map((c) => sanitizeCandidate(c, knownSecrets)),
  };
}

/**
 * Core pure function: handles candidate failure or 429 rate limit,
 * records normalized quota signal into the registry, and selects the next fallback candidate.
 */
export function handleDispatchFallback(
  registry: AgentRegistry,
  failedCandidateId: string,
  error: unknown,
  request: DispatchRequest,
  options?: DispatcherOptions,
): FallbackResult {
  const now = request.now ?? options?.now?.() ?? Date.now();
  const knownSecrets = options?.knownSecrets;

  const signal = classifyQuotaSignal(error, {
    knownSecrets,
    now,
  });

  registry.recordSignal(failedCandidateId, signal, { now });

  const currentExcludes = request.excludeCandidateIds ?? [];
  const updatedExcludes = currentExcludes.includes(failedCandidateId)
    ? currentExcludes
    : [...currentExcludes, failedCandidateId];

  const pool = registry.getAll({ now });
  const decision = selectCandidate(
    pool,
    {
      ...request,
      excludeCandidateIds: updatedExcludes,
      now,
    },
    options,
  );

  const nextCandidateId = decision.candidate?.id;
  const notification = formatFallbackNotification(
    failedCandidateId,
    nextCandidateId,
    { knownSecrets },
  );

  return {
    signal,
    notification,
    previousCandidateId: sanitizeSecrets(failedCandidateId, knownSecrets),
    decision,
    nextCandidate: decision.candidate,
  };
}

/**
 * Dispatcher: Stateful, table-driven coordinator wrapping an AgentRegistry.
 */
export class Dispatcher {
  private readonly registry: AgentRegistry;
  private readonly nowProvider: () => number;
  private readonly knownSecrets: readonly string[];
  private readonly getProbeLatency?: (
    candidate: DispatchCandidate,
  ) => number | undefined;

  constructor(options?: DispatcherOptions & { registry?: AgentRegistry }) {
    this.registry =
      options?.registry ??
      new AgentRegistry([], {
        now: options?.now,
        knownSecrets: options?.knownSecrets,
      });
    this.nowProvider = options?.now ?? (() => Date.now());
    this.knownSecrets = options?.knownSecrets ?? [];
    this.getProbeLatency = options?.getProbeLatency;
  }

  /**
   * Reference to the underlying AgentRegistry.
   */
  public getRegistry(): AgentRegistry {
    return this.registry;
  }

  /**
   * Current time provider.
   */
  public getNow(overrideNow?: number): number {
    return overrideNow ?? this.nowProvider();
  }

  /**
   * Selects the next eligible candidate according to dispatch criteria and budget evaluation.
   */
  public selectNext(request: DispatchRequest): DispatchResult {
    const now = this.getNow(request.now);
    const pool = this.registry.getAll({ now });
    return selectCandidate(
      pool,
      { ...request, now },
      {
        now: () => now,
        knownSecrets: this.knownSecrets,
        getProbeLatency: this.getProbeLatency,
      },
    );
  }

  /**
   * Handles dispatch failure or 429 response:
   * Classifies error, updates registry state, selects next candidate, and produces notification.
   */
  public handleFailure(
    failedCandidateId: string,
    error: unknown,
    request: DispatchRequest,
  ): FallbackResult {
    const now = this.getNow(request.now);
    return handleDispatchFallback(
      this.registry,
      failedCandidateId,
      error,
      { ...request, now },
      {
        now: () => now,
        knownSecrets: this.knownSecrets,
        getProbeLatency: this.getProbeLatency,
      },
    );
  }

  /**
   * Formats a safe debug string scrubbed of any credentials or secrets.
   */
  public dumpSafeDebug(): string {
    return this.registry.dumpSafeDebug();
  }
}

/**
 * Factory helper: creates a Dispatcher instance.
 */
export function createDispatcher(
  options?: DispatcherOptions & { registry?: AgentRegistry },
): Dispatcher {
  return new Dispatcher(options);
}

export default Dispatcher;
