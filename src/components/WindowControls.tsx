import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import UiIcon from "./UiIcon";

export default function WindowControls() {
  const [maximized, setMaximized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    const sync = async () => {
      try {
        const value = await getCurrentWindow().isMaximized();
        if (!disposed) setMaximized(value);
      } catch {
        if (!disposed) setError("无法读取窗口状态，请重试。");
      }
    };
    void sync();
    void (async () => {
      try {
        const stop = await getCurrentWindow().onResized(() => void sync());
        if (disposed) stop();
        else unlisten = stop;
      } catch {
        if (!disposed) setError("无法同步窗口状态，请重试。");
      }
    })();
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  const run = async (operation: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await operation();
    } catch {
      setError("窗口操作失败，请重试。");
    } finally {
      setBusy(false);
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
          void run(async () => {
            const window = getCurrentWindow();
            await window.toggleMaximize();
            setMaximized(await window.isMaximized());
          })
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
