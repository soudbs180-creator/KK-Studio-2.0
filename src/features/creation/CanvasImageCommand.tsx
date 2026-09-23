import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { agentConnection } from "../agent/agentConnection";
import type { CanvasCollectionItem } from "../../domain/canvasItems";
import type { CreationTask } from "./model";

export interface CanvasImageRequest {
  sourceItemId: string;
  prompt: string;
  model: string;
  count: number;
  signal: AbortSignal;
}
export const CanvasImageCommandContext = createContext<{
  submit: (request: CanvasImageRequest) => Promise<string | undefined>;
  cancel: (taskId: string) => void;
  tasks: CreationTask[];
  model: string;
  models: string[];
  textModel?: string;
  providerConnectionId?: string;
  disabledReason?: string;
} | null>(null);
export const CanvasImageNodeContext =
  createContext<CanvasCollectionItem | null>(null);

/** Task lifetime belongs to App. Unmounting a card cancels preparation only. */
export function useCanvasImageGeneration() {
  const command = useContext(CanvasImageCommandContext);
  const item = useContext(CanvasImageNodeContext);
  const agent = useSyncExternalStore(
    agentConnection.subscribe,
    agentConnection.getState,
  );
  const usesCodex = item?.generationSource === "codex";
  const codexBusy =
    usesCodex && agent.sending && agent.canvasNodeId === item?.id;
  const isText = item?.kind === "text";
  const label = isText ? "文案" : "图片";
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
  const task =
    item && !usesCodex
      ? command?.tasks
          .slice()
          .reverse()
          .find((task) => task.sourceItemId === item.id)
      : undefined;
  const loading =
    preparing ||
    codexBusy ||
    (!usesCodex && (task?.status === "queued" || task?.status === "running"));
  const phase:
    "idle" | "loading" | "success" | "error" | "cancelled" | "offline" = error
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
  const disabledReason =
    command?.disabledReason ??
    (!command || !item
      ? `请先新建或打开项目，再提交${label}生成。`
      : undefined) ??
    (isText && task?.status === "unknown"
      ? "供应商受理状态不明，请先核对原任务，不能重复提交。"
      : undefined) ??
    (usesCodex && agent.status !== "connected"
      ? "请先在对话面板连接 Codex。"
      : undefined) ??
    (isText && !usesCodex && !item?.providerConnectionId && !command?.textModel
      ? "请先在设置中配置文本模型连接。"
      : undefined);
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
              : `已归档 ${task.completedOutputs}/${task.requestedOutputs} 张图片。`
            : ""));
  function cancel() {
    if (codexBusy) void agentConnection.interrupt();
    request.current?.abort();
    if (task && loading) command?.cancel(task.id);
  }
  async function run(prompt: string, count: number, model: string) {
    if (!command || !item || request.current || loading || disabledReason)
      return;
    const controller = new AbortController();
    request.current = controller;
    setError("");
    setPreparing(true);
    try {
      const failure = await command.submit({
        sourceItemId: item.id,
        prompt,
        model,
        count,
        signal: controller.signal,
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
    message,
    run,
    cancel,
    available: loading || !disabledReason,
    mode: "provider" as const,
    kind: isText ? ("text" as const) : ("image" as const),
    draftText: task?.status === "running" ? task.outputs?.[0]?.text : undefined,
    model: item?.model ?? (isText ? command?.textModel : command?.model) ?? "",
    models: command?.models ?? [],
    usesCodex,
  };
}
