import {
  applySkillInstructions,
  type SkillImportInput,
  type SkillRecord,
  type SkillRegistry,
} from "../skills/skillRegistry.ts";

export const ASSISTANT_CATEGORIES = ["编程", "图片", "视频"] as const;
export type AssistantCategory = (typeof ASSISTANT_CATEGORIES)[number];
export interface AssistantDraft {
  id?: string;
  name: string;
  category: AssistantCategory;
  instructions: string;
}

const presets = [
  [
    "code-builder",
    "代码实现助手",
    "编程",
    "围绕现有工程完成小步实现与验证。",
    "先检查当前架构、相关源码与测试。保留现有数据和正常行为，提出最小可靠改动；实现后说明验证命令、实际结果和未验证事项。缺少证据时说明不确定性，不编造成功。",
  ],
  [
    "code-reviewer",
    "代码审查助手",
    "编程",
    "复核功能契约、故障边界和维护成本。",
    "沿实际调用链检查正确性、权限、并发、取消、迟到响应、恢复和数据兼容。每项问题给出具体依据、影响与最小修复建议；区分已确认问题和待验证风险，不为风格偏好提出无关重构。",
  ],
  [
    "image-prompt",
    "图片创意助手",
    "图片",
    "整理主体、构图、光线与风格提示。",
    "根据用户意图和参考图整理主体、环境、构图、比例、材质、光线、风格及限制条件。给出清晰可编辑的图片提示词，保留用户明确要求；未实际执行生成时只提供创作方案，不声称已有图片。",
  ],
  [
    "image-editor",
    "图片编辑助手",
    "图片",
    "规划局部修改并保护原件。",
    "先明确需要改变的区域和需要保留的主体、背景及风格。结合当前模型实际报告的编辑能力提出局部重绘、扩边或参考图方案；保护原件，不把缩略图当原图，不声称未执行的编辑已完成。",
  ],
  [
    "video-storyboard",
    "视频分镜助手",
    "视频",
    "把创意整理成镜头、动作与节奏。",
    "把用户创意整理为镜头表：每镜主体、场景、动作、机位、运镜、时长、声音与衔接，标出首尾帧和连续性要求。优先给出可调整的脚本与提示词；是否能生成视频由已接通模型决定，不编造视频产物。",
  ],
] as const;

/** Original KK prompt data, stored through the existing skill registry. */
export const ASSISTANT_TEMPLATES: readonly SkillImportInput[] = presets.map(
  ([id, name, category, description, instructions]) => ({
    manifest: {
      id: `assistant-${id}`,
      name,
      version: "1.0.0",
      description,
      author: "KK Studio 本地模板",
      category: `助手 · ${category}`,
      permissions: [],
      dependencies: [],
      source: "bundled",
      readOnly: true,
    },
    instructions,
  }),
);

export function isAssistant(record?: SkillRecord): record is SkillRecord {
  return Boolean(
    record?.manifest.id.startsWith("assistant-") &&
    record.manifest.category.startsWith("助手 · "),
  );
}

export function listAssistantProfiles(
  records: readonly SkillRecord[],
): SkillRecord[] {
  return records.filter(isAssistant);
}

export function saveAssistantProfile(
  registry: SkillRegistry,
  draft: AssistantDraft,
): SkillRecord {
  if (!ASSISTANT_CATEGORIES.includes(draft.category))
    throw new Error("助手分类无效。");
  if (draft.instructions.length > 3000)
    throw new Error("助手指令最多 3000 字符，请精简指令以保留任务输入空间。");
  if (draft.id) {
    const existing = registry.getRecord(draft.id);
    if (!isAssistant(existing))
      throw new Error("助手不存在，不能覆盖其他技能。");
    if (existing.manifest.source !== "local")
      throw new Error("内置助手不能修改，请创建自定义助手。");
    return registry.updateSkill(draft.id, {
      manifest: { name: draft.name, category: `助手 · ${draft.category}` },
      instructions: draft.instructions,
    });
  }
  return registry.createSkill({
    manifest: {
      id: `assistant-${crypto.randomUUID()}`,
      name: draft.name,
      description: "用户自定义助手，沿用当前模型和工具权限。",
      author: "本地",
      category: `助手 · ${draft.category}`,
      version: "1.0.0",
      permissions: [],
      dependencies: [],
      source: "local",
      readOnly: true,
    },
    instructions: draft.instructions,
  });
}

export function composeAssistantPrompt(
  prompt: string,
  record?: SkillRecord,
): string {
  if (!record) return prompt;
  if (!isAssistant(record) || !record.installed || !record.enabled)
    throw new Error("助手尚未安装或已禁用。");
  return applySkillInstructions(prompt, record);
}
