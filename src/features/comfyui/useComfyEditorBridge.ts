import { useEffect, useRef, useState, type RefObject } from "react";
import type { WorkflowRecord } from "../../domain/comfyWorkflow.ts";
import type { ComfyRuntimePort } from "./nativeRuntime.ts";
import {
  DEFAULT_COMFY_ENDPOINT,
  normalizeComfyEndpoint,
} from "./comfyEndpoint.ts";
import { readEditorSnapshot } from "./editorSnapshot.ts";

export function useComfyEditorBridge({
  frame,
  record,
  open,
  clientId,
  runtime,
  savedRoot,
  onSave,
  onBack,
}: {
  frame: RefObject<HTMLIFrameElement>;
  record?: WorkflowRecord;
  open: boolean;
  clientId: string;
  runtime: ComfyRuntimePort;
  savedRoot?: string | null;
  onSave: (record: WorkflowRecord) => Promise<void>;
  onBack: () => void;
}) {
  const endpoint = normalizeComfyEndpoint(
    runtime.endpoint ?? DEFAULT_COMFY_ENDPOINT,
  );
  const nonce = useRef(crypto.randomUUID());
  const [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("正在连接原生编辑同步…");
  const loaded = useRef("");
  useEffect(() => {
    setReady(false);
    loaded.current = "";
  }, [endpoint]);
  const pending = useRef(
    new Map<
      string,
      {
        resolve: (value: unknown) => void;
        reject: (error: Error) => void;
        timer: ReturnType<typeof setTimeout>;
      }
    >(),
  );
  function post(op: string, data = {}) {
    frame.current?.contentWindow?.postMessage(
      { source: "kk-studio", version: 1, nonce: nonce.current, op, ...data },
      endpoint,
    );
  }
  function request(op: string, data = {}): Promise<unknown> {
    const requestId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.current.delete(requestId);
        reject(new Error("原生编辑同步超时，编辑窗口已保留，请重试"));
      }, 10000);
      pending.current.set(requestId, { resolve, reject, timer });
      post(op, { ...data, requestId });
    });
  }
  useEffect(() => {
    function receive(event: MessageEvent) {
      const data = event.data;
      if (
        event.source !== frame.current?.contentWindow ||
        event.origin !== endpoint ||
        !data ||
        data.source !== "kk-comfy-bridge" ||
        data.version !== 1 ||
        data.nonce !== nonce.current
      )
        return;
      if (data.op === "ready") {
        setReady(true);
        return;
      }
      if (!["loaded", "snapshot", "error"].includes(data.op)) return;
      const entry = pending.current.get(data.requestId);
      if (!entry) return;
      clearTimeout(entry.timer);
      pending.current.delete(data.requestId);
      if (data.op === "error")
        entry.reject(
          new Error(
            typeof data.error === "string"
              ? data.error.slice(0, 500)
              : "原生编辑器同步失败",
          ),
        );
      else entry.resolve(data);
    }
    window.addEventListener("message", receive);
    return () => {
      window.removeEventListener("message", receive);
      for (const entry of pending.current.values()) {
        clearTimeout(entry.timer);
        entry.reject(new Error("编辑器已关闭"));
      }
      pending.current.clear();
    };
  }, [endpoint, frame]);
  useEffect(() => {
    if (!open || ready) return;
    post("hello");
    const timer = setInterval(() => post("hello"), 500);
    const guide = setTimeout(
      () =>
        setMessage(
          "服务未允许嵌入或尚未启用同步。可返回画布，选择目录由 KK 启动；已连接的外部服务需允许应用来源。",
        ),
      4000,
    );
    return () => {
      clearInterval(timer);
      clearTimeout(guide);
    };
  }, [open, ready, endpoint]);
  useEffect(() => {
    if (!open || !ready || !record) return;
    const version = `${record.id}:${record.updatedAt}`;
    if (loaded.current === version) return;
    loaded.current = "";
    let active = true;
    setBusy(true);
    void request("load", { record, clientId })
      .then(() => {
        if (active) {
          loaded.current = version;
          setMessage("当前卡片已载入；返回画布时保存节点和连线");
        }
      })
      .catch((error) => {
        if (active) setMessage(String(error.message));
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [open, ready, record, clientId]);
  return {
    endpoint,
    ready,
    busy,
    message,
    onLoad: () => {
      loaded.current = "";
      setReady(false);
      post("hello");
    },
    async back() {
      if (busy) return;
      if (
        !ready ||
        !record ||
        loaded.current !== `${record.id}:${record.updatedAt}`
      ) {
        onBack();
        return;
      }
      setBusy(true);
      try {
        const next = readEditorSnapshot(await request("read"), record);
        loaded.current = `${next.id}:${next.updatedAt}`;
        await onSave(next);
        onBack();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : String(error));
      } finally {
        setBusy(false);
      }
    },
    async install() {
      if (!runtime.installEditorBridge || busy) return;
      setBusy(true);
      try {
        const root = savedRoot ?? (await runtime.selectRoot());
        if (!root) return;
        await runtime.installEditorBridge(root);
        setMessage("同步扩展已安装，正在刷新原生编辑器");
        if (frame.current) frame.current.src = endpoint;
      } catch (error) {
        setMessage(error instanceof Error ? error.message : String(error));
      } finally {
        setBusy(false);
      }
    },
  };
}
