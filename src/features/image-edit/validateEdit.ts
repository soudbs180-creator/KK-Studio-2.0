import type {
  CanvasCollectionItem,
  CanvasReference,
} from "../../domain/canvasItems.ts";
import type { MaskDocument } from "./mask.ts";
import type { ResolvedImageModelCapabilities } from "../models/imageModelCapabilities.ts";
import { compileEditPrompt, formatEditPrompt } from "./prompt.ts";
import { editCapabilityReason } from "./snapshot.ts";
import { nativeAnnotationOverhead } from "./regions.ts";
export function validateEdit(
  source: CanvasCollectionItem,
  document: MaskDocument,
  prompt: string,
  references: CanvasReference[],
  capabilities: ResolvedImageModelCapabilities,
): string {
  try {
    const compiled = compileEditPrompt(prompt, document),
      active = {
        ...document,
        regions: document.regions.filter((r) =>
          compiled.regionIds.includes(r.id),
        ),
      };
    formatEditPrompt({
      current: compiled.prompt,
      originalPrompt: source.imageEditContext?.originalPrompt,
      previous: source.imageEditContext?.lastInstruction,
      local: !!active.regions.length,
      instructions: compiled.instructions,
    });
    if (document.regions.length && !active.regions.length)
      return "请先填写色块修改意见。";
    const count =
      1 +
      new Set(
        references
          .flatMap((r) => (r.assetId ? [r.assetId] : []))
          .concat(source.imageEditContext?.referenceAssetIds ?? [])
          .filter((id) => id !== source.assetId),
      ).size;
    return active.regions.length
      ? (editCapabilityReason(
          capabilities,
          count +
            (capabilities.operations.inpaint === "supported"
              ? nativeAnnotationOverhead(active)
              : 0),
        ) ?? "")
      : capabilities.maxReferences !== undefined &&
          count > capabilities.maxReferences
        ? `当前编辑需要 ${count} 张图片，超过模型的参考图数量上限。`
        : "";
  } catch (error) {
    return error instanceof Error ? error.message : "区域引用无效。";
  }
}
