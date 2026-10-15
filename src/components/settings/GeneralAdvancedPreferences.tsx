import { useState } from "react";

export default function GeneralAdvancedPreferences({
  open,
  onReset,
}: {
  open: boolean;
  onReset: () => void;
}) {
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <details className="settings-disclosure" open={open || undefined}>
      <summary>高级偏好</summary>
      <div className="settings-detail-stack">
        <p className="settings-section-intro">
          恢复主题、强调色和界面布局。项目、素材、模型连接与密钥保持原样。
        </p>
        <div className="settings-action-group">
          {confirmReset ? (
            <>
              <button
                type="button"
                className="settings-action"
                onClick={() => {
                  onReset();
                  setConfirmReset(false);
                }}
              >
                确认恢复
              </button>
              <button
                type="button"
                className="settings-action secondary"
                onClick={() => setConfirmReset(false)}
              >
                取消
              </button>
            </>
          ) : (
            <button
              type="button"
              className="settings-action secondary"
              onClick={() => setConfirmReset(true)}
            >
              恢复默认偏好
            </button>
          )}
        </div>
      </div>
    </details>
  );
}
