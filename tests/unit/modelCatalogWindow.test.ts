import assert from "node:assert/strict";
import test from "node:test";
import {
  parseModelWindow,
  buildModelCatalog,
  renderModelCatalogJson,
} from "../../src/features/models/modelCatalogWindow.ts";

test("后缀解析：M/K/纯数字三种形态", () => {
  assert.deepEqual(parseModelWindow("deepseek-v4-pro[1M]"), {
    slug: "deepseek-v4-pro",
    contextWindow: 1_000_000,
  });
  assert.deepEqual(parseModelWindow("claude-sonnet-4[200K]"), {
    slug: "claude-sonnet-4",
    contextWindow: 200_000,
  });
  assert.deepEqual(parseModelWindow("gpt-5.5[512k]"), {
    slug: "gpt-5.5",
    contextWindow: 512_000,
  });
  assert.deepEqual(parseModelWindow("gpt-5.5[1000000]"), {
    slug: "gpt-5.5",
    contextWindow: 1_000_000,
  });
});
test("后缀解析：无后缀与非法后缀均为 no-op", () => {
  assert.deepEqual(parseModelWindow("gpt-5.5"), { slug: "gpt-5.5" });
  assert.deepEqual(parseModelWindow("model[1x]"), { slug: "model[1x]" });
  assert.deepEqual(parseModelWindow("model[abc]"), { slug: "model[abc]" });
  assert.deepEqual(parseModelWindow("model[0M]"), { slug: "model[0M]" });
});
test("catalog 生成：带窗口条目写入 context/max，无窗口条目回落，auto_compact 为 null", () => {
  const entries = buildModelCatalog([
    { model: "deepseek-v4-pro[1M]", displayName: "DeepSeek V4 Pro" },
    { model: "gpt-5.5" },
  ]);
  assert.equal(entries.length, 2);
  assert.deepEqual(entries[0], {
    slug: "deepseek-v4-pro",
    display_name: "DeepSeek V4 Pro",
    context_window: 1_000_000,
    max_context_window: 1_000_000,
    auto_compact_token_limit: null,
  });
  assert.deepEqual(entries[1], {
    slug: "gpt-5.5",
    display_name: "gpt-5.5",
    auto_compact_token_limit: null,
  });
});
test("catalog 生成：priority 保留，displayName 缺省用 slug", () => {
  const [entry] = buildModelCatalog([
    { model: "claude-sonnet-4[200K]", priority: 3 },
  ]);
  assert.equal(entry.priority, 3);
  assert.equal(entry.display_name, "claude-sonnet-4");
});
test("renderModelCatalogJson：相对路径指针与 JSON payload", () => {
  const rendered = renderModelCatalogJson("profile-1", [
    { model: "deepseek-v4-pro[1M]" },
  ]);
  assert.equal(rendered.path, "model-catalogs/profile-1.json");
  const parsed = JSON.parse(rendered.json) as Array<{ slug: string }>;
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].slug, "deepseek-v4-pro");
});
