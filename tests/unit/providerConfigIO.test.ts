import assert from "node:assert/strict";
import test from "node:test";
import type { ProviderConnection } from "../../src/domain/providerConnections.ts";
import {
  exportProviderConfig,
  parseProviderConfig,
  mergeProviderConnections,
  buildSeedConnection,
} from "../../src/features/providers/providerConfigIO.ts";

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

test("导出→导入 round-trip：连接完整保留；credentialRef 作为不透明引用透传，密钥明文不出现", () => {
  const json = exportProviderConfig([CONNECTION]);
  const parsed = parseProviderConfig(json);
  assert.deepEqual(parsed.connections, [CONNECTION]);
  assert.equal(json.includes("sk-"), false);
  assert.equal(json.includes("Bearer "), false);
});
test("导出防线：未知密钥字段被 schema 剥离，不进入文件", () => {
  const leaked = { ...CONNECTION, apiKey: "sk-abcdef1234567890" };
  const json = exportProviderConfig([leaked as ProviderConnection]);
  assert.equal(json.includes("sk-abcdef1234567890"), false);
  assert.equal(json.includes("apiKey"), false);
});
test("导入拒绝：非法 JSON、错误版本、非法地址", () => {
  assert.throws(() => parseProviderConfig("not json"));
  assert.throws(() =>
    parseProviderConfig(
      JSON.stringify({
        version: 2,
        connections: [],
        exportedAt: "2026-09-24T00:00:00Z",
        source: "kk",
      }),
    ),
  );
  assert.throws(() =>
    parseProviderConfig(
      JSON.stringify({
        version: 1,
        exportedAt: "2026-09-24T00:00:00Z",
        source: "kk",
        connections: [
          { ...CONNECTION, baseUrl: "https://user:pass@example.com/v1" },
        ],
      }),
    ),
  );
});
test("合并导入：keep-existing 保留现有运行状态，新 id 追加", () => {
  const existing: ProviderConnection[] = [
    { ...CONNECTION, state: "quarantined", cooldownUntil: 12345 },
  ];
  const merged = mergeProviderConnections(existing, [CONNECTION]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].state, "quarantined");
  assert.equal(merged[0].cooldownUntil, 12345);
  const mergedNew = mergeProviderConnections(existing, [
    { ...CONNECTION, id: "another" },
  ]);
  assert.equal(mergedNew.length, 2);
});
test("合并导入：replace 模式整体替换同 id", () => {
  const merged = mergeProviderConnections(
    [{ ...CONNECTION, state: "quarantined" }],
    [CONNECTION],
    "replace",
  );
  assert.equal(merged[0].state, "active");
});
test("seed 导入：cc-switch 风格 name/baseUrl/model → user_byok 连接", () => {
  const seed = buildSeedConnection({
    name: "My Relay",
    baseUrl: "https://relay.example.com/v1",
    model: "claude-sonnet-4",
  });
  assert.equal(seed.kind, "user_byok");
  assert.equal(seed.id, "my-relay");
  assert.equal(seed.provider, "My Relay");
  assert.equal(seed.model, "claude-sonnet-4");
  assert.equal(seed.state, "active");
  assert.equal(seed.verificationStatus, "unverified");
  assert.throws(() =>
    buildSeedConnection({ name: "", baseUrl: "https://x.example.com" }),
  );
  assert.throws(() =>
    buildSeedConnection({
      name: "bad",
      baseUrl: "http://remote.example.com",
    }),
  );
});
