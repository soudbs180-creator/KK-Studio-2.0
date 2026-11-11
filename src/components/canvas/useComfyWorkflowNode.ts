import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  watchWorkflow,
  readLocalWorkflows,
  writeLocalWorkflows,
  parseComfyWorkflow,
  createImportedWorkflow,
  queueSavedWorkflow,
  isWorkflowRejection,
  validateExecutableWorkflow,
  type ComfyProcessStatus,
  type WorkflowRecord,
  scopeComfyRuntime,
  normalizeComfyEndpoint,
} from "../../features/comfyui/index.ts";
import type {
  CanvasCollectionItem,
  NodeEditingProps,
} from "../../domain/canvasItems.ts";
import { useComfyCanvasHost } from "./ComfyWorkflowCanvasHost.tsx";

const COMFYUI_ROOT_STORAGE_KEY = "kk-comfyui-root-path";

export function useComfyWorkflowNode(
  item: CanvasCollectionItem,
  editing: NodeEditingProps,
) {
  const host = useComfyCanvasHost();
  const runtime = useMemo(() => {
    try {
      return (
        host && scopeComfyRuntime(host.runtime, item.comfyWorkflow?.endpoint)
      );
    } catch {
      return null;
    }
  }, [host, item.comfyWorkflow?.endpoint]);
  const [status, setStatus] = useState<ComfyProcessStatus>({
    pid: null,
    owned: false,
    root: null,
    ready: false,
  });
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const [records, setRecords] = useState(readLocalWorkflows);
  const [savedRoot, setSavedRoot] = useState<string | null>(() => {
    try {
      return typeof localStorage !== "undefined"
        ? localStorage.getItem(COMFYUI_ROOT_STORAGE_KEY)
        : null;
    } catch {
      return null;
    }
  });
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
    if (!host || !runtime?.desktop) return;
    let active = true;
    async function health() {
      try {
        const state = await runtime!.status();
        if (active) {
          setStatus(state);
          if (state.ready)
            setMessage((current) =>
              /^(正在连接本机 ComfyUI|后台启动中，请等待本地环境就绪)/.test(
                current,
              )
                ? ""
                : current,
            );
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
    const write = host.delivery(item.id, runtime);
    const stop = watchWorkflow({
      clientId,
      runtime,
      pendingSubmission: () => latest.current.item.comfyWorkflow?.submission,
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
  }, [host, runtime, clientId, item.id]);

  async function chooseDirectory() {
    if (!host || locked.current) return;
    locked.current = true;
    setWorking(true);
    try {
      const root = await host.runtime.selectRoot();
      if (root && host.isCurrent(item.id)) {
        try {
          if (typeof localStorage !== "undefined") {
            localStorage.setItem(COMFYUI_ROOT_STORAGE_KEY, root);
          }
          setSavedRoot(root);
        } catch (storageError) {
          // health: allow EMPTY_CATCH -- 忽略存储受限环境异常
          void storageError;
        }
        setStatus(await host.runtime.start(root));
        patch({ ...latest.current.item.comfyWorkflow, endpoint: undefined });
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

  async function startSavedDirectory() {
    if (!host || locked.current || !savedRoot) return;
    locked.current = true;
    setWorking(true);
    try {
      setStatus(await host.runtime.start(savedRoot));
      patch({ ...latest.current.item.comfyWorkflow, endpoint: undefined });
      expectedProcess.current = true;
      setMessage("后台启动中，请等待本地环境就绪");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      locked.current = false;
      setWorking(false);
    }
  }

  async function importWorkflowFile(file: File) {
    try {
      const text = await file.text();
      const raw = JSON.parse(text) as unknown;
      const parsed = parseComfyWorkflow(raw);
      const name =
        file.name.replace(/\.[^/.]+$/, "") || "导入的 ComfyUI 工作流";
      const record = createImportedWorkflow(name, parsed);
      const current = readLocalWorkflows();
      const next = [record, ...current.filter((r) => r.id !== record.id)];
      writeLocalWorkflows(next);
      setRecords(next);
      patch({
        ...latest.current.item.comfyWorkflow,
        workflowId: record.id,
        snapshot: record,
      });
      setMessage(`已导入工作流：${record.name}`);
    } catch (err) {
      setMessage(
        `导入失败：${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async function run() {
    if (
      !host ||
      !runtime ||
      locked.current ||
      latest.current.item.comfyWorkflow?.submission
    )
      return;
    const record =
      latest.current.item.comfyWorkflow?.snapshot ??
      records.find(
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
      const promptId = await queueSavedWorkflow(runtime, record, clientId, key);
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
    runtime,
    status,
    message,
    working,
    records,
    clientId,
    savedRoot,
    chooseDirectory,
    startSavedDirectory,
    importWorkflowFile,
    run,
    activeRecord:
      item.comfyWorkflow?.snapshot ??
      records.find((r) => r.id === item.comfyWorkflow?.workflowId),
    updateRecord: (snapshot: WorkflowRecord) =>
      patch({
        ...latest.current.item.comfyWorkflow,
        workflowId: snapshot.id,
        snapshot,
      }),
    connect: (value: string) => {
      try {
        patch({
          ...latest.current.item.comfyWorkflow,
          endpoint: normalizeComfyEndpoint(value),
        });
        setMessage("正在连接本机 ComfyUI…");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : String(error));
      }
    },
    refresh: () => setRecords(readLocalWorkflows()),
    chooseWorkflow: (workflowId: string) =>
      patch({
        ...latest.current.item.comfyWorkflow,
        workflowId: workflowId || undefined,
        snapshot: records.find((r) => r.id === workflowId),
      }),
  };
}
