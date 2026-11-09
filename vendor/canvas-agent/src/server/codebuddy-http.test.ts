import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { request } from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { gzipSync } from "node:zlib";

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

  for (const endpoint of ["/canvas/state", "/canvas/result", "/agent/codex/turn"]) {
    const rejected = await fetch(base + endpoint, { method: "POST", headers, body: "{}" });
    assert.equal(rejected.status, 409, "protocol 6 callers without chat scope cannot mutate");
  }
  const missingScopeEvents = await fetch(base + "/events?clientId=legacy", { headers });
  assert.equal(missingScopeEvents.status, 409);
  const scope = { projectId: "project", chatId: "chat-a", epoch: "connection-a" };
  const events = await fetch(base + "/events?clientId=scope-test&scope=" + encodeURIComponent(JSON.stringify(scope)), { headers });
  const reader = events.body!.getReader();
  try {
    await reader.read();
    const scopedHeaders = { ...headers, "x-canvas-agent-client": "scope-test", "x-canvas-agent-scope": JSON.stringify(scope) };
    const state = await fetch(base + "/canvas/state", { method: "POST", headers: scopedHeaders, body: JSON.stringify({ projectId: "project", nodes: [], scope }) });
    assert.equal(state.status, 200);
    for (const endpoint of ["/canvas/activate", "/canvas/result", "/agent/codex/turn"]) {
      const stale = await fetch(base + endpoint, { method: "POST", headers: { ...scopedHeaders, "x-canvas-agent-scope": JSON.stringify({ ...scope, chatId: "chat-b" }) }, body: "{}" });
      assert.equal(stale.status, 409, "another chat cannot operate through the same SSE client");
    }
    const foreign = await fetch(base + "/agent/codex/threads/foreign-thread", { headers: scopedHeaders });
    assert.equal(foreign.status, 409, "unowned history is rejected before a Codex request");
  } finally { await reader.cancel(); }

  const unauthorized = await fetch(base + "/agent/codebuddy/config");
  assert.equal(unauthorized.status, 401);
  const initial = await fetch(base + "/agent/codebuddy/config", { headers });
  assert.deepEqual(await initial.json(), {
    ok: true,
    configured: false,
    cliPath: "",
  });
  await t.test("checks Origin and token before parsing request bodies", async () => {
    for (const [endpoint, method, extraHeaders, status] of [
      ["/agent/codebuddy/config", "POST", {}, 401],
      ["/agent/codebuddy/config", "POST", { "x-canvas-agent-token": "invalid" }, 401],
      ["/agent/codebuddy/config", "POST", { origin: "https://untrusted.invalid" }, 403],
      ["/body-parser-regression", "POST", {}, 401],
      ["/health", "POST", {}, 401],
      ["/config", "POST", {}, 401],
      ["/agent/codebuddy/config", "OPTIONS", { origin: "https://untrusted.invalid" }, 200],
    ] as const) {
      const response = await fetch(base + endpoint, {
        method,
        headers: { "content-type": "application/json", "content-encoding": "gzip", ...extraHeaders },
        body: Buffer.from([0x1f, 0x8b]),
        signal: AbortSignal.timeout(3000),
      });
      assert.equal(response.status, status, `${method} ${endpoint} must be checked before decompression`);
      await response.arrayBuffer();
    }
    for (const endpoint of ["/health", "/config"]) {
      const response = await fetch(base + endpoint, { signal: AbortSignal.timeout(3000) });
      assert.equal(response.status, 200);
      assert.equal((await response.json()).ok, true);
    }
  });
  for (const compressed of [false, true]) {
    const body = JSON.stringify({ cliPath: "" });
    const response = await fetch(base + "/agent/codebuddy/config", {
      method: "POST",
      headers: { ...headers, ...(compressed ? { "content-encoding": "gzip" } : {}) },
      body: compressed ? gzipSync(body) : body,
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, configured: false, cliPath: "" });
  }
  for (const compressed of [false, true]) {
    const response = await fetch(base + "/agent/codebuddy/config", {
      method: "POST",
      headers: { ...headers, ...(compressed ? { "content-encoding": "gzip" } : {}) },
      body: compressed ? Buffer.from([0x1f, 0x8b]) : "{",
    });
    const payload = await response.json();
    // Malformed client input must not be reported as a server fault (500),
    // and must not echo the parser's internal message back to the caller.
    assert.ok(
      response.status >= 400 && response.status < 500,
      `malformed body must be a client error, got ${response.status}`,
    );
    assert.equal(payload.ok, false);
    assert.equal(payload.error, "invalid request body");
    const health = await fetch(base + "/health");
    assert.equal(health.status, 200);
    assert.equal((await health.json()).ok, true);
  }
  await t.test("survives trailing gzip bytes with and without a token", async () => {
    // Later chunks reach a finished gzip decoder and used to crash the process (GHSA-27r3-jxmh-p828).
    const trailingBody = Buffer.concat([gzipSync('{"probe":true}'), Buffer.from([0]), Buffer.alloc(100 * 1024, 0x58)]);
    for (const authenticated of [false, true]) {
      const trailingStatus = await new Promise<number | undefined>((resolve, reject) => {
        const req = request({
          host: "127.0.0.1", port: address.port, method: "POST", path: "/body-parser-regression",
          headers: {
            "content-type": "application/json", "content-encoding": "gzip", "content-length": trailingBody.length,
            ...(authenticated ? { "x-canvas-agent-token": "test-codebuddy-token" } : {}),
          },
        }, (res) => {
          res.on("error", reject);
          res.resume();
          res.once("end", () => resolve(res.statusCode));
        });
        req.on("error", reject);
        req.setTimeout(3000, () => req.destroy(new Error("compressed request timed out")));
        req.end(trailingBody);
      });
      assert.equal(trailingStatus, authenticated ? 404 : 401);
      await delay(200);
      const healthy = await fetch(base + "/health", { signal: AbortSignal.timeout(3000) });
      assert.equal(healthy.status, 200);
      assert.equal((await healthy.json()).ok, true);
    }
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
  assert.deepEqual(await saved.json(), {
    ok: true,
    configured: true,
    cliPath: await realpath(cliPath),
  });
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
