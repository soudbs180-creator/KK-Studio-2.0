// Standalone users supply a session token; never print or persist a new secret.
if (
  !process.env.CANVAS_AGENT_TOKEN ||
  process.env.CANVAS_AGENT_TOKEN.length < 32
) {
  console.error(
    "请用 npm run dev:agent 或桌面“启动并连接”。独立服务需要在请求环境中提供至少32字符的 CANVAS_AGENT_TOKEN，不会写入或打印该 Token。",
  );
  process.exit(1);
}
await import("../../vendor/canvas-agent/dist/index.js");
