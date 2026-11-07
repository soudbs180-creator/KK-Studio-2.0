import type React from "react";
import type { SubagentFoldbackResult } from "../../features/agent/index.ts";

interface StatusStyleConfig {
  label: string;
  className: string;
  bg: string;
  color: string;
  border: string;
}

const STATUS_CONFIGS: Record<
  SubagentFoldbackResult["status"],
  StatusStyleConfig
> = {
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

export const FoldbackStatusPill: React.FC<{
  status: SubagentFoldbackResult["status"];
}> = ({ status }) => {
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

export const FoldbackArtifactList: React.FC<{
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
      <span
        style={{ fontSize: "11px", color: "var(--text-tertiary, #94a3b8)" }}
      >
        产物:
      </span>
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
