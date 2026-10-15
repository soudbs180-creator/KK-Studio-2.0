import { invoke, isTauri } from "@tauri-apps/api/core";
import {
  localHardwareReportSchema,
  type LocalHardwareReport,
} from "../../domain/localModelRecommendations.ts";

/** Explicit user-triggered inspection only: no storage, telemetry or browser estimates. */
export async function detectLocalHardware(): Promise<LocalHardwareReport> {
  if (!isTauri()) {
    return {
      version: 1,
      status: "unsupported",
      platform: "web",
      measuredAtMs: Date.now(),
      cpu: null,
      memory: null,
      os: null,
      gpus: [],
      disks: [],
      errors: [{ probe: "platform", code: "unsupported" }],
    };
  }
  try {
    return localHardwareReportSchema.parse(
      await invoke("detect_local_hardware"),
    );
  } catch {
    throw new Error("本机硬件检测不可用，请重试。");
  }
}
