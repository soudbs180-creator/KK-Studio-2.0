import {
  comfyApiWorkflowSchema as workflowSchema,
  workflowRecordSchema,
} from "../../domain/comfyWorkflow.ts";
import type {
  ComfyWorkflow,
  WorkflowRecord,
} from "../../domain/comfyWorkflow.ts";
export { workflowRecordSchema };
export type { ComfyWorkflow, WorkflowRecord };
import { assertSafeWorkflowPayload } from "./queueWorkflow.ts";

const WORKFLOW_STORAGE_KEY = "kk-studio.comfyui.workflows.v1";
export interface WorkflowParseResult {
  workflow: ComfyWorkflow;
  nodeCount: number;
  format: "api" | "ui";
  editorWorkflow?: Record<string, unknown>;
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
  assertSafeWorkflowPayload(value, 1024 * 1024);
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
    editorWorkflow: root,
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
      "1": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: "" } },
      "2": {
        class_type: "CLIPTextEncode",
        inputs: { text: "", clip: ["1", 1] },
      },
      "3": {
        class_type: "EmptyLatentImage",
        inputs: { width: 512, height: 512, batch_size: 1 },
      },
      "4": {
        class_type: "KSampler",
        inputs: {
          seed: 0,
          steps: 20,
          cfg: 7,
          model: ["1", 0],
          positive: ["2", 0],
          negative: ["6", 0],
          latent_image: ["3", 0],
          sampler_name: "euler",
          scheduler: "normal",
          denoise: 1,
        },
      },
      "5": {
        class_type: "SaveImage",
        inputs: { filename_prefix: "kk-studio", images: ["7", 0] },
      },
      "6": {
        class_type: "CLIPTextEncode",
        inputs: { text: "blur, watermark", clip: ["1", 1] },
      },
      "7": {
        class_type: "VAEDecode",
        inputs: { samples: ["4", 0], vae: ["1", 2] },
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
  const target = storage();
  if (!target) throw new Error("本地存储不可用，工作流未保存。");
  const safe = workflows.flatMap((workflow) => {
    const result = workflowRecordSchema.safeParse(workflow);
    return result.success ? [result.data] : [];
  });
  target.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify(safe));
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
    editorWorkflow: parsed.editorWorkflow,
    needsConversion: parsed.format === "ui",
    createdAt: now,
    updatedAt: now,
  };
}
export function workflowToJson(workflow: WorkflowRecord): string {
  return JSON.stringify(
    workflow.needsConversion ? workflow.editorWorkflow : workflow.workflow,
    null,
    2,
  );
}
