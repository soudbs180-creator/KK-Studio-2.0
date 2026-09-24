import { GEMINI_BRIDGE_DEFAULT_URL } from "../../features/agent/geminiCliAdapter";

export function GoogleCliSetup({
  bridgeUrl,
  onChange,
  disabled,
}: {
  bridgeUrl: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <>
      <p>
        用本机 Gemini CLI 登录 Google 账号，经本地桥免 API Key 对话。首次使用：
      </p>
      <ol className="settings-guide">
        <li>安装：npm install -g @google/gemini-cli</li>
        <li>登录：终端运行 gemini，选择 Login with Google</li>
        <li>启动桥：node scripts/gemini-bridge.mjs（默认端口 1424）</li>
      </ol>
      <p>检测或连接会用一次简短请求确认登录态，可能消耗 Gemini CLI 额度。</p>
      <div className="settings-network-field">
        <label htmlFor="google-bridge-url">Gemini CLI 桥地址</label>
        <input
          id="google-bridge-url"
          type="url"
          autoComplete="off"
          value={bridgeUrl}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          placeholder={GEMINI_BRIDGE_DEFAULT_URL}
        />
      </div>
    </>
  );
}

export function GoogleKeySetup({
  apiKey,
  onChange,
  disabled,
  stored,
}: {
  apiKey: string;
  onChange: (value: string) => void;
  disabled: boolean;
  stored: boolean;
}) {
  return (
    <>
      <p>
        填写 Google AI Studio API Key 后，在项目对话中选择 Google
        Gemini。生成的图片会自动保存到当前画布。
      </p>
      <div className="settings-network-field">
        <label htmlFor="google-key">Google 密钥</label>
        <input
          id="google-key"
          type="password"
          autoComplete="off"
          value={apiKey}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          placeholder={
            stored
              ? "已配置；输入新 Key 可替换"
              : "粘贴 Google AI Studio API Key"
          }
        />
      </div>
      <p>
        桌面版保存在系统凭据库；网页版仅保留在本次会话中。Google
        可能保留连续对话记录，具体期限由其项目设置决定。
      </p>
    </>
  );
}
