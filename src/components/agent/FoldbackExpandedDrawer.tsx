import type React from "react";
import type { SubagentFoldbackResult } from "../../features/agent/index.ts";

export const FoldbackExpandedDrawer: React.FC<{
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
        {stats
          ? `：已安全归档 ${stats.intermediateTurns} 轮内部工具调用与分析步骤。`
          : "。"}
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
            <span>
              原始文本体量: ~{stats.rawTokensEstimate.toLocaleString()} tokens
            </span>
          )}
        </div>
      )}
    </div>
  );
};
