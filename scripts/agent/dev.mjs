import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const port = Number(process.env.KK_AGENT_PORT || 17381);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("KK_AGENT_PORT 无效");
// Fail before starting anything if the port belongs to another task.
await new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.once("error", reject);
  probe.listen(port, "127.0.0.1", () => probe.close(resolve));
});
const profile = path.join(
  process.env.LOCALAPPDATA || os.tmpdir(),
  "kk-studio",
  "agent-runtime",
);
await mkdir(profile, { recursive: true });
const token = randomBytes(32).toString("hex");
const url = "http://127.0.0.1:" + port;
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.pid || child.exitCode !== null) continue;
    if (process.platform === "win32")
      spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        windowsHide: true,
        stdio: "ignore",
      });
    else child.kill("SIGTERM");
  }
  process.exitCode = code;
}
function start(args, env, quiet = false) {
  const child = spawn(process.execPath, args, {
    cwd: root,
    env: { ...process.env, ...env },
    windowsHide: true,
    stdio: quiet ? "ignore" : "inherit",
  });
  children.push(child);
  child.on("error", () => {
    console.error("本地 Agent 启动失败，请检查 vendor 依赖。");
    stop(1);
  });
  child.on("exit", (code) => stop(code || 0));
  return child;
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
start(
  ["vendor/canvas-agent/dist/index.js"],
  {
    PORT: String(port),
    USERPROFILE: profile,
    HOME: profile,
    CODEX_HOME: process.env.CODEX_HOME || path.join(os.homedir(), ".codex"),
    CANVAS_AGENT_TOKEN: token,
  },
  true,
);
let ready = false;
for (let attempt = 0; attempt < 80 && !stopping; attempt++) {
  try {
    ready = (await fetch(url + "/health")).ok;
  } catch {
    /* Startup still pending. */
  }
  if (ready) break;
  await new Promise((resolve) => setTimeout(resolve, 250));
}
if (!ready) {
  console.error("本地 Agent 未启动成功，请运行 npm run agent 检查服务。");
  stop(1);
} else if (!stopping) {
  start(["node_modules/vite/bin/vite.js"], {
    KK_AGENT_URL: url,
    KK_AGENT_TOKEN: token,
    VITE_KK_AGENT_PROXY: "1",
  });
  console.log(
    "KK Codex 入口：http://127.0.0.1:1421 · 打开项目后自动连接已有 Codex 登录。",
  );
}
