/**
 * Subagent Foldback Contract
 *
 * Defines the contract for subagent execution results and task briefs,
 * ensuring context anti-pollution by strictly structuring the interface
 * between primary agents and isolated child subagents.
 */

export type SubagentStatus = "success" | "partial" | "failed";

export interface SubagentFoldbackResult {
  taskId: string;
  subagentRole: string;
  status: SubagentStatus;
  executiveSummary: string; // Compact summary for main context (<= 300 words)
  structuredData?: Record<string, unknown>;
  artifactRefs?: string[];
  tokensConsumed?: number;
  /**
   * Execution metadata (isolated from main prompt context)
   */
  executionStats?: {
    durationMs: number;
    intermediateTurns: number;
    rawTokensEstimate?: number;
    tokensSaved?: number;
  };
  error?: string;
}

export type SubagentTaskType =
  | "scrape"
  | "deep_analysis"
  | "local_image_edit"
  | "code_verify"
  | (string & {});

export interface SubagentTaskBrief {
  taskId: string;
  taskType: SubagentTaskType;
  subagentRole: string;
  goal: string;
  constraints?: readonly string[];
  inputs?: Record<string, unknown>;
  expectedSchema?: Record<string, unknown>;
  timeoutMs?: number;
  maxTurns?: number;
  allowedTools?: readonly string[];
}

export const MAX_EXECUTIVE_SUMMARY_WORDS = 300;
export const MAX_EXECUTIVE_SUMMARY_CHARS = 1500;
export const SUMMARY_TRUNCATION_SUFFIX = " ... [summary truncated for context safety]";

/**
 * Truncates an executive summary to a character and word limit to guarantee context anti-pollution.
 * Enforces a hard character ceiling before word boundary truncation to prevent unspaced payloads
 * (e.g. minified JSON or base64) from bypassing limits.
 */
export function truncateExecutiveSummary(
  summary: string,
  maxWords: number = MAX_EXECUTIVE_SUMMARY_WORDS,
  maxChars: number = MAX_EXECUTIVE_SUMMARY_CHARS,
): string {
  if (!summary || typeof summary !== "string") {
    return "";
  }
  let trimmed = summary.trim();
  if (trimmed.length === 0) {
    return "";
  }
  const effectiveMaxChars = Math.max(0, maxChars);
  const effectiveMaxWords = Math.max(0, maxWords);

  // Enforce hard character ceiling first to prevent unspaced payload bypass
  if (trimmed.length > effectiveMaxChars) {
    trimmed = trimmed.slice(0, effectiveMaxChars) + SUMMARY_TRUNCATION_SUFFIX;
  }
  // Split on whitespace sequences for word boundary truncation
  const words = trimmed.split(/\s+/);
  if (words.length <= effectiveMaxWords) {
    return trimmed;
  }
  return words.slice(0, effectiveMaxWords).join(" ") + SUMMARY_TRUNCATION_SUFFIX;
}

/**
 * Validates whether an object conforms to the SubagentFoldbackResult interface.
 */
export function isSubagentFoldbackResult(
  value: unknown,
): value is SubagentFoldbackResult {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.taskId !== "string" || !candidate.taskId) return false;
  if (typeof candidate.subagentRole !== "string" || !candidate.subagentRole) return false;
  if (
    candidate.status !== "success" &&
    candidate.status !== "partial" &&
    candidate.status !== "failed"
  ) {
    return false;
  }
  if (typeof candidate.executiveSummary !== "string") return false;
  if (
    candidate.structuredData !== undefined &&
    (typeof candidate.structuredData !== "object" || candidate.structuredData === null)
  ) {
    return false;
  }
  if (
    candidate.artifactRefs !== undefined &&
    !Array.isArray(candidate.artifactRefs)
  ) {
    return false;
  }
  if (
    candidate.tokensConsumed !== undefined &&
    typeof candidate.tokensConsumed !== "number"
  ) {
    return false;
  }
  return true;
}

/**
 * Helper to construct a validated SubagentFoldbackResult.
 */
export function createFoldbackResult(params: {
  taskId: string;
  subagentRole: string;
  status: SubagentStatus;
  executiveSummary: string;
  structuredData?: Record<string, unknown>;
  artifactRefs?: string[];
  tokensConsumed?: number;
  executionStats?: SubagentFoldbackResult["executionStats"];
  error?: string;
}): SubagentFoldbackResult {
  return {
    taskId: params.taskId,
    subagentRole: params.subagentRole,
    status: params.status,
    executiveSummary: truncateExecutiveSummary(params.executiveSummary),
    ...(params.structuredData ? { structuredData: params.structuredData } : {}),
    ...(params.artifactRefs ? { artifactRefs: [...params.artifactRefs] } : {}),
    ...(params.tokensConsumed !== undefined ? { tokensConsumed: params.tokensConsumed } : {}),
    ...(params.executionStats ? { executionStats: { ...params.executionStats } } : {}),
    ...(params.error ? { error: params.error } : {}),
  };
}
