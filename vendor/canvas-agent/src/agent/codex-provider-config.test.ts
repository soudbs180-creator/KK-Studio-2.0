import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { parse as parseToml } from "smol-toml";

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

test("合法注释、引号和空白表头只替换一个受管表，其他表保留", () => {
  for (const header of [
    "[model_providers.kk_deepseek] # managed = old",
    "[model_providers . 'kk_deepseek'] # managed",
    "['model_providers'.\"kk_deepseek\"] # managed",
    '["model_providers"."kk_\\u0064eepseek"] # managed',
  ]) {
    const user = '["user#=table"] # preserve = yes\nvalue = "untouched"\n';
    const existing = `${header}\nname = "Old"\n\n${user}[[agents]] # keep\nname = "user-agent"\n`;
    parseToml(existing);
    const result = mergeCodexConfigToml(existing, samplePatch);
    const decoded = parseToml(result);
    assert.equal(
      (decoded.model_providers as Record<string, { name: string }>).kk_deepseek
        .name,
      "DeepSeek",
    );
    assert.ok(result.includes(user), "非受管表及注释逐字保留");
    assert.ok(result.includes('[[agents]] # keep\nname = "user-agent"\n'));
    assert.equal(mergeCodexConfigToml(result, samplePatch), result);
  }
});

test("多行字符串中的表头和顶层键不是可修改配置", () => {
  const prefix = [
    'notes = """',
    "[model_providers.kk_old] # inside string",
    'model_provider = "kk_fake"',
    '"""',
    "literal = '''",
    "[model_providers.kk_old]",
    "# literal comment text",
    "'''",
    "",
  ].join("\n");
  const existing = `${prefix}[model_providers.kk_old] # remove real table\nname = "Old"\n`;
  const before = parseToml(existing);
  const result = mergeCodexConfigToml(existing, samplePatch);
  const after = parseToml(result);
  assert.equal(after.notes, before.notes);
  assert.equal(after.literal, before.literal);
  assert.ok(result.startsWith(prefix));
  assert.equal(
    (after.model_providers as Record<string, unknown>).kk_old,
    undefined,
  );
  assert.equal(mergeCodexConfigToml(result, samplePatch), result);
});

test("删除当前受管provider必须显式选择有效连接，不能留下悬空指向", () => {
  for (const selection of [
    'model_provider = "kk_old"',
    "'model_provider' = 'kk_old' # selected",
    '"model_provider" = "kk_\\u006fld"',
  ]) {
    const existing = `${selection}\nmodel = "keep-model"\n[model_providers.kk_old]\nname = "Old"\n`;
    assert.throws(
      () =>
        mergeCodexConfigToml(existing, { providers: samplePatch.providers }),
      /当前.*provider|active/i,
    );
    const result = mergeCodexConfigToml(existing, samplePatch);
    assert.equal(parseToml(result).model_provider, "kk_deepseek");
    assert.equal(parseToml(result).model, "deepseek-v4-pro");
  }
});

test("patch拒绝不存在的active和重复provider身份", () => {
  assert.throws(() =>
    mergeCodexConfigToml("", {
      providers: samplePatch.providers,
      active: { providerKey: "kk_missing", model: "missing" },
    }),
  );
  assert.throws(() =>
    mergeCodexConfigToml("", {
      providers: [samplePatch.providers[0], samplePatch.providers[0]],
    }),
  );
});

test("数组与多行当前选择安全处理，受管键不是字符串时拒绝落盘", () => {
  const original = [
    "list = [",
    '  "[model_providers.kk_fake]",',
    '  "# value",',
    "]",
    '"model_provider" = """kk_deepseek""" # keep selection comment',
    "'model' = '''",
    "old-model",
    "''' # keep model comment",
    "[model_providers.kk_deepseek]",
    'name = "Old"',
    "",
  ].join("\r\n");
  const result = mergeCodexConfigToml(original, samplePatch);
  assert.equal(parseToml(result).model_provider, "kk_deepseek");
  assert.equal(parseToml(result).model, "deepseek-v4-pro");
  assert.deepEqual(parseToml(result).list, parseToml(original).list);
  assert.ok(result.includes("# keep selection comment"));
  assert.ok(result.includes("# keep model comment"));
  assert.ok(!result.replace(/\r\n/g, "").includes("\n"));
  assert.equal(mergeCodexConfigToml(result, samplePatch), result);
  assert.throws(() =>
    mergeCodexConfigToml(
      'model_provider.nested = "unsupported"\n',
      samplePatch,
    ),
  );
});

test("解析错误不暴露配置行或敏感原文", () => {
  const original = 'private_note = "sensitive-local-fixture"\ninvalid =\n';
  assert.throws(
    () => mergeCodexConfigToml(original, samplePatch),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /TOML 无效/);
      assert.doesNotMatch(
        error.message,
        /sensitive-local-fixture|private_note|invalid =/,
      );
      return true;
    },
  );
});

test("多行内联表与嵌套数组中的同名用户键保留，active只更新顶层", () => {
  const minimal = 'user_settings = {\n model_provider = "user-only-value"\n}\n';
  const minimalResult = mergeCodexConfigToml(minimal, samplePatch);
  assert.ok(minimalResult.startsWith(minimal));
  assert.deepEqual(
    parseToml(minimalResult).user_settings,
    parseToml(minimal).user_settings,
  );
  assert.equal(
    parseToml(minimalResult).model_provider,
    samplePatch.active.providerKey,
  );
  const original = [
    "user_settings = {",
    '  model_provider = "user-only-value",',
    "  nested = {",
    '    model = "user-only-model",',
    '    model_catalog_json = "user-only-catalog",',
    '    braces = "[{}] # literal",',
    "  },",
    '  list = [{ model_provider = "array-only" }],',
    "}",
    "",
  ].join("\r\n");
  const result = mergeCodexConfigToml(original, samplePatch);
  assert.ok(result.startsWith(original));
  const parsed = parseToml(result);
  assert.deepEqual(parsed.user_settings, parseToml(original).user_settings);
  assert.equal(parsed.model_provider, samplePatch.active.providerKey);
  assert.equal(parsed.model, samplePatch.active.model);
  assert.equal(mergeCodexConfigToml(result, samplePatch), result);
});

test("与Object原型同名的用户顶层键仍按原文保留", () => {
  const original =
    'toString = "user-value"\nconstructor = "user-constructor"\n__proto__ = "user-proto"\n';
  const result = mergeCodexConfigToml(original, samplePatch);
  assert.ok(result.startsWith(original));
  assert.equal(mergeCodexConfigToml(result, samplePatch), result);
});

test("用户profile仍引用旧受管provider时不能删除它或改写profile选择", () => {
  const original =
    '[profiles.work]\nmodel_provider = "kk_old"\nmodel = "profile-model"\n[model_providers.kk_old]\nname = "Old"\n';
  assert.throws(
    () => mergeCodexConfigToml(original, samplePatch),
    /profile.*provider/i,
  );
  const result = mergeCodexConfigToml(original, {
    ...samplePatch,
    providers: [
      ...samplePatch.providers,
      { ...samplePatch.providers[0], providerKey: "kk_old" },
    ],
  });
  assert.deepEqual(parseToml(result).profiles, parseToml(original).profiles);
});

function isolatedConfig(t: test.TestContext, original: string) {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), "kk-safe-provider-config-"),
  );
  const config = path.join(dir, "config.toml");
  fs.writeFileSync(config, original);
  t.after(() => {
    assert.ok(
      path.resolve(dir).startsWith(path.resolve(os.tmpdir()) + path.sep),
    );
    fs.rmSync(dir, { recursive: true, force: true });
  });
  return { dir, config };
}

const recoveryConnection = {
  id: "replacement",
  provider: "Replacement",
  baseUrl: "https://replacement.example.test/v1",
  model: "replacement-model[256k]",
};

test("合并失败时config和已有catalog字节不变，也不创建新catalog", (t) => {
  for (const original of [
    'model_provider = "kk_old"\n[model_providers.kk_old]\nname = "Old"\n',
    'model = "a"\nmodel = "duplicate"\n',
    'password = "synthetic-for-rejection"\n',
  ]) {
    const f = isolatedConfig(t, original);
    fs.mkdirSync(path.join(f.dir, "model-catalogs"));
    const priorCatalog = Buffer.from('[{"slug":"prior-model"}]\r\n');
    fs.writeFileSync(
      path.join(f.dir, "model-catalogs", "prior.json"),
      priorCatalog,
    );
    for (const catalogProfileId of ["prior", "new"]) {
      assert.throws(() =>
        applyCodexProviderConfig([recoveryConnection], {
          configDir: f.dir,
          catalogProfileId,
        }),
      );
      assert.equal(fs.readFileSync(f.config, "utf8"), original);
      assert.deepEqual(
        fs.readFileSync(path.join(f.dir, "model-catalogs", "prior.json")),
        priorCatalog,
      );
      assert.equal(
        fs.existsSync(path.join(f.dir, "model-catalogs", "new.json")),
        false,
      );
    }
  }
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

test("applyCodexProviderConfig dry-run 返回合并结果且不写盘", (t) => {
  const f = isolatedConfig(t, "");
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
      configDir: f.dir,
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
      configDir: f.dir,
    },
  );
  assert.ok(noModel.warnings.some((w) => w.includes("没有连接带 model")));
  assert.equal(noModel.configToml.includes("model_provider ="), false);
  assert.equal(fs.readFileSync(f.config, "utf8"), "");
  assert.equal(fs.existsSync(path.join(f.dir, "model-catalogs")), false);
});

test("显式指定 active 连接才切换 Codex 默认模型", (t) => {
  const f = isolatedConfig(t, "");
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
    configDir: f.dir,
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
      configDir: f.dir,
    }),
  );
});
