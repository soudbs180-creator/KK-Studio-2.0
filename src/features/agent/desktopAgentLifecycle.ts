import { invoke, isTauri } from "@tauri-apps/api/core";
import {
  agentConnection,
  type AgentConnection,
  type AgentStorage,
} from "./agentConnection.ts";

export interface DesktopAgentRuntimeStatus {
  available: boolean;
  running: boolean;
  healthy: boolean;
  endpoint?: string;
  reason?: string;
}
interface RuntimePort {
  start(): Promise<{ endpoint: string; token: string }>;
  status(): Promise<DesktopAgentRuntimeStatus>;
  stop(): Promise<unknown>;
}
interface LifecycleState {
  runtime: DesktopAgentRuntimeStatus | null;
  pending: boolean;
  error: string | null;
  automatic: boolean;
}
const AUTO_CONNECT_KEY = "kk-agent-auto-connect";
const preferences: AgentStorage = {
  getItem: (key) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => window.localStorage.setItem(key, value),
  removeItem: (key) => window.localStorage.removeItem(key),
};
const nativeRuntime: RuntimePort = {
  start: () => invoke("agent_runtime_start"),
  status: () => invoke("agent_runtime_status"),
  stop: () => invoke("agent_runtime_stop"),
};

/** One owner for startup, reconnect and settings; no task is sent on connect. */
export function createDesktopAgentLifecycle(
  options: {
    connection?: AgentConnection;
    runtime?: RuntimePort;
    storage?: AgentStorage;
    isDesktop?: () => boolean;
  } = {},
) {
  const connection = () => options.connection ?? agentConnection;
  const runtime = options.runtime ?? nativeRuntime;
  const storage = options.storage ?? preferences;
  const desktop = options.isDesktop ?? isTauri;
  let state: LifecycleState = {
    runtime: null,
    pending: false,
    error: null,
    automatic: storage.getItem(AUTO_CONNECT_KEY) !== "disabled",
  };
  const listeners = new Set<() => void>();
  let flight: Promise<void> | null = null;
  let epoch = 0;
  let runtimeRevision = 0;
  let attemptedProject: string | undefined;
  const patch = (next: Partial<LifecycleState>) => {
    state = { ...state, ...next };
    listeners.forEach((listener) => listener());
  };
  const errorText = (reason: unknown) =>
    reason instanceof Error ? reason.message : String(reason);
  function guardWork() {
    const current = connection().getState();
    if (current.sending || current.preparing || current.pendingApproval)
      throw new Error("请先处理正在运行的任务或待确认审批，再改变连接。");
  }
  function setAutomatic(automatic: boolean) {
    patch({ automatic });
    try {
      storage.setItem(AUTO_CONNECT_KEY, automatic ? "enabled" : "disabled");
    } catch {
      patch({
        error: "本次连接偏好已改变，但无法保存；下次启动请核对自动连接状态。",
      });
    }
  }
  async function refresh() {
    if (!desktop()) return;
    const version = epoch;
    const revision = ++runtimeRevision;
    try {
      const result = await runtime.status();
      if (version === epoch && revision === runtimeRevision)
        patch({ runtime: result });
    } catch (reason) {
      if (version === epoch && revision === runtimeRevision)
        patch({ error: errorText(reason) });
    }
  }
  function run(newConversation: boolean) {
    if (flight) return flight;
    guardWork();
    const version = ++epoch;
    const project = connection().getProjectId();
    const connectionRevision = connection().getState().connectionRevision;
    attemptedProject = project;
    patch({ pending: true, error: null });
    flight = (async () => {
      try {
        const credentials = await runtime.start();
        const revision = ++runtimeRevision;
        const runtimeResult = await runtime.status();
        if (version === epoch && revision === runtimeRevision)
          patch({ runtime: runtimeResult });
        if (version !== epoch || project !== connection().getProjectId())
          return;
        const current = connection().getState();
        if (connectionRevision !== current.connectionRevision) return; // A manual/external connection won while startup was pending.
        if (
          current.status === "connected" &&
          current.endpoint !== credentials.endpoint
        )
          throw new Error("当前已连接手动服务，请先断开后再切换。");
        if (!project) return; // Home is service-ready; never adopt an arbitrary thread.
        connection().setCredentials(credentials.endpoint, credentials.token);
        await connection().connect(newConversation);
        if (version !== epoch) return;
        const result = connection().getState();
        if (result.status === "error")
          throw new Error(result.error ?? "Agent 连接未完成。");
      } catch (reason) {
        if (version === epoch) patch({ error: errorText(reason) });
        throw reason;
      } finally {
        flight = null;
        patch({ pending: false });
      }
    })();
    return flight;
  }
  async function connect(newConversation = false) {
    if (!desktop()) return connection().connect(newConversation);
    guardWork();
    setAutomatic(true);
    const project = connection().getProjectId();
    const version = epoch;
    const connectionRevision = connection().getState().connectionRevision;
    if (flight && attemptedProject !== project) {
      await flight;
      if (
        project !== connection().getProjectId() ||
        !state.automatic ||
        connectionRevision !== connection().getState().connectionRevision
      )
        return;
      if (version !== epoch) {
        if (flight && attemptedProject === project) return flight;
        return;
      }
    }
    return run(newConversation);
  }
  async function ensure() {
    if (!desktop() || !state.automatic) return;
    if (flight) return flight.catch(() => undefined);
    if (connection().getState().status === "connected") return;
    const project = connection().getProjectId();
    if (attemptedProject === project) return;
    try {
      await run(false);
    } catch {
      /* The state retains the actionable error. */
    }
  }
  function disconnect() {
    guardWork();
    epoch++;
    patch({ error: null });
    setAutomatic(false);
    connection().disconnect();
  }
  async function stop() {
    guardWork();
    if (flight) throw new Error("正在恢复连接，请等待完成后停止服务。");
    epoch++;
    setAutomatic(false);
    patch({ pending: true, error: null });
    try {
      await runtime.stop();
      if (connection().getState().endpoint === state.runtime?.endpoint)
        connection().disconnect();
      await refresh();
    } catch (reason) {
      patch({ error: errorText(reason) });
      throw reason;
    } finally {
      patch({ pending: false });
    }
  }
  return {
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    refresh,
    connect,
    ensure,
    disconnect,
    stop,
  };
}

export const desktopAgentLifecycle = createDesktopAgentLifecycle();
