import assert from "node:assert/strict";
import test from "node:test";

import {
    applyClaudeProviderConfig,
    mergeClaudeSettingsJson,
} from "./claude-provider-config.js";

// ── settings.json 合并 ───────────────────────────────────────────────────

test("空文件生成最小 settings.json", () => {
    const result = mergeClaudeSettingsJson("", { baseUrl: "https://api.deepseek.com/v1", model: "deepseek-v4-pro" });
    assert.deepEqual(JSON.parse(result), {
        env: { ANTHROPIC_BASE_URL: "https://api.deepseek.com/v1" },
        model: "deepseek-v4-pro",
    });
    assert.ok(result.endsWith("\n"), "输出应带末尾换行");
});

test("保留用户设置并更新受管键", () => {
    const existing = JSON.stringify(
        {
            permissions: { allow: ["Bash(npm run build)"] },
            hooks: { PostToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "echo ok" }] }] },
            env: { FOO: "bar", ANTHROPIC_BASE_URL: "https://old.example.com" },
            model: "claude-sonnet-4",
        },
        null,
        2,
    );
    const result = mergeClaudeSettingsJson(existing, { baseUrl: "https://api.deepseek.com/v1", model: "deepseek-v4-pro" });
    const parsed = JSON.parse(result);
    assert.equal(parsed.permissions.allow[0], "Bash(npm run build)");
    assert.equal(parsed.hooks.PostToolUse[0].matcher, "Bash");
    assert.equal(parsed.env.FOO, "bar", "非受管 env 键保留");
    assert.equal(parsed.env.ANTHROPIC_BASE_URL, "https://api.deepseek.com/v1");
    assert.equal(parsed.model, "deepseek-v4-pro");
});

test("无 model 时不写顶层 model", () => {
    const result = mergeClaudeSettingsJson("", { baseUrl: "https://api.deepseek.com/v1" });
    assert.deepEqual(JSON.parse(result), { env: { ANTHROPIC_BASE_URL: "https://api.deepseek.com/v1" } });
});

test("幂等：同一输入应用两次结果一致", () => {
    const existing = JSON.stringify({ env: { FOO: "bar" }, model: "claude-sonnet-4" }, null, 2);
    const once = mergeClaudeSettingsJson(existing, { baseUrl: "https://api.deepseek.com/v1", model: "deepseek-v4-pro" });
    const twice = mergeClaudeSettingsJson(once, { baseUrl: "https://api.deepseek.com/v1", model: "deepseek-v4-pro" });
    assert.equal(twice, once);
});

test("非法 JSON 输入抛错且不静默覆盖", () => {
    assert.throws(() => mergeClaudeSettingsJson("{ not json", { baseUrl: "https://x.example.com" }));
    assert.throws(() => mergeClaudeSettingsJson("[1,2,3]", { baseUrl: "https://x.example.com" }));
});

test("UTF-8 BOM 输入被容忍", () => {
    const result = mergeClaudeSettingsJson("\uFEFF{ \"model\": \"claude-sonnet-4\" }", { baseUrl: "https://api.deepseek.com/v1" });
    assert.equal(JSON.parse(result).env.ANTHROPIC_BASE_URL, "https://api.deepseek.com/v1");
    assert.equal(JSON.parse(result).model, "claude-sonnet-4", "BOM 存在时用户既有 model 应保留（未给新 model）");
});

test("baseUrl 内嵌 userinfo 被拒绝", () => {
    assert.throws(() => mergeClaudeSettingsJson("", { baseUrl: "https://user:pass@example.com/v1" }));
});

// ── 编排（dry-run 不写盘）────────────────────────────────────────────────

test("applyClaudeProviderConfig dry-run 返回合并结果且不写盘", () => {
    const result = applyClaudeProviderConfig(
        [
            { id: "deepseek", provider: "DeepSeek", displayName: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", model: "deepseek-v4-pro[1M]", credentialRef: "vault://deepseek" },
            { id: "openai-compat", provider: "OpenAI Compat", baseUrl: "https://gateway.example.com/v1" },
        ],
        { dryRun: true, configDir: "D:/kk-studio/.worktrees/TASK-PROV-004-claude-landing/.tmp-claude-test-unit" },
    );
    assert.equal(result.dryRun, true);
    assert.deepEqual(result.providers, ["kk_deepseek", "kk_openai_compat"]);
    assert.equal(result.model, "deepseek-v4-pro", "后缀应剥离为 slug");
    const parsed = JSON.parse(result.settingsJson);
    assert.equal(parsed.env.ANTHROPIC_BASE_URL, "https://api.deepseek.com/v1");
    assert.ok(!JSON.stringify(result).includes("sk-"), "输出不应含密钥形态");
    // 多连接 baseUrl 不一致 → 警告
    assert.ok(result.warnings.some((w) => w.includes("仅支持一个 ANTHROPIC_BASE_URL")));

    const noModel = applyClaudeProviderConfig(
        [{ id: "bare", provider: "Bare", baseUrl: "https://bare.example.com" }],
        { dryRun: true, configDir: "D:/kk-studio/.worktrees/TASK-PROV-004-claude-landing/.tmp-claude-test-unit" },
    );
    assert.ok(noModel.warnings.some((w) => w.includes("没有连接带 model")));
    assert.equal(JSON.parse(noModel.settingsJson).model, undefined);
});
