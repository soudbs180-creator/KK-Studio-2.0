import { invoke } from "@tauri-apps/api/core";
import { usesNativeAssets } from "../features/creation/nativeAssetAdapter.ts";
export interface WindowAppearance {
  supported: boolean;
  enabled: boolean;
  reason?: string;
}
type AppearanceInvoke = (
  command: string,
  args?: Record<string, unknown>,
) => Promise<unknown>;
const unavailable: WindowAppearance = {
  supported: false,
  enabled: false,
  reason: "透明窗口仅在支持的桌面宿主中可用。",
};
function readState(value: unknown): WindowAppearance {
  if (!value || typeof value !== "object")
    throw new Error("窗口状态回执无效。");
  const result = value as Record<string, unknown>;
  if (
    typeof result.supported !== "boolean" ||
    typeof result.enabled !== "boolean" ||
    (!result.supported && result.enabled)
  )
    throw new Error("窗口状态回执无效。");
  return {
    supported: result.supported,
    enabled: result.enabled,
    ...(typeof result.reason === "string" ? { reason: result.reason } : {}),
  };
}
function apply(state: WindowAppearance) {
  if (typeof document !== "undefined")
    document.documentElement.dataset.windowTransparent = String(
      state.supported && state.enabled,
    );
}
export async function getWindowAppearance(
  call?: AppearanceInvoke,
): Promise<WindowAppearance> {
  if (!call && !usesNativeAssets()) return { ...unavailable };
  const state = readState(await (call ?? invoke)("window_appearance_get"));
  apply(state);
  return state;
}
export async function setWindowAppearance(
  enabled: boolean,
  call?: AppearanceInvoke,
): Promise<WindowAppearance> {
  if (!call && !usesNativeAssets()) throw new Error(unavailable.reason);
  const state = readState(
    await (call ?? invoke)("window_appearance_set", { enabled }),
  );
  apply(state);
  if (!state.supported || state.enabled !== enabled)
    throw new Error(state.reason ?? "宿主未确认窗口切换，请重试。");
  return state;
}
export async function restoreWindowAppearance(enabled: boolean): Promise<void> {
  try {
    const state = await getWindowAppearance();
    if (state.supported && state.enabled !== enabled)
      await setWindowAppearance(enabled);
  } catch {
    if (typeof document !== "undefined")
      document.documentElement.dataset.windowTransparent = "false";
  }
}
