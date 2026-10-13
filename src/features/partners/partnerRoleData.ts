import type { AgentRole } from "../../domain/agentWorkflow";

export interface PartnerRole {
  id: AgentRole;
  name: string;
  responsibility: string;
  deliverable: string;
  modelRequirement: string;
}

/** Roles describe a task, separately from the model/account used to execute it. */
export const PARTNER_ROLES: readonly PartnerRole[] = [
  {
    id: "planner",
    name: "策划伙伴",
    responsibility: "拆解目标、安排步骤与验收条件。",
    deliverable: "输出可执行的任务清单，并列出需要用户决定的事项。",
    modelRequirement: "文本规划与推理",
  },
  {
    id: "prompt_compiler",
    name: "提示词伙伴",
    responsibility: "把创作意图整理为清晰的模型指令。",
    deliverable: "输出可编辑的提示词，保留用户约束和参考素材要求。",
    modelRequirement: "文本编写",
  },
  {
    id: "reference_analyst",
    name: "参考分析伙伴",
    responsibility: "分析参考素材、风格与构图。",
    deliverable: "输出有依据的素材分析；无法确认的内容明确标注。",
    modelRequirement: "读取所用参考素材",
  },
  {
    id: "generation_worker",
    name: "生成伙伴",
    responsibility: "根据明确指令完成文本、图片或视频生成。",
    deliverable: "先检查所选模型的能力与参数，只使用已接入的生成服务。",
    modelRequirement: "本次任务所需的文本、图片或视频生成",
  },
  {
    id: "asset_tagger",
    name: "素材整理伙伴",
    responsibility: "为素材编写名称、标签与摘要。",
    deliverable: "输出简洁、一致的素材标签，不改动原始素材。",
    modelRequirement: "素材理解与文本编写",
  },
  {
    id: "reviewer",
    name: "审查伙伴",
    responsibility: "检查结果是否符合目标与约束。",
    deliverable: "逐项给出问题、依据与修改建议，区分已验证与未验证。",
    modelRequirement: "结果理解与推理",
  },
  {
    id: "compositor_exporter",
    name: "合成与导出伙伴",
    responsibility: "整理镜头、时间线与交付格式。",
    deliverable: "输出合成或导出方案，实际操作须使用已接入的工具。",
    modelRequirement: "文本规划及已接入的合成工具",
  },
];

export function partnerInstructions(role: PartnerRole): string {
  return `协作角色：${role.name}\n负责：${role.responsibility}\n交付要求：${role.deliverable}\n请按以上职责处理当前创作任务。`;
}
