import { invoke, isTauri } from "@tauri-apps/api/core";
import type { WorkflowOutput } from "./workflowOutputs.ts";
export interface ComfyProcessStatus {
  pid: number | null;
  owned: boolean;
  root: string | null;
  ready: boolean;
}
export interface ComfyRuntimePort {
  desktop: boolean;
  selectRoot(): Promise<string | null>;
  start(path: string): Promise<ComfyProcessStatus>;
  stop(): Promise<void>;
  status(): Promise<ComfyProcessStatus>;
  json(path: string, body?: unknown): Promise<unknown>;
  readOutput(output: WorkflowOutput): Promise<string>;
}
export const nativeComfyRuntime: ComfyRuntimePort = {
  desktop: isTauri(),
  async selectRoot() {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const result = await open({
      directory: true,
      multiple: false,
      title: "选择本地 ComfyUI 根目录",
    });
    return typeof result === "string" ? result : null;
  },
  start: (path) => invoke("comfyui_start_process", { path }),
  stop: () => invoke("comfyui_stop_process"),
  status: () => invoke("comfyui_process_status"),
  json: (path, body) =>
    invoke("comfyui_http_json", { path, body: body ?? null }),
  readOutput: (output) =>
    invoke("comfyui_read_output", {
      file: {
        filename: output.filename,
        subfolder: output.subfolder,
        type: output.type,
      },
    }),
};
