export default function McpProtocolNotice() {
  return (
    <>
      <p className="settings-section-intro">
        连接会先探测 MCP Streamable
        HTTP（2026-07-28）现代协议，不支持时安全回退到 2025-11-25 legacy
        握手。地址只保存名称和 endpoint，不保存密钥、OAuth token 或会话 ID。
      </p>
      <div className="settings-connection-note">
        <span className="settings-status-dot" aria-hidden="true" />
        <div>
          <strong>支持工具发现和手动确认调用</strong>
          <p>
            现代服务器使用 server/discover → tools/list，legacy 服务器使用
            initialize → initialized → tools/list，并显示服务器返回的
            inputSchema。stdio、OAuth 和 Agent 自动调用仍为 Prototype。
          </p>
        </div>
      </div>
    </>
  );
}
