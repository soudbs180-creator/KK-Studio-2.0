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
      className="agent-foldback-expanded-content"
    >
      <div className="agent-foldback-isolation-banner">
        🔒 <strong>沙箱上下文隔离保护</strong>
        {stats
          ? `：已安全归档 ${stats.intermediateTurns} 轮内部工具调用与分析步骤。`
          : "。"}
      </div>

      {hasStructuredData && (
        <div className="agent-foldback-structured-block">
          <div className="agent-foldback-structured-title">结构化数据产物:</div>
          <pre
            data-testid="foldback-structured-data"
            className="agent-foldback-structured-pre"
          >
            {JSON.stringify(result.structuredData, null, 2)}
          </pre>
        </div>
      )}

      {result.error && (
        <div
          data-testid="foldback-error-box"
          className="agent-foldback-error-box"
        >
          ⚠️ <strong>异常原因:</strong> {result.error}
        </div>
      )}

      {stats && (
        <div
          data-testid="foldback-execution-stats"
          className="agent-foldback-execution-stats"
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
