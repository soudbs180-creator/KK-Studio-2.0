import type React from "react";
import type { SubagentFoldbackResult } from "../../features/agent/index.ts";

interface StatusStyleConfig {
  label: string;
  className: string;
}

const STATUS_CONFIGS: Record<
  SubagentFoldbackResult["status"],
  StatusStyleConfig
> = {
  success: {
    label: "已完成",
    className: "foldback-status-success",
  },
  partial: {
    label: "部分完成",
    className: "foldback-status-partial",
  },
  failed: {
    label: "失败",
    className: "foldback-status-failed",
  },
};

export const FoldbackStatusPill: React.FC<{
  status: SubagentFoldbackResult["status"];
}> = ({ status }) => {
  const config = STATUS_CONFIGS[status] || STATUS_CONFIGS.failed;
  return (
    <span
      data-testid="foldback-status-badge"
      className={`agent-foldback-status-pill ${config.className}`}
    >
      <span className="agent-foldback-status-dot" />
      {config.label}
    </span>
  );
};

export const FoldbackArtifactList: React.FC<{
  artifacts: string[];
  onArtifactClick?: (ref: string) => void;
}> = ({ artifacts, onArtifactClick }) => {
  return (
    <div
      data-testid="foldback-artifact-list"
      className="agent-foldback-artifact-list"
    >
      <span className="agent-foldback-artifact-label">产物:</span>
      {artifacts.map((ref, idx) => (
        <button
          key={`${ref}-${idx}`}
          type="button"
          data-testid="foldback-artifact-pill"
          className={`agent-foldback-artifact-pill${onArtifactClick ? " is-clickable" : ""}`}
          onClick={() => onArtifactClick?.(ref)}
        >
          📄 {ref}
        </button>
      ))}
    </div>
  );
};
