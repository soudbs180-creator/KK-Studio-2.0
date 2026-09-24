import {
  googleAgentConnection,
  type GoogleAgentState,
} from "../features/agent/googleAgentConnection";
export default function GoogleAgentControls({
  state,
}: {
  state: GoogleAgentState;
}) {
  const disabled = state.sending || state.status === "connecting";
  const settings = state.settings;
  return (
    <div className="google-agent-controls">
      <label>
        输出
        <select
          aria-label="Google 输出"
          value={settings.mode}
          disabled={disabled}
          onChange={(e) =>
            googleAgentConnection.configure({
              mode: e.target.value as "text" | "image",
            })
          }
        >
          <option value="text">对话</option>
          <option value="image" disabled={settings.loginMode === "cli"}>
            生成图片
          </option>
        </select>
      </label>
      {settings.loginMode === "cli" && (
        <p className="google-agent-note">
          Gemini CLI 通道仅支持对话；生图请改用 API Key 登录方式。
        </p>
      )}
      <label className="google-agent-model">
        模型
        <input
          aria-label="Google 模型"
          value={settings.model}
          list="google-models"
          disabled={disabled}
          onChange={(e) =>
            googleAgentConnection.configure({ model: e.target.value })
          }
        />
      </label>
      <datalist id="google-models">
        {state.models.map((model) => (
          <option key={model} value={model} />
        ))}
      </datalist>
      {settings.mode === "image" && (
        <>
          <label>
            比例
            <select
              aria-label="Google 图片比例"
              value={settings.aspectRatio}
              disabled={disabled}
              onChange={(e) =>
                googleAgentConnection.configure({ aspectRatio: e.target.value })
              }
            >
              {["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"].map(
                (ratio) => (
                  <option key={ratio}>{ratio}</option>
                ),
              )}
            </select>
          </label>
          <label>
            清晰度
            <select
              aria-label="Google 图片清晰度"
              value={settings.imageSize}
              disabled={disabled}
              onChange={(e) =>
                googleAgentConnection.configure({ imageSize: e.target.value })
              }
            >
              {["1K", "2K", "4K"].map((size) => (
                <option key={size}>{size}</option>
              ))}
            </select>
          </label>
        </>
      )}
    </div>
  );
}
