import { cardSelectionLayout } from "../../domain/canvasGraph.ts";
import type { ProjectCanvas } from "../../domain/projectCanvas.ts";
import type { CanvasCollectionItem } from "../../domain/canvasItems.ts";
import { CANVAS_KIND_LABELS } from "../../domain/canvasItems.ts";
import { imageResultContext } from "../image-edit/index.ts";
import type { CreationTask } from "./model.ts";
import type { StoredGeneratedAsset } from "./assetRepository.ts";

export function assertTaskAssetMime(
  task: Pick<CreationTask, "kind" | "media">,
  mime: string,
): void {
  const valid =
    task.kind === "video"
      ? /^video\/(mp4|webm)$/.test(mime)
      : task.kind === "audio"
        ? mime ===
          (task.media?.kind === "audio" && task.media.format === "wav"
            ? "audio/wav"
            : "audio/mpeg")
        : task.kind === "image" && /^image\/(png|jpeg|webp|gif)$/.test(mime);
  if (!valid) throw new Error("归档原件 MIME 与任务模态或输出格式不匹配。");
}

export function archivedTaskResult(
  projectId: string,
  task: CreationTask,
  outputIndex: number,
  asset: StoredGeneratedAsset,
): CanvasCollectionItem {
  assertTaskAssetMime(task, asset.mime);
  const id = `${projectId}-${task.id}-result-${outputIndex + 1}`;
  const title = `${CANVAS_KIND_LABELS[task.kind]}结果 ${outputIndex + 1}`;
  return {
    id,
    title,
    kind: task.kind,
    description: `${task.model} · 已归档 ${asset.assetId}`,
    prompt: task.prompt,
    model: task.model,
    providerConnectionId: task.providerConnectionId,
    imageEditDraft:
      task.kind === "image" ? task.imageEdit?.document : undefined,
    imageEditContext:
      task.kind === "image"
        ? imageResultContext(task, asset.assetId)
        : undefined,
    assetId: asset.assetId,
    parentAssetId: asset.parentId,
    preview: asset.preview,
    generationStatus: "ready",
    updatedAt: Date.now(),
    result: {
      id,
      title,
      kind: task.kind,
      src: asset.preview,
      description: `来自 ${task.providerName ?? "已配置模型"} 的已归档${CANVAS_KIND_LABELS[task.kind]}结果`,
      source: "provider",
    },
  };
}

/** Newly archived media belongs beside the existing graph, never beneath a source composer. */
export function positionNewMediaResults(
  previous: ProjectCanvas | undefined,
  canvas: ProjectCanvas,
  items: CanvasCollectionItem[],
): void {
  const added = items.filter(
    (item) =>
      ["video", "audio"].includes(item.kind) &&
      item.result?.source === "provider" &&
      !previous?.positions[item.id],
  );
  if (!added.length) return;
  const existing = items.filter((item) => previous?.positions[item.id]);
  let right = Math.max(
    82,
    ...existing.map((item) => {
      const box = cardSelectionLayout(item);
      return previous!.positions[item.id].x + box.left + box.width;
    }),
  );
  for (const item of added) {
    const box = cardSelectionLayout(item);
    canvas.positions[item.id] = {
      x: right + 32 - box.left,
      y: canvas.positions[item.id]?.y ?? 107,
    };
    right += box.width + 32;
  }
}
