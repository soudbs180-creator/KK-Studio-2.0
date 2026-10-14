import { isTauri } from "@tauri-apps/api/core";
import type { CliTool } from "../../integrations/nativeCli";
import useNativeCliControls from "./useNativeCliControls";
import NativeCliFacts from "./NativeCliFacts";
import NativeCliActions from "./NativeCliActions";

/** Installation and authentication start only on explicit action clicks. */
export default function NativeCliControls({
  tool,
  active,
  onBusyChange,
}: {
  tool: CliTool;
  active: boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const state = useNativeCliControls(tool, active, onBusyChange);
  if (!isTauri())
    return (
      <p className="settings-field-help">
        CLI 安装、登录和本地桥管理在桌面版提供。网页可连接已启动的本机服务。
      </p>
    );
  return (
    <section
      className="settings-cli-card"
      aria-label={`${state.label} CLI 管理`}
      aria-busy={state.busy}
    >
      <NativeCliFacts
        tool={tool}
        label={state.label}
        info={state.info}
        bridge={state.bridge}
      />
      <NativeCliActions tool={tool} state={state} />
      {(state.loadingMessage || state.message) && (
        <p role="status">{state.loadingMessage || state.message}</p>
      )}
    </section>
  );
}
