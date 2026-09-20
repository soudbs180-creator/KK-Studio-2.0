import { createContext, useContext, useEffect, useRef, useState } from "react";
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
  disabledReason?: string;
} | null>(null);
export const CanvasImageNodeContext =
  createContext<CanvasCollectionItem | null>(null);

/** Task lifetime belongs to App. Unmounting a card cancels preparation only. */
export function useCanvasImageGeneration() {
  const command = useContext(CanvasImageCommandContext);
  const item = useContext(CanvasImageNodeContext);
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
  const task = item
    ? command?.tasks
        .slice()
        .reverse()
        .find((task) => task.sourceItemId === item.id)
    : undefined;
  const loading =
    preparing || task?.status === "queued" || task?.status === "running";
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
    (!command || !item ? "请先新建或打开项目，再提交图片生成。" : undefined);
  const message =
    error ||
    disabledReason ||
    (preparing
      ? "正在检查参考原件和模型连接，可取消。"
      : task?.error ||
        (loading
          ? "图片任务处理中，可取消；成功结果将保存到本机。"
          : task?.status === "succeeded"
            ? `已归档 ${task.completedOutputs}/${task.requestedOutputs} 张图片。`
            : ""));
  function cancel() {
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
        setError("无法提交图片任务，请重试；草稿和参考图已保留。");
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
    available: !disabledReason,
    mode: "provider" as const,
    model: item?.model ?? command?.model ?? "",
    models: command?.models ?? [],
  };
}
