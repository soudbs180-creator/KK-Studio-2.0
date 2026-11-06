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
    <section className="settings-general-reset" data-figma-node="655:142697">
      <h3 className="settings-general-heading">高级偏好重置</h3>
      <p>
        恢复应用主题、强调色和界面布局至初始状态。您的项目工程、素材资产、已配置的模型连接与密钥将完整保留。
      </p>
      <div className="settings-general-reset-actions">
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
    </section>
  );
}
