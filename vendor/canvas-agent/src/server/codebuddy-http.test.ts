import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("CodeBuddy config and probe require local token and distinguish saved from usable", async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "kk-codebuddy-http-"));
  const previous = {
    KK_AGENT_CONFIG_DIR: process.env.KK_AGENT_CONFIG_DIR,
    KK_AGENT_DESKTOP: process.env.KK_AGENT_DESKTOP,
    CANVAS_AGENT_TOKEN: process.env.CANVAS_AGENT_TOKEN,
    PORT: process.env.PORT,
  };
  process.env.KK_AGENT_CONFIG_DIR = dir;
  process.env.KK_AGENT_DESKTOP = "1";
  process.env.CANVAS_AGENT_TOKEN = "test-codebuddy-token";
  process.env.PORT = "0";
  const cliPath = path.join(dir, "codebuddy.js");
  await writeFile(
    cliPath,
    "console.log(JSON.stringify({result:'CODEBUDDY_OK',model:'test-model'}))",
  );
  const { startHttpServer } = await import("./http.js");
  const server = startHttpServer();
  t.after(async () => {
    server.close();
    await once(server, "close");
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    await rm(dir, { recursive: true, force: true });
  });
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  const headers = {
    "content-type": "application/json",
    "x-canvas-agent-token": "test-codebuddy-token",
  };

  const unauthorized = await fetch(base + "/agent/codebuddy/config");
  assert.equal(unauthorized.status, 401);
  const initial = await fetch(base + "/agent/codebuddy/config", { headers });
  assert.deepEqual(await initial.json(), {
    ok: true,
    configured: false,
    cliPath: "",
  });
  const invalid = await fetch(base + "/agent/codebuddy/config", {
    method: "POST",
    headers,
    body: JSON.stringify({ cliPath: "codebuddy.js" }),
  });
  assert.equal(invalid.status, 400);
  const saved = await fetch(base + "/agent/codebuddy/config", {
    method: "POST",
    headers,
    body: JSON.stringify({ cliPath }),
  });
  assert.deepEqual(await saved.json(), { ok: true, configured: true, cliPath });
  const probe = await fetch(base + "/agent/codebuddy/probe", {
    method: "POST",
    headers,
    body: "{}",
  });
  const result = (await probe.json()) as {
    ok: boolean;
    model: string;
    durationMs: number;
  };
  assert.equal(result.ok, true);
  assert.equal(result.model, "test-model");
  assert.ok(Number.isFinite(result.durationMs));

  const marker = path.join(dir, "slow-started.txt");
  await writeFile(
    cliPath,
    `
        const fs = require("node:fs");
        if (!fs.existsSync(${JSON.stringify(marker)})) {
            fs.writeFileSync(${JSON.stringify(marker)}, String(process.pid));
            setTimeout(() => console.log(JSON.stringify({result:"CODEBUDDY_OK"})), 5000);
        } else {
            console.log(JSON.stringify({result:"CODEBUDDY_OK"}));
        }
    `,
  );
  const controller = new AbortController();
  const pending = fetch(base + "/agent/codebuddy/probe", {
    method: "POST",
    headers,
    body: "{}",
    signal: controller.signal,
  });
  const startedAt = Date.now();
  while (Date.now() - startedAt < 3000) {
    if (await readFile(marker, "utf8").catch(() => "")) break;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  assert.ok(
    await readFile(marker, "utf8").catch(() => ""),
    "fake CLI should have started",
  );
  controller.abort();
  await assert.rejects(pending);
  let nextStatus = 0;
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline && nextStatus !== 200) {
    const next = await fetch(base + "/agent/codebuddy/probe", {
      method: "POST",
      headers,
      body: "{}",
    });
    nextStatus = next.status;
    await next.arrayBuffer();
    if (nextStatus !== 200)
      await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.equal(nextStatus, 200);
});
