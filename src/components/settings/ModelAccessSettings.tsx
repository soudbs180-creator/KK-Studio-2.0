import { useState } from "react";
import AgentConnectionSettings from "./AgentConnectionSettings";
import ModelProviderSettings from "./ModelProviderSettings";
import GoogleConnectionSettings from "./GoogleConnectionSettings";
import CodeBuddyConnectionSettings from "./CodeBuddyConnectionSettings";
import OAuthAccessPanel from "./OAuthAccessPanel";

const METHODS = [
  ["codex", "Codex 主 Agent"],
  ["official", "API Key（官方）"],
  ["relay", "API Key（中转站）"],
  ["cli", "CLI 账号"],
  ["oauth", "OAuth"],
] as const;
type Method = (typeof METHODS)[number][0];

/** Connections belong here; specialist task roles belong to extensions. */
export default function ModelAccessSettings({
  onFeedback,
}: {
  onFeedback: (message: string) => void;
}) {
  const [method, setMethod] = useState<Method>("codex");
  const [apiSaving, setApiSaving] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  return (
    <div className="model-access-settings">
      <div className="model-access-methods" role="group" aria-label="接入方式">
        {METHODS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="settings-action secondary"
            aria-pressed={method === id}
            disabled={apiSaving || googleBusy}
            aria-controls={`model-access-${id === "official" || id === "relay" ? "api" : id}`}
            onClick={() => setMethod(id)}
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
      </section>
      <section
        id="model-access-api"
        hidden={method !== "official" && method !== "relay"}
        aria-label={
          method === "relay" ? "中转站 API Key 配置" : "官方 API Key 配置"
        }
      >
        <ModelProviderSettings
          scope={method === "relay" ? "relay" : "official"}
          active={method === "official" || method === "relay"}
          onBusyChange={setApiSaving}
          onFeedback={onFeedback}
        />
      </section>
      <section
        id="model-access-cli"
        hidden={method !== "cli"}
        aria-label="CLI 账号配置"
      >
        {method === "cli" && (
          <CodeBuddyConnectionSettings onFeedback={onFeedback} />
        )}
      </section>
      <section
        hidden={method !== "official" && method !== "cli"}
        aria-label="Google 账号接入"
      >
        <GoogleConnectionSettings
          mode={method === "cli" ? "cli" : "api-key"}
          active={method === "official" || method === "cli"}
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
