import { useEffect, useRef, useState } from "react";
import type { ShortcutScope } from "../../features/settings/shortcutsRegistry";
import {
  checkConflict,
  normalizeKey,
  normalizeKeys,
} from "../../features/settings/shortcutsRegistry";

interface KeystrokeRecorderProps {
  shortcutId: string;
  scope: ShortcutScope;
  currentKeys: readonly string[];
  onSave: (keys: string[]) => void;
  onReset?: () => void;
  disabled?: boolean;
}

export default function KeystrokeRecorder({
  shortcutId,
  scope,
  currentKeys,
  onSave,
  onReset,
  disabled = false,
}: KeystrokeRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isRecording) return;

    function handleKeyDown(e: KeyboardEvent) {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === "Escape") {
        setIsRecording(false);
        setError(null);
        return;
      }

      const isModifier = ["Control", "Alt", "Shift", "Meta"].includes(e.key);
      const modifiers: string[] = [];
      if (e.ctrlKey) modifiers.push("Ctrl");
      if (e.altKey) modifiers.push("Alt");
      if (e.shiftKey) modifiers.push("Shift");
      if (e.metaKey) modifiers.push("Meta");

      if (isModifier) {
        return;
      }

      let primary = e.key;
      if (primary === " ") primary = "Space";
      else if (primary.length === 1) primary = primary.toUpperCase();
      else primary = normalizeKey(primary);

      const candidate = normalizeKeys([...modifiers, primary]);
      const conflict = checkConflict(candidate, scope, shortcutId);

      if (conflict.hasConflict) {
        setError(conflict.reason ?? "按键组合冲突");
      } else {
        setError(null);
        setIsRecording(false);
        onSave(candidate);
      }
    }

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [isRecording, scope, shortcutId, onSave]);

  return (
    <div
      className="keystroke-recorder"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        alignItems: "flex-end",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div
          className="kk-control-box"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "4px 8px",
            backgroundColor: "var(--kk-bg-input)",
            border: isRecording
              ? "1px solid var(--kk-accent)"
              : "1px solid var(--kk-border-subtle)",
            boxShadow: isRecording ? "0 0 0 2px var(--kk-accent-soft)" : "none",
            transition: "all 0.16s var(--motion-spring)",
          }}
        >
          {isRecording ? (
            <span
              style={{
                fontSize: "12px",
                color: "var(--kk-text-accent)",
                padding: "0 4px",
              }}
            >
              按下组合键 (Esc 取消)...
            </span>
          ) : (
            currentKeys.map((k) => (
              <kbd
                key={k}
                className="kk-kbd-box"
                style={{
                  display: "inline-block",
                  padding: "2px 6px",
                  fontSize: "12px",
                  fontWeight: 500,
                  fontFamily: "var(--kk-font-mono)",
                  color: "var(--kk-text-primary)",
                  backgroundColor: "var(--kk-bg-soft)",
                  border: "1px solid var(--kk-border-control)",
                }}
              >
                {k}
              </kbd>
            ))
          )}
        </div>

        <button
          ref={buttonRef}
          type="button"
          className="settings-action secondary"
          style={{
            height: "var(--kk-control-h-md)",
            padding: "0 12px",
            fontSize: "12px",
          }}
          disabled={disabled}
          onClick={() => {
            if (isRecording) {
              setIsRecording(false);
              setError(null);
            } else {
              setIsRecording(true);
              setError(null);
            }
          }}
        >
          {isRecording ? "取消" : "更改"}
        </button>

        {onReset && (
          <button
            type="button"
            className="settings-action secondary"
            style={{
              height: "var(--kk-control-h-md)",
              padding: "0 10px",
              fontSize: "12px",
              opacity: 0.8,
            }}
            disabled={disabled}
            title="恢复默认按键"
            onClick={onReset}
          >
            重置
          </button>
        )}
      </div>

      {error && (
        <span
          style={{
            fontSize: "12px",
            color: "var(--kk-text-danger)",
            textAlign: "right",
          }}
          role="alert"
        >
          {error}
        </span>
      )}
    </div>
  );
}
