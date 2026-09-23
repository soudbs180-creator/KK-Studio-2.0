import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  process.argv[2] ||
    fileURLToPath(new URL("../../vendor/canvas-agent", import.meta.url)),
);
const patches = [
  [
    "src/server/http.ts",
    "import { prepareIdleConversation }",
    'import { createRuntimeDrain } from "./kk-runtime-drain.js";\nimport { prepareIdleConversation }',
  ],
  [
    "src/server/http.ts",
    '    app.get("/events", (req, res) => {',
    `    const drain = createRuntimeDrain(() => Boolean(session.codexBusy || skillDraftRunning || draftThreadStart || ["preparing", "running"].includes(session.conversationStateSnapshot.status)));
    app.post("/runtime/shutdown", (_req, res) => {
        if (!process.env.KK_AGENT_DESKTOP) return void res.status(404).json({ ok: false });
        const ok = drain.shutdown();
        res.status(ok ? 200 : 409).json({ ok });
    });
    app.use((req, res, next) => {
        // Read-only account/history requests may wait on the provider. They can
        // be cancelled on shutdown; mutations and model turns must finish first.
        const release = drain.enter(req.method !== "GET");
        if (!release) return void res.status(503).json({ ok: false, error: "Agent is stopping" });
        res.once("finish", release);
        res.once("close", release);
        next();
    });
    app.get("/events", (req, res) => {`,
  ],
  [
    "src/server/http.ts",
    "res.json({ ok: true, workspace, conversation: session.conversationStateSnapshot, ...(await readCodexThread(emit, threadId, workspace.workspacePath)) });",
    "res.json({ ok: true, workspace, ...(await readCodexThread(emit, threadId, workspace.workspacePath)), conversation: session.conversationStateSnapshot });",
  ],
  [
    "src/config.ts",
    'path.join(os.homedir(), ".infinite-canvas")',
    'process.env.KK_AGENT_CONFIG_DIR || path.join(os.homedir(), ".infinite-canvas")',
  ],
  [
    "src/config.ts",
    "if (process.env.CANVAS_AGENT_TOKEN) config.token = process.env.CANVAS_AGENT_TOKEN;",
    'config.token = process.env.CANVAS_AGENT_TOKEN || crypto.randomBytes(32).toString("hex");',
  ],
  [
    "src/config.ts",
    'writeConfigFile(CONFIG_DIR, CONFIG_FILE, process.env.CANVAS_AGENT_TOKEN ? { ...config, token: "" } : config);',
    'writeConfigFile(CONFIG_DIR, CONFIG_FILE, { ...config, token: "" });',
  ],
  [
    "src/server/http.ts",
    "const port = Number(process.env.PORT) || Number(new URL(config.url).port) || DEFAULT_PORT;",
    "const port = process.env.PORT !== undefined ? Number(process.env.PORT) : Number(new URL(config.url).port) || DEFAULT_PORT;",
  ],
  [
    "src/server/http.ts",
    '    app.listen(port, "127.0.0.1", () => {',
    '    const server = app.listen(port, "127.0.0.1", () => {\n        const address = server.address();\n        if (address && typeof address !== "string") {\n            config.url = `http://127.0.0.1:${address.port}`;\n            saveConfig(config);\n        }',
  ],
  [
    "src/server/http.ts",
    "        checkVersions();",
    "        if (!process.env.KK_AGENT_DESKTOP) checkVersions();",
  ],
  [
    "src/server/http.ts",
    "        if (!process.env.CANVAS_AGENT_TOKEN) console.log(`Connect token: ${config.token}`);",
    "        // Connection secrets are supplied through private IPC or the caller environment.",
  ],
  [
    "src/server/http.ts",
    "    });\n}\n\n/** 将异步 Express",
    "    });\n    return server;\n}\n\n/** 将异步 Express",
  ],
  [
    "src/agent/codex-client.ts",
    'env_vars: ["CANVAS_AGENT_TOKEN", "USERPROFILE", "HOME"]',
    'env_vars: ["CANVAS_AGENT_TOKEN", "KK_AGENT_CONFIG_DIR", "USERPROFILE", "HOME"]',
  ],
  [
    "src/agent/codex-client.ts",
    '...(cwd ? { cwd } : {}), threadSource: "user"',
    '...(cwd ? { cwd } : {}), threadSource: "user", historyMode: "legacy"',
  ],
  [
    "src/agent/codex-client.ts",
    "            threadId = thread.id;\n            if (preheat)",
    '            threadId = thread.id;\n            // Persist an empty durable thread without sending a model turn.\n            await this.request("thread/name/set", { threadId, name: "KK Studio" });\n            if (preheat)',
  ],
  [
    "src/agent/codex-protocol.ts",
    "type CodexRequestSpec = {",
    'type CodexRequestSpec = {\n    "thread/name/set": { params: { threadId: string; name: string }; result: Record<string, never> };',
  ],
  [
    "src/agent/codex-protocol.ts",
    'params: ThreadOptions & { threadSource: "user" };',
    'params: ThreadOptions & { threadSource: "user"; historyMode?: "legacy" | "paginated" };',
  ],
  [
    "src/utils/logger.ts",
    'path.join(os.homedir(), ".infinite-canvas", "logs",',
    'path.join(process.env.KK_AGENT_CONFIG_DIR || path.join(os.homedir(), ".infinite-canvas"), "logs",',
  ],
];
const pending = new Map();
const helperPath = path.join(root, "src/server/kk-runtime-drain.ts");
const helper = await fs.readFile(
  new URL("./runtimeDrain.ts", import.meta.url),
  "utf8",
);
const existingHelper = await fs.readFile(helperPath, "utf8").catch((error) => {
  if (error.code !== "ENOENT") throw error;
  return null;
});
if (existingHelper !== null && existingHelper !== helper)
  throw Error(
    "Agent shutdown gate has local edits; reconcile before building.",
  );
for (const [relative, before, after] of patches) {
  const target = path.join(root, relative);
  const source =
    pending.get(target) ??
    (await fs.readFile(target, "utf8")).replaceAll("\r\n", "\n");
  if (source.includes(after)) continue;
  if (source.split(before).length !== 2)
    throw Error(`Unsupported Agent integration anchor: ${relative}`);
  pending.set(target, source.replace(before, after));
}
for (const [target, source] of pending) await fs.writeFile(target, source);
await fs.writeFile(helperPath, helper);
console.log(
  "Agent desktop configuration, ephemeral port and memory credentials verified.",
);
