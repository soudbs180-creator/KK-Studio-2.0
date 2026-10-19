import React, { useState, useId } from "react";
import type { SubagentFoldbackResult } from "../../features/agent/delegation/foldbackContract.ts";

export interface AgentFoldbackCardProps {
  result: SubagentFoldbackResult;
  isExpanded?: boolean;
  defaultExpanded?: boolean;
  onToggleExpand?: (expanded: boolean) => void;
  onArtifactClick?: (artifactRef: string) => void;
  className?: string;
}

interface StatusStyleConfig {
  label: string;
  className: string;
  bg: string;
  color: string;
  border: string;
}

const STATUS_CONFIGS: Record<SubagentFoldbackResult["status"], StatusStyleConfig> = {
  success: {
    label: "已完成",
    className: "foldback-status-success",
    bg: "rgba(16, 185, 129, 0.12)",
    color: "#10b981",
    border: "rgba(16, 185, 129, 0.3)",
  },
  partial: {
    label: "部分完成",
    className: "foldback-status-partial",
    bg: "rgba(245, 158, 11, 0.12)",
    color: "#f59e0b",
    border: "rgba(245, 158, 11, 0.3)",
  },
  failed: {
    label: "失败",
    className: "foldback-status-failed",
    bg: "rgba(239, 68, 68, 0.12)",
    color: "#ef4444",
    border: "rgba(239, 68, 68, 0.3)",
  },
};

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

const FoldbackStatusPill: React.FC<{ status: SubagentFoldbackResult["status"] }> = ({ status }) => {
  const config = STATUS_CONFIGS[status] || STATUS_CONFIGS.failed;
  return (
    <span
      data-testid="foldback-status-badge"
      className={config.className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "2px 8px",
        borderRadius: "9999px",
        fontSize: "11px",
        fontWeight: 600,
        background: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: config.color,
        }}
      />
      {config.label}
    </span>
  );
};

const FoldbackArtifactList: React.FC<{
  artifacts: string[];
  onArtifactClick?: (ref: string) => void;
}> = ({ artifacts, onArtifactClick }) => {
  return (
    <div
      data-testid="foldback-artifact-list"
      style={{
        marginTop: "10px",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        flexWrap: "wrap",
      }}
    >
      <span style={{ fontSize: "11px", color: "var(--text-tertiary, #94a3b8)" }}>产物:</span>
      {artifacts.map((ref, idx) => (
        <button
          key={`${ref}-${idx}`}
          type="button"
          data-testid="foldback-artifact-pill"
          onClick={() => onArtifactClick?.(ref)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "2px 8px",
            borderRadius: "4px",
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            color: "#38bdf8",
            fontSize: "11px",
            cursor: onArtifactClick ? "pointer" : "default",
          }}
        >
          📄 {ref}
        </button>
      ))}
    </div>
  );
};

const FoldbackExpandedDrawer: React.FC<{
  contentId: string;
  result: SubagentFoldbackResult;
}> = ({ contentId, result }) => {
  const stats = result.executionStats;
  const hasStructuredData =
    result.structuredData && Object.keys(result.structuredData).length > 0;

  return (
    <div
      id={contentId}
      data-testid="foldback-expanded-content"
      style={{
        marginTop: "12px",
        paddingTop: "10px",
        borderTop: "1px dashed var(--border-subtle, rgba(255, 255, 255, 0.1))",
      }}
    >
      <div
        style={{
          padding: "6px 10px",
          borderRadius: "4px",
          background: "rgba(99, 102, 241, 0.08)",
          border: "1px solid rgba(99, 102, 241, 0.2)",
          fontSize: "11px",
          color: "#a5b4fc",
          marginBottom: "8px",
        }}
      >
        🔒 <strong>沙箱上下文隔离保护</strong>
        {stats ? `：已安全归档 ${stats.intermediateTurns} 轮内部工具调用与分析步骤。` : "。"}
      </div>

      {hasStructuredData && (
        <div style={{ marginTop: "8px" }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "var(--text-secondary, #cbd5e1)",
              marginBottom: "4px",
            }}
          >
            结构化数据产物:
          </div>
          <pre
            data-testid="foldback-structured-data"
            style={{
              margin: 0,
              padding: "8px 10px",
              borderRadius: "4px",
              background: "rgba(0, 0, 0, 0.3)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              fontSize: "11px",
              fontFamily: "monospace",
              overflowX: "auto",
              color: "#cbd5e1",
              maxHeight: "240px",
            }}
          >
            {JSON.stringify(result.structuredData, null, 2)}
          </pre>
        </div>
      )}

      {result.error && (
        <div
          data-testid="foldback-error-box"
          style={{
            marginTop: "8px",
            padding: "8px 10px",
            borderRadius: "4px",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#fca5a5",
            fontSize: "11px",
          }}
        >
          ⚠️ <strong>异常原因:</strong> {result.error}
        </div>
      )}

      {stats && (
        <div
          data-testid="foldback-execution-stats"
          style={{
            marginTop: "8px",
            display: "flex",
            gap: "16px",
            fontSize: "11px",
            color: "var(--text-tertiary, #94a3b8)",
          }}
        >
          <span>耗时: {stats.durationMs}ms</span>
          <span>执行轮次: {stats.intermediateTurns} 轮</span>
          {stats.rawTokensEstimate !== undefined && (
            <span>原始文本体量: ~{stats.rawTokensEstimate.toLocaleString()} tokens</span>
          )}
        </div>
      )}
    </div>
  );
};

export const AgentFoldbackCard: React.FC<AgentFoldbackCardProps> = ({
  result,
  isExpanded: controlledExpanded,
  defaultExpanded = false,
  onToggleExpand,
  onArtifactClick,
  className = "",
}) => {
  const [internalExpanded, setInternalExpanded] = useState<boolean>(defaultExpanded);
  const contentId = useId();

  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  const handleToggle = () => {
    const nextState = !isExpanded;
    if (controlledExpanded === undefined) {
      setInternalExpanded(nextState);
    }
    onToggleExpand?.(nextState);
  };

  const stats = result.executionStats;
  const hasArtifacts = Array.isArray(result.artifactRefs) && result.artifactRefs.length > 0;

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
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
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
              border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.15))",
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

      {isExpanded && <FoldbackExpandedDrawer contentId={contentId} result={result} />}
    </div>
  );
};

export default AgentFoldbackCard;
