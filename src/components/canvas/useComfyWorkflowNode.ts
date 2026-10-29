import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  watchWorkflow,
  readLocalWorkflows,
  queueSavedWorkflow,
  isWorkflowRejection,
  validateExecutableWorkflow,
  type ComfyProcessStatus,
} from "../../features/comfyui/index.ts";
import type {
  CanvasCollectionItem,
  NodeEditingProps,
} from "../../domain/canvasItems.ts";
import { useComfyCanvasHost } from "./ComfyWorkflowCanvasHost.tsx";

export function useComfyWorkflowNode(
  item: CanvasCollectionItem,
  editing: NodeEditingProps,
) {
  const host = useComfyCanvasHost();
  const [status, setStatus] = useState<ComfyProcessStatus>({
    pid: null,
    owned: false,
    root: null,
    ready: false,
  });
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const [records, setRecords] = useState(readLocalWorkflows);
  const latest = useRef({ item, editing });
  latest.current = { item, editing };
  const locked = useRef(false);
  const expectedProcess = useRef(false);
  const clientId = `kk-comfy-${host?.projectId}-${item.id}`;
  function patch(value: CanvasCollectionItem["comfyWorkflow"]) {
    if (host?.isCurrent(item.id))
      latest.current.editing.onChange({ comfyWorkflow: value });
  }
  useEffect(() => {
    if (!host?.runtime.desktop) return;
    let active = true;
    async function health() {
      try {
        const state = await host!.runtime.status();
        if (active) {
          setStatus(state);
          if (expectedProcess.current && !state.owned && !state.ready) {
            expectedProcess.current = false;
            setMessage("ComfyUI 后台进程已退出，请检查本地 Python 环境");
          }
        }
      } catch {
        if (active)
          setStatus({ pid: null, owned: false, root: null, ready: false });
      }
    }
    void health();
    const timer = setInterval(() => void health(), 2000);
    const write = host.delivery(item.id);
    const stop = watchWorkflow({
      clientId,
      runtime: host.runtime,
      progress: (text) => {
        if (active) setMessage(text);
      },
      failed(promptId, key) {
        const data = latest.current.item.comfyWorkflow;
        if (
          active &&
          data?.submission &&
          (data.submission.promptId === promptId || data.submission.key === key)
        ) {
          patch({ ...data, submission: undefined });
          setMessage("ComfyUI 执行失败，请检查工作流后重试");
        }
      },
      async deliver(output) {
        await write(output);
        if (!active) return;
        const data = latest.current.item.comfyWorkflow;
        if (
          data?.submission &&
          (data.submission.promptId === output.promptId ||
            data.submission.key === output.submissionKey)
        ) {
          patch({ ...data, submission: undefined });
          setMessage("图片已归档并连接到画布");
        }
      },
    });
    return () => {
      active = false;
      clearInterval(timer);
      stop();
    };
  }, [host, clientId, item.id]);
  async function chooseDirectory() {
    if (!host || locked.current) return;
    locked.current = true;
    setWorking(true);
    try {
      const root = await host.runtime.selectRoot();
      if (root && host.isCurrent(item.id)) {
        setStatus(await host.runtime.start(root));
        expectedProcess.current = true;
        setMessage("后台启动中，请等待本地环境就绪");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      locked.current = false;
      setWorking(false);
    }
  }
  async function run() {
    if (
      !host ||
      locked.current ||
      latest.current.item.comfyWorkflow?.submission
    )
      return;
    const record = records.find(
      (r) => r.id === latest.current.item.comfyWorkflow?.workflowId,
    );
    if (!record) {
      setMessage("请先选择已保存的 API 工作流");
      return;
    }
    locked.current = true;
    setWorking(true);
    const key = crypto.randomUUID();
    let sent = false;
    try {
      validateExecutableWorkflow(record);
      flushSync(() =>
        patch({
          ...latest.current.item.comfyWorkflow,
          submission: { key, state: "intent" },
        }),
      );
      await host.flush();
      if (!host.isCurrent(item.id)) throw new Error("项目或卡片已切换，未发送");
      sent = true;
      const promptId = await queueSavedWorkflow(
        host.runtime,
        record,
        clientId,
        key,
      );
      patch({
        ...latest.current.item.comfyWorkflow,
        submission: { key, state: "submitted", promptId },
      });
      await host.flush();
      setMessage("任务已提交，等待 ComfyUI 出图");
    } catch (error) {
      if (isWorkflowRejection(error)) sent = false;
      patch({
        ...latest.current.item.comfyWorkflow,
        submission: sent ? { key, state: "unknown" } : undefined,
      });
      setMessage(
        sent
          ? "受理状态不明，请在原生 ComfyUI 核对；不会自动重发"
          : error instanceof Error
            ? error.message
            : String(error),
      );
    } finally {
      locked.current = false;
      setWorking(false);
    }
  }
  return {
    host,
    status,
    message,
    working,
    records,
    clientId,
    chooseDirectory,
    run,
    refresh: () => setRecords(readLocalWorkflows()),
    chooseWorkflow: (workflowId: string) =>
      patch({ ...item.comfyWorkflow, workflowId: workflowId || undefined }),
  };
}
