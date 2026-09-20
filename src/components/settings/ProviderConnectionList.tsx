import {
  isProviderGenerationVerified,
  type ProviderConnection,
} from "../../domain/providerConnections";

export default function ProviderConnectionList({
  connections,
  activeBaseUrl,
  activeCredentialRef,
  onSelect,
}: {
  connections: ProviderConnection[];
  activeBaseUrl: string;
  activeCredentialRef?: string;
  onSelect: (connection: ProviderConnection) => void;
}) {
  if (!connections.length) return null;
  return (
    <section className="provider-connection-list" aria-label="已登记连接">
      <div className="provider-connection-list-heading">
        <strong>已登记连接</strong>
        <span>{connections.length} 个</span>
      </div>
      <div role="list">
        {connections.map((connection) => {
          const active =
            connection.baseUrl === activeBaseUrl &&
            (!activeCredentialRef ||
              !connection.credentialRef ||
              connection.credentialRef === activeCredentialRef);
          const verified = isProviderGenerationVerified(connection);
          return (
            <button
              key={connection.id}
              type="button"
              role="listitem"
              className={active ? "is-active" : ""}
              onClick={() => onSelect(connection)}
              title={connection.baseUrl ?? connection.displayName}
            >
              <span>
                <strong>{connection.displayName}</strong>
                <small>{connection.baseUrl ?? "本地连接"}</small>
              </span>
              <em>
                {active
                  ? "当前"
                  : connection.kind === "user_byok"
                    ? "BYOK"
                    : "本地"}
              </em>
              <small className={`connection-state is-${connection.state}`}>
                {connection.state === "active"
                  ? "已配置"
                  : connection.state === "cooldown"
                    ? "冷却中"
                    : connection.state === "quarantined"
                      ? "已隔离"
                      : connection.state === "degraded"
                        ? "降级"
                        : "已停用"}
              </small>
              <small
                className={`connection-verification ${
                  verified ? "is-verified" : "is-unverified"
                }`}
                title={
                  verified
                    ? `图片生成已验证${
                        connection.lastSuccessfulGenerationAt
                          ? ` · ${new Date(
                              connection.lastSuccessfulGenerationAt,
                            ).toLocaleString()}`
                          : ""
                      }`
                    : "已保存配置，但尚未通过实际图片生成验证"
                }
              >
                {verified ? "已验证生成" : "未验证生成"}
              </small>
            </button>
          );
        })}
      </div>
      <p>
        连接列表只保存名称、地址和能力；“已验证生成”仅在实际图片生成成功后记录。桌面密钥保存在系统凭据库，网页密钥仅在当前会话可用。
      </p>
    </section>
  );
}
