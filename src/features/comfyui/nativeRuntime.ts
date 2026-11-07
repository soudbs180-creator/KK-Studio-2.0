import { invoke, isTauri } from "@tauri-apps/api/core";
import type { WorkflowOutput } from "./workflowOutputs.ts";
import { normalizeComfyEndpoint } from "./comfyEndpoint.ts";
export interface ComfyProcessStatus {
  pid: number | null;
  owned: boolean;
  root: string | null;
  ready: boolean;
}
export interface ComfyRuntimePort {
  desktop: boolean;
  endpoint?: string;
  selectRoot(): Promise<string | null>;
  installEditorBridge?(path: string): Promise<string>;
  start(path: string): Promise<ComfyProcessStatus>;
  stop(): Promise<void>;
  status(endpoint?: string): Promise<ComfyProcessStatus>;
  json(path: string, body?: unknown, endpoint?: string): Promise<unknown>;
  readOutput(output: WorkflowOutput, endpoint?: string): Promise<string>;
}
export const nativeComfyRuntime: ComfyRuntimePort = {
  desktop: isTauri(),
  installEditorBridge: (path) =>
    invoke("comfyui_install_editor_bridge", { path }),
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
  status: (endpoint) =>
    invoke("comfyui_process_status", { endpoint: endpoint ?? null }),
  json: (path, body, endpoint) =>
    invoke("comfyui_http_json", {
      path,
      body: body ?? null,
      endpoint: endpoint ?? null,
    }),
  readOutput: (output, endpoint) =>
    invoke("comfyui_read_output", {
      file: {
        filename: output.filename,
        subfolder: output.subfolder,
        type: output.type,
      },
      endpoint: endpoint ?? null,
    }),
};
export function scopeComfyRuntime(
  runtime: ComfyRuntimePort,
  value?: string,
): ComfyRuntimePort {
  if (!value) return runtime;
  const endpoint = normalizeComfyEndpoint(value);
  return {
    ...runtime,
    endpoint,
    status: () => runtime.status(endpoint),
    json: (path, body) => runtime.json(path, body, endpoint),
    readOutput: (output) => runtime.readOutput(output, endpoint),
  };
}
