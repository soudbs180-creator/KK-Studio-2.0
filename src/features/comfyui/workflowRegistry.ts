import { z } from "zod";

const WORKFLOW_STORAGE_KEY = "kk-studio.comfyui.workflows.v1";
const workflowNodeSchema = z
  .object({
    class_type: z.string().min(1),
    inputs: z.record(z.string(), z.unknown()).optional(),
    _meta: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();
const workflowSchema = z.record(z.string().min(1), workflowNodeSchema);
export const workflowRecordSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  description: z.string().max(500),
  source: z.enum(["starter", "imported", "created"]),
  tags: z.array(z.string().min(1).max(32)).max(12),
  workflow: workflowSchema,
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});
export type ComfyWorkflow = z.infer<typeof workflowSchema>;
export type WorkflowRecord = z.infer<typeof workflowRecordSchema>;
export interface WorkflowParseResult {
  workflow: ComfyWorkflow;
  nodeCount: number;
  format: "api" | "ui";
}
function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
function createId(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${random}`;
}
function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
export function parseComfyWorkflow(value: unknown): WorkflowParseResult {
  const root = asRecord(value);
  if (!root) throw new Error("工作流必须是 JSON 对象。");
  const api = workflowSchema.safeParse(root);
  if (api.success && Object.keys(api.data).length)
    return {
      workflow: api.data,
      nodeCount: Object.keys(api.data).length,
      format: "api",
    };
  const converted: Record<string, unknown> = {};
  for (const node of Array.isArray(root.nodes) ? root.nodes : []) {
    const entry = asRecord(node);
    const type = typeof entry?.type === "string" ? entry.type : "";
    const id = entry?.id;
    if (!entry || !type || (typeof id !== "number" && typeof id !== "string"))
      continue;
    const inputs =
      entry.inputs &&
      typeof entry.inputs === "object" &&
      !Array.isArray(entry.inputs)
        ? entry.inputs
        : {};
    converted[String(id)] = { class_type: type, inputs };
  }
  const ui = workflowSchema.safeParse(converted);
  if (!ui.success || !Object.keys(ui.data).length)
    throw new Error(
      "没有找到可执行的 ComfyUI 节点（需要 API prompt 或 UI nodes）。",
    );
  return {
    workflow: ui.data,
    nodeCount: Object.keys(ui.data).length,
    format: "ui",
  };
}
export function createStarterWorkflow(
  name = "我的 ComfyUI 工作流",
): WorkflowRecord {
  const now = Date.now();
  return {
    id: createId("workflow"),
    name,
    description: "可编辑的本地工作流模板；选择模型后即可提交到 ComfyUI。",
    source: "created",
    tags: ["本地", "模板"],
    workflow: {
      "1": { class_type: "CheckpointLoaderSimple", inputs: {} },
      "2": { class_type: "CLIPTextEncode", inputs: { text: "" } },
      "3": {
        class_type: "EmptyLatentImage",
        inputs: { width: 1024, height: 1024, batch_size: 1 },
      },
      "4": { class_type: "KSampler", inputs: { seed: 0, steps: 20, cfg: 7 } },
      "5": {
        class_type: "SaveImage",
        inputs: { filename_prefix: "kk-studio" },
      },
    },
    createdAt: now,
    updatedAt: now,
  };
}
export function readLocalWorkflows(): WorkflowRecord[] {
  const raw = storage()?.getItem(WORKFLOW_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.flatMap((item) => {
          const result = workflowRecordSchema.safeParse(item);
          return result.success ? [result.data] : [];
        })
      : [];
  } catch {
    return [];
  }
}
export function writeLocalWorkflows(workflows: WorkflowRecord[]): void {
  const safe = workflows.flatMap((workflow) => {
    const result = workflowRecordSchema.safeParse(workflow);
    return result.success ? [result.data] : [];
  });
  storage()?.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify(safe));
}
export function createImportedWorkflow(
  name: string,
  parsed: WorkflowParseResult,
): WorkflowRecord {
  const now = Date.now();
  return {
    id: createId("workflow"),
    name: name.trim().slice(0, 120) || "导入的 ComfyUI 工作流",
    description: `从 ${parsed.format === "ui" ? "ComfyUI UI 导出" : "API prompt JSON"} 导入，包含 ${parsed.nodeCount} 个节点。`,
    source: "imported",
    tags: ["本地", "已导入"],
    workflow: parsed.workflow,
    createdAt: now,
    updatedAt: now,
  };
}
export function workflowToJson(workflow: WorkflowRecord): string {
  return JSON.stringify(workflow.workflow, null, 2);
}
