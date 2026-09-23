import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import test from "node:test";
import { pathToFileURL } from "node:url";

test("Agent configuration never saves a generated connection secret without environment credentials", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "kk-agent-config-"),
  );
  const env = { ...process.env, KK_AGENT_CONFIG_DIR: directory };
  delete env.CANVAS_AGENT_TOKEN;
  const moduleUrl = pathToFileURL(
    path.resolve("vendor/canvas-agent/dist/config.js"),
  ).href;
  const child = spawn(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `const {saveConfig}=await import(${JSON.stringify(moduleUrl)});saveConfig({url:"http://127.0.0.1:12345",token:"synthetic-nonproduction-secret"});`,
    ],
    { env, windowsHide: true, stdio: "ignore" },
  );
  try {
    assert.equal((await once(child, "exit"))[0], 0);
    const config = JSON.parse(
      await fs.readFile(path.join(directory, "canvas-agent.json"), "utf8"),
    );
    assert.equal(config.token, "");
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("desktop Agent waits for its owner, authenticates readiness and clears on owner disconnect", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "kk-agent-runtime-"));
  const entry = path.resolve(
    process.env.KK_TEST_AGENT_ENTRY || "scripts/agent/desktop-entry.mjs",
  );
  const child = spawn(
    process.env.KK_TEST_AGENT_NODE || process.execPath,
    [entry],
    {
      cwd: root,
      env: { ...process.env, KK_AGENT_DATA_DIR: root },
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  const exited = once(child, "exit");
  let output = "";
  let diagnostic = "";
  child.stdout.on("data", (data) => (output += String(data)));
  child.stderr.on("data", (data) => (diagnostic += String(data)));
  try {
    await new Promise((resolve) => setTimeout(resolve, 150));
    assert.equal(output, "", "no endpoint or token before ownership handshake");
    child.stdin.write("start\n");
    for (
      let attempt = 0;
      attempt < 100 && !output.includes("KK_AGENT_READY ");
      attempt++
    ) {
      if (child.exitCode !== null) break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    const line = output
      .split(/\r?\n/)
      .find((value) => value.startsWith("KK_AGENT_READY "));
    assert.ok(
      line,
      `owned service must become ready: ${diagnostic.slice(0, 100)}`,
    );
    const ready = JSON.parse(line.slice("KK_AGENT_READY ".length));
    assert.match(ready.endpoint, /^http:\/\/127\.0\.0\.1:\d+$/);
    assert.match(ready.token, /^[a-f0-9]{64}$/);
    const unauthenticated = await fetch(ready.endpoint + "/agent/codex/usage");
    assert.equal(unauthenticated.status, 401);
    const config = await fs.readFile(
      path.join(root, "canvas-agent.json"),
      "utf8",
    );
    assert.equal(config.includes(ready.token), false, "token never persists");
    assert.equal(
      JSON.parse(config).url,
      ready.endpoint,
      "MCP uses the allocated port",
    );
    const shutdown = await fetch(ready.endpoint + "/runtime/shutdown", {
      method: "POST",
      headers: { "x-canvas-agent-token": ready.token },
    });
    assert.equal(shutdown.status, 200);
    const lateRequest = await fetch(ready.endpoint + "/agent/codex/usage", {
      headers: { "x-canvas-agent-token": ready.token },
    });
    assert.equal(
      lateRequest.status,
      503,
      "new requests cannot race acknowledged shutdown",
    );
    child.stdin.end();
    await exited;
    await assert.rejects(
      fetch(ready.endpoint + "/health", { signal: AbortSignal.timeout(500) }),
    );
  } finally {
    child.kill();
    await exited;
    await fs.rm(root, { recursive: true, force: true });
  }
});
