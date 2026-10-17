import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useSettingsNavigationBusy } from "./useSettingsBusy";
import { agentConnection } from "../../features/agent/agentConnection";
import { desktopAgentLifecycle } from "../../features/agent/desktopAgentLifecycle";
import AgentConnectionSettings from "./AgentConnectionSettings";
import ModelAccessApiPanel from "./ModelAccessApiPanel";
import GoogleConnectionSettings from "./GoogleConnectionSettings";
import CodeBuddyConnectionSettings from "./CodeBuddyConnectionSettings";
import OAuthAccessPanel from "./OAuthAccessPanel";
import NativeCliControls from "./NativeCliControls";
import type { LocalWorkflowAccess } from "./LocalWorkflowSettings";

const METHODS = [
  ["codex", "Codex 主 Agent"],
  ["official", "API Key（官方）"],
  ["relay", "API Key（中转站）"],
  ["cli", "CLI 账号"],
  ["oauth", "OAuth"],
  ["local", "本地"],
] as const;
type Method = (typeof METHODS)[number][0];

/** Connections belong here; specialist task roles belong to extensions. */
export default function ModelAccessSettings({
  onFeedback,
  active = true,
  initialMethod = "codex",
  workflows,
}: {
  onFeedback: (message: string) => void;
  active?: boolean;
  initialMethod?: Method;
  workflows: LocalWorkflowAccess;
}) {
  const setBusy = useSettingsNavigationBusy();
  const [navigation, setNavigation] = useState<"methods" | "detail">(
    initialMethod === "local" ? "detail" : "methods",
  );
  const agent = useSyncExternalStore(
    agentConnection.subscribe,
    agentConnection.getState,
  );
  const lifecycle = useSyncExternalStore(
    desktopAgentLifecycle.subscribe,
    desktopAgentLifecycle.getState,
  );
  const [method, setMethod] = useState<Method>(initialMethod);
  const [apiSaving, setApiSaving] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [codeBuddyBusy, setCodeBuddyBusy] = useState(false);
  const [codexCliBusy, setCodexCliBusy] = useState(false);
  const [nativeCliBusy, setNativeCliBusy] = useState(false);
  const [cliTool, setCliTool] = useState<"gemini" | "codebuddy">("gemini");
  const [codeBuddyMounted, setCodeBuddyMounted] = useState(false);
  const [focusGoogle, setFocusGoogle] = useState(false);
  const busy =
    apiSaving ||
    googleBusy ||
    codeBuddyBusy ||
    codexCliBusy ||
    nativeCliBusy ||
    agent.status === "connecting" ||
    lifecycle.pending;
  useLayoutEffect(() => setBusy(active && busy), [active, busy, setBusy]);
  const accessRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (
      navigation !== "methods" ||
      !window.matchMedia("(max-width: 767px)").matches
    )
      return;
    accessRef.current
      ?.querySelector<HTMLButtonElement>(
        '.model-access-methods [aria-pressed="true"]',
      )
      ?.focus({ preventScroll: true });
  }, [navigation]);
  const googlePanel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!focusGoogle || method !== "official") return;
    googlePanel.current?.scrollIntoView({ block: "nearest" });
    googlePanel.current
      ?.querySelector<HTMLInputElement>("#google-key")
      ?.focus({ preventScroll: true });
    setFocusGoogle(false);
  }, [focusGoogle, method]);
  return (
    <div
      ref={accessRef}
      className="model-access-settings"
      data-navigation={navigation}
    >
      <div className="model-access-back">
        <button
          type="button"
          className="settings-action secondary"
          disabled={busy}
          title={busy ? "连接操作进行中，完成后可返回" : undefined}
          onClick={() => {
            if (!busy) setNavigation("methods");
          }}
        >
          返回接入方式
        </button>
        <strong>{METHODS.find(([id]) => id === method)?.[1]}</strong>
      </div>
      <div className="model-access-methods" role="group" aria-label="接入方式">
        {METHODS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="settings-action secondary"
            aria-pressed={method === id}
            disabled={busy}
            aria-controls={`model-access-${id === "official" || id === "relay" || id === "local" ? "api" : id}`}
            onClick={() => {
              if (busy) return;
              setMethod(id);
              setNavigation("detail");
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <section
        id="model-access-codex"
        hidden={method !== "codex"}
        aria-label="Codex 主 Agent 接入"
      >
        <AgentConnectionSettings onFeedback={onFeedback} />
        <NativeCliControls
          tool="codex"
          active={active && method === "codex"}
          onBusyChange={setCodexCliBusy}
        />
      </section>
      <ModelAccessApiPanel
        method={method}
        active={active}
        workflows={workflows}
        onBusyChange={setApiSaving}
        onOpenGoogle={() => {
          if (busy) return;
          setNavigation("detail");
          setMethod("official");
          setFocusGoogle(true);
        }}
        onFeedback={onFeedback}
      />
      <section
        id="model-access-cli"
        hidden={method !== "cli"}
        aria-label="CLI 账号配置"
      >
        <div
          className="settings-action-group"
          role="group"
          aria-label="CLI 工具"
        >
          {(["gemini", "codebuddy"] as const).map((tool) => (
            <button
              type="button"
              className="settings-action secondary"
              key={tool}
              aria-pressed={cliTool === tool}
              disabled={busy}
              onClick={() => {
                setCliTool(tool);
                if (tool === "codebuddy") setCodeBuddyMounted(true);
              }}
            >
              {tool === "gemini" ? "Gemini CLI" : "CodeBuddy CLI"}
            </button>
          ))}
        </div>
        {codeBuddyMounted && (
          <div hidden={cliTool !== "codebuddy"}>
            <CodeBuddyConnectionSettings
              onFeedback={onFeedback}
              onBusyChange={setCodeBuddyBusy}
            />
          </div>
        )}
        <NativeCliControls
          tool={cliTool}
          active={active && method === "cli"}
          onBusyChange={setNativeCliBusy}
        />
      </section>
      <section
        ref={googlePanel}
        hidden={
          method !== "official" && !(method === "cli" && cliTool === "gemini")
        }
        aria-label="Google 账号接入"
      >
        <GoogleConnectionSettings
          mode={method === "cli" ? "cli" : "api-key"}
          active={
            active &&
            (method === "official" ||
              (method === "cli" && cliTool === "gemini"))
          }
          onBusyChange={setGoogleBusy}
          onFeedback={onFeedback}
        />
      </section>
      <div id="model-access-oauth" hidden={method !== "oauth"}>
        <OAuthAccessPanel hidden={method !== "oauth"} />
      </div>
    </div>
  );
}
