import assert from "node:assert/strict";
import test from "node:test";

import {
    assertNoSecrets,
    applyCodexProviderConfig,
    buildModelCatalogJson,
    envKeyFor,
    mergeCodexConfigToml,
    parseModelWindow,
    providerKey,
    serializeCodexProviderTable,
    tomlQuote,
} from "./codex-provider-config.js";

// ── providerKey / envKeyFor（与 app 侧契约一致）─────────────────────────

test("providerKey 生成稳定键并带 kk_ 前缀", () => {
    assert.equal(providerKey("my great Provider!"), "kk_my_great_provider");
    assert.equal(providerKey("DeepSeek-V4"), "kk_deepseek_v4");
    assert.match(providerKey("x".repeat(100)), /^kk_[a-z0-9_]{48}$/);
});

test("providerKey 对无法生成键的 id 抛错", () => {
    assert.throws(() => providerKey("!!!"));
});

test("envKeyFor 生成 KK_STUDIO_<ID>_API_KEY", () => {
    assert.equal(envKeyFor("my provider", "API_KEY"), "KK_STUDIO_MY_PROVIDER_API_KEY");
    assert.equal(envKeyFor("DeepSeek-V4", "API_KEY"), "KK_STUDIO_DEEPSEEK_V4_API_KEY");
});

// ── tomlQuote 与表渲染 ───────────────────────────────────────────────────

test("tomlQuote 转义反斜杠与引号", () => {
    assert.equal(tomlQuote("a\\b"), '"a\\\\b"');
    assert.equal(tomlQuote('say "hi"'), '"say \\"hi\\""');
});

test("serializeCodexProviderTable 按字段渲染", () => {
    const withAll = serializeCodexProviderTable({
        providerKey: "kk_deepseek",
        name: "DeepSeek",
        baseUrl: "https://api.deepseek.com/v1",
        envKey: "KK_STUDIO_DEEPSEEK_API_KEY",
        wireApi: "chat",
        modelCatalogJson: "model-catalogs/kk-deepseek.json",
    });
    assert.match(withAll, /^\[model_providers\.kk_deepseek\]$/m);
    assert.match(withAll, /name = "DeepSeek"/);
    assert.match(withAll, /base_url = "https:\/\/api\.deepseek\.com\/v1"/);
    assert.match(withAll, /env_key = "KK_STUDIO_DEEPSEEK_API_KEY"/);
    assert.match(withAll, /wire_api = "chat"/);
    assert.match(withAll, /model_catalog_json = "model-catalogs\/kk-deepseek\.json"/);

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
            wireApi: "chat" as const,
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
    assert.match(result, /^model_catalog_json = "model-catalogs\/kk-default\.json"$/m);
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
    assert.match(result, /model_catalog_json = "model-catalogs\/kk-default\.json" # 旧指针/);
    // kk_deepseek 表体更新
    assert.match(result, /name = "DeepSeek"/);
    assert.match(result, /base_url = "https:\/\/api\.deepseek\.com\/v1"/);
    // 历史 kk_stale 被移除
    assert.doesNotMatch(result, /kk_stale/);
    // kk_openai_compat 追加
    assert.match(result, /\[model_providers\.kk_openai_compat\]/);
});

test("顶层键缺失时追加且幂等", () => {
    const existing = ['model = "gpt-4o"', "", "[model_providers.kk_deepseek]", 'name = "DeepSeek"', 'base_url = "https://api.deepseek.com/v1"', 'wire_api = "chat"'].join("\n");
    const once = mergeCodexConfigToml(existing, samplePatch);
    const twice = mergeCodexConfigToml(once, samplePatch);
    assert.equal(twice, once, "同一 patch 应用两次结果一致");
    assert.match(once, /^model_provider = "kk_deepseek"$/m);
});

test("CRLF 输入保留 CRLF", () => {
    const existing = 'model = "gpt-4o"\r\n\r\n[model_providers.kk_deepseek]\r\nname = "DeepSeek"\r\nbase_url = "https://api.deepseek.com/v1"\r\nwire_api = "chat"\r\n';
    const result = mergeCodexConfigToml(existing, samplePatch);
    assert.ok(result.includes("\r\n"), "输出应保留 CRLF");
    assert.ok(!result.replace(/\r\n/g, "").includes("\n"), "不应混入 LF");
});

test("非法 providerKey 抛错", () => {
    assert.throws(() =>
        mergeCodexConfigToml("", { providers: [{ providerKey: "deepseek", name: "X", baseUrl: "https://x", wireApi: "chat" }] }),
    );
});

test("仅顶层区无表的文件可合并", () => {
    const existing = "# only top\nmodel = \"gpt-4o\"\n";
    const result = mergeCodexConfigToml(existing, samplePatch);
    assert.match(result, /# only top/);
    assert.match(result, /\[model_providers\.kk_deepseek\]/);
});

// ── model catalog ────────────────────────────────────────────────────────

test("parseModelWindow 解析后缀", () => {
    assert.deepEqual(parseModelWindow("deepseek-v4-pro[1M]"), { slug: "deepseek-v4-pro", contextWindow: 1_000_000 });
    assert.deepEqual(parseModelWindow("x[200K]"), { slug: "x", contextWindow: 200_000 });
    assert.deepEqual(parseModelWindow("x[512k]"), { slug: "x", contextWindow: 512_000 });
    assert.deepEqual(parseModelWindow("x[1000000]"), { slug: "x", contextWindow: 1_000_000 });
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

// ── 防线 ─────────────────────────────────────────────────────────────────

test("assertNoSecrets 拒绝密钥形态文本", () => {
    assert.throws(() => assertNoSecrets("api_key=sk-1234567890abcdef", "x"));
    assert.throws(() => assertNoSecrets({ token: "Bearer abcdefghijklmnopqrstuvwx" }, "x"));
    assert.throws(() => assertNoSecrets("-----BEGIN RSA PRIVATE KEY-----", "x"));
    assert.doesNotThrow(() => assertNoSecrets({ name: "DeepSeek", baseUrl: "https://api.deepseek.com/v1" }, "x"));
});

// ── 编排（dry-run 不写盘）────────────────────────────────────────────────

test("applyCodexProviderConfig dry-run 返回合并结果且不写盘", () => {
    const result = applyCodexProviderConfig(
        [
            { id: "deepseek", provider: "DeepSeek", displayName: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", model: "deepseek-v4-pro[1M]", credentialRef: "vault://deepseek" },
            { id: "openai-compat", provider: "OpenAI Compat", baseUrl: "https://gateway.example.com/v1" },
        ],
        { dryRun: true, catalogProfileId: "kk-default", configDir: "D:/kk-studio/.worktrees/TASK-PROV-003-provider-wiring/.tmp-codex-test" },
    );
    assert.equal(result.dryRun, true);
    assert.deepEqual(result.providers, ["kk_deepseek", "kk_openai_compat"]);
    assert.match(result.configToml, /model_provider = "kk_deepseek"/);
    assert.match(result.configToml, /model = "deepseek-v4-pro"/);
    assert.match(result.configToml, /env_key = "KK_STUDIO_DEEPSEEK_API_KEY"/);
    assert.doesNotMatch(result.configToml, /sk-[A-Za-z0-9]/);
    // 有一个连接带 model，不应触发“没有连接带 model”警告
    assert.ok(!result.warnings.some((w) => w.includes("没有连接带 model")));

    const noModel = applyCodexProviderConfig(
        [{ id: "bare", provider: "Bare", baseUrl: "https://bare.example.com" }],
        { dryRun: true, configDir: "D:/kk-studio/.worktrees/TASK-PROV-003-provider-wiring/.tmp-codex-test" },
    );
    assert.ok(noModel.warnings.some((w) => w.includes("没有连接带 model")));
    assert.equal(noModel.configToml.includes("model_provider ="), false);
});
