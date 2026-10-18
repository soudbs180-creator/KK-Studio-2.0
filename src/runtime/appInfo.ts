import { isTauri } from "@tauri-apps/api/core";
import platformVersions from "../../config/platform-versions.json" with { type: "json" };

export const appVersion = isTauri()
  ? platformVersions.desktop
  : platformVersions.web;
// GitHub replaces spaces in uploaded release asset names with dots.
export const windowsInstallerFilename = `KK.Studio_${platformVersions.desktop}_x64-setup.exe`;
export const windowsInstallerUrl = `https://github.com/soudbs180-creator/KK-Studio-2.0/releases/download/v${platformVersions.desktop}/${encodeURIComponent(windowsInstallerFilename)}`;
export function appPlatform() {
  return isTauri() ? "桌面客户端" : "网页版";
}
