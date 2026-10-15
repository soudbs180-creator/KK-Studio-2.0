import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { envKeyFor, providerKey } from "./codex-provider-config.js";
import { runProvidersCommand } from "./provider-cli.js";

function fixture(t: test.TestContext) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kk-provider-cli-"));
  const input = path.join(dir, "providers.json");
  const target = path.join(dir, "codex");
  fs.mkdirSync(target);
  fs.writeFileSync(
    input,
    JSON.stringify({
      connections: [
        {
          id: "custom",
          provider: "Custom",
          baseUrl: "https://provider.example.test/v1",
          wireApi: "responses",
          model: "custom-model[256k]",
          credentialRef: "vault://custom",
        },
      ],
    }),
  );
  fs.writeFileSync(
    path.join(target, "config.toml"),
    'model = "user-model"\nmodel_provider = "user-provider"\n',
  );
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return { input, target, config: path.join(target, "config.toml") };
}

test("CLI accepts options before input and preserves the existing model by default", async (t) => {
  const f = fixture(t);
  assert.equal(
    await runProvidersCommand(["apply", "--config-dir", f.target, f.input]),
    0,
  );
  const config = fs.readFileSync(f.config, "utf8");
  assert.match(config, /model = "user-model"/);
  assert.match(config, /model_provider = "user-provider"/);
  assert.ok(config.includes(`[model_providers.${providerKey("custom")}]`));
});

test("CLI explicitly activates a connection and strips catalog window suffix", async (t) => {
  const f = fixture(t);
  assert.equal(
    await runProvidersCommand([
      "apply",
      f.input,
      "--config-dir",
      f.target,
      "--active",
      "custom",
    ]),
    0,
  );
  const config = fs.readFileSync(f.config, "utf8");
  assert.ok(config.includes(`model_provider = "${providerKey("custom")}"`));
  assert.match(config, /model = "custom-model"/);
});

test("CLI rejects unknown, incomplete and extra positional arguments before writing", async (t) => {
  const f = fixture(t);
  const original = fs.readFileSync(f.config, "utf8");
  for (const extra of [
    ["--unknown"],
    ["--catalog", "--dry-run"],
    ["extra.json"],
  ]) {
    assert.equal(
      await runProvidersCommand([
        "apply",
        f.input,
        "--config-dir",
        f.target,
        ...extra,
      ]),
      1,
    );
    assert.equal(fs.readFileSync(f.config, "utf8"), original);
  }
  assert.equal(
    await runProvidersCommand([
      "apply-claude",
      f.input,
      "--active",
      "custom",
      "--config-dir",
      f.target,
    ]),
    1,
  );
  assert.equal(fs.existsSync(path.join(f.target, "settings.json")), false);
});

test("check probes a Responses provider with the referenced environment credential", async (t) => {
  const f = fixture(t);
  const name = envKeyFor("custom", "API_KEY");
  const previous = process.env[name];
  process.env[name] = "fixture-credential";
  let calls = 0;
  t.mock.method(
    globalThis,
    "fetch",
    async (url: string | URL | Request, options?: RequestInit) => {
      assert.equal(String(url), "https://provider.example.test/v1/models");
      assert.deepEqual(options?.headers, {
        Authorization: "Bearer fixture-credential",
      });
      calls++;
      return new Response(JSON.stringify({ data: [{ id: "fixture-model" }] }), { status: 200 });
    },
  );
  t.after(() => {
    if (previous === undefined) delete process.env[name];
    else process.env[name] = previous;
  });
  assert.equal(await runProvidersCommand(["check", f.input]), 0);
  assert.equal(calls, 1);
});

test("CLI-223-01 incompatible explicit protocols/auth fail before any target write", async (t) => {
  const f = fixture(t), original = fs.readFileSync(f.config, "utf8"), settings = path.join(f.target, "settings.json");
  fs.writeFileSync(settings, '{"env":{"KEEP":"original"}}');
  for (const [sub, protocol, authMode] of [
    ["apply", "anthropic", "api-key"], ["apply", "openai-chat", "api-key"], ["apply", "openai-responses", "none"],
    ["apply-claude", "openai-responses", "api-key"], ["apply-claude", "anthropic", "none"], ["check", "anthropic", "api-key"],
  ]) {
    fs.writeFileSync(f.input, JSON.stringify({ connections: [{ id: "custom", provider: "Custom", baseUrl: "https://provider.example.test/v1", model: "fixture", protocol, authMode }] }));
    const args = sub === "check" ? [sub, f.input] : [sub, f.input, "--config-dir", f.target];
    assert.equal(await runProvidersCommand(args), 1);
    assert.equal(fs.readFileSync(f.config, "utf8"), original);
    assert.equal(fs.readFileSync(settings, "utf8"), '{"env":{"KEEP":"original"}}');
  }
});
test("CLI-223-01 matching explicit target protocol and legacy input remain compatible", async (t) => {
  const f = fixture(t);
  for (const [sub, protocol] of [["apply", "openai-responses"], ["apply-claude", "anthropic"]]) {
    fs.writeFileSync(f.input, JSON.stringify({ connections: [{ id: "custom", provider: "Custom", baseUrl: "https://provider.example.test/v1", protocol, authMode: "api-key" }] }));
    assert.equal(await runProvidersCommand([sub, f.input, "--config-dir", f.target]), 0);
  }
});
test("CLI-223-05 rejects HTML, wrong model-list shape, duplicates and excessive body without retries", async (t) => {
  const f = fixture(t), name = envKeyFor("custom", "API_KEY"), previous = process.env[name];
  process.env[name] = "fixture-credential";
  t.after(() => { if (previous === undefined) delete process.env[name]; else process.env[name] = previous; });
  for (const body of ['<html>login</html>', '{}', '{"data":[{}]}', '{"data":[{"id":"same"},{"id":"same"}]}', ' '.repeat(2 * 1024 * 1024 + 1)]) {
    let calls = 0;
    t.mock.method(globalThis, "fetch", async () => { calls++; return new Response(body, { status: 200 }); });
    assert.equal(await runProvidersCommand(["check", f.input]), 1);
    assert.equal(calls, 1);
  }
});
test("CLI-223-05 bounds a hanging model-list body by the same timeout", async (t) => {
  const f = fixture(t), name = envKeyFor("custom", "API_KEY"), previous = process.env[name], timer = setTimeout;
  process.env[name] = "fixture-credential";
  t.after(() => { if (previous === undefined) delete process.env[name]; else process.env[name] = previous; });
  let cancelled = false;
  t.mock.method(globalThis, "setTimeout", (fn: () => void, ms: number) => timer(fn, Math.min(ms, 15)));
  t.mock.method(globalThis, "fetch", async () => new Response(new ReadableStream({ cancel() { cancelled = true; } }), { status: 200 }));
  assert.equal(await runProvidersCommand(["check", f.input]), 1);
  assert.equal(cancelled, true);
});

test("CLI-223-04 apply-claude leaves the original file byte-identical for invalid env", async (t) => {
  const f = fixture(t), settings = path.join(f.target, "settings.json");
  for (const env of [null, false, 42, "original", ["original"]]) {
    const existing = JSON.stringify({ env, unknown: { retained: true } });
    fs.writeFileSync(settings, existing);
    assert.equal(await runProvidersCommand(["apply-claude", f.input, "--config-dir", f.target]), 1);
    assert.equal(fs.readFileSync(settings, "utf8"), existing);
  }
});
