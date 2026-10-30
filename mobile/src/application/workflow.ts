import {
  retryableOutputIndices,
  type CreationTask,
  type CreationDraft,
} from "@kk-studio/creation-contracts";
import { ServiceError } from "../services/httpClient.ts";
import type {
  WorkflowHost,
  PendingArchive,
  SubmissionOptions,
} from "./types.ts";
import {
  providerConnection,
  projectRevision,
  errorMessage,
  capturedDraft,
  requireAccountContext,
} from "./types.ts";
import { submitGateway, reconcileTask } from "./gatewayWorkflow.ts";
import { submitVideo, recoverVideoTask } from "./videoWorkflow.ts";
import {
  isTwelveAiConnection,
  supportsImageReferences,
} from "../services/twelveAiProtocol.ts";
import { imageMime, MAX_IMAGE_BYTES } from "../services/imageBytes.ts";
import type { ImageInput } from "../services/providerTypes.ts";
import { videoModelProfile } from "../services/twelveAiVideoModels.ts";
import {
  archiveReceipt,
  verifyReceipt,
  updateTask as update,
} from "./archival.ts";

function taskFromDraft(
  host: WorkflowHost,
  draft: CreationDraft,
  retry?: CreationTask,
  indices?: number[],
  imageSize?: string,
): CreationTask {
  const now = host.deps.now(),
    id = host.deps.id();
  return {
    id,
    idempotencyKey: id,
    prompt: draft.prompt,
    model: draft.model,
    kind: draft.kind,
    status: "queued",
    submissionState: "intent",
    createdAt: now,
    updatedAt: now,
    attachments: structuredClone(draft.attachments),
    attempt: retry ? retry.attempt + 1 : 1,
    requestedOutputs:
      indices?.length ?? (draft.kind === "text" ? 1 : draft.outputCount),
    completedOutputs: 0,
    privacyMode: draft.privacyMode,
    providerConnectionId: draft.providerConnectionId,
    ...(imageSize !== undefined ? { imageSize } : {}),
    outputs: Array.from(
      {
        length:
          indices?.length ?? (draft.kind === "text" ? 1 : draft.outputCount),
      },
      (_, index) => ({
        index,
        status: "waiting",
        model: draft.model,
        createdAt: now,
      }),
    ),
    ...(retry ? { retryOfTaskId: retry.id, retryOutputIndices: indices } : {}),
  };
}
export async function recoverTask(
  host: WorkflowHost,
  taskId: string,
): Promise<void> {
  const ctx = host.context();
  await host.ensureSession();
  if (
    ctx.snapshot.projects.some((p) =>
      p.tasks.some((t) => t.id === taskId && t.kind === "video"),
    )
  ) {
    await recoverVideoTask(host, taskId);
    return;
  }
  if (host.pendingGateways.has(taskId)) {
    await reconcileTask(host, taskId);
    return;
  }
  const pending = host.recoveries.get(taskId);
  if (!pending || pending.accountId !== ctx.accountId)
    throw new Error("没有可恢复的本次回执。请核对供应商，不会重复付费生成。");
  await host.mutate(ctx, (repo) => repo.load());
  await archiveReceipt(host, ctx, pending);
}
export async function submit(
  host: WorkflowHost,
  retryTaskId?: string,
  options: SubmissionOptions = {},
): Promise<void> {
  const requestedImageSize = options.imageSize;
  const ctx = host.context(),
    projectId = ctx.snapshot.activeProjectId;
  if (!projectId) throw new Error("先创建或打开项目。");
  const busyKey = `${ctx.accountId}:${projectId}`;
  if (host.submitting.has(busyKey))
    throw new Error("当前项目已有生成进行中，请等待或停止。");
  host.submitting.add(busyKey);
  let task: CreationTask | undefined,
    controller: AbortController | undefined,
    clearedAt: number | undefined,
    captured: CreationDraft | undefined,
    intentPersisted = false;
  try {
    const project = ctx.snapshot.projects.find((p) => p.id === projectId)!;
    const retry = retryTaskId
      ? project.tasks.find((t) => t.id === retryTaskId)
      : undefined;
    const imageSize = retry ? retry.imageSize : requestedImageSize;
    let indices: number[] | undefined;
    if (retryTaskId) {
      if (!retry) throw new Error("重试任务不存在。");
      if (
        !retry.providerConnectionId ||
        !retry.providerCredentialRef ||
        !retry.providerBaseUrl
      )
        throw new Error(
          "原任务缺少可校验的连接身份，不能自动重试。保留的输入仍可核对。",
        );
      if (retry.imageEdit || retry.imageEditContext)
        throw new Error(
          "当前适配器不支持此图片编辑请求，不能忽略编辑字段后重试。",
        );
      indices = retryableOutputIndices(retry, retry.outputs ?? []);
      if (!indices.length)
        throw new Error(
          "该任务受理状态不明或没有安全失败输出；请先核对，不可重试。",
        );
      if (
        project.tasks.some(
          (t) =>
            t.retryOfTaskId === retry!.id &&
            ["intent", "submitted", "unknown"].includes(
              t.submissionState ?? "",
            ) &&
            t.status !== "failed" &&
            t.status !== "cancelled" &&
            t.retryOutputIndices?.some((index) => indices!.includes(index)),
        )
      )
        throw new Error("该输出已有未完成或受理不明的重试任务，请先核对。");
    }
    captured = structuredClone(
      retry ? capturedDraft(retry, host.deps.now()) : project.composerDraft,
    );
    const metadata = ctx.snapshot.connections.find(
      (c) => c.id === captured!.providerConnectionId,
    );
    if (!metadata) throw new Error("请先设置模型连接。");
    const receiptProtocol = retry
      ? project.executionReceipts?.find((r) => r.taskId === retry.id)?.protocol
      : undefined;
    if (receiptProtocol === "comfyui")
      throw new Error(
        "ComfyUI 工作流任务须在工作流控制台核对，不能通过普通生成重试。",
      );
    const connection = {
      ...providerConnection(metadata),
      ...(receiptProtocol ? { protocol: receiptProtocol } : {}),
      ...(retry?.providerBaseUrl ? { baseUrl: retry.providerBaseUrl } : {}),
      ...(retry?.providerCredentialRef
        ? { credentialRef: retry.providerCredentialRef }
        : {}),
    };
    if (connection.protocol === "kk-image-jobs") requireAccountContext(ctx);
    await host.ensureSession();
    if (!host.valid(ctx)) throw new Error("会话已变化，请重新登录。");
    if (
      connection.protocol === "kk-image-jobs" &&
      (captured.kind !== "image" || !host.deps.gateway)
    )
      throw new Error("此连接没有可执行的当前类型适配器。");
    if (!captured.prompt.trim() || !captured.model.trim())
      throw new Error("请输入内容并选择模型。");
    if (
      captured.kind !== "text" &&
      captured.kind !== "image" &&
      captured.kind !== "video"
    )
      throw new Error("当前连接没有可执行的视频或音频适配器。");
    if (
      captured.kind === "video" &&
      (!host.deps.video ||
        !isTwelveAiConnection(connection) ||
        !videoModelProfile(captured.model))
    )
      throw new Error(
        "此连接或模型尚无已接入的文本生视频协议，请选择受支持的 12ai 模型。",
      );
    if (
      captured.kind === "video" &&
      (captured.outputCount !== 1 || captured.prompt.length > 5000)
    )
      throw new Error("文本生视频每次生成一条，提示词最多 5000 字符。");
    if (captured.kind !== "video" && !connection.capabilities[captured.kind])
      throw new Error("该连接未启用当前类型端点，请检查连接设置。");
    if (
      imageSize !== undefined &&
      (captured.kind !== "image" ||
        !imageSize.trim() ||
        !connection.capabilities.imageSizes?.includes(imageSize))
    )
      throw new Error(
        "图片尺寸未在此连接声明支持，请选择支持的尺寸或默认尺寸。",
      );
    if (
      !retry &&
      project.tasks.some(
        (t) =>
          ["submitted", "unknown"].includes(t.submissionState ?? "") &&
          t.prompt === captured!.prompt &&
          t.model === captured!.model &&
          t.providerConnectionId === captured!.providerConnectionId &&
          t.kind === captured!.kind,
      )
    )
      throw new Error(
        "同一输入已有未完成或受理不明任务，请先核对任务，不能重复生成。",
      );
    if (
      captured.attachments.length &&
      (captured.kind !== "image" ||
        !supportsImageReferences(connection, captured.model))
    )
      throw new Error(
        "当前生成适配器尚不支持参考素材。请移除参考后生成；不会静默忽略。",
      );
    const referenceImages: NonNullable<ImageInput["referenceImages"]> = [];
    for (const attachment of captured.attachments) {
      if (
        !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
          attachment.mime,
        )
      )
        throw new Error(
          "此图片编辑通道仅支持 PNG、JPEG、WebP 或 GIF 图片参考。",
        );
      const asset = ctx.snapshot.assets.find(
        (asset) => asset.id === attachment.assetId,
      );
      if (
        !asset ||
        asset.mime !== attachment.mime ||
        asset.size !== attachment.size
      )
        throw new Error("参考素材与已保存原件的 MIME 或大小不一致。");
      const bytes = await ctx.repo.readOriginal(asset.id);
      if (!host.valid(ctx)) throw new Error("会话已变化，参考图提交已停止。");
      const mime = imageMime(bytes);
      if (
        mime !== attachment.mime ||
        bytes.byteLength !== attachment.size ||
        bytes.byteLength > MAX_IMAGE_BYTES
      )
        throw new Error("参考图片原件的 MIME 或大小无效。");
      referenceImages.push({ assetId: asset.id, bytes, mime });
    }
    task = {
      ...taskFromDraft(host, captured, retry, indices, imageSize),
      providerCredentialRef: connection.credentialRef,
      providerBaseUrl: connection.baseUrl,
      providerName: metadata.name,
      ...(retry
        ? {
            providerConnectionId: retry.providerConnectionId,
            providerCredentialRef: retry.providerCredentialRef,
            providerBaseUrl: retry.providerBaseUrl,
            providerName: retry.providerName,
            imageSize: retry.imageSize,
            imageEdit: structuredClone(retry.imageEdit),
            imageEditContext: structuredClone(retry.imageEditContext),
            sourceItemId: retry.sourceItemId,
          }
        : {}),
    };
    await host.mutate(ctx, (repo, s) =>
      repo.appendTask(projectId, task!, projectRevision(s, projectId)),
    );
    intentPersisted = true;
    await host.mutate(ctx, (repo, s) =>
      repo.appendMessage(
        projectId,
        {
          id: host.deps.id(),
          projectId,
          conversationId: projectId,
          taskId: task!.id,
          role: "user",
          text: task!.prompt,
          createdAt: host.deps.now(),
        },
        projectRevision(s, projectId),
      ),
    );
    if (
      !retry &&
      ctx.snapshot.projects.find((p) => p.id === projectId)?.composerDraft
        .updatedAt === captured.updatedAt
    ) {
      await host.mutate(ctx, (repo, s) =>
        repo.saveDraft(
          projectId,
          { ...captured!, prompt: "", attachments: [] },
          projectRevision(s, projectId),
        ),
      );
      clearedAt = ctx.snapshot.projects.find((p) => p.id === projectId)!
        .composerDraft.updatedAt;
    }
    if (!host.valid(ctx)) throw new ServiceError("CANCELLED_BEFORE_SUBMISSION");
    task = {
      ...task,
      status: "running",
      submissionState: "submitted",
      submittedAt: host.deps.now(),
      updatedAt: host.deps.now(),
      outputs: task.outputs!.map((o) => ({ ...o, status: "running" })),
    };
    await update(host, ctx, projectId, task);
    await host.mutate(ctx, (repo, s) =>
      repo.saveExecutionReceipt(
        projectId,
        {
          taskId: task!.id,
          connectionId: connection.id,
          protocol: connection.protocol,
        },
        projectRevision(s, projectId),
      ),
    );
    controller = new AbortController();
    host.active.set(task.id, { context: ctx, projectId, controller });
    host.publish();
    const input = {
      submissionId: task.idempotencyKey,
      projectId,
      connection,
      model: task.model,
      prompt: task.prompt,
      attachments: task.attachments,
    };
    if (task.kind === "video") {
      await submitVideo(host, ctx, projectId, task, input, controller.signal);
      return;
    }
    const client = host.deps.provider(ctx.vault);
    if (connection.protocol === "kk-image-jobs") {
      await submitGateway(
        host,
        ctx,
        projectId,
        task,
        { ...input, count: task.requestedOutputs },
        controller.signal,
      );
      return;
    }
    let stream = "";
    const receipt =
      task.kind === "text"
        ? await client.generateText(
            input,
            (delta) => {
              stream += delta;
              host.stream(ctx, task!.id, stream);
            },
            controller.signal,
          )
        : await client.generateImages(
            {
              ...input,
              count: task.requestedOutputs,
              size: task.imageSize,
              referenceImages,
            },
            controller.signal,
          );
    verifyReceipt(receipt, task, projectId);
    const pending: PendingArchive = {
      accountId: ctx.accountId,
      projectId,
      task,
      receipt,
      complete: receipt.submissionState === "terminal",
    };
    host.recoveries.set(task.id, pending);
    if (!host.valid(ctx))
      throw new ServiceError("SESSION_CHANGED_AFTER_SUBMISSION", "unknown");
    await archiveReceipt(host, ctx, pending);
  } catch (error) {
    host.report(error);
    if (!task || !intentPersisted) throw error;
    if (error instanceof ServiceError && error.recoveryReceipt) {
      const pending = {
        accountId: ctx.accountId,
        projectId,
        task,
        receipt: error.recoveryReceipt,
        complete: false,
      };
      host.recoveries.set(task.id, pending);
      try {
        await archiveReceipt(host, ctx, pending);
      } catch (archiveError) {
        host.report(archiveError);
      }
    }
    const current =
      ctx.snapshot.projects
        .find((p) => p.id === projectId)
        ?.tasks.find((t) => t.id === task!.id) ?? task;
    if (
      current.status === "succeeded" &&
      current.completedOutputs === current.requestedOutputs
    )
      return;
    const uncertain =
      host.recoveries.has(task.id) ||
      host.pendingGateways.has(task.id) ||
      !host.valid(ctx) ||
      (error instanceof ServiceError
        ? error.submissionState === "unknown" ||
          error.submissionState === "submitted"
        : task.submissionState === "submitted");
    const failure: CreationTask = {
      ...current,
      status: uncertain
        ? current.completedOutputs > 0
          ? "partial"
          : "unknown"
        : "failed",
      submissionState: uncertain ? "unknown" : "terminal",
      error: errorMessage(error),
      updatedAt: host.deps.now(),
      outputs: current.outputs?.map((o) =>
        o.status === "succeeded"
          ? o
          : {
              ...o,
              status: uncertain ? "unknown" : "failed",
              error: errorMessage(error),
            },
      ),
    };
    try {
      await update(host, ctx, projectId, failure);
      const p = ctx.snapshot.projects.find((p) => p.id === projectId);
      if (
        captured &&
        clearedAt !== undefined &&
        p?.composerDraft.updatedAt === clearedAt
      )
        await host.mutate(ctx, (repo, s) =>
          repo.restoreDraft(
            projectId,
            captured!,
            clearedAt!,
            projectRevision(s, projectId),
          ),
        );
    } catch (storageError) {
      host.report(storageError);
    }
  } finally {
    if (task) host.active.delete(task.id);
    host.submitting.delete(busyKey);
    host.publish();
  }
}
