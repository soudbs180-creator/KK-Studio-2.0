import type { MobileLibraryInput } from "../core/mobileModel.ts";
import type { SearchResult } from "../application/localSearch.ts";
export const libraryLabels: Record<MobileLibraryInput["kind"], string> = {
  prompt: "提示词",
  template: "模板",
  role: "角色说明",
  "skill-instruction": "Skill 指令",
};
export const searchLabels: Record<SearchResult["kind"], string> = {
  project: "项目",
  message: "消息",
  task: "任务",
  asset: "素材",
  library: "创作库",
};
