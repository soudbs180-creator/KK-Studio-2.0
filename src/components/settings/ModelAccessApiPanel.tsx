import ModelProviderSettings from "./ModelProviderSettings";
import LocalHardwareSettings from "./LocalHardwareSettings";
import LocalWorkflowSettings, {
  type LocalWorkflowAccess,
} from "./LocalWorkflowSettings";

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
        <h3 className="settings-detail-label">已启动的本地对话服务</h3>
        <p className="settings-section-intro">
          连接已启动的 llama.cpp、LM Studio 或 Ollama，默认无需 API
          Key。这里不会启动外部服务；Qwen 与 ComfyUI
          模型包目录关联和自动启动尚未接通。
        </p>
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
