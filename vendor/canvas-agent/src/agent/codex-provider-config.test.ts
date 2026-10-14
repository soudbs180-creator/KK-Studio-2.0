import assert from "node:assert/strict";
import test from "node:test";

import {
  assertNoSecrets,
  applyCodexProviderConfig,
  buildModelCatalogJson,
  envKeyFor,
  mergeCodexConfigToml,
  parseProviderConfig,
  parseModelWindow,
  providerKey,
  serializeCodexProviderTable,
  tomlQuote,
} from "./codex-provider-config.js";

// ── providerKey / envKeyFor（与 app 侧契约一致）─────────────────────────

test("providerKey 生成稳定键并带 kk_ 前缀", () => {
  assert.match(
    providerKey("my great Provider!"),
    /^kk_my_great_provider_[a-f0-9]{16}$/,
  );
  assert.match(providerKey("DeepSeek-V4"), /^kk_deepseek_v4_[a-f0-9]{16}$/);
  assert.match(providerKey("x".repeat(100)), /^kk_x{32}_[a-f0-9]{16}$/);
});

test("providerKey 对无法生成键的 id 抛错", () => {
  assert.match(providerKey("阿里"), /^kk_provider_[a-f0-9]{16}$/);
  assert.notEqual(providerKey("foo-bar"), providerKey("foo_bar"));
});

test("envKeyFor 生成 KK_STUDIO_<ID>_API_KEY", () => {
  assert.match(
    envKeyFor("my provider", "API_KEY"),
    /^KK_STUDIO_MY_PROVIDER_[A-F0-9]{16}_API_KEY$/,
  );
  assert.notEqual(
    envKeyFor("foo-bar", "API_KEY"),
    envKeyFor("foo_bar", "API_KEY"),
  );
});

test("Codex 连接仅接受当前 Responses 协议", () => {
  assert.throws(() =>
    parseProviderConfig([
      { id: "x", provider: "X", baseUrl: "https://x.example", wireApi: "chat" },
    ]),
  );
});

test("Provider URLs reject embedded credentials and unsupported schemes", () => {
  for (const baseUrl of [
    "https://user:password@host.example/v1",
    "ftp://host.example/v1",
  ]) {
    assert.throws(() =>
      parseProviderConfig([{ id: "x", provider: "X", baseUrl }]),
    );
  }
});

// ── tomlQuote 与表渲染 ───────────────────────────────────────────────────

test("tomlQuote 转义反斜杠与引号", () => {
  assert.equal(tomlQuote("a\\b"), '"a\\\\b"');
  assert.equal(tomlQuote('say "hi"'), '"say \\"hi\\""');
  assert.equal(tomlQuote("line\nbreak\tend"), '"line\\nbreak\\tend"');
});

test("serializeCodexProviderTable 按字段渲染", () => {
  const withAll = serializeCodexProviderTable({
    providerKey: "kk_deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    envKey: "KK_STUDIO_DEEPSEEK_API_KEY",
    wireApi: "responses",
  });
  assert.match(withAll, /^\[model_providers\.kk_deepseek\]$/m);
  assert.match(withAll, /name = "DeepSeek"/);
  assert.match(withAll, /base_url = "https:\/\/api\.deepseek\.com\/v1"/);
  assert.match(withAll, /env_key = "KK_STUDIO_DEEPSEEK_API_KEY"/);
  assert.match(withAll, /wire_api = "responses"/);
  assert.doesNotMatch(withAll, /model_catalog_json/);

  const minimal = serializeCodexProviderTable({
    providerKey: "kk_x",
    name: "X",
    baseUrl: "https://example.com",
    wireApi: "responses",
  });
  assert.doesNotMatch(minimal, /env_key/);
  assert.doesNotMatch(minimal, /model_catalog_json/);
  assert.match(minimal, /wire_api = "responses"/);
});

// ── TOML 保守合并 ────────────────────────────────────────────────────────

const samplePatch = {
  providers: [
    {
      providerKey: "kk_deepseek",
      name: "DeepSeek",
      baseUrl: "https://api.deepseek.com/v1",
      envKey: "KK_STUDIO_DEEPSEEK_API_KEY",
      wireApi: "responses" as const,
    },
    {
      providerKey: "kk_openai_compat",
      name: "OpenAI Compat",
      baseUrl: "https://gateway.example.com/v1",
      wireApi: "responses" as const,
    },
  ],
  active: { providerKey: "kk_deepseek", model: "deepseek-v4-pro" },
  modelCatalogJson: "model-catalogs/kk-default.json",
};

test("空文件生成最小全新配置", () => {
  const result = mergeCodexConfigToml("", samplePatch);
  assert.match(result, /^model_provider = "kk_deepseek"$/m);
  assert.match(result, /^model = "deepseek-v4-pro"$/m);
  assert.match(
    result,
    /^model_catalog_json = "model-catalogs\/kk-default\.json"$/m,
  );
  assert.match(result, /^\[model_providers\.kk_deepseek\]$/m);
  assert.match(result, /^\[model_providers\.kk_openai_compat\]$/m);
  // 顶层键必须先于任何表
  const topKeys = result.indexOf("model_provider");
  const firstTable = result.indexOf("[model_providers");
  assert.ok(topKeys < firstTable);
});

test("保留注释与用户自定义 provider 表", () => {
  const existing = [
    "# 用户备注",
    'model = "gpt-4o"',
    "",
    "[model_providers.anthropic]",
    'name = "Anthropic"',
    'base_url = "https://api.anthropic.com"',
    'wire_api = "chat"',
    "",
  ].join("\n");
  const result = mergeCodexConfigToml(existing, samplePatch);
  assert.match(result, /# 用户备注/);
  assert.match(result, /\[model_providers\.anthropic\]/);
  assert.match(result, /name = "Anthropic"/);
  assert.match(result, /\[model_providers\.kk_deepseek\]/);
});

test("已有 kk_* 表被原位替换且顶层键原位更新", () => {
  const existing = [
    'model_provider = "kk_deepseek"',
    'model = "deepseek-old"',
    'model_catalog_json = "model-catalogs/old.json"  # 旧指针',
    "",
    "[model_providers.kk_deepseek]",
    'name = "DeepSeek 旧"',
    'base_url = "https://old.example.com"',
    'wire_api = "chat"',
    'env_key = "KK_STUDIO_OLD_API_KEY"',
    "",
    "[model_providers.kk_stale]",
    'name = "Stale"',
    'base_url = "https://stale.example.com"',
    'wire_api = "chat"',
    "",
  ].join("\n");
  const result = mergeCodexConfigToml(existing, samplePatch);
  // 顶层键原位更新
  assert.match(result, /^model_provider = "kk_deepseek"$/m);
  assert.match(result, /^model = "deepseek-v4-pro"$/m);
  // 行尾注释保留（间距按渲染规范归一，注释内容逐字保留）
  assert.match(
    result,
    /model_catalog_json = "model-catalogs\/kk-default\.json" # 旧指针/,
  );
  // kk_deepseek 表体更新
  assert.match(result, /name = "DeepSeek"/);
  assert.match(result, /base_url = "https:\/\/api\.deepseek\.com\/v1"/);
  // 历史 kk_stale 被移除
  assert.doesNotMatch(result, /kk_stale/);
  // kk_openai_compat 追加
  assert.match(result, /\[model_providers\.kk_openai_compat\]/);
});

test("顶层键缺失时追加且幂等", () => {
  const existing = [
    'model = "gpt-4o"',
    "",
    "[model_providers.kk_deepseek]",
    'name = "DeepSeek"',
    'base_url = "https://api.deepseek.com/v1"',
    'wire_api = "chat"',
  ].join("\n");
  const once = mergeCodexConfigToml(existing, samplePatch);
  const twice = mergeCodexConfigToml(once, samplePatch);
  assert.equal(twice, once, "同一 patch 应用两次结果一致");
  assert.match(once, /^model_provider = "kk_deepseek"$/m);
});

test("CRLF 输入保留 CRLF", () => {
  const existing =
    'model = "gpt-4o"\r\n\r\n[model_providers.kk_deepseek]\r\nname = "DeepSeek"\r\nbase_url = "https://api.deepseek.com/v1"\r\nwire_api = "chat"\r\n';
  const result = mergeCodexConfigToml(existing, samplePatch);
  assert.ok(result.includes("\r\n"), "输出应保留 CRLF");
  assert.ok(!result.replace(/\r\n/g, "").includes("\n"), "不应混入 LF");
});

test("非法 providerKey 抛错", () => {
  assert.throws(() =>
    mergeCodexConfigToml("", {
      providers: [
        {
          providerKey: "deepseek",
          name: "X",
          baseUrl: "https://x",
          wireApi: "chat",
        },
      ],
    }),
  );
});

test("仅顶层区无表的文件可合并", () => {
  const existing = '# only top\nmodel = "gpt-4o"\n';
  const result = mergeCodexConfigToml(existing, samplePatch);
  assert.match(result, /# only top/);
  assert.match(result, /\[model_providers\.kk_deepseek\]/);
});

test("自有 provider 表后面的数组表仍完整保留", () => {
  const existing = [
    "[model_providers.kk_old]",
    'name = "Old"',
    'wire_api = "responses"',
    "",
    "[[agents]]",
    'name = "user-agent"',
    "",
  ].join("\n");
  const result = mergeCodexConfigToml(existing, { providers: [] });
  assert.doesNotMatch(result, /kk_old/);
  assert.match(result, /\[\[agents\]\]\nname = "user-agent"/);
});

// ── model catalog ────────────────────────────────────────────────────────

test("parseModelWindow 解析后缀", () => {
  assert.deepEqual(parseModelWindow("deepseek-v4-pro[1M]"), {
    slug: "deepseek-v4-pro",
    contextWindow: 1_000_000,
  });
  assert.deepEqual(parseModelWindow("x[200K]"), {
    slug: "x",
    contextWindow: 200_000,
  });
  assert.deepEqual(parseModelWindow("x[512k]"), {
    slug: "x",
    contextWindow: 512_000,
  });
  assert.deepEqual(parseModelWindow("x[1000000]"), {
    slug: "x",
    contextWindow: 1_000_000,
  });
  assert.deepEqual(parseModelWindow("plain-model"), { slug: "plain-model" });
  assert.deepEqual(parseModelWindow("bad[abc]"), { slug: "bad[abc]" });
});

test("buildModelCatalogJson 生成 cc-switch 兼容 catalog", () => {
  const { path, json } = buildModelCatalogJson("kk-default", [
    { model: "deepseek-v4-pro[1M]", displayName: "DeepSeek V4 Pro" },
    { model: "plain-model" },
  ]);
  assert.equal(path, "model-catalogs/kk-default.json");
  const catalog = JSON.parse(json);
  assert.equal(catalog.length, 2);
  assert.equal(catalog[0].slug, "deepseek-v4-pro");
  assert.equal(catalog[0].display_name, "DeepSeek V4 Pro");
  assert.equal(catalog[0].context_window, 1_000_000);
  assert.equal(catalog[0].max_context_window, 1_000_000);
  assert.equal(catalog[0].auto_compact_token_limit, null);
  assert.equal(catalog[1].slug, "plain-model");
  assert.equal(catalog[1].context_window, undefined);
});

test("catalog 文件名拒绝目录穿越", () => {
  assert.throws(() => buildModelCatalogJson("../outside", [{ model: "x" }]));
  assert.throws(() => buildModelCatalogJson("x/y", [{ model: "x" }]));
});

// ── 防线 ─────────────────────────────────────────────────────────────────

test("assertNoSecrets 拒绝密钥形态文本", () => {
  assert.throws(() => assertNoSecrets("api_key=sk-1234567890abcdef", "x"));
  assert.throws(() =>
    assertNoSecrets({ token: "Bearer abcdefghijklmnopqrstuvwx" }, "x"),
  );
  assert.throws(() => assertNoSecrets("-----BEGIN RSA PRIVATE KEY-----", "x"));
  assert.doesNotThrow(() =>
    assertNoSecrets(
      { name: "DeepSeek", baseUrl: "https://api.deepseek.com/v1" },
      "x",
    ),
  );
});

// ── 编排（dry-run 不写盘）────────────────────────────────────────────────

test("applyCodexProviderConfig dry-run 返回合并结果且不写盘", () => {
  const result = applyCodexProviderConfig(
    [
      {
        id: "deepseek",
        provider: "DeepSeek",
        displayName: "DeepSeek",
        baseUrl: "https://api.deepseek.com/v1",
        model: "deepseek-v4-pro[1M]",
        credentialRef: "vault://deepseek",
      },
      {
        id: "openai-compat",
        provider: "OpenAI Compat",
        baseUrl: "https://gateway.example.com/v1",
      },
    ],
    {
      dryRun: true,
      catalogProfileId: "kk-default",
      configDir:
        "D:/kk-studio/.worktrees/TASK-PROV-003-provider-wiring/.tmp-codex-test",
    },
  );
  assert.equal(result.dryRun, true);
  assert.equal(result.providers.length, 2);
  assert.doesNotMatch(result.configToml, /model_provider =/);
  assert.match(
    result.configToml,
    /env_key = "KK_STUDIO_DEEPSEEK_[A-F0-9]{16}_API_KEY"/,
  );
  assert.doesNotMatch(result.configToml, /sk-[A-Za-z0-9]/);
  // 有一个连接带 model，不应触发“没有连接带 model”警告
  assert.ok(!result.warnings.some((w) => w.includes("没有连接带 model")));

  const noModel = applyCodexProviderConfig(
    [{ id: "bare", provider: "Bare", baseUrl: "https://bare.example.com" }],
    {
      dryRun: true,
      configDir:
        "D:/kk-studio/.worktrees/TASK-PROV-003-provider-wiring/.tmp-codex-test",
    },
  );
  assert.ok(noModel.warnings.some((w) => w.includes("没有连接带 model")));
  assert.equal(noModel.configToml.includes("model_provider ="), false);
});

test("显式指定 active 连接才切换 Codex 默认模型", () => {
  const connections = [
    {
      id: "deepseek",
      provider: "DeepSeek",
      baseUrl: "https://api.deepseek.com/v1",
      model: "deepseek-v4[1M]",
    },
  ];
  const result = applyCodexProviderConfig(connections, {
    dryRun: true,
    activeConnectionId: "deepseek",
  });
  assert.match(
    result.configToml,
    new RegExp(`model_provider = "${providerKey("deepseek")}"`),
  );
  assert.match(result.configToml, /model = "deepseek-v4"/);
  assert.throws(() =>
    applyCodexProviderConfig(connections, {
      dryRun: true,
      activeConnectionId: "missing",
    }),
  );
});

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
function guardedFixture(t: test.TestContext) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kk-cli-guard-"));
  const config = path.join(dir, "config.toml");
  const catalog = path.join(dir, "model-catalogs/fixture.json");
  fs.mkdirSync(path.dirname(catalog));
  fs.writeFileSync(config, 'model = "original"\n');
  fs.writeFileSync(catalog, '["original"]');
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return { dir, config, catalog, connections: [{ id: "fixture", provider: "Fixture", baseUrl: "https://fixture.example.test/v1", model: "new-model" }] };
}
test("CLI-223-02 preserves multiline strings, nested arrays and commented profile headers", () => {
  for (const quote of ['"""', "'''"]) {
    const fragment = [`instructions = ${quote}`, "[model_providers.kk_old]", 'model = "retain"', "# retained string content", quote].join("\n");
    const existing = ['model = "old-root"', fragment, 'values = [', '  "[model_providers.kk_fake]",', '  { model = "retain-array" },', ']', '[profiles.work] # keep header comment', 'model = "work-model"', 'name = "backslash\\\\" # real comment', 'literal = \'# literal\' # actual comment'].join("\n");
    const merged = mergeCodexConfigToml(existing, { providers: [], active: { providerKey: "kk_new", model: "new-root" } });
    assert.ok(merged.includes(fragment));
    assert.ok(merged.includes('[profiles.work] # keep header comment\nmodel = "work-model"'));
    assert.ok(merged.includes('{ model = "retain-array" }'));
    assert.match(merged, /^model = "new-root"/);
  }
  const escaped = 'notes = """\nescaped \\""" remains inside\n[model_providers.kk_fake]\n"""';
  assert.ok(mergeCodexConfigToml(escaped, { providers: [] }).includes(escaped));
  for (const tail of ['"""value""""', '"""value"""""']) {
    const input = `notes = ${tail}\n[profiles.work] # actual table\nmodel = "work-model"`;
    assert.ok(mergeCodexConfigToml(input, { providers: [] }).includes(input));
  }
});
test("CLI-223-02 rejects unsafe malformed lexical structures before writing catalog", (t) => {
  const f = guardedFixture(t);
  for (const existing of ['notes = """\nnot closed', 'notes = "not closed', 'values = [ { ] }', 'model = """old\nroot"""']) {
    fs.writeFileSync(f.config, existing);
    assert.throws(() => applyCodexProviderConfig(f.connections, { configDir: f.dir, catalogProfileId: "fixture", activeConnectionId: "fixture" }));
    assert.equal(fs.readFileSync(f.config, "utf8"), existing);
    assert.equal(fs.readFileSync(f.catalog, "utf8"), '["original"]');
  }
});
test("CLI-223-03 preflight failure preserves both original files", (t) => {
  const f = guardedFixture(t), existing = 'api_key = "synthetic-original"\n';
  fs.writeFileSync(f.config, existing);
  assert.throws(() => applyCodexProviderConfig(f.connections, { configDir: f.dir, catalogProfileId: "fixture" }));
  assert.equal(fs.readFileSync(f.config, "utf8"), existing);
  assert.equal(fs.readFileSync(f.catalog, "utf8"), '["original"]');
});
test("CLI-223-03 second publish failure restores the first file and keeps recovery bytes", (t) => {
  const f = guardedFixture(t), rename = fs.renameSync;
  t.mock.method(fs, "renameSync", (from: fs.PathLike, to: fs.PathLike) => {
    if (String(to) === f.config) throw new Error("synthetic second publish failure");
    return rename(from, to);
  });
  assert.throws(() => applyCodexProviderConfig(f.connections, { configDir: f.dir, catalogProfileId: "fixture" }), /恢复|restore/);
  assert.equal(fs.readFileSync(f.config, "utf8"), 'model = "original"\n');
  assert.equal(fs.readFileSync(f.catalog, "utf8"), '["original"]');
  assert.ok(fs.readdirSync(path.dirname(f.catalog)).some((name) => name.includes("kk-recovery")));
});
test("CLI-223-03 rollback refuses to overwrite another writer and keeps the original backup", (t) => {
  const f = guardedFixture(t), rename = fs.renameSync;
  t.mock.method(fs, "renameSync", (from: fs.PathLike, to: fs.PathLike) => {
    if (String(to) === f.config) {
      fs.writeFileSync(f.catalog, '["foreign-change"]');
      throw new Error("synthetic publish failure");
    }
    return rename(from, to);
  });
  assert.throws(() => applyCodexProviderConfig(f.connections, { configDir: f.dir, catalogProfileId: "fixture" }), /未确认/);
  assert.equal(fs.readFileSync(f.catalog, "utf8"), '["foreign-change"]');
  const backup = fs.readdirSync(path.dirname(f.catalog)).find((name) => name.includes("kk-recovery"));
  assert.ok(backup);
  assert.equal(fs.readFileSync(path.join(path.dirname(f.catalog), backup!), "utf8"), '["original"]');
});
test("CLI-223-03 failed rollback reports unknown and the preserved recovery path", (t) => {
  const f = guardedFixture(t), rename = fs.renameSync;
  let catalogPublished = false;
  t.mock.method(fs, "renameSync", (from: fs.PathLike, to: fs.PathLike) => {
    if (String(to) === f.config || (String(to) === f.catalog && catalogPublished)) throw new Error("synthetic rollback failure");
    if (String(to) === f.catalog) catalogPublished = true;
    return rename(from, to);
  });
  assert.throws(() => applyCodexProviderConfig(f.connections, { configDir: f.dir, catalogProfileId: "fixture" }), /未确认.*kk-recovery/s);
  const backup = fs.readdirSync(path.dirname(f.catalog)).find((name) => name.includes("kk-recovery"));
  assert.ok(backup);
  assert.equal(fs.readFileSync(path.join(path.dirname(f.catalog), backup!), "utf8"), '["original"]');
});

test("CLI-223-01 parser preserves non-secret unknown fields and rejects secrets before stripping", () => {
  const input = { connections: [{ id: "fixture", provider: "Fixture", baseUrl: "https://fixture.example.test/v1", protocol: "openai-responses", authMode: "api-key", futureField: { retain: true } }], futureEnvelope: { retain: true } };
  const parsed = parseProviderConfig(input);
  assert.equal(parsed[0].protocol, "openai-responses");
  assert.deepEqual(parsed[0].futureField, { retain: true });
  assert.throws(() => parseProviderConfig({ ...input, futureEnvelope: { api_key: "synthetic-key" } }), /凭据/);
  assert.throws(() => parseProviderConfig({ connections: [{ ...input.connections[0], protocol: "unsupported-protocol" }] }), /协议/);
});
test("CLI-223-02 quoted ordinary provider table names are treated as the same owned table", () => {
  for (const header of ['[model_providers."kk_old"]', "['model_providers'.'kk_old']", '[ model_providers . kk_old ]']) {
    assert.equal(mergeCodexConfigToml(`${header}\nname = "Old"\n`, { providers: [] }).includes("Old"), false);
  }
});
test("CLI-223-03 new first file is removed on second publish failure", (t) => {
  const f = guardedFixture(t), rename = fs.renameSync;
  fs.unlinkSync(f.catalog);
  t.mock.method(fs, "renameSync", (from: fs.PathLike, to: fs.PathLike) => {
    if (String(to) === f.config) throw new Error("synthetic publish failure");
    return rename(from, to);
  });
  assert.throws(() => applyCodexProviderConfig(f.connections, { configDir: f.dir, catalogProfileId: "fixture" }), /恢复/);
  assert.equal(fs.existsSync(f.catalog), false);
  assert.equal(fs.readFileSync(f.config, "utf8"), 'model = "original"\n');
});

test("CLI-223-02 rejects invalid or repeated managed roots and malformed table headers without writing", (t) => {
  const f = guardedFixture(t);
  for (const original of [
    'model = "x" garbage', 'model = "x"\nmodel = "y"', 'model = true', 'model_catalog_json = 12', 'model_provider = "x" + "y"',
    String.raw`model = "bad\/escape"`, '[profiles.work] trailing', '[profiles..work]', '[[agents]] trailing', '[profiles.work',
  ]) {
    fs.writeFileSync(f.config, original);
    assert.throws(() => applyCodexProviderConfig(f.connections, { configDir: f.dir, catalogProfileId: "fixture", activeConnectionId: "fixture" }));
    assert.equal(fs.readFileSync(f.config, "utf8"), original);
    assert.equal(fs.readFileSync(f.catalog, "utf8"), '["original"]');
    assert.deepEqual(fs.readdirSync(f.dir).sort(), ["config.toml", "model-catalogs"]);
  }
});
test("CLI-223-02 validates preserved managed values even when no active root replacement was requested", (t) => {
  const f = guardedFixture(t), original = 'model = "x" garbage';
  fs.writeFileSync(f.config, original);
  assert.throws(() => applyCodexProviderConfig(f.connections, { configDir: f.dir }));
  assert.equal(fs.readFileSync(f.config, "utf8"), original);
});
test("CLI-223-02 accepts complete basic/literal root strings and preserves their trailing comments", () => {
  for (const value of ['"a#b"', "'a#b'", String.raw`"escaped\\quote\"value"`, String.raw`"unicode\U0001F600"`]) {
    const existing = `model = ${value} # preserved comment\n[profiles."user.space"] # preserved header\nmodel = "profile-model"`;
    const merged = mergeCodexConfigToml(existing, { providers: [], active: { providerKey: "kk_new", model: "new-root" } });
    assert.match(merged, /^model = "new-root" # preserved comment/);
    assert.ok(merged.includes('[profiles."user.space"] # preserved header\nmodel = "profile-model"'));
  }
  const flat = '["model_providers.kk_old"]\nunknown = "retained"';
  assert.ok(mergeCodexConfigToml(flat, { providers: [] }).includes(flat));
});

test("escaped quoted root keys cannot create duplicate managed keys or publish files", (t) => {
  const f = guardedFixture(t);
  for (const key of [String.raw`"\u006dodel"`, String.raw`"\u006dodel_provider"`, String.raw`"\u006dodel_catalog_json"`]) {
    const original = key + ' = "original"\n';
    fs.writeFileSync(f.config, original);
    assert.throws(() => applyCodexProviderConfig(f.connections, { configDir: f.dir, catalogProfileId: "fixture", activeConnectionId: "fixture" }), /转义根键/);
    assert.equal(fs.readFileSync(f.config, "utf8"), original);
    assert.equal(fs.readFileSync(f.catalog, "utf8"), '["original"]');
    assert.deepEqual(fs.readdirSync(f.dir).sort(), ["config.toml", "model-catalogs"]);
  }
});
