import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
export {
  CanvasOperationsContext,
  useCanvasOperations,
  useCanvasOperationsRuntime,
} from "./canvasOperationsRuntime.tsx";

import type {
  AssetPort,
  CreationTask,
  ImageEditRequest,
  ImageCapabilitySpec,
} from "../../packages/creation-contracts/index.ts";
import type {
  CanvasCollectionItem,
  CanvasReference,
} from "../domain/canvasItems";
import { imageReferenceCount } from "../domain/imageReferences";
import { useModelCapabilityUpdates } from "./modelCapabilityUpdates.ts";
import type {
  ModelSelection,
  CapabilitySupport,
} from "../../packages/creation-contracts/index.ts";

export interface CanvasImageRequest {
  providerConnectionId?: string;
  imageEdit?: ImageEditRequest;
  sourceItemId: string;
  prompt: string;
  model: string;
  count: number;
  signal: AbortSignal;
  imageCapability?: ImageCapabilitySpec;
}
export const CanvasImageCommandContext = createContext<{
  flush?: () => Promise<void>;
  assets?: Pick<AssetPort, "read">;
  modelCapabilities?: (selection: ModelSelection) => CanvasModelCapabilities;
  agent?: {
    subscribe: (listener: () => void) => () => void;
    getState: () => {
      status: string;
      sending: boolean;
      canvasNodeId?: string;
      error: string | null;
    };
    interrupt: () => Promise<unknown>;
  };
  submit: (request: CanvasImageRequest) => Promise<string | undefined>;
  cancel: (taskId: string) => void;
  query?: (taskId: string) => Promise<void>;
  tasks: CreationTask[];
  items?: CanvasCollectionItem[];
  updateItem?: (id: string, patch: Partial<CanvasCollectionItem>) => void;
  updateItemTags?: (id: string, tags: string[]) => string | undefined;
  createTag?: (name: string) => void;
  customTags?: string[];
  favoriteIds?: ReadonlySet<string>;
  deleteItem?: (id: string) => void;
  retryTask?: (taskId: string) => void;
  regenerateTask?: (taskId: string) => void;
  openPreview?: (itemId: string, title?: string) => void;
  model: string;
  models: string[];
  textModel?: string;
  providerConnectionId?: string;
  disabledReason?: string;
  imageConfigured?: boolean;
  configure?: () => void;
} | null>(null);
export const CanvasImageNodeContext =
  createContext<CanvasCollectionItem | null>(null);

/** Task lifetime belongs to App. Unmounting a card cancels preparation only. */
export function useCanvasImageGeneration({
  references = [],
  outputCount,
  operation: requestedOperation,
}: {
  references?: CanvasReference[];
  outputCount?: number;
  operation?: "inpaint";
} = {}) {
  const command = useContext(CanvasImageCommandContext);
  const item = useContext(CanvasImageNodeContext);
  const agent = useCanvasAgent(command);
  const usesCodex = item?.generationSource === "codex";
  const codexBusy =
    usesCodex && agent.sending && agent.canvasNodeId === item?.id;
  const isText = item?.kind === "text";
  const isMedia = item?.kind === "video" || item?.kind === "audio";
  const kind = item?.kind ?? "image";
  const label = generationLabel();
  function generationLabel() {
    return kind === "video"
      ? "视频"
      : kind === "audio"
        ? "音频"
        : isText
          ? "文案"
          : "图片";
  }
  const model =
    item?.model ??
    (isText ? command?.textModel : isMedia ? "" : command?.model) ??
    "";
  const capabilities = useCanvasCapabilities(
    {
      source: usesCodex ? "codex" : "api",
      model,
      connectionId: item?.providerConnectionId ?? command?.providerConnectionId,
    },
    command,
  );
  const totalReferences = imageReferenceCount(item, references);
  const operation =
    requestedOperation ?? (totalReferences ? "edit" : "generate");
  const capabilityReason = capabilityBlockReason();
  function capabilityBlockReason() {
    const { maxReferences, maxGenerationCount } = capabilities;
    return !isText && !isMedia && !usesCodex
      ? capabilities.operations[operation] === "unsupported"
        ? `当前模型不支持${operation === "inpaint" ? "蒙版编辑" : operation === "edit" ? "参考图编辑" : "图片生成"}，请切换支持的模型。`
        : maxReferences !== undefined && totalReferences > maxReferences
          ? `当前模型最多接收 ${capabilities.maxReferences} 张参考图（包含原图），请移除多余参考图。`
          : maxGenerationCount !== undefined &&
              Number(outputCount ?? item?.parameters?.count ?? 1) >
                maxGenerationCount
            ? `当前模型一次任务最多生成 ${capabilities.maxGenerationCount} 张图片，请重新选择生成数量。`
            : undefined
      : undefined;
  }
  const [error, setError] = useState("");
  const [preparing, setPreparing] = useState(false);
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      request.current?.abort();
    };
  }, []);
  const sourceTasks =
    item && !usesCodex
      ? (command?.tasks.filter((task) => task.sourceItemId === item?.id) ?? [])
      : [];
  const task =
    sourceTasks.find((task) => task.status === "running") ??
    sourceTasks.find((task) => task.status === "queued") ??
    sourceTasks.at(-1);
  const queryOnly = Boolean(
    command?.query &&
    item?.kind === "video" &&
    task &&
    ["unknown", "partial", "interrupted"].includes(task.status) &&
    task.outputs?.some((o) => o.mediaReceipt?.acceptance === "accepted"),
  );
  const loading =
    preparing ||
    codexBusy ||
    (!usesCodex && (task?.status === "queued" || task?.status === "running"));
  const phase = generationPhase();
  function generationPhase():
    "idle" | "loading" | "success" | "error" | "cancelled" | "offline" {
    return error
      ? "error"
      : loading
        ? "loading"
        : task?.status === "succeeded"
          ? "success"
          : task?.status === "cancelled"
            ? "cancelled"
            : task?.status === "offline"
              ? "offline"
              : task
                ? "error"
                : "idle";
  }
  const disabledReason =
    command?.disabledReason ??
    capabilityReason ??
    (!command || !item
      ? `请先新建或打开项目，再提交${label}生成。`
      : undefined) ??
    ((isText || isMedia) && task?.status === "unknown" && !queryOnly
      ? "供应商受理状态不明，请先核对原任务，不能重复提交。"
      : undefined) ??
    (usesCodex && agent.status !== "connected"
      ? "请先在对话面板连接 Codex。"
      : undefined) ??
    (!isText && !isMedia && !usesCodex && !command?.imageConfigured
      ? "请先在设置中配置图片模型连接；当前草稿已保留。"
      : undefined) ??
    (isMedia && !item?.providerConnectionId
      ? `请先在设置中配置${label}模型连接，并为当前节点选择模型。`
      : undefined) ??
    (isMedia && usesCodex
      ? "此模态需要真实媒体模型连接，请在模型设置中选择。"
      : undefined) ??
    (isText && !usesCodex && !item?.providerConnectionId && !command?.textModel
      ? "请先在设置中配置文本模型连接。"
      : undefined);
  const needsConfiguration =
    !usesCodex &&
    (isMedia
      ? !item?.providerConnectionId
      : isText
        ? !item?.providerConnectionId && !command?.textModel
        : !command?.imageConfigured);
  const message =
    error ||
    (usesCodex ? agent.error : undefined) ||
    disabledReason ||
    (preparing
      ? "正在检查参考原件和模型连接，可取消。"
      : task?.error ||
        (loading
          ? usesCodex
            ? "Codex 正在执行；详情和权限请求见对话面板。"
            : `${label}任务处理中，可取消；成功结果将保存到本机。`
          : task?.status === "succeeded"
            ? isText
              ? "文案结果已保存到本机项目。"
              : `已归档 ${task.completedOutputs}/${task.requestedOutputs} 份${label}。`
            : ""));
  function cancel() {
    if (codexBusy) void command?.agent?.interrupt();
    request.current?.abort();
    if (task && loading) command?.cancel(task.id);
  }
  async function run(
    prompt: string,
    count: number,
    model: string,
    imageEdit?: ImageEditRequest,
    imageCapability?: ImageCapabilitySpec,
  ) {
    if (!command || !item || request.current || loading || disabledReason)
      return;
    const controller = new AbortController();
    request.current = controller;
    setError("");
    setPreparing(true);
    try {
      if (queryOnly && task && command.query) {
        await command.query(task.id);
        return;
      }
      const failure = await command.submit({
        sourceItemId: item.id,
        providerConnectionId: item.providerConnectionId,
        prompt,
        model,
        count,
        signal: controller.signal,
        imageEdit,
        imageCapability,
      });
      if (mounted.current && failure) setError(failure);
    } catch {
      if (mounted.current)
        setError(`无法提交${label}任务，请重试；草稿已保留。`);
    } finally {
      if (request.current === controller) request.current = null;
      if (mounted.current) setPreparing(false);
    }
  }
  return {
    phase,
    queryOnly,
    message,
    run,
    cancel,
    available: loading || !disabledReason,
    mode: "provider" as const,
    kind,
    draftText: task?.status === "running" ? task.outputs?.[0]?.text : undefined,
    model,
    incomingReferenceCount: totalReferences - imageReferenceCount(item),
    maxGenerationCount: capabilities.maxGenerationCount,
    models: command?.models ?? [],
    usesCodex,
    configure:
      needsConfiguration && command?.configure ? command.configure : undefined,
  };
}

const disconnectedState = {
  status: "disconnected",
  sending: false,
  error: null,
};
const disconnectedAgent = () => disconnectedState;
const noAgentSubscription = () => () => {};

function useCanvasAgent(
  command: React.ContextType<typeof CanvasImageCommandContext>,
) {
  return useSyncExternalStore(
    command?.agent?.subscribe ?? noAgentSubscription,
    command?.agent?.getState ?? disconnectedAgent,
  );
}

function useCanvasCapabilities(
  selection: ModelSelection,
  command: React.ContextType<typeof CanvasImageCommandContext>,
) {
  return useModelCapabilityUpdates(
    selection,
    command?.modelCapabilities ?? unavailableModelCapabilities,
  );
}

interface CanvasModelCapabilities {
  operations: Record<
    "generate" | "edit" | "inpaint" | "outpaint",
    CapabilitySupport
  >;
  maxReferences?: number;
  maxGenerationCount?: number;
}
const unavailableModelCapabilities = (): CanvasModelCapabilities => ({
  operations: {
    generate: "unknown",
    edit: "unknown",
    inpaint: "unknown",
    outpaint: "unknown",
  },
});
