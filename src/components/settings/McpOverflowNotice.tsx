export default function McpOverflowNotice({
  warning,
  title,
  onExport,
  onRecover,
}: {
  warning: string;
  title: string;
  onExport: () => void;
  onRecover?: () => void;
}) {
  return (
    <div className="settings-connection-note" role="alert">
      <span className="settings-status-dot" aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <p>{warning}</p>
        <div className="settings-inline-actions">
          <button
            type="button"
            className="settings-action secondary"
            onClick={onExport}
          >
            导出原始 MCP 配置
          </button>
          {onRecover && (
            <button
              type="button"
              className="settings-action"
              onClick={onRecover}
            >
              保留前 50 项并恢复
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
