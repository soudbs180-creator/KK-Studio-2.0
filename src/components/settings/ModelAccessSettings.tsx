import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useSettingsNavigationBusy } from "./useSettingsBusy";
import { agentConnection } from "../../features/agent/index.ts";
import { desktopAgentLifecycle } from "../../features/agent/index.ts";
import AgentConnectionSettings from "./AgentConnectionSettings";
import ModelAccessApiPanel from "./ModelAccessApiPanel";
import GoogleConnectionSettings from "./GoogleConnectionSettings";
import CodeBuddyConnectionSettings from "./CodeBuddyConnectionSettings";
import OAuthAccessPanel from "./OAuthAccessPanel";
import NativeCliControls from "./NativeCliControls";
import type { LocalWorkflowAccess } from "./LocalWorkflowSettings";

export const CHANNELS = [
  {
    id: "official",
    label: "官方直连",
    badge: "API",
    title: "官方 API 直连 (Official API)",
    desc: "直接调用 OpenAI、Anthropic Claude、Google Gemini、DeepSeek 原生官方开发者 API。",
  },
  {
    id: "relay",
    label: "中转路由",
    badge: "Gateway",
    title: "API 供应商路由 / 中转站 (Relay)",
    desc: "接入 12ai、SiliconFlow、OpenRouter 或自有 New API / One API 聚合网关。",
  },
  {
    id: "oauth",
    label: "账号授权",
    badge: "OAuth",
    title: "账号授权 (OAuth / Web Authorization)",
    desc: "通过官方网页或应用授权直接接入账号会话，享受官方会员配额。",
  },
  {
    id: "cli",
    label: "CLI 直连",
    badge: "CLI",
    title: "CLI 直连 (Native CLI Runtimes)",
    desc: "无缝桥接本机已登录的官方命令行开发环境（Codex、Gemini、CodeBuddy）。",
  },
  {
    id: "local",
    label: "本地模型",
    badge: "Offline",
    title: "本地模型 (Local Runtimes & ComfyUI)",
    desc: "完全在本地计算机运行的开源模型引擎，数据隐私安全，零网络调用。",
  },
] as const;

export type ChannelId = (typeof CHANNELS)[number]["id"];
export type Method = ChannelId | "codex";

export default function ModelAccessSettings({
  onFeedback,
  active = true,
  initialMethod = "official",
  workflows,
}: {
  onFeedback: (message: string) => void;
  active?: boolean;
  initialMethod?: Method;
  workflows: LocalWorkflowAccess;
}) {
  const setBusy = useSettingsNavigationBusy();
  const [currentChannel, setCurrentChannel] = useState<ChannelId>(
    initialMethod === "codex" ? "cli" : initialMethod,
  );
  const [cliTool, setCliTool] = useState<"codex" | "gemini" | "codebuddy">(
    initialMethod === "codex" ? "codex" : "gemini",
  );

  const agent = useSyncExternalStore(
    agentConnection.subscribe,
    agentConnection.getState,
  );
  const lifecycle = useSyncExternalStore(
    desktopAgentLifecycle.subscribe,
    desktopAgentLifecycle.getState,
  );

  const [apiSaving, setApiSaving] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [codeBuddyBusy, setCodeBuddyBusy] = useState(false);
  const [codexCliBusy, setCodexCliBusy] = useState(false);
  const [nativeCliBusy, setNativeCliBusy] = useState(false);
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

  const googlePanel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!focusGoogle || currentChannel !== "official") return;
    googlePanel.current?.scrollIntoView({ block: "nearest" });
    googlePanel.current
      ?.querySelector<HTMLInputElement>("#google-key")
      ?.focus({ preventScroll: true });
    setFocusGoogle(false);
  }, [focusGoogle, currentChannel]);

  const channelInfo = CHANNELS.find((c) => c.id === currentChannel)!;

  return (
    <div className="model-access-settings ccswitch-layout">
      <nav className="model-access-channel-nav" aria-label="模型接入渠道导航">
        <div className="channel-nav-header">
          <h2 className="channel-nav-title">模型接入渠道</h2>
          <span className="channel-nav-count">5 大核心渠道</span>
        </div>
        <div
          className="channel-segmented-tabs"
          role="tablist"
          aria-label="5 大模型接入渠道"
        >
          {CHANNELS.map((ch) => (
            <button
              key={ch.id}
              type="button"
              role="tab"
              data-channel={ch.id}
              aria-selected={currentChannel === ch.id}
              aria-controls={`channel-panel-${ch.id}`}
              disabled={busy}
              className={`channel-tab-button ${currentChannel === ch.id ? "is-active" : ""}`}
              onClick={() => {
                if (!busy) setCurrentChannel(ch.id);
              }}
            >
              <span className="tab-label">{ch.label}</span>
              <span className="tab-badge">{ch.badge}</span>
            </button>
          ))}
        </div>
      </nav>

      <main className="model-access-main-content">
        <div className="channel-panel-intro">
          <h3 className="panel-title">{channelInfo.title}</h3>
          <p className="panel-desc">{channelInfo.desc}</p>
        </div>

        {/* 1. Official, 2. Relay, 5. Local */}
        {["official", "relay", "local"].includes(currentChannel) && (
          <section
            id={`channel-panel-${currentChannel}`}
            role="tabpanel"
            className="channel-panel-view"
          >
            <ModelAccessApiPanel
              method={currentChannel}
              active={active}
              workflows={workflows}
              onBusyChange={setApiSaving}
              onOpenGoogle={() => {
                if (!busy) setFocusGoogle(true);
              }}
              onFeedback={onFeedback}
            />
            {currentChannel === "official" && (
              <section
                ref={googlePanel}
                className="google-connection-subgroup inset-grouped-card"
                aria-label="Google API"
              >
                <GoogleConnectionSettings
                  mode="api-key"
                  active={active && currentChannel === "official"}
                  onBusyChange={setGoogleBusy}
                  onFeedback={onFeedback}
                />
              </section>
            )}
          </section>
        )}

        {/* 3. OAuth */}
        {currentChannel === "oauth" && (
          <section
            id="channel-panel-oauth"
            role="tabpanel"
            className="channel-panel-view"
          >
            <OAuthAccessPanel hidden={false} />
          </section>
        )}

        {/* 4. CLI */}
        {currentChannel === "cli" && (
          <section
            id="channel-panel-cli"
            role="tabpanel"
            className="channel-panel-view"
          >
            <div
              className="cli-tool-subnav"
              role="group"
              aria-label="CLI 运行工具"
            >
              {[
                { id: "codex", label: "Codex CLI / 主 Agent" },
                { id: "gemini", label: "Gemini CLI" },
                { id: "codebuddy", label: "CodeBuddy CLI" },
              ].map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  className={`cli-subtab-btn ${cliTool === tool.id ? "is-active" : ""}`}
                  aria-pressed={cliTool === tool.id}
                  disabled={busy}
                  onClick={() => {
                    setCliTool(tool.id as "codex" | "gemini" | "codebuddy");
                    if (tool.id === "codebuddy") setCodeBuddyMounted(true);
                  }}
                >
                  {tool.label}
                </button>
              ))}
            </div>

            {cliTool === "codex" && (
              <div className="cli-tool-panel">
                <AgentConnectionSettings onFeedback={onFeedback} />
                <NativeCliControls
                  tool="codex"
                  active={active}
                  onBusyChange={setCodexCliBusy}
                />
              </div>
            )}
            {cliTool === "gemini" && (
              <div className="cli-tool-panel">
                <GoogleConnectionSettings
                  mode="cli"
                  active={active}
                  onBusyChange={setGoogleBusy}
                  onFeedback={onFeedback}
                />
                <NativeCliControls
                  tool="gemini"
                  active={active}
                  onBusyChange={setNativeCliBusy}
                />
              </div>
            )}
            {cliTool === "codebuddy" && codeBuddyMounted && (
              <div className="cli-tool-panel">
                <CodeBuddyConnectionSettings
                  onFeedback={onFeedback}
                  onBusyChange={setCodeBuddyBusy}
                />
                <NativeCliControls
                  tool="codebuddy"
                  active={active}
                  onBusyChange={setNativeCliBusy}
                />
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
