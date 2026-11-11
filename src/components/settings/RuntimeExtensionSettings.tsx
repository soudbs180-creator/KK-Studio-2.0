import { Button } from "../ui/Button.tsx";
import { useState, useSyncExternalStore } from "react";
import { extensionBridge } from "../../features/extensions/index.ts";

/** Uses the installed-plugin row pattern for extensions registered by the current runtime. */
export default function RuntimeExtensionSettings({
  busy,
  onFeedback,
}: {
  busy: boolean;
  onFeedback(message: string): void;
}) {
  const extensions = useSyncExternalStore(
    (callback) => extensionBridge.subscribeExtensions(callback),
    () => extensionBridge.getExtensions(),
    () => extensionBridge.getExtensions(),
  );
  const [error, setError] = useState<string>();
  if (!extensions.length) return null;
  return (
    <>
      {extensions.map((extension) => {
        const enabled =
          extension.status === "active" || extension.status === "degraded";
        const reason =
          !enabled && extension.restartable === false
            ? "旧版扩展停用后需重新加载，或迁移到新版扩展接口。"
            : undefined;
        const name = extension.name ?? extension.id;
        return (
          <div className="plugin-manager-row" key={extension.id}>
            <div className="plugin-manager-info">
              <strong>{name}</strong>
              <span>
                {extension.version ? `${extension.version} · ` : ""}当前运行时 ·{" "}
                {enabled ? "已启用" : "已停用"}
              </span>
              {extension.error && <p role="alert">{extension.error}</p>}
              {reason && <p>{reason}</p>}
            </div>
            <div className="plugin-manager-actions">
              <Button
                type="button"
                role="switch"
                aria-checked={enabled}
                aria-label={`${enabled ? "停用" : "启用"} ${name}`}
                title={reason}
                disabled={busy || Boolean(reason)}
                isPill
                onClick={() => {
                  try {
                    extensionBridge.setExtensionEnabled(extension.id, !enabled);
                    setError(undefined);
                    onFeedback(enabled ? "扩展已停用" : "扩展已启用");
                  } catch (cause) {
                    setError(
                      cause instanceof Error ? cause.message : "切换扩展失败",
                    );
                  }
                }}
              >
                {enabled ? "已启用" : "已停用"}
              </Button>
            </div>
          </div>
        );
      })}
      {error && (
        <p className="settings-network-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
