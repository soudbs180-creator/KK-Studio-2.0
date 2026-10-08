import type { CreationTask } from "../creation/model.ts";
import type { ImageEditContext } from "../../domain/imageEdit.ts";
/** Root constraints are immutable; only the latest instruction is carried forward. */
export function imageResultContext(
  task: CreationTask,
  assetId: string,
): ImageEditContext {
  return (
    task.imageEditContext ?? {
      originalPrompt: task.prompt,
      originalAssetId: assetId,
      referenceAssetIds: [
        ...new Set(
          task.attachments.flatMap((a) => (a.assetId ? [a.assetId] : [])),
        ),
      ],
    }
  );
}
