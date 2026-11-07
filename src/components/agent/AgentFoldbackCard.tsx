import React, { useState, useId } from "react";
import type { SubagentFoldbackResult } from "../../features/agent/index.ts";
import {
  FoldbackStatusPill,
  FoldbackArtifactList,
} from "./FoldbackSummaryParts";
import { FoldbackExpandedDrawer } from "./FoldbackExpandedDrawer";

export interface AgentFoldbackCardProps {
  result: SubagentFoldbackResult;
  isExpanded?: boolean;
  defaultExpanded?: boolean;
  onToggleExpand?: (expanded: boolean) => void;
  onArtifactClick?: (artifactRef: string) => void;
  className?: string;
}

const CARD_CONTAINER_STYLE: React.CSSProperties = {
  border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))",
  borderRadius: "8px",
  background: "var(--bg-surface-elevated, rgba(30, 32, 40, 0.75))",
  padding: "12px 14px",
  margin: "8px 0",
  fontSize: "13px",
  lineHeight: "1.5",
  color: "var(--text-primary, #e2e8f0)",
  backdropFilter: "blur(8px)",
  boxSizing: "border-box",
  width: "100%",
  maxWidth: "100%",
};

export const AgentFoldbackCard: React.FC<AgentFoldbackCardProps> = ({
  result,
  isExpanded: controlledExpanded,
  defaultExpanded = false,
  onToggleExpand,
  onArtifactClick,
  className = "",
}) => {
  const [internalExpanded, setInternalExpanded] =
    useState<boolean>(defaultExpanded);
  const contentId = useId();

  const isExpanded =
    controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  const handleToggle = () => {
    const nextState = !isExpanded;
    if (controlledExpanded === undefined) {
      setInternalExpanded(nextState);
    }
    onToggleExpand?.(nextState);
  };

  const stats = result.executionStats;
  const hasArtifacts =
    Array.isArray(result.artifactRefs) && result.artifactRefs.length > 0;

  return (
    <div
      className={`agent-foldback-card ${className}`.trim()}
      data-testid="agent-foldback-card"
      data-status={result.status}
      data-task-id={result.taskId}
      data-subagent-role={result.subagentRole}
      role="region"
      aria-label={`子任务执行简报: ${result.subagentRole}`}
      style={CARD_CONTAINER_STYLE}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <FoldbackStatusPill status={result.status} />
          <span
            data-testid="foldback-role-badge"
            style={{
              padding: "2px 8px",
              borderRadius: "4px",
              background: "rgba(99, 102, 241, 0.15)",
              color: "#818cf8",
              fontSize: "11px",
              fontWeight: 500,
              border: "1px solid rgba(99, 102, 241, 0.3)",
            }}
          >
            {result.subagentRole}
          </span>
          <span
            data-testid="foldback-task-id"
            style={{
              fontSize: "11px",
              color: "var(--text-tertiary, #94a3b8)",
              fontFamily: "monospace",
            }}
          >
            #{result.taskId}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {stats?.tokensSaved !== undefined && stats.tokensSaved > 0 && (
            <span
              data-testid="foldback-tokens-saved"
              title="子任务独立沙箱执行，避免原始长文本及工具调用注入主上下文"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "11px",
                color: "#10b981",
                background: "rgba(16, 185, 129, 0.08)",
                padding: "2px 6px",
                borderRadius: "4px",
                border: "1px solid rgba(16, 185, 129, 0.2)",
              }}
            >
              🛡️ 省略 ~{stats.tokensSaved.toLocaleString()} tokens
            </span>
          )}

          {result.tokensConsumed !== undefined && (
            <span
              data-testid="foldback-tokens-consumed"
              style={{
                fontSize: "11px",
                color: "var(--text-tertiary, #94a3b8)",
              }}
            >
              消耗 {result.tokensConsumed.toLocaleString()}
            </span>
          )}

          <button
            type="button"
            data-testid="foldback-expand-toggle"
            aria-expanded={isExpanded}
            aria-controls={contentId}
            onClick={handleToggle}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              background: "transparent",
              border:
                "1px solid var(--border-subtle, rgba(255, 255, 255, 0.15))",
              borderRadius: "4px",
              color: "var(--text-secondary, #cbd5e1)",
              padding: "2px 8px",
              fontSize: "11px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {isExpanded ? "收起详情 ▲" : "查看详情 ▼"}
          </button>
        </div>
      </div>

      <div
        data-testid="foldback-executive-summary"
        style={{
          marginTop: "10px",
          color: "var(--text-primary, #f1f5f9)",
          fontSize: "13px",
          wordBreak: "break-word",
        }}
      >
        {result.executiveSummary}
      </div>

      {hasArtifacts && (
        <FoldbackArtifactList
          artifacts={result.artifactRefs!}
          onArtifactClick={onArtifactClick}
        />
      )}

      <div
        className={`kk-grid-collapse${isExpanded ? " is-open" : ""}`}
        aria-hidden={!isExpanded}
      >
        <div>
          <FoldbackExpandedDrawer contentId={contentId} result={result} />
        </div>
      </div>
    </div>
  );
};

export default AgentFoldbackCard;
