import type { SkillRegistry } from "./skillRegistry";

const TEMPLATE_SKILLS = [
  {
    manifest: {
      id: "shot-planner",
      name: "镜头规划助手",
      version: "0.1.0",
      description: "把一句创意整理成可检查的镜头、主体和构图提示。",
      author: "KK Studio 本地模板",
      category: "分镜",
      permissions: ["canvas:read"],
      dependencies: [],
      source: "bundled" as const,
      readOnly: true as const,
    },
    instructions:
      "先提取主体、环境、镜头运动和画面比例，再输出 3 个可编辑镜头草稿。不要替用户提交任务。",
  },
  {
    manifest: {
      id: "product-prompt-review",
      name: "产品提示复核",
      version: "0.1.0",
      description: "检查产品图提示词中的主体、材质、背景和限制条件。",
      author: "KK Studio 本地模板",
      category: "产品",
      permissions: ["asset:inspect"],
      dependencies: [],
      source: "bundled" as const,
      readOnly: true as const,
    },
    instructions:
      "按主体、材质、光线、背景、构图和禁止项逐项复核，并把缺失项写成问题供用户补充。",
  },
] as const;

export function ensureTemplates(registry: SkillRegistry, persist = true): void {
  for (const template of TEMPLATE_SKILLS) {
    if (!registry.getRecord(template.manifest.id)) {
      if (persist) registry.importSkill(template);
      else registry.seedSkill(template);
    }
  }
}
