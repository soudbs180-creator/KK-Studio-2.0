import { isTauri } from "@tauri-apps/api/core";
import platformVersions from "../../config/platform-versions.json" with { type: "json" };

export const appVersion = isTauri()
  ? platformVersions.desktop
  : platformVersions.web;
export function appPlatform() {
  return isTauri() ? "桌面版" : "浏览器版";
}
