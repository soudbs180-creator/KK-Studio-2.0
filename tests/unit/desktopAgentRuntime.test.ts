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
      attempt < 240 && !output.includes("KK_AGENT_READY ");
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
    assert.equal(output.trim().split(/\r?\n/).length, 1);
    assert.equal(diagnostic.includes(ready.token), false);
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

test("desktop Agent reserves stdout for readiness while a noisy conversation restores", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "kk-agent-restore-"));
  const entry = path.join(root, "desktop-entry.mjs");
  await fs.copyFile("scripts/agent/desktop-entry.mjs", entry);
  await fs.mkdir(path.join(root, "agent/dist/server"), { recursive: true });
  await fs.writeFile(path.join(root, "package.json"), '{"type":"module"}');
  await fs.writeFile(
    path.join(root, "agent/dist/server/http.js"),
    `import http from "node:http";
     console.log("fixture import diagnostic");
     process.stdout.write("L".repeat(9000) + "\\n");
     console.log("KK_AGENT_READY fixture-diagnostic");
     export function startHttpServer() {
       console.log("fixture start diagnostic");
       let polls = 0;
       return http.createServer((_request, response) => {
         polls++;
         if (polls <= 3) {
           for (let line = 0; line < 16; line++) {
             console.log("fixture restore diagnostic");
             process.stdout.write("fixture direct diagnostic\\n");
           }
         } else {
           process.stdout.write("fixture ready diagnostic\\n");
         }
         response.setHeader("Content-Type", "application/json");
         response.end(JSON.stringify({
           ok: true,
           conversation: { status: polls <= 3 ? "preparing" : "ready" },
         }));
       }).listen(0, "127.0.0.1");
     }`,
  );
  const child = spawn(process.execPath, [entry], {
    cwd: root,
    env: { ...process.env, KK_AGENT_DATA_DIR: root },
    windowsHide: true,
    stdio: ["pipe", "pipe", "pipe"],
  });
  const exited = once(child, "close");
  let output = "";
  let diagnostics = "";
  child.stdout.on("data", (data) => (output += String(data)));
  child.stderr.on("data", (data) => (diagnostics += String(data)));
  try {
    child.stdin.write("start\n");
    await Promise.race([
      new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("No readiness after controlled restoration")),
          12000,
        );
        const read = () => {
          if (!output.includes("KK_AGENT_READY ")) return;
          clearTimeout(timeout);
          child.stdout.off("data", read);
          resolve();
        };
        child.stdout.on("data", read);
      }),
      exited.then(() => {
        throw new Error("Fixture exited before readiness");
      }),
    ]);
    const lines = output.trim().split(/\r?\n/);
    assert.equal(
      lines.length,
      1,
      "diagnostics must not consume native readiness lines",
    );
    assert.equal(lines[0].startsWith("KK_AGENT_READY "), true);
    const ready = JSON.parse(lines[0].slice("KK_AGENT_READY ".length));
    assert.equal(ready.pid, child.pid);
    assert.equal(/^[a-f0-9]{64}$/.test(ready.token), true);
    const health = await (await fetch(ready.endpoint + "/health")).json();
    assert.equal(health.conversation.status, "ready");
    child.stdin.end();
    assert.equal((await exited)[0], 0);
    assert.equal(output.trim().split(/\r?\n/).length, 1);
    assert.equal(diagnostics.includes("L".repeat(9000)), true);
    assert.equal(
      diagnostics.includes("KK_AGENT_READY fixture-diagnostic"),
      true,
    );
    assert.equal(diagnostics.includes("fixture ready diagnostic"), true);
    assert.equal(diagnostics.includes(ready.token), false);
    assert.equal(
      diagnostics.split("fixture restore diagnostic").length - 1,
      48,
    );
    assert.equal(diagnostics.split("fixture direct diagnostic").length - 1, 48);
  } finally {
    child.kill();
    await exited;
    await fs.rm(root, { recursive: true, force: true });
  }
});
