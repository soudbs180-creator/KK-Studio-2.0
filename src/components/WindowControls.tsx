import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import UiIcon from "./UiIcon";

function releaseListener(stop: () => void) {
  const report = () => console.warn("窗口状态监听清理失败。");
  try {
    // The SDK types this as void, but its implementation returns a Promise.
    void Promise.resolve(stop()).catch(report);
  } catch {
    report();
  }
}

export default function WindowControls() {
  const [maximized, setMaximized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lifecycle = useRef({
    mounted: false,
    sequence: 0,
    operation: 0,
    busy: false,
  });

  const syncWindowState = useCallback(async () => {
    const current = lifecycle.current;
    if (!current.mounted) return;
    const sequence = ++current.sequence;
    try {
      const value = await getCurrentWindow().isMaximized();
      if (current.mounted && current.sequence === sequence) setMaximized(value);
    } catch {
      if (current.mounted && current.sequence === sequence)
        setError("无法读取窗口状态，请重试。");
    }
  }, []);

  useEffect(() => {
    const current = lifecycle.current;
    current.mounted = true;
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void syncWindowState();
    void (async () => {
      try {
        const stop = await getCurrentWindow().onResized(() => {
          if (!disposed) void syncWindowState();
        });
        if (disposed) releaseListener(stop);
        else unlisten = stop;
      } catch {
        if (!disposed) setError("无法同步窗口状态，请重试。");
      }
    })();
    return () => {
      disposed = true;
      current.mounted = false;
      current.sequence++;
      current.operation++;
      current.busy = false;
      if (unlisten) releaseListener(unlisten);
    };
  }, [syncWindowState]);

  const run = async (operation: () => Promise<void>, synchronize = false) => {
    const current = lifecycle.current;
    if (!current.mounted || current.busy) return;
    const operationId = ++current.operation;
    current.sequence++;
    current.busy = true;
    const active = () => current.mounted && current.operation === operationId;
    setBusy(true);
    setError("");
    try {
      await operation();
      if (synchronize && active()) await syncWindowState();
    } catch {
      if (active()) {
        current.sequence++;
        setError("窗口操作失败，请重试。");
      }
    } finally {
      if (active()) {
        current.busy = false;
        setBusy(false);
      }
    }
  };
  const maximizeLabel = maximized ? "还原窗口" : "最大化窗口";

  return (
    <div
      className="window-controls"
      role="group"
      aria-label="窗口控制"
      aria-busy={busy}
    >
      <button
        type="button"
        aria-label="最小化窗口"
        title="最小化窗口"
        disabled={busy}
        onClick={() => void run(() => getCurrentWindow().minimize())}
      >
        <UiIcon name="minimize" size={16} />
      </button>
      <button
        type="button"
        aria-label={maximizeLabel}
        title={maximizeLabel}
        disabled={busy}
        onClick={() =>
          void run(() => getCurrentWindow().toggleMaximize(), true)
        }
      >
        <UiIcon name={maximized ? "copy" : "maximize"} size={16} />
      </button>
      <button
        type="button"
        className="window-control-close"
        aria-label="关闭窗口"
        title="关闭窗口"
        disabled={busy}
        onClick={() => void run(() => getCurrentWindow().close())}
      >
        <UiIcon name="add" size={16} />
      </button>
      {error && (
        <span className="window-control-error" role="status">
          {error}
        </span>
      )}
    </div>
  );
}
