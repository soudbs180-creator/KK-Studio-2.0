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
    >
      <div className="agent-foldback-header">
        <div className="agent-foldback-meta-group">
          <FoldbackStatusPill status={result.status} />
          <span
            data-testid="foldback-role-badge"
            className="agent-foldback-role-badge"
          >
            {result.subagentRole}
          </span>
          <span
            data-testid="foldback-task-id"
            className="agent-foldback-task-id"
          >
            #{result.taskId}
          </span>
        </div>

        <div className="agent-foldback-actions">
          {stats?.tokensSaved !== undefined && stats.tokensSaved > 0 && (
            <span
              data-testid="foldback-tokens-saved"
              className="agent-foldback-tokens-saved"
              title="子任务独立沙箱执行，避免原始长文本及工具调用注入主上下文"
            >
              🛡️ 省略 ~{stats.tokensSaved.toLocaleString()} tokens
            </span>
          )}

          {result.tokensConsumed !== undefined && (
            <span
              data-testid="foldback-tokens-consumed"
              className="agent-foldback-tokens-consumed"
            >
              消耗 {result.tokensConsumed.toLocaleString()}
            </span>
          )}

          <button
            type="button"
            data-testid="foldback-expand-toggle"
            className="agent-foldback-expand-toggle"
            aria-expanded={isExpanded}
            aria-controls={contentId}
            onClick={handleToggle}
          >
            {isExpanded ? "收起详情 ▲" : "查看详情 ▼"}
          </button>
        </div>
      </div>

      <div
        data-testid="foldback-executive-summary"
        className="agent-foldback-executive-summary"
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
