import { isTauri } from "@tauri-apps/api/core";
import { confirm, message as showMessage } from "@tauri-apps/plugin-dialog";

/** Tauri overrides window.confirm with an async, legacy IPC implementation. */
export async function confirmAction(message: string): Promise<boolean> {
  const desktop =
    isTauri() ||
    Boolean(
      (window as Window & { __TAURI_INTERNALS__?: unknown })
        .__TAURI_INTERNALS__,
    );
  try {
    return desktop
      ? await confirm(message, {
          title: "KK Studio",
          kind: "warning",
          okLabel: "确认",
          cancelLabel: "取消",
        })
      : await window.confirm(message);
  } catch {
    if (desktop)
      await showMessage("无法显示确认窗口，操作未执行。请稍后重试。", {
        title: "KK Studio",
        kind: "error",
      }).catch(() => undefined);
    return false;
  }
}
