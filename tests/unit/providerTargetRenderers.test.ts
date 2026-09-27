import assert from "node:assert/strict";
import test from "node:test";
import type { ProviderConnection } from "../../src/domain/providerConnections.ts";
import {
  assertNoSecrets,
  providerKey,
  envKeyFor,
  renderCodexTarget,
  renderClaudeTarget,
  renderOpenAiEnvTarget,
  renderAllTargets,
  serializeCodexToml,
  serializeClaudeSettings,
  serializeOpenAiEnv,
} from "../../src/features/providers/providerTargetRenderers.ts";

const CONNECTION: ProviderConnection = {
  id: "my-openai",
  provider: "OpenAI 兼容",
  kind: "user_byok",
  displayName: "我的 API",
  baseUrl: "https://api.example.com/v1",
  credentialRef: "cred-1",
  model: "gpt-5.5",
  capabilities: {
    modalities: ["text"],
    operations: ["generate"],
    async: false,
  },
  state: "active",
  concurrencyLimit: 4,
  verificationStatus: "unverified",
};

test("Codex 渲染：稳定键、baseUrl 与模型，无密钥明文", () => {
  const block = renderCodexTarget(CONNECTION);
  assert.match(block.providerKey, /^kk_my_openai_[a-f0-9]{16}$/);
  assert.equal(block.baseUrl, "https://api.example.com/v1");
  assert.equal(block.wireApi, "responses");
  assert.equal(block.model, "gpt-5.5");
  assert.match(
    block.envKey ?? "",
    /^KK_STUDIO_MY_OPENAI_[A-F0-9]{16}_API_KEY$/,
  );
  assert.equal(JSON.stringify(block).includes("cred-1"), false);
});
test("Codex 渲染：可显式指定 responses 协议；无凭据时不生成 envKey", () => {
  const block = renderCodexTarget(
    { ...CONNECTION, credentialRef: undefined },
    { wireApi: "responses" },
  );
  assert.equal(block.wireApi, "responses");
  assert.equal(block.envKey, undefined);
});
test("Claude 渲染：默认不假定 Anthropic 协议，env 只含 baseUrl", () => {
  const block = renderClaudeTarget(CONNECTION);
  assert.equal(block.env.ANTHROPIC_BASE_URL, "https://api.example.com/v1");
  assert.equal(block.assumesAnthropicProtocol, false);
  assert.equal(JSON.stringify(block).includes("AUTH_TOKEN"), false);
});
test("OpenAI 环境渲染：OPENAI_BASE_URL 与模型", () => {
  const block = renderOpenAiEnvTarget(CONNECTION);
  assert.equal(block.env.OPENAI_BASE_URL, "https://api.example.com/v1");
  assert.equal(block.model, "gpt-5.5");
  assert.match(
    block.envKey ?? "",
    /^KK_STUDIO_MY_OPENAI_[A-F0-9]{16}_OPENAI_KEY$/,
  );
});
test("renderAllTargets：默认 2 目标，显式 Anthropic 假设时 3 目标", () => {
  assert.equal(renderAllTargets(CONNECTION).length, 2);
  assert.equal(
    renderAllTargets(CONNECTION, { assumeAnthropicProtocol: true }).length,
    3,
  );
  assert.equal(
    renderAllTargets({ ...CONNECTION, baseUrl: undefined }).length,
    0,
  );
});
test("序列化：Codex TOML 与 Claude settings.json 形态正确且无密钥", () => {
  const toml = serializeCodexToml(renderCodexTarget(CONNECTION));
  assert.match(toml, /\[model_providers\.kk_my_openai_[a-f0-9]{16}\]/);
  assert.match(toml, /base_url = "https:\/\/api\.example\.com\/v1"/);
  assert.match(toml, /model_provider = "kk_my_openai_[a-f0-9]{16}"/);
  assert.match(toml, /model = "gpt-5\.5"/);
  const settings = JSON.parse(
    serializeClaudeSettings(renderClaudeTarget(CONNECTION)),
  ) as { env: Record<string, string>; model?: string };
  assert.equal(settings.env.ANTHROPIC_BASE_URL, "https://api.example.com/v1");
  assert.equal(settings.model, "gpt-5.5");
  const env = serializeOpenAiEnv(renderOpenAiEnvTarget(CONNECTION));
  assert.match(env, /export OPENAI_BASE_URL=/);
});
test("assertNoSecrets：拒绝密钥形态文本", () => {
  assert.throws(() => assertNoSecrets({ apiKey: "sk-abcdef123456" }, "x"));
  assert.throws(() =>
    assertNoSecrets("Bearer abcdefghijklmnopqrstuvwxyz123456", "x"),
  );
  assert.doesNotThrow(() => assertNoSecrets({ name: "ok" }, "x"));
});
test("providerKey / envKeyFor：清洗非法字符并截断", () => {
  assert.match(providerKey("My Provider!!"), /^kk_my_provider_[a-f0-9]{16}$/);
  assert.match(providerKey("!!!"), /^kk_provider_[a-f0-9]{16}$/);
  assert.match(envKeyFor("a b", "KEY"), /^KK_STUDIO_A_B_[A-F0-9]{16}_KEY$/);
});

test("合法中文连接 id 生成三种目标配置，异常输入不被静默跳过", () => {
  const localized = { ...CONNECTION, id: "阿里" };
  assert.match(providerKey(localized.id), /^kk_provider_[a-f0-9]{16}$/);
  assert.match(
    envKeyFor(localized.id, "API_KEY"),
    /^KK_STUDIO_PROVIDER_[A-F0-9]{16}_API_KEY$/,
  );
  assert.deepEqual(
    renderAllTargets(localized, { assumeAnthropicProtocol: true }).map(
      (item) => item.target,
    ),
    ["codex", "claude", "openai-env"],
  );
  assert.deepEqual(renderAllTargets({ ...localized, baseUrl: undefined }), []);
  assert.throws(() =>
    renderAllTargets({ ...localized, displayName: "x".repeat(81) }),
  );
});

test("Codex 输出使用当前受支持协议，并把模型选择放在 provider 表之外", () => {
  const block = renderCodexTarget(CONNECTION);
  assert.equal(block.wireApi, "responses");
  const toml = serializeCodexToml(block);
  const tableStart = toml.indexOf("[model_providers.");
  assert.ok(tableStart > 0);
  assert.ok(toml.indexOf('model_provider = "') < tableStart);
  assert.ok(toml.indexOf('model = "') < tableStart);
  assert.match(toml, /wire_api = "responses"/);
});

test("Codex TOML 把连接显示名中的换行转义为字符串内容", () => {
  const block = renderCodexTarget({
    ...CONNECTION,
    displayName: "line\nbreak",
  });
  assert.match(serializeCodexToml(block), /name = "line\\nbreak"/);
});

test("Bash 环境导出把 URL 中的命令替换保持为字面量", () => {
  const block = renderOpenAiEnvTarget({
    ...CONNECTION,
    baseUrl: "https://api.example.com/$(id)",
  });
  assert.equal(
    serializeOpenAiEnv(block),
    "export OPENAI_BASE_URL='https://api.example.com/$(id)'",
  );
});

test("不同连接 id 不共享 Codex 配置键或凭据环境变量", () => {
  assert.notEqual(providerKey("foo-bar"), providerKey("foo_bar"));
  assert.notEqual(
    envKeyFor("foo-bar", "API_KEY"),
    envKeyFor("foo_bar", "API_KEY"),
  );
});
