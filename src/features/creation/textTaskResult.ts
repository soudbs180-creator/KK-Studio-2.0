import type { CanvasCollectionItem } from "../../domain/canvasItems.ts";
import type { CreationTask } from "./model.ts";

/** Text belongs to the project and native journal, not the media asset store. */
export function textTaskResult(
  projectId: string,
  task: CreationTask,
  index: number,
  text: string,
): CanvasCollectionItem {
  if (!text.trim() || new TextEncoder().encode(text).length > 32768)
    throw new Error("文本结果为空或超出限制，无法完成任务。");
  const id = `${projectId}-${task.id}-result-${index + 1}`;
  return {
    id,
    kind: "text",
    title: `文案结果 ${index + 1}`,
    prompt: task.prompt,
    model: task.model,
    description: `${task.model} · 已保存文本`,
    generationStatus: "ready",
    updatedAt: Date.now(),
    result: {
      id,
      kind: "text",
      title: `文案结果 ${index + 1}`,
      text,
      description: `来自 ${task.providerName ?? "已配置模型"} 的文本结果`,
      source: "provider",
    },
  };
}
