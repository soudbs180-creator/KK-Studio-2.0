import { readMaskDocument, maskBounds } from "./mask.ts";
import { assertEditShape } from "./schema.ts";
import type {
  ImageEditSnapshot,
  ImageEditContext,
} from "../../domain/imageEdit.ts";
export type {
  ImageEditSnapshot,
  ImageEditContext,
} from "../../domain/imageEdit.ts";
import type { ResolvedImageModelCapabilities } from "../models/imageModelCapabilities.ts";
const assetId = (value: unknown) =>
  typeof value === "string" && /^asset-[a-f0-9]{24}$/.test(value);
export function readImageEditSnapshot(
  input: unknown,
): ImageEditSnapshot | undefined {
  if (input === undefined) return undefined;
  assertEditShape(
    input,
    [
      "sourceAssetId",
      "maskAssetId",
      "groupId",
      "document",
      "crop",
      "nativeMask",
    ],
    ["sourceAssetId", "groupId", "document", "crop", "nativeMask"],
    "编辑原件引用损坏，不能取消蒙版保护。",
  );
  const snapshot = input as ImageEditSnapshot;
  if (
    !snapshot ||
    !assetId(snapshot.sourceAssetId) ||
    (snapshot.maskAssetId !== undefined && !assetId(snapshot.maskAssetId))
  )
    throw new Error("编辑原件引用损坏，不能取消蒙版保护。");
  if (
    typeof snapshot.groupId !== "string" ||
    !snapshot.groupId ||
    snapshot.groupId.length > 160 ||
    typeof snapshot.nativeMask !== "boolean"
  )
    throw new Error("编辑任务身份损坏。");
  const document = readMaskDocument(snapshot.document),
    crop = snapshot.crop;
  assertEditShape(
    crop,
    ["x", "y", "width", "height", "regionIds"],
    ["x", "y", "width", "height", "regionIds"],
    "编辑裁剪区域数据损坏。",
  );
  if (
    !crop ||
    ![crop.x, crop.y, crop.width, crop.height].every(Number.isSafeInteger) ||
    crop.width <= 0 ||
    crop.height <= 0 ||
    crop.width > 18024 ||
    crop.height > 18024 ||
    !Array.isArray(crop.regionIds) ||
    !crop.regionIds.length ||
    new Set(crop.regionIds).size !== crop.regionIds.length ||
    crop.regionIds.some((id) => !document.regions.some((r) => r.id === id)) ||
    crop.x < -crop.width ||
    crop.y < -crop.height ||
    crop.x >= document.width ||
    crop.y >= document.height
  )
    throw new Error("编辑裁剪区域数据损坏。");
  for (const region of document.regions.filter((r) =>
    crop.regionIds.includes(r.id),
  )) {
    const bounds = maskBounds(region.runs);
    if (
      !bounds.width ||
      bounds.x < crop.x ||
      bounds.y < crop.y ||
      bounds.x + bounds.width > crop.x + crop.width ||
      bounds.y + bounds.height > crop.y + crop.height
    )
      throw new Error("编辑裁剪区域未包含完整蒙版。");
  }
  if (snapshot.nativeMask && !snapshot.maskAssetId)
    throw new Error("原生编辑蒙版原件缺失。");
  return {
    sourceAssetId: snapshot.sourceAssetId,
    maskAssetId: snapshot.maskAssetId,
    groupId: snapshot.groupId,
    document,
    crop: structuredClone(crop),
    nativeMask: snapshot.nativeMask,
  };
}
export function readImageEditContext(
  input: unknown,
): ImageEditContext | undefined {
  if (input === undefined) return undefined;
  const context = input as ImageEditContext;
  assertEditShape(
    input,
    [
      "originalPrompt",
      "originalAssetId",
      "referenceAssetIds",
      "lastInstruction",
    ],
    ["originalPrompt", "referenceAssetIds"],
    "连续编辑上下文无效，原件已保留。",
  );
  if (
    !context ||
    typeof context.originalPrompt !== "string" ||
    context.originalPrompt.length > 4000 ||
    !Array.isArray(context.referenceAssetIds) ||
    context.referenceAssetIds.length > 64 ||
    context.referenceAssetIds.some((id) => !assetId(id)) ||
    (context.originalAssetId !== undefined &&
      !assetId(context.originalAssetId)) ||
    (context.lastInstruction !== undefined &&
      (typeof context.lastInstruction !== "string" ||
        context.lastInstruction.length > 4000))
  )
    throw new Error("连续编辑上下文无效，原件已保留。");
  return structuredClone(context);
}
export function editCapabilityReason(
  capabilities: Pick<
    ResolvedImageModelCapabilities,
    "operations" | "maxReferences"
  >,
  referenceCount: number,
): string | undefined {
  const native = capabilities.operations.inpaint === "supported";
  if (!native && capabilities.operations.edit !== "supported")
    return "局部重绘需要模型明确支持蒙版或参考图编辑，请在模型设置核实能力。";
  const total = referenceCount + (native ? 0 : 1);
  if (
    capabilities.maxReferences !== undefined &&
    total > capabilities.maxReferences
  )
    return `当前编辑需要 ${total} 张图片（包含原图${native ? "" : "和标注图"}），模型最多接收 ${capabilities.maxReferences} 张；请移除参考图或选择支持的模型。`;
  return undefined;
}
