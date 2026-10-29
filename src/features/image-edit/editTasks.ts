import type { CanvasCollectionItem } from "../../domain/canvasItems.ts";
import type {
  CreateProjectInput,
  CreationAttachment,
  CreationTask,
} from "../../domain/creationTypes.ts";
import type { ProviderConnection } from "../../domain/providerConnections.ts";

import { resolveImageModelCapabilities } from "../models/index.ts";
import {
  annotateImage,
  composePixels,
  cropImage,
  decodeImage,
  drawMask,
  resolveCanvasMime,
} from "./imageProcessing.ts";
import { readMaskDocument, type MaskDocument } from "./mask.ts";
import { compileEditPrompt, formatEditPrompt } from "./prompt.ts";
import {
  chooseEditSize,
  nativeAnnotationOverhead,
  planEditRegions,
  type EditCrop,
} from "./regions.ts";
import { editCapabilityReason, readImageEditSnapshot } from "./snapshot.ts";

type ImageModelCapabilities = ReturnType<typeof resolveImageModelCapabilities>;
type CompiledEditPrompt = ReturnType<typeof compileEditPrompt>;

import type {
  AssetPort,
  AssetWriteRequest,
  CapabilityAsset,
  ImageEditRequest,
} from "../../../packages/creation-contracts/index.ts";
export type { ImageEditRequest } from "../../../packages/creation-contracts/index.ts";
type StoredGeneratedAsset = CapabilityAsset;
export interface ImageEditAssets {
  read: AssetPort["read"];
  write: (
    request: AssetWriteRequest & { signal?: AbortSignal },
  ) => Promise<CapabilityAsset>;
}

export function createImageEditRuntime(assets: ImageEditAssets) {
  const loadStoredAsset = assets.read;
  const storeGeneratedAsset = assets.write;
  function attachment(
    asset: StoredGeneratedAsset,
    name: string,
    originalAssetId?: string,
  ): CreationAttachment {
    return {
      id: asset.assetId,
      assetId: asset.assetId,
      originalAssetId: originalAssetId ?? asset.parentId ?? asset.assetId,
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

  function resolveEditCapabilityReason(
    capabilities: ImageModelCapabilities,
    active: MaskDocument,
    referenceCount: number,
    local: boolean,
    selectionOnly: boolean,
  ): string | undefined {
    if (local) {
      const overhead =
        capabilities.operations.inpaint === "supported"
          ? nativeAnnotationOverhead(active)
          : 0;
      return editCapabilityReason(capabilities, 1 + referenceCount + overhead);
    }
    if (capabilities.operations.edit === "unsupported")
      return "当前模型不支持参考图编辑，请切换支持的模型。";
    const needed =
      1 + referenceCount + (active.regions.length && !selectionOnly ? 1 : 0);
    if (
      capabilities.maxReferences !== undefined &&
      needed > capabilities.maxReferences
    )
      return `当前编辑需要 ${needed} 张图片，超过模型的参考图数量上限。`;
    return undefined;
  }

  async function storeAnnotatedAttachment(
    decoded: HTMLCanvasElement,
    active: MaskDocument,
    crop: EditCrop,
    parentId: string,
    signal?: AbortSignal,
  ): Promise<CreationAttachment> {
    const annotated = annotateImage(decoded, active, crop);
    const annotatedMime = resolveCanvasMime(annotated, "image/png");
    const annotatedAsset = await storeGeneratedAsset({
      source: annotated.toDataURL(annotatedMime),
      sourceKind: "upload",
      isAiGenerated: false,
      parentId,
      tags: ["区域标注"],
      signal,
    });
    return attachment(annotatedAsset, "区域标注图（仅用于定位）", parentId);
  }

  /** Exact request images are archived before the existing durable task intent. */
  async function prepareEditInputs(
    input: CreateProjectInput,
    source: CanvasCollectionItem,
    project: Pick<
      import("../../domain/creationTypes.ts").CreationProject,
      "prompt" | "attachments"
    >,
    connection: ProviderConnection,
    edit: ImageEditRequest,
    signal?: AbortSignal,
  ): Promise<CreateProjectInput[]> {
    if (!source.assetId) throw new Error("请先导入归档原件，再使用图片编辑。");
    const document = readMaskDocument(edit.document),
      compiled = compileEditPrompt(input.prompt, document);
    const active = {
      ...document,
      regions: document.regions.filter((r) =>
        compiled.regionIds.includes(r.id),
      ),
    };
    if (document.regions.length && !active.regions.length)
      throw new Error("色块尚未填写修改意见，请先确认区域指令。");
    if (!input.prompt.trim() && !compiled.instructions.length)
      throw new Error("请填写修改意见。");
    const capabilities = resolveImageModelCapabilities(connection, input.model),
      selectionOnly = edit.selectionOnly ?? true,
      local = selectionOnly && active.regions.length > 0;
    const context = {
      originalPrompt:
        source.imageEditContext?.originalPrompt ??
        source.prompt ??
        project.prompt,
      originalAssetId:
        source.imageEditContext?.originalAssetId ?? source.assetId,
      lastInstruction: source.imageEditContext?.lastInstruction,
      referenceAssetIds:
        source.imageEditContext?.referenceAssetIds ??
        project.attachments.flatMap((a) =>
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
    const reason = resolveEditCapabilityReason(
      capabilities,
      active,
      references.length,
      local,
      selectionOnly,
    );
    if (reason) throw new Error(reason);
    if (!local) {
      return prepareFullImageEditInputs({
        input,
        source,
        sourceAsset,
        document,
        active,
        compiled,
        context,
        references,
        selectionOnly,
        signal,
      });
    }
    return prepareLocalEditInputs({
      input,
      source,
      sourceAsset,
      document,
      active,
      compiled,
      context,
      references,
      capabilities,
      signal,
    });
  }

  async function prepareFullImageEditInputs(params: {
    input: CreateProjectInput;
    source: CanvasCollectionItem;
    sourceAsset: StoredGeneratedAsset;
    document: MaskDocument;
    active: MaskDocument;
    compiled: CompiledEditPrompt;
    context: NonNullable<CreateProjectInput["imageEditContext"]>;
    references: CreationAttachment[];
    selectionOnly: boolean;
    signal?: AbortSignal;
  }): Promise<CreateProjectInput[]> {
    const {
      input,
      source,
      sourceAsset,
      document,
      active,
      compiled,
      context,
      references,
      selectionOnly,
      signal,
    } = params;
    const attachments = [
      attachment(sourceAsset, "当前编辑原图", context.originalAssetId),
      ...references,
    ];
    if (active.regions.length && !selectionOnly) {
      const decoded = await decodeImage(sourceAsset.preview, signal);
      if (
        decoded.width !== document.width ||
        decoded.height !== document.height
      )
        throw new Error("原图尺寸已变化，请重新加载编辑区域。");
      const fullCrop: EditCrop = {
        x: 0,
        y: 0,
        width: document.width,
        height: document.height,
        regionIds: active.regions.map((region) => region.id),
      };
      attachments.splice(
        1,
        0,
        await storeAnnotatedAttachment(
          decoded,
          active,
          fullCrop,
          context.originalAssetId ?? source.assetId!,
          signal,
        ),
      );
    }
    return [
      {
        ...input,
        prompt: formatEditPrompt({
          current: input.prompt,
          originalPrompt: context.originalPrompt,
          previous: context.lastInstruction,
          local: false,
          instructions: compiled.instructions,
        }),
        imageSize: undefined,
        attachments,
        imageEditContext: { ...context, lastInstruction: input.prompt },
      },
    ];
  }

  async function prepareLocalEditInputs(params: {
    input: CreateProjectInput;
    source: CanvasCollectionItem;
    sourceAsset: StoredGeneratedAsset;
    document: MaskDocument;
    active: MaskDocument;
    compiled: CompiledEditPrompt;
    context: NonNullable<CreateProjectInput["imageEditContext"]>;
    references: CreationAttachment[];
    capabilities: ImageModelCapabilities;
    signal?: AbortSignal;
  }): Promise<CreateProjectInput[]> {
    const {
      input,
      source,
      sourceAsset,
      document,
      active,
      compiled,
      context,
      references,
      capabilities,
      signal,
    } = params;
    const decoded = await decodeImage(sourceAsset.preview, signal);
    if (decoded.width !== document.width || decoded.height !== document.height)
      throw new Error("原图尺寸已变化，请重新加载编辑区域。");
    const plan = planEditRegions(active),
      native = capabilities.operations.inpaint === "supported",
      groupId = crypto.randomUUID(),
      parentId = context.originalAssetId ?? source.assetId!,
      inputs: CreateProjectInput[] = [];
    for (const crop of plan.crops) {
      signal?.throwIfAborted();
      const cropped = cropImage(decoded, crop);
      const cropMime = resolveCanvasMime(cropped, "image/png");
      const cropAsset = await storeGeneratedAsset({
        source: cropped.toDataURL(cropMime),
        sourceKind: "upload",
        isAiGenerated: false,
        parentId,
        tags: ["编辑输入"],
        signal,
      });
      const images = [
        attachment(cropAsset, "当前编辑原图", context.originalAssetId),
        ...references,
      ];
      let maskAssetId: string | undefined;
      if (native) {
        const mask = drawMask(
          active,
          crop,
          cropped.width,
          cropped.height,
          true,
        );
        const maskMime = resolveCanvasMime(mask, "image/png");
        maskAssetId = (
          await storeGeneratedAsset({
            source: mask.toDataURL(maskMime),
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
        images.splice(
          1,
          0,
          await storeAnnotatedAttachment(
            decoded,
            active,
            crop,
            parentId,
            signal,
          ),
        );
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
          sourceAssetId: source.assetId!,
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
  async function composeEditResult(
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
      const image = await decodeImage(
        (await original(assetId)).preview,
        signal,
      );
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
    const composed = composePixels(base, generated, edit.document, edit.crop);
    const targetMime = resolveCanvasMime(composed, "image/png");
    return composed.toDataURL(targetMime);
  }
  async function composeNativeEditAsset(
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
      parentId:
        task.imageEditContext?.originalAssetId ?? task.imageEdit.sourceAssetId,
      tags: ["AI生成", "蒙版重绘"],
    });
  }

  return { prepareEditInputs, composeEditResult, composeNativeEditAsset };
}
