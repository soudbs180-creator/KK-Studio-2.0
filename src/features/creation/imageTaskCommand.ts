import type { CanvasCollectionItem } from "../../domain/canvasItems.ts";
import { reconcileProjectCanvas } from "../../domain/projectCanvas.ts";
import type { ProviderConnection } from "../../domain/providerConnections.ts";
import {
  MODEL_PROVIDER_STORAGE_KEY,
  parseModelProvider,
} from "../../domain/modelProvider.ts";
import {
  createTask,
  modelSupportsKind,
  type CreateProjectInput,
  type CreationProject,
  type CreationAttachment,
} from "./model.ts";
import {
  loadStoredAsset,
  type StoredGeneratedAsset,
} from "./assetRepository.ts";
import { hasApiKey } from "./providerCredentials.ts";
import {
  addProviderConnection,
  connectionFromModelProfile,
  readProviderConnections,
} from "./providerRegistry.ts";
import {
  assertSubmissionConnection,
  selectSubmissionConnection,
} from "./providerSubmission.ts";

export class ImageTaskCommandError extends Error {
  readonly configure: boolean;
  constructor(message: string, configure = false) {
    super(message);
    this.configure = configure;
  }
}

export function validateImageTaskInput(input: CreateProjectInput): void {
  if (!input.prompt.trim())
    throw new ImageTaskCommandError("请先填写图片描述。");
  if (input.prompt.length > 4000)
    throw new ImageTaskCommandError("图片描述不能超过 4000 字。");
  if (input.privacyMode === "platform_backed")
    throw new ImageTaskCommandError(
      "平台额度模式仍为 Prototype；当前不会上传素材或扣费。",
    );
  if (input.privacyMode === "local_only")
    throw new ImageTaskCommandError(
      "仅本地模式需要可执行的 ComfyUI 工作流；此入口尚未接入，请使用 BYOK 本地模式。",
    );
  if (!input.model.trim())
    throw new ImageTaskCommandError("请选择本次创作使用的模型。", true);
  if (!modelSupportsKind(input.model, input.kind) || input.kind !== "image")
    throw new ImageTaskCommandError("当前模型不支持图片创作，请改用图片模型。");
  const count = input.outputCount ?? 1;
  if (!Number.isInteger(count) || count < 1 || count > 64)
    throw new ImageTaskCommandError("图片数量必须为 1 至 64 的整数。");
}

/** Every entry uses this binding check; an existing project never swaps accounts. */
export async function prepareImageTask(
  input: CreateProjectInput,
  project?: CreationProject,
): Promise<ProviderConnection> {
  validateImageTaskInput(input);
  if (!project) {
    const profile = parseModelProvider(
      localStorage.getItem(MODEL_PROVIDER_STORAGE_KEY),
    ).profile;
    const connection = connectionFromModelProfile(profile);
    if (!(await hasApiKey(profile.baseUrl, connection.credentialRef)))
      throw new ImageTaskCommandError(
        "请先配置模型连接；当前草稿已保留，配置后再次提交。",
        true,
      );
    if (!readProviderConnections().some((item) => item.id === connection.id))
      addProviderConnection(connection);
  }
  const unbound =
    !project ||
    (!project.providerBaseUrl &&
      !project.providerCredentialRef &&
      project.tasks.length === 0);
  if (unbound) {
    if (!readProviderConnections().length)
      throw new ImageTaskCommandError(
        "请先配置模型连接；当前草稿已保留，配置后再次提交。",
        true,
      );
    return selectSubmissionConnection(input.attachments.length);
  }
  const binding = {
    id:
      project.tasks.at(-1)?.providerConnectionId ??
      readProviderConnections().find(
        (item) =>
          item.baseUrl === project.providerBaseUrl &&
          item.credentialRef === project.providerCredentialRef,
      )?.id,
    baseUrl: project.providerBaseUrl,
    credentialRef: project.providerCredentialRef,
    referenceCount: input.attachments.length,
  };
  const connection = assertSubmissionConnection(binding);
  if (!(await hasApiKey(connection.baseUrl!, connection.credentialRef)))
    throw new ImageTaskCommandError(
      "原绑定连接缺少密钥，请配置后重试；当前草稿已保留。",
      true,
    );
  return assertSubmissionConnection(binding);
}

export function appendImageTask(
  project: CreationProject,
  input: CreateProjectInput,
  connection: ProviderConnection,
  sourceItemId?: string,
) {
  if (sourceItemId && !project.items.some((item) => item.id === sourceItemId))
    throw new ImageTaskCommandError("来源节点已删除，未提交生成。");
  const bound = {
    ...project,
    providerBaseUrl: connection.baseUrl,
    providerName: connection.provider,
    providerCredentialRef: connection.credentialRef,
  };
  const task = {
    ...createTask({
      ...bound,
      prompt: input.prompt,
      model: input.model,
      kind: "image",
      attachments: input.attachments,
      composerDraft: {
        ...bound.composerDraft,
        outputCount: input.outputCount ?? 1,
        privacyMode: input.privacyMode ?? "byok_local",
      },
    }),
    sourceItemId,
    providerConnectionId: connection.id,
  };
  return {
    task,
    project: {
      ...bound,
      tasks: [...bound.tasks, task],
      items: bound.items.map((item) =>
        item.id === sourceItemId
          ? { ...item, generationStatus: "pending" as const }
          : item,
      ),
      updatedAt: Date.now(),
    },
  };
}

/** Publish each archived result once. A deleted source does not prevent archival. */
export function appendImageTaskResults(
  project: CreationProject,
  results: CanvasCollectionItem[],
  sourceItemId: string | null | undefined,
): CreationProject {
  const added = results.filter(
    (result) => !project.items.some((item) => item.id === result.id),
  );
  const items = [...project.items, ...added];
  const canvas = reconcileProjectCanvas(project.canvas, items);
  if (sourceItemId && project.items.some((item) => item.id === sourceItemId)) {
    canvas.edges = [
      ...canvas.edges,
      ...added.map((result) => ({
        id: `result-${result.id}`,
        source: sourceItemId,
        target: result.id,
        kind: "result" as const,
      })),
    ];
  }
  return { ...project, items, canvas };
}

/** Read archived originals only; an unreadable reference can never become text-to-image. */
export async function canvasImageAttachments(
  project: CreationProject,
  source: CanvasCollectionItem,
  read: (id: string) => Promise<StoredGeneratedAsset | null> = loadStoredAsset,
): Promise<CreationAttachment[]> {
  const incoming = project.canvas.edges
    .filter((edge) => edge.target === source.id && edge.kind !== "result")
    .map((edge) => project.items.find((item) => item.id === edge.source));
  const sources =
    source.assetId || source.preview || source.result
      ? [source, ...incoming]
      : incoming;
  const seen = new Set<string>();
  const attachments: CreationAttachment[] = [];
  for (const item of sources) {
    if (!item || item.kind !== "image" || !item.assetId)
      throw new ImageTaskCommandError(
        "参考图片尚未归档，未提交生成；请重新导入原件。",
      );
    if (seen.has(item.assetId)) continue;
    seen.add(item.assetId);
    const asset = await read(item.assetId);
    if (!asset || !/^image\/(png|jpeg|webp|gif)$/.test(asset.mime))
      throw new ImageTaskCommandError(
        "参考素材原件缺失或格式不支持，未提交生成。",
      );
    const encoded = asset.preview.match(
      /^data:image\/(?:png|jpeg|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/,
    )?.[1];
    if (!encoded)
      throw new ImageTaskCommandError("参考素材原件无法读取，未提交生成。");
    const size = atob(encoded).length;
    attachments.push({
      id: item.id,
      assetId: item.assetId,
      name: item.title,
      mime: asset.mime,
      size,
      dataUrl: `kk-asset:${item.assetId}`,
    });
  }
  return attachments;
}
