import type {
  CanvasCollectionItem,
  CanvasReference,
} from "../../domain/canvasItems.ts";
import type { ProviderConnection } from "../../domain/providerConnections.ts";
import type {
  CreateProjectInput,
  CreationAttachment,
  CreationProject,
  CreationTask,
} from "../creation/model.ts";
import {
  loadStoredAsset,
  storeGeneratedAsset,
  type StoredGeneratedAsset,
} from "../creation/assetRepository.ts";
import { resolveImageModelCapabilities } from "../models/imageModelCapabilities.ts";
import { compileEditPrompt, formatEditPrompt } from "./prompt.ts";
import {
  planEditRegions,
  chooseEditSize,
  nativeAnnotationOverhead,
} from "./regions.ts";
import { readMaskDocument, type MaskDocument } from "./mask.ts";
import { editCapabilityReason, readImageEditSnapshot } from "./snapshot.ts";
import {
  annotateImage,
  composePixels,
  cropImage,
  decodeImage,
  drawMask,
} from "./imageProcessing.ts";

export interface ImageEditRequest {
  document: MaskDocument;
  references?: CanvasReference[];
}
function attachment(
  asset: StoredGeneratedAsset,
  name: string,
): CreationAttachment {
  return {
    id: asset.assetId,
    assetId: asset.assetId,
    name,
    mime: asset.mime,
    size: Math.floor(((asset.preview.split(",")[1]?.length ?? 0) * 3) / 4),
    dataUrl: `kk-asset:${asset.assetId}`,
  };
}
async function original(id: string): Promise<StoredGeneratedAsset> {
  const asset = await loadStoredAsset(id);
  if (!asset || !asset.mime.startsWith("image/"))
    throw new Error("图片原件或参考图缺失，本次未提交，已有内容已保留。");
  return asset;
}
/** Exact request images are archived before the existing durable task intent. */
export async function prepareEditInputs(
  input: CreateProjectInput,
  source: CanvasCollectionItem,
  project: CreationProject,
  connection: ProviderConnection,
  edit: ImageEditRequest,
  signal?: AbortSignal,
): Promise<CreateProjectInput[]> {
  if (!source.assetId) throw new Error("请先导入归档原件，再使用图片编辑。");
  const document = readMaskDocument(edit.document),
    compiled = compileEditPrompt(input.prompt, document);
  const active = {
    ...document,
    regions: document.regions.filter((r) => compiled.regionIds.includes(r.id)),
  };
  if (document.regions.length && !active.regions.length)
    throw new Error("色块尚未填写修改意见，请先确认区域指令。");
  if (!input.prompt.trim() && !compiled.instructions.length)
    throw new Error("请填写修改意见。");
  const capabilities = resolveImageModelCapabilities(connection, input.model),
    local = active.regions.length > 0;
  const context = source.imageEditContext ?? {
    originalPrompt: source.prompt ?? project.prompt,
    originalAssetId: source.assetId,
    referenceAssetIds: project.attachments.flatMap((a) =>
      a.assetId && a.assetId !== source.assetId ? [a.assetId] : [],
    ),
  };
  const ids = [
    ...context.referenceAssetIds,
    ...input.attachments.flatMap((a) => (a.assetId ? [a.assetId] : [])),
    ...(edit.references ?? []).flatMap((r) => (r.assetId ? [r.assetId] : [])),
  ].filter((id) => id !== source.assetId);
  const references: CreationAttachment[] = [];
  for (const id of [...new Set(ids)]) {
    signal?.throwIfAborted();
    references.push(
      attachment(
        await original(id),
        context.referenceAssetIds.includes(id) ? "初始参考图" : "本轮参考图",
      ),
    );
  }
  const sourceAsset = await original(source.assetId);
  formatEditPrompt({
    current: compiled.prompt,
    originalPrompt: context.originalPrompt,
    previous: context.lastInstruction,
    local,
    instructions: compiled.instructions,
  });
  const reason = local
    ? editCapabilityReason(
        capabilities,
        1 +
          references.length +
          (capabilities.operations.inpaint === "supported"
            ? nativeAnnotationOverhead(active)
            : 0),
      )
    : capabilities.operations.edit === "unsupported"
      ? "当前模型不支持参考图编辑，请切换支持的模型。"
      : undefined;
  if (reason) throw new Error(reason);
  if (!local)
    return [
      {
        ...input,
        prompt: formatEditPrompt({
          current: input.prompt,
          originalPrompt: context.originalPrompt,
          previous: context.lastInstruction,
          local: false,
          instructions: [],
        }),
        imageSize: undefined,
        attachments: [attachment(sourceAsset, "当前编辑原图"), ...references],
        imageEditContext: { ...context, lastInstruction: input.prompt },
      },
    ];
  const decoded = await decodeImage(sourceAsset.preview, signal);
  if (decoded.width !== document.width || decoded.height !== document.height)
    throw new Error("原图尺寸已变化，请重新加载编辑区域。");
  const plan = planEditRegions(active),
    native = capabilities.operations.inpaint === "supported",
    groupId = crypto.randomUUID(),
    inputs: CreateProjectInput[] = [];
  for (const crop of plan.crops) {
    signal?.throwIfAborted();
    const cropped = cropImage(decoded, crop);
    const cropAsset = await storeGeneratedAsset({
      source: cropped.toDataURL("image/png"),
      sourceKind: "upload",
      isAiGenerated: false,
      parentId: source.assetId,
      tags: ["编辑输入"],
      signal,
    });
    const images = [attachment(cropAsset, "当前编辑原图"), ...references];
    let maskAssetId: string | undefined;
    if (native) {
      const mask = drawMask(active, crop, cropped.width, cropped.height, true);
      maskAssetId = (
        await storeGeneratedAsset({
          source: mask.toDataURL("image/png"),
          sourceKind: "upload",
          isAiGenerated: false,
          tags: ["编辑蒙版"],
          signal,
        })
      ).assetId;
    }
    if (
      !native ||
      active.regions.some((r) => crop.regionIds.includes(r.id) && r.color)
    ) {
      const annotated = await storeGeneratedAsset({
        source: annotateImage(decoded, active, crop).toDataURL("image/png"),
        sourceKind: "upload",
        isAiGenerated: false,
        parentId: source.assetId,
        tags: ["区域标注"],
        signal,
      });
      images.splice(1, 0, attachment(annotated, "区域标注图（仅用于定位）"));
    }
    inputs.push({
      ...input,
      outputCount: 1,
      attachments: images,
      imageSize:
        plan.mode === "local"
          ? chooseEditSize(crop.width, capabilities.declaration?.sizes)
          : undefined,
      prompt: formatEditPrompt({
        current: compiled.prompt,
        originalPrompt: context.originalPrompt,
        previous: context.lastInstruction,
        local: true,
        instructions: compiled.instructions.filter((i) =>
          crop.regionIds.includes(i.regionId),
        ),
      }),
      imageEditContext: { ...context, lastInstruction: input.prompt },
      imageEdit: {
        sourceAssetId: source.assetId,
        maskAssetId,
        groupId,
        document: active,
        crop,
        nativeMask: native,
      },
    });
  }
  return inputs;
}

/** Native recovery and live Web/Desktop publication share this protection boundary. */
export async function composeEditResult(
  task: CreationTask,
  source: string,
  siblings: CreationTask[] = [],
  signal?: AbortSignal,
): Promise<string> {
  const edit = readImageEditSnapshot(task.imageEdit);
  if (!edit) return source;
  let base = await decodeImage(
    (await original(edit.sourceAssetId)).preview,
    signal,
  );
  if (
    base.width !== edit.document.width ||
    base.height !== edit.document.height
  )
    throw new Error("编辑原图尺寸与任务快照不一致。");
  for (const sibling of siblings) {
    if (sibling.id === task.id || sibling.imageEdit?.groupId !== edit.groupId)
      continue;
    const assetId = sibling.outputs?.find(
      (o) => o.status === "succeeded" && o.assetId,
    )?.assetId;
    if (!assetId) continue;
    const previous = readImageEditSnapshot(sibling.imageEdit)!;
    const image = await decodeImage((await original(assetId)).preview, signal);
    base = composePixels(
      base,
      image,
      previous.document,
      {
        x: 0,
        y: 0,
        width: base.width,
        height: base.height,
        regionIds: previous.crop.regionIds,
      },
      1,
    );
  }
  const generated = await decodeImage(source, signal);
  return composePixels(base, generated, edit.document, edit.crop).toDataURL(
    "image/png",
  );
}
export async function composeNativeEditAsset(
  task: CreationTask,
  asset: StoredGeneratedAsset,
  siblings: CreationTask[] = [],
): Promise<StoredGeneratedAsset> {
  if (!task.imageEdit) return asset;
  const source = await composeEditResult(task, asset.preview, siblings);
  return storeGeneratedAsset({
    source,
    provider: task.providerName,
    model: task.model,
    sourceJobId: task.id,
    connectionId: task.providerConnectionId,
    promptHash: asset.promptHash,
    parentId: task.imageEdit.sourceAssetId,
    tags: ["AI生成", "蒙版重绘"],
  });
}
