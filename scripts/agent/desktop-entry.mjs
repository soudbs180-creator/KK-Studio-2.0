import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { once } from "node:events";
import path from "node:path";
import { createInterface } from "node:readline";

// Private stdio belongs to the native owner, never a file logger or shell.
const control = createInterface({ input: process.stdin, crlfDelay: Infinity });
control.once("close", () => process.exit(0));
const [command] = await once(control, "line");
if (command !== "start" || !process.env.KK_AGENT_DATA_DIR) process.exit(1);
const token = randomBytes(32).toString("hex");
process.env.CANVAS_AGENT_TOKEN = token;
process.env.KK_AGENT_CONFIG_DIR = path.resolve(process.env.KK_AGENT_DATA_DIR);
process.env.KK_AGENT_DESKTOP = "1";
process.env.PORT = "0";
const packaged = new URL("./agent/dist/server/http.js", import.meta.url);
const entry = existsSync(packaged)
  ? packaged
  : new URL("../../vendor/canvas-agent/dist/server/http.js", import.meta.url);
try {
  const { startHttpServer } = await import(entry.href);
  const server = startHttpServer();
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw Error("Invalid bind");
  const endpoint = `http://127.0.0.1:${address.port}`;
  // Restoring an existing Codex thread continues after HTTP starts listening.
  // Do not let the first frontend handshake capture its transient preparing state.
  const deadline = Date.now() + 45000;
  while (true) {
    const health = await (
      await fetch(endpoint + "/health", { signal: AbortSignal.timeout(2000) })
    ).json();
    if (health.conversation?.status !== "preparing") break;
    if (Date.now() >= deadline)
      throw Error("Conversation preparation timed out");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  process.stdout.write(
    `KK_AGENT_READY ${JSON.stringify({ endpoint, token, pid: process.pid })}\n`,
  );
} catch {
  process.stderr.write("KK desktop Agent failed to start.\n");
  process.exit(1);
}
