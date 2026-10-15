import { cliPending, type CliTool } from "../../integrations/nativeCli";
import type { NativeCliController } from "./useNativeCliControls";

function ActionButton({
  label,
  action,
  state,
  disabled,
  title,
  secondary = false,
  onClick,
}: {
  label: string;
  action: string;
  state: NativeCliController;
  disabled: boolean;
  title?: string;
  secondary?: boolean;
  onClick: () => unknown;
}) {
  const loading = state.loadingAction === action;
  return (
    <button
      type="button"
      className={"settings-action" + (secondary ? " secondary" : "")}
      disabled={disabled}
      title={title}
      onClick={() => {
        void onClick();
      }}
    >
      {loading ? state.loadingMessage : label}
    </button>
  );
}
function OperationActions({
  tool,
  state,
}: {
  tool: CliTool;
  state: NativeCliController;
}) {
  return (
    <div className="settings-action-group">
      <ActionButton
        label={`检测 ${state.label} CLI`}
        action="inspect"
        state={state}
        secondary
        disabled={Boolean(state.pending)}
        onClick={state.detect}
      />
      {state.canCancelDetection && (
        <ActionButton
          label="取消等待检测"
          action="cancel-wait"
          state={state}
          secondary
          disabled={false}
          onClick={state.cancelDetection}
        />
      )}
      {tool !== "codex" && (
        <ActionButton
          label={`安装 ${state.label} CLI`}
          action="install"
          state={state}
          disabled={state.busy || !state.info?.npmAvailable}
          title={
            !state.info?.npmAvailable
              ? "先检测同一环境中的 Node/npm"
              : undefined
          }
          onClick={() => state.begin("install")}
        />
      )}
      <ActionButton
        label={`登录 ${state.label} CLI`}
        action="login"
        state={state}
        disabled={state.busy || !state.info?.complete}
        title={!state.info?.complete ? "先检测完整的 CLI 安装" : undefined}
        onClick={() => state.begin("login")}
      />
      {cliPending(state.operation) && (
        <ActionButton
          label="取消当前 CLI 操作"
          action="cancel"
          state={state}
          secondary
          disabled={Boolean(state.pending)}
          onClick={state.cancelOperation}
        />
      )}
      {state.info?.cliPath && (
        <ActionButton
          label="复制 CLI 路径"
          action="copy"
          state={state}
          secondary
          disabled={Boolean(state.pending)}
          onClick={state.copyPath}
        />
      )}
    </div>
  );
}
function BridgeActions({
  tool,
  state,
}: {
  tool: CliTool;
  state: NativeCliController;
}) {
  if (tool !== "gemini") return null;
  return (
    <div className="settings-action-group">
      <ActionButton
        label="启动已保存地址的 CLI 桥"
        action="bridge-start"
        state={state}
        disabled={
          state.busy || !state.info?.complete || Boolean(state.bridge?.running)
        }
        title={
          !state.info?.complete ? "先检测完整的 Gemini CLI 安装" : undefined
        }
        onClick={state.startBridge}
      />
      <ActionButton
        label={state.pending === "bridge-start" ? "取消桥启动" : "停止 CLI 桥"}
        action={
          state.pending === "bridge-cancel" ? "bridge-cancel" : "bridge-stop"
        }
        state={state}
        secondary
        disabled={!state.canStopBridge}
        title={!state.canStopBridge ? "只能停止本窗口启动的桥" : undefined}
        onClick={state.stopBridge}
      />
      <ActionButton
        label="检测 CLI 桥"
        action="bridge-inspect"
        state={state}
        secondary
        disabled={Boolean(state.pending)}
        onClick={state.detectBridge}
      />
    </div>
  );
}
export default function NativeCliActions(props: {
  tool: CliTool;
  state: NativeCliController;
}) {
  return (
    <>
      <OperationActions {...props} />
      <BridgeActions {...props} />
    </>
  );
}
