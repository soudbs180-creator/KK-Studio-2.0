import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import UiIcon from "../UiIcon";

const LONG_SETTINGS_DESCRIPTION_LENGTH = 40;

export function isLongSettingsDescription(value?: string): value is string {
  return Boolean(value && value.length > LONG_SETTINGS_DESCRIPTION_LENGTH);
}

export default function SettingsInfoHint({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [tooltipStyle, setTooltipStyle] = useState<CSSProperties>();
  const tooltipId = `settings-info-${id}`;

  useEffect(() => {
    if (!open) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(360, window.innerWidth - 16);
    const left = Math.min(
      Math.max(8, rect.left),
      window.innerWidth - width - 8,
    );
    setTooltipStyle({
      "--settings-info-left": `${left}px`,
      "--settings-info-top": `${rect.bottom + 8}px`,
      "--settings-info-width": `${width}px`,
    } as CSSProperties);
  }, [open]);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  }

  return (
    <span
      className="settings-info-hint"
      data-open={open}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        ref={triggerRef}
        type="button"
        className="settings-info-hint-trigger"
        aria-label={label}
        aria-describedby={tooltipId}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
      >
        <UiIcon name="circle-help" size={16} />
      </button>
      <span
        id={tooltipId}
        className="settings-info-hint-tooltip"
        role="tooltip"
        style={tooltipStyle}
      >
        {children}
      </span>
    </span>
  );
}
