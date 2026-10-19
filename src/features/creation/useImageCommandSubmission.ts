import React, { useRef, type SetStateAction } from "react";
import {
  type CreateProjectInput,
  type CreationDraft,
  type CreationProject,
  type CreationSnapshot,
  type CreationTask,
  createProject,
  emptyDraft,
} from "./model.ts";
import type { CanvasCollectionItem } from "../../domain/canvasItems.ts";
import type { CanvasImageRequest } from "./CanvasImageCommand.ts";
import { compileEditPrompt } from "../image-edit/prompt.ts";
import { imageCapabilitiesForSelection } from "../models/imageModelCapabilities.ts";
import {
  getDisabledReason,
  getGenerationUiState,
} from "../../domain/uiGovernance.ts";
import {
  appendImageTask,
  canvasImageAttachments,
  prepareImageTask,
  ImageTaskCommandError,
} from "./imageTaskCommand.ts";
import { updateProjectChatView } from "../agent/chatProjectUpdate.ts";
import { prepareEditInputs } from "../image-edit/editTasks.ts";
import { readProviderConnections } from "./providerRegistry.ts";
import type { ProviderConnection } from "../../domain/providerConnections.ts";
import { agentConnection } from "../agent/agentConnection.ts";
import { rootItemId } from "./useTaskExecution.ts";
import type { SaveState } from "./useCreationStorage.ts";

export type ImageCommandRequest =
  | {
      origin: "home" | "chat" | "agent" | "plugin";
      input: CreateProjectInput;
    }
  | { origin: "canvas"; input: CanvasImageRequest };

export interface UseImageCommandSubmissionOptions {
  creationRef: React.MutableRefObject<CreationSnapshot>;
  activeProjectIdRef: React.MutableRefObject<string | null | undefined>;
  persistence: {
    state: SaveState;
    flush: () => Promise<void>;
  };
  homeModelConfig: {
    model: string;
    configured: boolean;
  };
  executeTask: (
    projectId: string,
    taskId: string,
    initialProject?: CreationProject,
  ) => Promise<void>;
  cancelTask: (taskId: string) => void;
  commitCreation: (snapshot: CreationSnapshot) => void;
  replaceCanvasItems: (
    action: SetStateAction<CanvasCollectionItem[]>,
  ) => CanvasCollectionItem[];
  onNavigateToWorkspace?: () => void;
  onOpenSettingsProviders?: () => void;
  submitLock?: React.MutableRefObject<boolean>;
  prepareTask?: typeof prepareImageTask;
}

export interface UseImageCommandSubmissionReturn {
  submitImageCommand: (
    request: ImageCommandRequest,
    onAccepted?: (taskId: string) => void,
    validateAcceptance?: () => string | undefined,
  ) => Promise<string | undefined>;
  submitLock: React.MutableRefObject<boolean>;
}

export function canvasSignature(project: CreationProject, id: string): string {
  return JSON.stringify({
    items: project.items.filter(
      (item) =>
        item.id === id ||
        project.canvas.edges.some(
          (edge) =>
            edge.target === id &&
            edge.kind !== "result" &&
            edge.source === item.id,
        ),
    ),
    edges: project.canvas.edges.filter(
      (edge) => edge.target === id && edge.kind !== "result",
    ),
  });
}

/**
 * 纯逻辑任务提交构造器：可供 Hook 包装或无 UI 上下文时直接调用。
 */
export function createSubmissionLogic(
  options: UseImageCommandSubmissionOptions,
): UseImageCommandSubmissionReturn {
  const {
    creationRef,
    activeProjectIdRef,
    persistence,
    homeModelConfig,
    executeTask,
    cancelTask,
    commitCreation,
    replaceCanvasItems,
    onNavigateToWorkspace,
    onOpenSettingsProviders,
    prepareTask = prepareImageTask,
  } = options;

  const submitLock = options.submitLock ?? { current: false };

  async function submitImageCommand(
    request: ImageCommandRequest,
    onAccepted?: (taskId: string) => void,
    validateAcceptance?: () => string | undefined,
  ): Promise<string | undefined> {
    const preflight = validatePreflight({
      request,
      submitLock,
      persistenceState: persistence.state,
      creationSnapshot: creationRef.current,
      activeProjectId: activeProjectIdRef.current ?? undefined,
      homeModelConfig,
      validateAcceptance,
    });
    if (preflight.error) return preflight.error;

    const { projectId, original, effectivePrompt, codexCanvas } = preflight;
    const signal =
      request.origin === "canvas" ? request.input.signal : undefined;
    const draftAtStart = creationRef.current.homeDraft;

    submitLock.current = true;
    try {
      const canvasFlow = await checkAndHandleCanvasOrigin({
        request,
        original,
        codexCanvas,
        projectId,
        signal,
        creationRef,
        activeProjectIdRef,
      });
      if (canvasFlow.sourceError) return canvasFlow.sourceError;
      if (canvasFlow.earlyReturn !== undefined) return canvasFlow.earlyReturn;

      const input = await resolveCommandInput(request, original);
      if (signal?.aborted) return "已取消提交，草稿和参考图已保留。";

      const { connection, editInputs } = await prepareEditPlan({
        request,
        input,
        original,
        effectivePrompt,
        signal,
        prepareTask,
      });

      const current = projectId
        ? creationRef.current.projects.find((p) => p.id === projectId)
        : undefined;

      const consistencyCheck = validateConsistencyAfterPreflight({
        projectId,
        current,
        activeProjectId: activeProjectIdRef.current ?? undefined,
        signal,
        request,
        original,
        validateAcceptance,
      });
      if (consistencyCheck) return consistencyCheck;

      const base = current ?? createProject(input);
      const rootSourceId =
        request.origin === "canvas"
          ? request.input.sourceItemId
          : (rootItemId(base) ?? undefined);

      const { nextProject, appendedTaskId } = appendTaskSeries({
        base,
        editInputs,
        connection,
        rootSourceId,
        request,
        current,
        inputPrompt: input.prompt,
        inputAttachments: input.attachments,
      });

      commitAndDeployProjectState({
        current,
        nextProject,
        baseId: base.id,
        projectId,
        requestOrigin: request.origin,
        draftAtStart,
        creationRef,
        activeProjectIdRef,
        commitCreation,
        replaceCanvasItems,
        onNavigateToWorkspace,
      });

      await persistence.flush();

      const postSaveError = verifyPostSaveSafety({
        validateAcceptance,
        signal,
        projectId,
        activeProjectId: activeProjectIdRef.current ?? undefined,
        cancelTask,
        taskId: appendedTaskId,
        requestOrigin: request.origin,
      });
      if (postSaveError) return postSaveError;

      onAccepted?.(appendedTaskId);
      void executeTask(nextProject.id, appendedTaskId, nextProject);
      return undefined;
    } catch (error) {
      if (error instanceof ImageTaskCommandError && error.configure) {
        onOpenSettingsProviders?.();
      }
      return error instanceof Error
        ? error.message
        : "无法提交图片任务，当前草稿已保留。";
    } finally {
      submitLock.current = false;
    }
  }

  return { submitImageCommand, submitLock };
}

/**
 * 图片命令提交 Hook：负责跨画布、对话、首页与插件等入口的统一任务生成前置校验、Codex/API 派发与草稿落盘。
 */
export function useImageCommandSubmission(
  options: UseImageCommandSubmissionOptions,
): UseImageCommandSubmissionReturn {
  const internalLock = useRef(false);
  return createSubmissionLogic({
    ...options,
    submitLock: options.submitLock ?? internalLock,
  });
}

// ---------------------------------------------------------------------------
// 细粒度校验与派发子函数（控制函数 CC <= 20）
// ---------------------------------------------------------------------------

interface PreflightParams {
  request: ImageCommandRequest;
  submitLock: React.MutableRefObject<boolean>;
  persistenceState: SaveState;
  creationSnapshot: CreationSnapshot;
  activeProjectId?: string;
  homeModelConfig: { model: string; configured: boolean };
  validateAcceptance?: () => string | undefined;
}

interface PreflightResult {
  error?: string;
  projectId?: string;
  original?: CreationProject;
  effectivePrompt: string;
  codexCanvas: boolean;
}

export function validatePreflightGuards(params: {
  submitLock: React.MutableRefObject<boolean>;
  persistenceState: SaveState;
  validateAcceptance?: () => string | undefined;
}): string | undefined {
  const initialBlock = params.validateAcceptance?.();
  if (initialBlock) return initialBlock;
  if (params.submitLock.current) return "正在提交图片任务，请稍候。";
  if (!["saved", "saving"].includes(params.persistenceState))
    return "请先处理项目读取或保存提示，当前未提交生成。";
  return undefined;
}

function resolvePromptForSubmission(request: ImageCommandRequest): {
  prompt: string;
  error?: string;
} {
  let effectivePrompt = request.input.prompt;
  if (request.origin === "canvas" && request.input.imageEdit) {
    try {
      const compiled = compileEditPrompt(
        effectivePrompt,
        request.input.imageEdit.document,
      );
      if (!effectivePrompt.trim() && compiled.instructions.length) {
        effectivePrompt = "按已确认的区域修改意见编辑图片。";
      }
    } catch (error) {
      return {
        prompt: "",
        error: error instanceof Error ? error.message : "区域引用无效。",
      };
    }
  }
  return { prompt: effectivePrompt };
}

export function checkSubmissionUiReadiness(options: {
  effectivePrompt: string;
  request: ImageCommandRequest;
  codexCanvas: boolean;
  homeModelConfig: { model: string; configured: boolean };
  activeTask?: CreationTask;
}): string | undefined {
  const { effectivePrompt, request, codexCanvas, homeModelConfig, activeTask } =
    options;
  const isAgent = request.origin === "agent";
  const modelConfigured = isAgent || codexCanvas || homeModelConfig.configured;
  const serviceConfigured =
    isAgent ||
    codexCanvas ||
    (homeModelConfig.configured && Boolean(request.input.model.trim()));
  const online = typeof navigator === "undefined" ? true : navigator.onLine;

  const taskStatus = activeTask
    ? activeTask.status === "queued"
      ? ("queued" as const)
      : ("running" as const)
    : undefined;

  const uiState = getGenerationUiState({
    prompt: effectivePrompt,
    inputValid: Boolean(effectivePrompt.trim()),
    modelConfigured,
    quotaAvailable: true,
    online,
    serviceConfigured,
    taskStatus,
  });

  if (uiState !== "ready" && !isAgent) {
    return getDisabledReason(uiState) ?? "当前任务暂不可提交。";
  }
  return undefined;
}

function validatePreflight(params: PreflightParams): PreflightResult {
  const guardError = validatePreflightGuards(params);
  if (guardError)
    return { error: guardError, effectivePrompt: "", codexCanvas: false };

  const { request, creationSnapshot, activeProjectId, homeModelConfig } =
    params;
  const projectId = request.origin === "home" ? undefined : activeProjectId;
  const original = creationSnapshot.projects.find(
    (project) => project.id === projectId,
  );
  if (request.origin !== "home" && !original) {
    return {
      error: "请先新建或打开项目。",
      effectivePrompt: "",
      codexCanvas: false,
    };
  }

  const { prompt: effectivePrompt, error: promptError } =
    resolvePromptForSubmission(request);
  if (promptError)
    return { error: promptError, effectivePrompt: "", codexCanvas: false };

  const activeTask = original?.tasks.find(
    (task) => task.status === "queued" || task.status === "running",
  );
  const codexCanvas = Boolean(
    request.origin === "canvas" &&
      original?.items.some(
        (item) =>
          item.id === request.input.sourceItemId &&
          item.generationSource === "codex",
      ),
  );

  const readinessError = checkSubmissionUiReadiness({
    effectivePrompt,
    request,
    codexCanvas,
    homeModelConfig,
    activeTask,
  });
  if (readinessError) {
    return { error: readinessError, effectivePrompt, codexCanvas };
  }

  return { projectId, original, effectivePrompt, codexCanvas };
}

async function checkAndHandleCanvasOrigin(options: {
  request: ImageCommandRequest;
  original?: CreationProject;
  codexCanvas: boolean;
  projectId?: string;
  signal?: AbortSignal;
  creationRef: React.MutableRefObject<CreationSnapshot>;
  activeProjectIdRef: React.MutableRefObject<string | null | undefined>;
}): Promise<{ earlyReturn?: string | undefined; sourceError?: string }> {
  if (options.request.origin !== "canvas") return {};
  const {
    request,
    original,
    codexCanvas,
    projectId,
    signal,
    creationRef,
    activeProjectIdRef,
  } = options;

  const sourceId = request.input.sourceItemId;
  const source = original?.items.find((item) => item.id === sourceId);
  if (!source || (source.kind !== "image" && source.kind !== "text")) {
    return { sourceError: "来源节点已删除或不支持，当前未提交生成。" };
  }

  if (codexCanvas) {
    const sourceSig = canvasSignature(original!, source.id);
    const result = await submitCodexCanvasFlow({
      requestInput: request.input,
      original: original!,
      source,
      sourceSig,
      projectId,
      signal,
      creationRef,
      activeProjectIdRef,
    });
    return { earlyReturn: result };
  }

  return {};
}

interface CodexCanvasFlowParams {
  requestInput: CanvasImageRequest;
  original: CreationProject;
  source: CanvasCollectionItem;
  sourceSig: string;
  projectId?: string;
  signal?: AbortSignal;
  creationRef: React.MutableRefObject<CreationSnapshot>;
  activeProjectIdRef: React.MutableRefObject<string | null | undefined>;
}

async function submitCodexCanvasFlow(
  params: CodexCanvasFlowParams,
): Promise<string | undefined> {
  const {
    requestInput,
    original,
    source,
    sourceSig,
    projectId,
    signal,
    creationRef,
    activeProjectIdRef,
  } = params;

  if (requestInput.imageEdit?.document.regions.length)
    return "Codex 卡片暂不支持局部区域编辑，请选择支持编辑的 API 连接。";

  const validate = () => {
    if (signal?.aborted) return "已取消提交，草稿和参考图已保留。";
    const current = creationRef.current.projects.find(
      (project) => project.id === projectId,
    );
    if (!current || activeProjectIdRef.current !== projectId)
      return "项目已切换，当前未提交生成。";
    if (
      current.tasks.some(
        (task) => task.status === "queued" || task.status === "running",
      )
    )
      return "已有任务正在执行，当前未重复提交。";
    if (canvasSignature(current, source.id) !== sourceSig)
      return "节点或参考图在检查期间发生变化，请重新提交；当前内容已保留。";
    return undefined;
  };

  const beforeRead = validate();
  if (beforeRead) return beforeRead;

  const attachments = await canvasImageAttachments(original, source);
  if (source.kind === "text" && attachments.length)
    return "Codex 文本卡片暂不接收参考图片，请在右侧 Agent 面板提交。";

  const afterRead = validate();
  if (afterRead) return afterRead;

  return agentConnection.generateFromCanvas({
    nodeId: source.id,
    prompt: requestInput.prompt,
    model: requestInput.model,
    count: requestInput.count,
    kind: source.kind as "image" | "text",
    attachments: attachments.map((attachment) => ({
      ...attachment,
      canvasNodeId: attachment.id,
    })),
    signal,
    validate,
  });
}

async function resolveCommandInput(
  request: ImageCommandRequest,
  original?: CreationProject,
): Promise<CreateProjectInput> {
  if (request.origin !== "canvas") return structuredClone(request.input);

  const sourceItemId = request.input.sourceItemId;
  const source = original!.items.find((item) => item.id === sourceItemId)!;

  const attachments =
    source.kind === "text"
      ? []
      : await canvasImageAttachments(original!, source);

  const imageOperation =
    request.input.imageEdit?.document.regions.length &&
    imageCapabilitiesForSelection(
      {
        source: "api",
        model: request.input.model,
        connectionId:
          source.providerConnectionId ??
          original!.composerDraft.providerConnectionId,
      },
      readProviderConnections(),
    ).operations.inpaint === "supported"
      ? ("inpaint" as const)
      : undefined;

  return {
    prompt: request.input.prompt,
    model: request.input.model,
    providerConnectionId: source.providerConnectionId,
    kind: source.kind,
    attachments,
    outputCount: request.input.count,
    privacyMode: original!.composerDraft.privacyMode,
    imageSize:
      source.kind === "text" || source.assetId
        ? undefined
        : source.parameters?.imageSize,
    imageOperation,
  };
}

interface EditPlanParams {
  request: ImageCommandRequest;
  input: CreateProjectInput;
  original?: CreationProject;
  effectivePrompt: string;
  signal?: AbortSignal;
  prepareTask?: typeof prepareImageTask;
}

async function prepareEditPlan(
  params: EditPlanParams,
): Promise<{ connection: ProviderConnection; editInputs: CreateProjectInput[] }> {
  const { request, input, original, effectivePrompt, signal, prepareTask = prepareImageTask } = params;

  const connection = await prepareTask(
    { ...input, prompt: effectivePrompt },
    original,
  );

  const editSource =
    request.origin === "canvas"
      ? original?.items.find((item) => item.id === request.input.sourceItemId)
      : undefined;

  const editRequest =
    request.origin === "canvas"
      ? (request.input.imageEdit ??
        (editSource?.assetId && editSource.kind === "image"
          ? { document: { width: 1, height: 1, regions: [] } }
          : undefined))
      : undefined;

  const editInputs =
    editRequest && editSource && original
      ? await prepareEditInputs(
          input,
          editSource,
          original,
          connection,
          editRequest,
          signal,
        )
      : [input];

  for (const editInput of editInputs)
    await prepareTask(editInput, original);

  return { connection, editInputs };
}

interface ConsistencyParams {
  projectId?: string;
  current?: CreationProject;
  activeProjectId?: string;
  signal?: AbortSignal;
  request: ImageCommandRequest;
  original?: CreationProject;
  validateAcceptance?: () => string | undefined;
}

function validateConsistencyAfterPreflight(
  params: ConsistencyParams,
): string | undefined {
  const {
    projectId,
    current,
    activeProjectId,
    signal,
    request,
    original,
    validateAcceptance,
  } = params;

  if (signal?.aborted) return "已取消提交，草稿和参考图已保留。";

  if (projectId && (!current || activeProjectId !== projectId))
    return "项目已切换，当前未提交生成。";

  if (
    current?.tasks.some(
      (task) => task.status === "queued" || task.status === "running",
    )
  )
    return "已有任务正在执行，当前未重复提交。";

  if (request.origin === "canvas" && current && original) {
    const sourceItemId = request.input.sourceItemId;
    const originalSig = canvasSignature(original, sourceItemId);
    if (canvasSignature(current, sourceItemId) !== originalSig)
      return "节点或参考图在检查期间发生变化，请重新提交；当前内容已保留。";
  }

  const acceptanceBlock = validateAcceptance?.();
  if (acceptanceBlock) return acceptanceBlock;

  if (request.origin === "chat" && current?.activeChatId !== original?.activeChatId)
    return "聊天已切换，未提交；原聊天草稿仍保留。";

  return undefined;
}

interface AppendTaskParams {
  base: CreationProject;
  editInputs: CreateProjectInput[];
  connection: ProviderConnection;
  rootSourceId?: string;
  request: ImageCommandRequest;
  current?: CreationProject;
  inputPrompt: string;
  inputAttachments: CreateProjectInput["attachments"];
}

function appendTaskSeries(params: AppendTaskParams): {
  nextProject: CreationProject;
  appendedTaskId: string;
} {
  const {
    base,
    editInputs,
    connection,
    rootSourceId,
    request,
    current,
    inputPrompt,
    inputAttachments,
  } = params;

  const firstAppended = appendImageTask(
    base,
    editInputs[0],
    connection,
    rootSourceId,
  );
  let nextProject: CreationProject = firstAppended.project;

  for (const editInput of editInputs.slice(1)) {
    nextProject = appendImageTask(
      nextProject,
      editInput,
      connection,
      rootSourceId,
    ).project;
  }

  if (request.origin === "chat") {
    nextProject = updateProjectChatView(nextProject, () => ({
      ...nextProject,
      prompt: inputPrompt,
      attachments: inputAttachments,
      messages: [
        ...current!.messages,
        {
          id: `${base.id}-message-${firstAppended.task.id}`,
          taskId: firstAppended.task.id,
          role: "user",
          content: inputPrompt,
          createdAt: Date.now(),
        },
      ],
    }));
  }

  return {
    nextProject,
    appendedTaskId: firstAppended.task.id,
  };
}

function commitAndDeployProjectState(options: {
  current?: CreationProject;
  nextProject: CreationProject;
  baseId: string;
  projectId?: string;
  requestOrigin: string;
  draftAtStart: CreationDraft;
  creationRef: React.MutableRefObject<CreationSnapshot>;
  activeProjectIdRef: React.MutableRefObject<string | null | undefined>;
  commitCreation: (snapshot: CreationSnapshot) => void;
  replaceCanvasItems: (
    action: SetStateAction<CanvasCollectionItem[]>,
  ) => CanvasCollectionItem[];
  onNavigateToWorkspace?: () => void;
}): void {
  const {
    current,
    nextProject,
    baseId,
    projectId,
    requestOrigin,
    draftAtStart,
    creationRef,
    activeProjectIdRef,
    commitCreation,
    replaceCanvasItems,
    onNavigateToWorkspace,
  } = options;

  commitCreation({
    ...creationRef.current,
    projects: current
      ? creationRef.current.projects.map((project) =>
          project.id === projectId ? nextProject : project,
        )
      : [nextProject, ...creationRef.current.projects],
    activeProjectId: current ? creationRef.current.activeProjectId : baseId,
    homeDraft:
      requestOrigin === "home" && creationRef.current.homeDraft === draftAtStart
        ? emptyDraft()
        : creationRef.current.homeDraft,
  });

  if (!current || activeProjectIdRef.current === projectId) {
    replaceCanvasItems(nextProject.items);
  }

  if (!current) {
    performWorkspaceTransition(onNavigateToWorkspace);
  }
}

function verifyPostSaveSafety(options: {
  validateAcceptance?: () => string | undefined;
  signal?: AbortSignal;
  projectId?: string;
  activeProjectId?: string;
  cancelTask: (id: string) => void;
  taskId: string;
  requestOrigin?: string;
}): string | undefined {
  const {
    validateAcceptance,
    signal,
    projectId,
    activeProjectId,
    cancelTask,
    taskId,
    requestOrigin,
  } = options;

  const afterSaveBlock = validateAcceptance?.();
  if (afterSaveBlock) {
    cancelTask(taskId);
    return afterSaveBlock;
  }
  if (
    signal?.aborted ||
    (requestOrigin !== "chat" && projectId && activeProjectId !== projectId)
  ) {
    cancelTask(taskId);
    return "已取消提交，任务未发送。";
  }
  return undefined;
}

function performWorkspaceTransition(onNavigate?: () => void): void {
  if (typeof document !== "undefined" && "startViewTransition" in document) {
    (
      document as Document & {
        startViewTransition: (cb: () => void) => void;
      }
    ).startViewTransition(() => {
      onNavigate?.();
    });
  } else {
    onNavigate?.();
  }
}
