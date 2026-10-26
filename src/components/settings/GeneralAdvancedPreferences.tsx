import { useState } from "react";

export default function GeneralAdvancedPreferences({
  open: _open,
  onReset,
}: {
  open: boolean;
  onReset: () => void;
}) {
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="settings-group-section" style={{ marginTop: "20px" }}>
      <div
        className="kk-card-box"
        style={{
          backgroundColor: "var(--kk-bg-card)",
          border: "1px solid var(--kk-border-subtle)",
          padding: "16px 20px",
        }}
      >
        <h3
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "var(--kk-text-primary)",
            margin: 0,
          }}
        >
          高级偏好重置
        </h3>
        <p
          style={{
            margin: "4px 0 12px",
            fontSize: "12px",
            color: "var(--kk-text-secondary)",
            lineHeight: 1.5,
          }}
        >
          恢复应用主题、强调色和界面布局至初始状态。您的项目工程、素材资产、已配置的模型连接与密钥将完整保留。
        </p>
        <div style={{ display: "flex", gap: "8px" }}>
          {confirmReset ? (
            <>
              <button
                type="button"
                className="settings-action"
                style={{ height: "var(--kk-control-h-md)" }}
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
                style={{ height: "var(--kk-control-h-md)" }}
                onClick={() => setConfirmReset(false)}
              >
                取消
              </button>
            </>
          ) : (
            <button
              type="button"
              className="settings-action secondary"
              style={{ height: "var(--kk-control-h-md)" }}
              onClick={() => setConfirmReset(true)}
            >
              恢复默认偏好
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
