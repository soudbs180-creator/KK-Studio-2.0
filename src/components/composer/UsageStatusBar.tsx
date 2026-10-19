import React from "react";
import type { CreationDraft, ReasoningEffort } from "../../features/creation/model.ts";
import { parseModelWindow } from "../../features/models/modelCatalogWindow.ts";

export interface UsageStatusBarProps {
  currentTokens?: number;
  maxTokens?: number;
  cachedTokens?: number;
  cachedPercentage?: number;
  outputTps?: number;
  reasoningEffort?: ReasoningEffort;
  onReasoningEffortChange?: (effort: ReasoningEffort) => void;
  className?: string;
  draft?: CreationDraft;
}

export function estimateContextTokens(
  text = "",
  attachmentCount = 0,
  baseOverhead = 0,
): number {
  const clean = text || "";
  let asciiCount = 0;
  let cjkCount = 0;
  let otherCount = 0;

  for (const ch of clean) {
    const code = ch.codePointAt(0) ?? 0;
    if (code <= 127) {
      asciiCount++;
    } else if (
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3400 && code <= 0x4dbf) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0x3040 && code <= 0x30ff) ||
      (code >= 0xac00 && code <= 0xd7af)
    ) {
      cjkCount++;
    } else {
      otherCount++;
    }
  }

  const textTokens =
    Math.ceil(asciiCount / 4) +
    Math.ceil(cjkCount * 1.0) +
    Math.ceil(otherCount * 0.5);
  const attachmentTokens = Math.max(0, attachmentCount) * 1024;
  return textTokens + attachmentTokens + Math.max(0, baseOverhead);
}

export function resolveMaxTokens(modelId?: string): number {
  if (!modelId || !modelId.trim()) return 128_000;
  const parsed = parseModelWindow(modelId);
  if (parsed.contextWindow && parsed.contextWindow > 0) {
    return parsed.contextWindow;
  }

  const slug = (parsed.slug || modelId).toLowerCase();
  if (/(gemini)/i.test(slug)) return 1_000_000;
  if (/(claude)/i.test(slug)) return 200_000;
  if (/(deepseek)/i.test(slug)) return 64_000;
  if (/(gpt-4|o[134]|qwen|llama)/i.test(slug)) return 128_000;

  return 128_000;
}

export function formatTokenCount(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function formatUsageProgress(
  currentTokens: number,
  maxTokens: number,
): {
  percentage: number;
  label: string;
  status: "normal" | "warning" | "danger";
} {
  const safeMax = Math.max(1, maxTokens);
  const rawPct = (currentTokens / safeMax) * 100;
  const percentage = Math.min(100, Math.max(0, Math.round(rawPct)));
  const label = `${formatTokenCount(currentTokens)} / ${formatTokenCount(safeMax)} (${percentage}%)`;

  let status: "normal" | "warning" | "danger" = "normal";
  if (rawPct >= 90) {
    status = "danger";
  } else if (rawPct >= 70) {
    status = "warning";
  }

  return { percentage, label, status };
}

export function isReasoningModel(modelId?: string): boolean {
  if (!modelId || !modelId.trim()) return false;
  const clean = modelId.trim();
  return (
    /(?:^|[/\-_:.])(?:o[134]|r1|qwq)(?:[/\-_:.]|$)/i.test(clean) ||
    /(?:reasoner|thinking|claude-3-7)/i.test(clean)
  );
}

export default function UsageStatusBar({
  currentTokens: propCurrentTokens,
  maxTokens: propMaxTokens,
  cachedTokens,
  cachedPercentage: propCachedPercentage,
  outputTps,
  reasoningEffort: propReasoningEffort,
  onReasoningEffortChange,
  className = "",
  draft,
}: UsageStatusBarProps): React.ReactElement {
  const effectiveModel = draft?.model || draft?.modelSelection?.model || "";
  const effectiveMaxTokens =
    propMaxTokens !== undefined ? propMaxTokens : resolveMaxTokens(effectiveModel);

  const effectiveCurrentTokens =
    propCurrentTokens !== undefined
      ? propCurrentTokens
      : estimateContextTokens(draft?.prompt ?? "", draft?.attachments?.length ?? 0);

  const progress = formatUsageProgress(effectiveCurrentTokens, effectiveMaxTokens);

  let cachedPct = 0;
  if (propCachedPercentage !== undefined) {
    cachedPct = Math.min(100, Math.max(0, Math.round(propCachedPercentage)));
  } else if (cachedTokens !== undefined && effectiveCurrentTokens > 0) {
    cachedPct = Math.min(100, Math.max(0, Math.round((cachedTokens / effectiveCurrentTokens) * 100)));
  }

  const isCached = cachedPct > 0;
  const tpsText =
    outputTps !== undefined && outputTps > 0
      ? `${Math.round(outputTps)} tps`
      : "-- tps";

  const supportsReasoning = isReasoningModel(effectiveModel) || !effectiveModel;
  const activeEffort =
    propReasoningEffort || draft?.reasoningEffort || "medium";

  return (
    <div
      className={`composer-usage-status-bar ${className}`.trim()}
      role="status"
      aria-label="创作上下文用量与推理状态"
    >
      <div className="composer-gauge-group">
        <div
          className={`composer-token-progress-bar status-${progress.status}`}
          role="progressbar"
          aria-valuenow={progress.percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          title={`上下文已用 ${progress.label}`}
        >
          <div
            className="composer-token-progress-fill"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
        <span className="composer-token-text">{progress.label}</span>
      </div>

      <div className="composer-metrics-group">
        <span
          className={`composer-cache-badge ${isCached ? "is-cached" : "is-idle"}`}
          title={isCached ? `提示词缓存命中率: ${cachedPct}%` : "未命中提示词缓存"}
        >
          ⚡ Cached ({cachedPct}%)
        </span>
        <span className="composer-tps-badge" title="生成速率">
          {tpsText}
        </span>
      </div>

      <div
        className={`composer-reasoning-selector ${supportsReasoning ? "" : "is-disabled"}`}
        role="group"
        aria-label="推理思考深度"
      >
        <span className="composer-reasoning-label" title="推理思考深度">
          思考:
        </span>
        {(["low", "medium", "high"] as const).map((effort) => {
          const isActive = activeEffort === effort;
          const title = supportsReasoning
            ? `设置推理深度为 ${effort}`
            : "当前模型不支持调整推理深度";
          return (
            <button
              key={effort}
              type="button"
              className={`composer-reasoning-btn ${isActive ? "is-active" : ""}`}
              aria-pressed={isActive}
              disabled={!supportsReasoning}
              title={title}
              onClick={() => onReasoningEffortChange?.(effort)}
            >
              {effort.charAt(0).toUpperCase() + effort.slice(1)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
