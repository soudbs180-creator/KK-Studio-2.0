export type {
  ImageEditContext,
  ImageEditSnapshot,
} from "../../domain/imageEdit.ts";
export {
  readImageEditContext,
  readImageEditSnapshot,
} from "../../domain/imageEditSnapshot.ts";
import type { ResolvedImageModelCapabilities } from "../models/index.ts";
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
