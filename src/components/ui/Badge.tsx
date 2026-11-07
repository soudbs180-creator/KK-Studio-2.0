import React, { type ReactNode } from "react";
import UiIcon from "../UiIcon";

export type BadgeVariant =
  "default" | "neutral" | "success" | "warning" | "danger" | "accent";

export type DataTagCategory =
  "character" | "scene" | "costume" | "prop" | "custom";

export type BadgeHeight = "16px" | "20px" | "24px";

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  category?: DataTagCategory;
  height?: BadgeHeight;
  dot?: boolean;
  loading?: boolean;
  onRemove?: () => void;
  className?: string;
}

export function Badge({
  children,
  variant = "default",
  category,
  height = "20px",
  dot = false,
  loading = false,
  onRemove,
  className = "",
}: BadgeProps) {
  const heightClassMap: Record<BadgeHeight, string> = {
    "16px": "kk-badge--16",
    "20px": "kk-badge--20",
    "24px": "kk-badge--24",
  };

  const classNames = [
    "kk-badge",
    heightClassMap[height],
    category ? `kk-tag--${category}` : `kk-badge--${variant}`,
    dot ? "kk-badge--with-dot" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classNames}>
      {dot && <span className="kk-badge__dot" aria-hidden="true" />}
      {loading && (
        <span className="kk-badge__spinner" aria-hidden="true">
          <UiIcon name="loading" size={12} />
        </span>
      )}
      <span className="kk-badge__content">{children}</span>
      {onRemove && (
        <button
          type="button"
          className="kk-badge__remove"
          aria-label="移除标签"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <UiIcon name="close" size={10} />
        </button>
      )}
    </span>
  );
}

export default Badge;
