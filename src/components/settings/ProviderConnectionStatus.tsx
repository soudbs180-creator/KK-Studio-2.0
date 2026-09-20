export default function ProviderConnectionStatus({
  kind,
  message,
}: {
  kind: "idle" | "loading" | "success" | "error" | "cancelled" | "offline";
  message: string;
}) {
  return (
    <div className={`provider-status is-${kind}`} role="status">
      <span className="settings-status-dot" />
      <div>
        <strong>{kind === "success" ? "连接可用" : "API 连接"}</strong>
        <p>{message}</p>
      </div>
    </div>
  );
}
