import React, { type ReactNode } from "react";

export interface SettingsCardGroupProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  id?: string;
}

export interface SettingsCardRowProps {
  label?: string;
  title?: string;
  description?: string;
  helper?: string;
  control?: ReactNode;
  children?: ReactNode;
  danger?: boolean;
  badge?: ReactNode;
  className?: string;
  id?: string;
  onClick?: () => void;
}

export function SettingsCardGroup({
  title,
  description,
  children,
  className = "",
  id,
}: SettingsCardGroupProps) {
  return (
    <section
      id={id}
      className={`settings-card-group ${className}`.trim()}
      data-testid="settings-card-group"
    >
      {(title || description) && (
        <div className="settings-card-group-header">
          {title && <h3 className="settings-card-group-title">{title}</h3>}
          {description && (
            <p className="settings-card-group-desc">{description}</p>
          )}
        </div>
      )}
      <div className="settings-card-group-card">{children}</div>
    </section>
  );
}

export function SettingsCardRow({
  label,
  title,
  description,
  helper,
  control,
  children,
  danger = false,
  badge,
  className = "",
  id,
  onClick,
}: SettingsCardRowProps) {
  const displayLabel = label ?? title ?? "";
  const displayDesc = description ?? helper;
  const displayControl = control ?? children;
  const isClickable = Boolean(onClick);

  return (
    <div
      id={id}
      className={`settings-card-row ${danger ? "is-danger" : ""} ${isClickable ? "is-clickable" : ""} ${className}`.trim()}
      data-testid="settings-card-row"
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      <div className="settings-card-row-content">
        <div className="settings-card-row-label-row">
          <span className="settings-card-row-label">{displayLabel}</span>
          {badge && <span className="settings-card-row-badge">{badge}</span>}
        </div>
        {displayDesc && <p className="settings-card-row-desc">{displayDesc}</p>}
      </div>
      {displayControl && (
        <div className="settings-card-row-control">{displayControl}</div>
      )}
    </div>
  );
}
