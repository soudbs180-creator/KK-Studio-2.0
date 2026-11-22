/**
 * models feature 公共入口。
 * 组件层只能经本 barrel 引用本 feature，禁止深路径导入。
 */

export { detectLocalHardware } from "./localHardware";
export { localModelInstallation } from "./localModelInstallation";
export { runLocalModelInstallFlow } from "./localModelInstallFlow";
export {
  describeFastVideoRuntime,
  readFastVideoRuntimeSettings,
  writeFastVideoRuntimeSettings,
} from "./fastVideoRuntimeSettings";
export type { FastVideoRuntimeSettings } from "./fastVideoRuntimeSettings";
export { createFastVideoAdapterFromSettings } from "./fastVideoAdapterFactory";
