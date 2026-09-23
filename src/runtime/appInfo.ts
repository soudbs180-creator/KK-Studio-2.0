import { isTauri } from "@tauri-apps/api/core";
import packageJson from "../../package.json" with { type: "json" };

export const appVersion = packageJson.version;
export function appPlatform() {
  return isTauri() ? "桌面版" : "浏览器版";
}
