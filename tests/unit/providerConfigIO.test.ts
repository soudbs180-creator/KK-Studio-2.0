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
  assert.match(seed.id, /^my-relay-[a-f0-9]{16}$/);
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

test("中文 seed 生成稳定且不同的连接 id，合并不会静默丢项", () => {
  const ali = buildSeedConnection({
    name: "阿里",
    baseUrl: "https://ali.example.com/v1",
  });
  const tencent = buildSeedConnection({
    name: "腾讯",
    baseUrl: "https://tencent.example.com/v1",
  });
  assert.notEqual(ali.id, tencent.id);
  assert.equal(
    ali.id,
    buildSeedConnection({ name: "阿里", baseUrl: "https://ali.example.com/v1" })
      .id,
  );
  assert.deepEqual(
    mergeProviderConnections([], [ali, tencent]).map((item) => item.provider),
    ["阿里", "腾讯"],
  );
});

test("同名 ASCII seed 的不同地址生成不同 id 并可同时导入", () => {
  const first = buildSeedConnection({
    name: "OpenAI",
    baseUrl: "https://one.example.com/v1",
  });
  const second = buildSeedConnection({
    name: "OpenAI",
    baseUrl: "https://two.example.com/v1",
  });
  assert.notEqual(first.id, second.id);
  assert.equal(
    first.id,
    buildSeedConnection({
      name: "OpenAI",
      baseUrl: "https://one.example.com/v1",
    }).id,
  );
  assert.equal(mergeProviderConnections([], [first, second]).length, 2);
});

test("导入两个相同 id 时显式拒绝碰撞", () => {
  assert.throws(() =>
    mergeProviderConnections(
      [],
      [CONNECTION, { ...CONNECTION, provider: "另一个供应商" }],
    ),
  );
});
