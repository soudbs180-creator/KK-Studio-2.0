import { useSyncExternalStore } from "react";
import { pluginStore } from "../features/plugins/pluginStore";

export default function ComposerPluginSummary() {
  const state = useSyncExternalStore(
    pluginStore.subscribe,
    pluginStore.getState,
  );
  const enabled = state.plugins.filter((plugin) => plugin.enabled);
  return (
    <div className="composer-plugin-summary">
      <p>
        {enabled.length
          ? `已启用 ${enabled.length} 个画布插件`
          : "当前没有启用的画布插件。"}
      </p>
      {enabled.length > 0 && (
        <p>{enabled.map((plugin) => plugin.name).join(" · ")}</p>
      )}
      <p>在画布「添加节点 › 插件」中使用；此菜单不会把插件附加到生成请求。</p>
      {state.error && <p role="alert">{state.error}</p>}
    </div>
  );
}
