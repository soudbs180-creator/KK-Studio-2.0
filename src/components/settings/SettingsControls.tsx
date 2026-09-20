import type { ReactNode } from "react";

interface SettingRowProps {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}

export function SettingRow({
  id,
  title,
  description,
  children,
  className = "",
}: SettingRowProps) {
  return (
    <div className={`settings-row ${className}`}>
      <div className="settings-row-copy">
        <h3 id={`${id}-label`}>{title}</h3>
        <p id={`${id}-description`}>{description}</p>
      </div>
      <div className="settings-row-control">{children}</div>
    </div>
  );
}

interface ToggleProps {
  id: string;
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabledReason?: string;
  hint?: string;
}

export function SettingsToggle({
  id,
  checked,
  onChange,
  disabledReason,
  hint,
}: ToggleProps) {
  const explanation = disabledReason || hint;
  return (
    <span className="settings-control-wrap" title={explanation}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-description${explanation ? ` ${id}-reason` : ""}`}
        disabled={Boolean(disabledReason)}
        className="settings-toggle"
        onClick={() => onChange?.(!checked)}
      >
        <span />
      </button>
      {explanation && (
        <span className="settings-visually-hidden" id={`${id}-reason`}>
          {explanation}
        </span>
      )}
    </span>
  );
}
