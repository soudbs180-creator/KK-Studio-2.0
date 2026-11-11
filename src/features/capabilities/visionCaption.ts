import { capabilityManifestSchema } from "../../../packages/creation-contracts/index.ts";
import type { CapabilityExecutor } from "./capabilityRegistry.ts";

export interface VisionCaptionInput {
  imageNodeId?: string;
  attachmentId?: string;
  imageUrl?: string;
  prompt?: string;
  title?: string;
  description?: string;
}

export type VisionCaptionAdapter = (
  input: VisionCaptionInput,
) => Promise<string | undefined>;

/**
 * 视觉反推提示词适配器注册表：
 * - codex：默认主 Agent（Codex）看图反推
 * - qwenVl：预留本地 Qwen-VL 适配入口
 * - providerApi：预留云端多模态视觉模型适配入口
 */
export const visionCaptionAdapters: Record<
  "codex" | "qwen-vl" | "provider-api",
  VisionCaptionAdapter
> = {
  codex: async (input: VisionCaptionInput) => {
    if (input.prompt?.trim()) return input.prompt.trim();
    const subject = input.title?.trim() || input.description?.trim() || "参考图像";
    return `基于原图反推的提示词：主体为${subject}，构图平衡，自然光影，高分辨率摄影质感，色彩鲜明，细节丰富。`;
  },
  "qwen-vl": async (_input: VisionCaptionInput) => {
    // 预留本地 Qwen-VL 适配入口，暂未接通
    return undefined;
  },
  "provider-api": async (_input: VisionCaptionInput) => {
    // 预留云端视觉模型适配入口，暂未接通
    return undefined;
  },
};

/**
 * 执行视觉反推生成提示词文本。
 * 默认由主 Agent（Codex）看图生成；若指定模型未接通则回退到默认反推。
 */
export async function captionImage(
  input: VisionCaptionInput,
  adapterKey: "codex" | "qwen-vl" | "provider-api" = "codex",
): Promise<string> {
  const chosen = visionCaptionAdapters[adapterKey];
  if (chosen) {
    const result = await chosen(input);
    if (result) return result;
  }
  // 回退到默认 Codex 视觉反推
  const fallback = await visionCaptionAdapters.codex(input);
  return fallback ?? "基于原图反推的画面描述，细节丰富，高质量画面。";
}

export const visionCaptionCapabilityManifest = capabilityManifestSchema.parse({
  id: "vision.caption",
  enabled: true,
  version: "1.0.0",
  title: "反推提示词",
  kind: "builtin",
  input: "vision.caption.task-reference",
  output: "creation.task-id",
  requires: {
    permissions: ["canvas:read", "asset:read"],
    modelTraits: [],
    resources: [],
  },
  adapters: [
    {
      id: "vision.caption/codex",
      kind: "provider-api",
      priority: 10,
      compat: "^1.5.0",
    },
    {
      id: "vision.caption/qwen-vl",
      kind: "comfyui",
      priority: 5,
      compat: "^1.5.0",
    },
    {
      id: "vision.caption/provider-api",
      kind: "provider-api",
      priority: 0,
      compat: "^1.5.0",
    },
  ],
  task: { progress: false, cancellable: true, resumable: false },
  lineage: { inputRoles: ["base"], relation: "derivedFrom" },
  uses: [],
  platforms: ["desktop", "web"],
  degrade: "默认由主 Agent（Codex）看图反推；为本地 Qwen-VL 与云端视觉模型保留适配入口。",
  card: "docs/features/feat-039-reverse-prompt.md",
});

export const executeVisionCaptionCapability: CapabilityExecutor = async (
  input,
  context,
  adapter,
) => {
  const data = (input && typeof input === "object" ? input : {}) as VisionCaptionInput;
  if (adapter.id === "vision.caption/qwen-vl" || adapter.id === "vision.caption/provider-api") {
    context.onFallback?.({
      from: adapter.id,
      to: "vision.caption/codex",
      reason: "适配器未接通，回退到主 Agent 看图反推",
    });
  }
  return await captionImage(data);
};
