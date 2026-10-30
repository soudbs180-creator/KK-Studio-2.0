import { parseComfyUiProgressMessage } from "./comfyUiProgress.ts";
import { workflowOutputs, workflowFailures } from "./workflowOutputs.ts";
import type { ComfyRuntimePort } from "./nativeRuntime.ts";
import type { WorkflowOutput } from "./workflowOutputs.ts";

export function watchWorkflow(options: {
  clientId: string;
  runtime: ComfyRuntimePort;
  deliver: (output: WorkflowOutput) => Promise<void>;
  progress: (text: string) => void;
  failed?: (promptId: string, key?: string) => void;
  pendingSubmission?: () => { key: string; promptId?: string } | undefined;
}) {
  let closed = false,
    syncing = false,
    socket: WebSocket | undefined;
  let backfillOffset = 0,
    backfillComplete = false,
    submissionKey: string | undefined;
  const clients = [options.clientId + "-host", options.clientId + "-editor"];
  async function consume(history: unknown) {
    if (closed) return;
    for (const failure of workflowFailures(history, clients))
      options.failed?.(failure.promptId, failure.key);
    for (const output of workflowOutputs(history, clients)) {
      if (closed) return;
      await options.deliver(output);
    }
  }
  async function sync() {
    if (closed || syncing) return;
    syncing = true;
    try {
      const pending = options.pendingSubmission?.();
      if (pending?.key !== submissionKey) {
        submissionKey = pending?.key;
        backfillOffset = 0;
        backfillComplete = false;
      }
      if (pending?.promptId && /^[A-Za-z0-9_-]{1,160}$/.test(pending.promptId))
        await consume(
          await options.runtime.json(`/history/${pending.promptId}`),
        );
      if (closed) return;
      const history = await options.runtime.json("/history?max_items=100");
      await consume(history);
      if (
        !closed &&
        !backfillComplete &&
        Object.keys(history ?? {}).length >= 100
      ) {
        const older = await options.runtime.json(
          `/history?max_items=100&offset=${backfillOffset}`,
        );
        await consume(older);
        backfillComplete =
          Object.keys(older ?? {}).length < 100 || backfillOffset >= 1000000;
        backfillOffset += 100;
      }
    } catch {
      if (!closed) options.progress("无法归档产物，请检查 ComfyUI 连接后重试");
    } finally {
      syncing = false;
    }
  }
  function connect() {
    if (closed) return;
    socket = new WebSocket(
      `ws://127.0.0.1:8188/ws?clientId=${encodeURIComponent(clients[0])}`,
    );
    socket.onmessage = (event) => {
      if (
        closed ||
        typeof event.data !== "string" ||
        event.data.length > 1024 * 1024
      )
        return;
      const progress = parseComfyUiProgressMessage(event.data);
      if (progress.error)
        options.progress("ComfyUI 执行失败，请在原生界面检查工作流");
      else if (progress.stage === "progress" || progress.percent > 0)
        options.progress(`执行进度 ${Math.round(progress.percent)}%`);
      void sync();
    };
    socket.onerror = () => {}; // The native HTTP history path also works with an older server's WS origin policy.
    socket.onclose = () => {
      if (!closed) reconnect = setTimeout(connect, 1500);
    };
  }
  let reconnect: ReturnType<typeof setTimeout> | undefined;
  connect();
  void sync();
  const timer = setInterval(() => void sync(), 2000);
  return () => {
    closed = true;
    clearInterval(timer);
    clearTimeout(reconnect);
    socket?.close();
  };
}
