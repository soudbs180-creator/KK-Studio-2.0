import { useEffect, useRef, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import {
  beginCli,
  cancelCli,
  cliPending,
  inspectCli,
  readCliBridge,
  readCliOperation,
  startCliBridge,
  stopCliBridge,
  type CliTool,
  type CliOperation,
  type CliInspection,
  type CliBridge,
} from "../../integrations/nativeCli";
import { readGoogleCliPreference } from "../../features/agent/googleAgentConfig";
import { normalizeGeminiBridgeUrl } from "../../features/agent/geminiCliAdapter";
import useSettingsBusy from "./useSettingsBusy";

type Action =
  | "inspect"
  | "install"
  | "login"
  | "cancel"
  | "copy"
  | "bridge-start"
  | "bridge-stop"
  | "bridge-cancel"
  | "bridge-inspect";
function progress(action: Action, label: string): string {
  return {
    inspect: `正在检测 ${label} CLI…`,
    install: `正在启动 ${label} CLI 安装…`,
    login: `正在打开 ${label} CLI 登录终端…`,
    cancel: "正在取消当前 CLI 操作…",
    copy: "正在复制 CLI 路径…",
    "bridge-start": "正在启动 CLI 桥…",
    "bridge-stop": "正在停止 CLI 桥…",
    "bridge-cancel": "正在取消 CLI 桥启动…",
    "bridge-inspect": "正在检测 CLI 桥…",
  }[action];
}
function failure(error: unknown): string {
  if (typeof error === "string") return error;
  return error instanceof Error ? error.message : "CLI 操作失败，请重试。";
}

export default function useNativeCliControls(
  tool: CliTool,
  active: boolean,
  onBusyChange: (busy: boolean) => void,
) {
  const [info, setInfo] = useState<CliInspection>();
  const [operation, setOperation] = useState<CliOperation>();
  const [bridge, setBridge] = useState<CliBridge>();
  const [pending, setPending] = useState<Action>();
  const [message, setMessage] = useState("");
  const generation = useRef(0),
    request = useRef(0);
  const identity = useRef({ tool, active });
  identity.current = { tool, active };
  const ownedOperation = operation?.tool === tool ? operation : undefined;
  const busy = active && (Boolean(pending) || cliPending(ownedOperation));
  const label = { codex: "Codex", gemini: "Gemini", codebuddy: "CodeBuddy" }[
    tool
  ];
  useSettingsBusy(busy, onBusyChange);
  function current(expected: number): boolean {
    return (
      generation.current === expected &&
      identity.current.tool === tool &&
      identity.current.active
    );
  }
  useEffect(() => {
    generation.current++;
    request.current++;
    setInfo(undefined);
    setBridge(undefined);
    setPending(undefined);
    setMessage("");
    return () => {
      generation.current++;
      request.current++;
    };
  }, [tool, active]);
  useEffect(() => {
    if (!active || !isTauri() || !cliPending(ownedOperation)) return;
    const expected = generation.current,
      operationId = ownedOperation!.operationId;
    let mounted = true,
      reading = false;
    const timer = window.setInterval(() => {
      if (reading) return;
      reading = true;
      const inspectionRequest = request.current;
      void readCliOperation(operationId)
        .then(async (result) => {
          if (
            !mounted ||
            !current(expected) ||
            request.current !== inspectionRequest ||
            result.operationId !== operationId ||
            result.tool !== tool
          )
            return;
          setOperation(result);
          setMessage(result.message);
          if (!cliPending(result)) {
            const refreshed = await inspectCli(tool);
            // Terminal phase cleans up this interval; the same generation may still refresh.
            if (
              current(expected) &&
              request.current === inspectionRequest &&
              refreshed.tool === tool
            )
              setInfo(refreshed);
          }
        })
        .catch(() => {
          if (current(expected) && request.current === inspectionRequest)
            setMessage("无法读取 CLI 状态；操作身份已保留，可重试检测或取消。");
        })
        .finally(() => {
          reading = false;
        });
    }, 1000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [active, tool, ownedOperation?.operationId, ownedOperation?.phase]);

  async function perform<T>(
    action: Action,
    run: (accepted: () => boolean) => Promise<T>,
    apply: (result: T) => void,
    allowOperation = false,
    discard?: (result: T) => Promise<unknown>,
  ): Promise<void> {
    const interruptStart =
      action === "bridge-cancel" && pending === "bridge-start";
    if (
      !active ||
      !identity.current.active ||
      identity.current.tool !== tool ||
      (pending && !interruptStart) ||
      (cliPending(ownedOperation) && !allowOperation)
    )
      return;
    const expected = generation.current,
      id = ++request.current;
    const accepted = () => current(expected) && request.current === id;
    setPending(action);
    setMessage("");
    try {
      const result = await run(accepted);
      if (accepted()) apply(result);
      else await discard?.(result);
    } catch (error) {
      if (accepted()) setMessage(failure(error));
    } finally {
      if (accepted()) setPending(undefined);
    }
  }
  function publishOperation(result: CliOperation): void {
    if (result.tool !== tool) throw new Error("CLI 回执与当前工具不一致。");
    setOperation(result);
    setMessage(result.message);
  }
  function publishBridge(result: CliBridge): void {
    setBridge(result);
    setMessage(result.message);
  }
  const detect = () =>
    perform(
      "inspect",
      async (accepted) => {
        const result = await inspectCli(tool);
        if (!accepted()) return;
        if (result.tool !== tool)
          throw new Error("CLI 检测回执与当前工具不一致。");
        setInfo(result);
        setMessage(result.message);
        if (tool === "gemini") return readCliBridge();
      },
      (result) => {
        if (result) setBridge(result);
      },
      true,
    );
  function begin(action: "install" | "login"): Promise<void> {
    return perform(
      action,
      () => beginCli(tool, action),
      publishOperation,
      false,
      // Keep the owned ID usable if the panel changed before begin acknowledged it.
      (result) =>
        cliPending(result) ? cancelCli(result.operationId) : Promise.resolve(),
    );
  }
  const cancelOperation = () => {
    if (!ownedOperation) return Promise.resolve();
    return perform(
      "cancel",
      () => cancelCli(ownedOperation.operationId),
      publishOperation,
      true,
    );
  };
  const copyPath = () =>
    perform(
      "copy",
      () => navigator.clipboard.writeText(info!.cliPath!),
      () => setMessage("CLI 路径已复制，可粘贴到连接配置。"),
      true,
    );
  const startBridge = () =>
    perform(
      "bridge-start",
      () =>
        startCliBridge(
          Number(
            new URL(
              normalizeGeminiBridgeUrl(readGoogleCliPreference().bridgeUrl),
            ).port,
          ),
        ),
      publishBridge,
    );
  const stopBridge = () =>
    perform(
      pending === "bridge-start" ? "bridge-cancel" : "bridge-stop",
      stopCliBridge,
      publishBridge,
    );
  const detectBridge = () =>
    perform("bridge-inspect", readCliBridge, publishBridge, true);
  const cancelDetection = () => {
    if (pending !== "inspect" && pending !== "bridge-inspect") return;
    request.current++;
    setPending(undefined);
    setMessage("已取消等待检测；本机检测是否结束尚未确认。");
  };
  const canCancelDetection =
    pending === "inspect" || pending === "bridge-inspect";
  const canStopBridge =
    pending === "bridge-start" ||
    (!busy && Boolean(bridge?.owned && bridge.running));
  const loadingAction =
    pending ??
    (cliPending(ownedOperation) ? ownedOperation?.action : undefined);
  const loadingMessage = pending ? progress(pending, label) : message;
  return {
    info,
    operation: ownedOperation,
    bridge,
    pending,
    message,
    busy,
    label,
    loadingAction,
    loadingMessage,
    canCancelDetection,
    canStopBridge,
    detect,
    begin,
    cancelOperation,
    copyPath,
    startBridge,
    stopBridge,
    detectBridge,
    cancelDetection,
  };
}

export type NativeCliController = ReturnType<typeof useNativeCliControls>;
