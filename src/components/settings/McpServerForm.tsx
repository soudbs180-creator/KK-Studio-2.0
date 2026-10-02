export default function McpServerForm({
  name,
  endpoint,
  formError,
  readOnly,
  onNameChange,
  onEndpointChange,
  onSubmit,
}: {
  name: string;
  endpoint: string;
  formError: string;
  readOnly: boolean;
  onNameChange: (value: string) => void;
  onEndpointChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <section className="settings-mcp-add" aria-labelledby="mcp-add-title">
      <h3 id="mcp-add-title">添加 MCP 服务器</h3>
      <label className="settings-field">
        名称
        <input
          aria-label="MCP服务器名称"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="例如：本地工具"
        />
      </label>
      <label className="settings-field">
        Streamable HTTP 地址
        <input
          aria-label="MCP地址"
          value={endpoint}
          onChange={(event) => onEndpointChange(event.target.value)}
          placeholder="https://example.com/mcp 或 http://127.0.0.1:3000/mcp"
          inputMode="url"
        />
      </label>
      {formError && (
        <p className="settings-mcp-error" role="alert">
          {formError}
        </p>
      )}
      <button
        type="button"
        className="settings-action"
        disabled={readOnly || !name.trim() || !endpoint.trim()}
        onClick={onSubmit}
      >
        保存服务器
      </button>
    </section>
  );
}
