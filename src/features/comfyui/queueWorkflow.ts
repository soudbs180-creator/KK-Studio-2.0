import { z } from "zod";
import type { WorkflowRecord } from "./workflowRegistry.ts";
import type { ComfyRuntimePort } from "./nativeRuntime.ts";
export function validateExecutableWorkflow(record: WorkflowRecord): void {
  if (record.needsConversion)
    throw new Error("请先进入原生编辑器同步此 UI 工作流，或导入 API JSON");
  if (!Object.keys(record.workflow).length)
    throw new Error("工作流为空或超过大小上限");
  assertSafeWorkflowPayload(record.workflow, 256 * 1024);
}
export function assertSafeWorkflowPayload(value: unknown, limit: number): void {
  const raw = JSON.stringify(value);
  if (!raw || raw.length > limit) throw new Error("工作流为空或超过大小上限");
  if (
    /"(?:api[_-]?key|password|access[_-]?token|refresh[_-]?token|client[_-]?secret|authorization)"\s*:/i.test(
      raw,
    ) ||
    /sk-[A-Za-z0-9_-]{12,}/.test(raw)
  )
    throw new Error("工作流含凭据字段，请移除后再运行");
}
export async function queueSavedWorkflow(
  runtime: ComfyRuntimePort,
  record: WorkflowRecord,
  clientId: string,
  key: string,
): Promise<string> {
  validateExecutableWorkflow(record);
  const result = await runtime.json("/prompt", {
    client_id: clientId + "-host",
    prompt: record.workflow,
    extra_data: { kk_submission_id: key },
  });
  return z.object({ prompt_id: z.string().min(1).max(160) }).parse(result)
    .prompt_id;
}

// Only a definitive prompt rejection releases an intent; transport failures remain unknown.
export function isWorkflowRejection(error: unknown): boolean {
  return /^ComfyUI 请求失败（HTTP (400|401|403|404|405|413|422)）$/.test(
    error instanceof Error ? error.message : String(error),
  );
}
