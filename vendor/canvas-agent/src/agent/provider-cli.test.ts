import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { parse as parseToml } from "smol-toml";
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

test("CLI更新注释表头且保留用户选择，移除当前连接失败时原件不变", async (t) => {
  const f = fixture(t);
  const key = providerKey("custom");
  const original = `model_provider = "${key}"\nmodel = "user-model"\n[model_providers . '${key}'] # managed = old\nname = "Old"\n[profiles.user] # preserve\nmodel = "profile-model"\n`;
  fs.writeFileSync(f.config, original);
  assert.equal(
    await runProvidersCommand(["apply", f.input, "--config-dir", f.target]),
    0,
  );
  const updated = fs.readFileSync(f.config, "utf8");
  assert.equal(parseToml(updated).model_provider, key);
  assert.equal(parseToml(updated).model, "user-model");
  assert.ok(
    updated.includes('[profiles.user] # preserve\nmodel = "profile-model"\n'),
  );
  assert.equal(
    await runProvidersCommand(["apply", f.input, "--config-dir", f.target]),
    0,
  );
  assert.equal(fs.readFileSync(f.config, "utf8"), updated);

  const retired =
    'model_provider = "kk_retired"\nmodel = "prior-model"\n[model_providers.kk_retired]\nname = "Retired"\n';
  fs.writeFileSync(f.config, retired);
  assert.equal(
    await runProvidersCommand([
      "apply",
      f.input,
      "--config-dir",
      f.target,
      "--catalog",
      "blocked",
    ]),
    1,
  );
  assert.equal(fs.readFileSync(f.config, "utf8"), retired);
  assert.equal(fs.existsSync(path.join(f.target, "model-catalogs")), false);
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
  assert.equal(
    parseToml(fs.readFileSync(f.config, "utf8")).model_provider,
    key,
  );
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
      return new Response("{}", { status: 200 });
    },
  );
  t.after(() => {
    if (previous === undefined) delete process.env[name];
    else process.env[name] = previous;
  });
  assert.equal(await runProvidersCommand(["check", f.input]), 0);
  assert.equal(calls, 1);
});
