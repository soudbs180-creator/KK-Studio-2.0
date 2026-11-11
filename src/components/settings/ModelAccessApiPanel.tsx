import ModelProviderSettings from "./ModelProviderSettings";
import LocalHardwareSettings from "./LocalHardwareSettings";
import LocalWorkflowSettings, {
  type LocalWorkflowAccess,
} from "./LocalWorkflowSettings";
import SettingsInfoHint from "./SettingsInfoHint";

export default function ModelAccessApiPanel({
  method,
  active,
  workflows,
  onBusyChange,
  onOpenGoogle,
  onFeedback,
}: {
  method: string;
  active: boolean;
  workflows: LocalWorkflowAccess;
  onBusyChange: (busy: boolean) => void;
  onOpenGoogle: () => void;
  onFeedback: (message: string) => void;
}) {
  const apiMethod = ["official", "relay", "local"].includes(method);
  const scope =
    method === "local" ? "local" : method === "relay" ? "relay" : "official";
  const label = {
    local: "本地模型服务",
    relay: "中转站 API Key 配置",
    official: "官方 API Key 配置",
  }[scope];
  return (
    <section id="model-access-api" hidden={!apiMethod} aria-label={label}>
      <div hidden={method !== "local"} className="settings-detail-stack">
        <LocalHardwareSettings />
        <LocalWorkflowSettings workflows={workflows} />
        <div className="settings-title-row">
          <h3 className="settings-detail-label">已启动的本地对话服务</h3>
          <SettingsInfoHint
            id="local-chat-service"
            label="查看本地对话服务说明"
          >
            连接已启动的 llama.cpp、LM Studio 或 Ollama，默认无需 API
            Key。ComfyUI 可在画布工作流节点选择目录启动，并在这里保存连接。
          </SettingsInfoHint>
        </div>
      </div>
      <ModelProviderSettings
        scope={scope}
        active={active && apiMethod}
        onBusyChange={onBusyChange}
        onOpenGoogle={onOpenGoogle}
        onFeedback={onFeedback}
      />
    </section>
  );
}
