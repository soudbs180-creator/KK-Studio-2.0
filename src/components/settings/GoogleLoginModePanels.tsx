import { useState } from "react";
import {
  GEMINI_BRIDGE_DEFAULT_URL,
  resolveGeminiCliLoginStatus,
  type GeminiCliStatus,
} from "../../features/agent/geminiCliAdapter";

export function GoogleLoginModeChoice({
  cli,
  disabled,
  onChange,
}: {
  cli: boolean;
  disabled: boolean;
  onChange: (mode: "api-key" | "cli") => void;
}) {
  return (
    <fieldset className="settings-login-modes">
      <legend>登录方式</legend>
      <label className="settings-radio">
        <input
          type="radio"
          name="google-login-mode"
          value="api-key"
          checked={!cli}
          disabled={disabled}
          onChange={() => onChange("api-key")}
        />
        密钥登录（对话与生图）
      </label>
      <label className="settings-radio">
        <input
          type="radio"
          name="google-login-mode"
          value="cli"
          checked={cli}
          disabled={disabled}
          onChange={() => onChange("cli")}
        />
        Gemini CLI 账号（Google 登录，免 Key，仅对话）
      </label>
    </fieldset>
  );
}

export function GoogleCliSetup({
  bridgeUrl,
  onChange,
  disabled,
  report,
}: {
  bridgeUrl: string;
  onChange: (value: string) => void;
  disabled: boolean;
  report?: GeminiCliStatus;
}) {
  const [copyStatus, setCopyStatus] = useState("");
  const login = report ? resolveGeminiCliLoginStatus(report) : undefined;
  async function copyCommand(command: string) {
    try {
      await navigator.clipboard.writeText(command);
      setCopyStatus("命令已复制，请在你的终端执行。");
    } catch {
      setCopyStatus("复制失败，请手动复制上方命令到终端。");
    }
  }
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
      <div className="settings-action-group" aria-label="CLI 准备命令">
        <button
          type="button"
          className="settings-action secondary"
          onClick={() => void copyCommand("npm install -g @google/gemini-cli")}
        >
          复制安装命令
        </button>
        <button
          type="button"
          className="settings-action secondary"
          onClick={() => void copyCommand("gemini")}
        >
          复制登录命令
        </button>
        <button
          type="button"
          className="settings-action secondary"
          onClick={() => void copyCommand("node scripts/gemini-bridge.mjs")}
        >
          复制启动桥命令
        </button>
      </div>
      {copyStatus && <p role="status">{copyStatus}</p>}
      <div className="settings-detail-card" aria-label="Gemini CLI 检测状态">
        <div>
          <span>软件安装</span>
          <strong>
            {!report ? "未检测" : report.installed ? "已安装" : "未安装"}
          </strong>
        </div>
        <div>
          <span>CLI 版本</span>
          <strong>{report?.version ?? "未报告"}</strong>
        </div>
        <div>
          <span>登录验证</span>
          <strong>
            {!report
              ? "未检测"
              : login === "verified"
                ? "已验证"
                : login === "required"
                  ? "需要登录"
                  : "未确认"}
          </strong>
        </div>
      </div>
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
