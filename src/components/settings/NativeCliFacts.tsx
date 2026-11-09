import type {
  CliBridge,
  CliInspection,
  CliTool,
} from "../../integrations/nativeCli";
import SettingsInfoHint from "./SettingsInfoHint";

export default function NativeCliFacts({
  tool,
  label,
  info,
  bridge,
}: {
  tool: CliTool;
  label: string;
  info?: CliInspection;
  bridge?: CliBridge;
}) {
  return (
    <>
      <div className="settings-title-row">
        <h3>{label} CLI</h3>
        <SettingsInfoHint
          id={`cli-${tool}-verification`}
          label={`查看${label} CLI 验证说明`}
        >
          检测只读取版本和帮助。终端退出、CLI
          安装完成和桥启动均不代表账号或模型已验证。
        </SettingsInfoHint>
      </div>
      <p>
        {tool === "codex"
          ? "使用 KK 随包版本；登录会打开终端。"
          : tool === "gemini"
            ? "安装官方 @google/gemini-cli；登录在终端中选择 Google 账号。"
            : "安装官方 @tencent-ai/codebuddy-code；在终端中选择账号体系。"}
      </p>
      <dl className="settings-summary-list">
        <div>
          <dt>CLI 状态</dt>
          <dd>
            {!info
              ? "未检测"
              : info.complete
                ? "完整安装"
                : info.installed
                  ? "安装不完整"
                  : "未安装"}
          </dd>
        </div>
        <div>
          <dt>版本</dt>
          <dd>{info?.version || "未报告"}</dd>
        </div>
        <div>
          <dt>Node / npm</dt>
          <dd>
            {!info
              ? "未检测"
              : `${info.nodeAvailable ? "可用" : "缺失"} / ${info.npmAvailable ? "可用" : "缺失"}`}
          </dd>
        </div>
      </dl>
      {info?.cliPath && <p className="settings-field-help">{info.cliPath}</p>}
      {tool === "gemini" && bridge?.endpoint && (
        <p className="settings-field-help">
          桥地址：{bridge.endpoint} ·{" "}
          {bridge.healthy ? "进程健康" : "未确认健康"}
        </p>
      )}
    </>
  );
}
