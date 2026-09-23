import assert from "node:assert/strict";
import test from "node:test";

import {
  ALL_PROMPTS_OPTION,
  DEFAULT_PROMPT_SOURCES,
  createPromptLibrary,
  formatPromptDate,
  type PromptSource,
  type PromptSourceCacheEntry,
} from "../../src/features/prompts/promptLibrary.ts";

/**
 * 提示词库服务（src/features/prompts/promptLibrary.ts）单元测试：
 * 使用内存缓存 + 注入 fetcher，验证来源预设、JSON 解析、缓存与搜索。
 */

type StubEntry = PromptSourceCacheEntry;

function memoryCache() {
  const map = new Map<string, StubEntry>();
  return {
    get: async (id: string) => map.get(id) ?? null,
    set: async (id: string, entry: StubEntry) => void map.set(id, entry),
    map,
  };
}

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
    ok,
  });
}

const sampleSource: PromptSource = {
  id: "test-source",
  name: "测试来源",
  url: "https://example.com/source.json",
  homepage: "https://example.com",
  enabled: true,
  builtIn: false,
};

const sampleItems = [
  {
    title: "赛博朋克街道",
    prompt: "cyberpunk street, neon lights",
    tags: ["cyberpunk", "城市"],
    coverUrl: "/cover1.png",
  },
  {
    title: "水墨山水",
    prompt: "ink wash landscape",
    tags: ["水墨"],
  },
];

test("cached browsing never starts a network request and cancelled refresh preserves cache", async () => {
  const cache = memoryCache();
  let requests = 0;
  const library = createPromptLibrary({
    sources: [sampleSource],
    cache,
    fetcher: (async (_input, init) => {
      requests++;
      init?.signal?.throwIfAborted();
      return jsonResponse(sampleItems);
    }) as typeof fetch,
  });
  assert.deepEqual(await library.readCachedSource(sampleSource.id), []);
  assert.equal(requests, 0);
  await library.refreshSource(sampleSource.id);
  const initial = await library.readCachedSource(sampleSource.id);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    library.refreshSource(sampleSource.id, { signal: controller.signal }),
  );
  assert.deepEqual(await library.readCachedSource(sampleSource.id), initial);
  assert.equal((await library.statuses())[sampleSource.id].lastError, "");
});

test("malformed cache entries are normalized before rendering", async () => {
  const cache = memoryCache();
  const library = createPromptLibrary({
    sources: [sampleSource],
    cache,
    fetcher: (async () => jsonResponse(sampleItems)) as typeof fetch,
  });
  await library.refreshSource(sampleSource.id);
  const entry = cache.map.get(sampleSource.id)!;
  entry.items = [
    null,
    { id: "restored", title: "Recovered", prompt: "safe" },
  ] as unknown as typeof entry.items;
  const recovered = await library.readCachedSource(sampleSource.id);
  assert.equal(recovered.length, 1);
  assert.deepEqual(recovered[0].tags, []);
});

test("内置 7 个提示词来源且全部启用", () => {
  assert.equal(DEFAULT_PROMPT_SOURCES.length, 7);
  assert.ok(
    DEFAULT_PROMPT_SOURCES.every((source) => source.enabled && source.builtIn),
  );
  assert.ok(
    DEFAULT_PROMPT_SOURCES.every((source) => source.url.startsWith("https://")),
  );
});

test("runSource 解析 JSON 并归一化字段", async () => {
  const library = createPromptLibrary({
    cache: memoryCache(),
    fetcher: async () => jsonResponse(sampleItems),
  });
  const items = await library.runSource(sampleSource);
  assert.equal(items.length, 2);
  assert.equal(items[0].title, "赛博朋克街道");
  assert.equal(items[0].coverUrl, "https://example.com/cover1.png");
  assert.deepEqual(items[0].tags, ["cyberpunk", "城市"]);
});

test("fetchPrompts 返回分页、分类与标签", async () => {
  const cache = memoryCache();
  const library = createPromptLibrary({
    sources: [sampleSource],
    cache,
    fetcher: async () => jsonResponse(sampleItems),
  });
  const first = await library.fetchPrompts({ page: 1, pageSize: 1 });
  assert.equal(first.total, 2);
  assert.equal(first.items.length, 1);
  assert.equal(first.items[0].category, "测试来源");
  assert.deepEqual(first.categories, ["测试来源"]);
  assert.deepEqual(first.tags, ["cyberpunk", "城市", "水墨"]);

  const keyword = await library.fetchPrompts({ keyword: "水墨" });
  assert.equal(keyword.total, 1);
  assert.equal(keyword.items[0].title, "水墨山水");

  const tag = await library.fetchPrompts({ tag: ["cyberpunk"] });
  assert.equal(tag.total, 1);

  const category = await library.fetchPrompts({
    category: ALL_PROMPTS_OPTION,
  });
  assert.equal(category.total, 2);
});

test("缓存生效：二次请求不再触发 fetcher", async () => {
  let calls = 0;
  const library = createPromptLibrary({
    sources: [sampleSource],
    cache: memoryCache(),
    fetcher: async () => {
      calls += 1;
      return jsonResponse(sampleItems);
    },
  });
  await library.fetchPrompts();
  await library.fetchPrompts();
  assert.equal(calls, 1);
});

test("来源拉取失败时保留上次缓存并记录错误", async () => {
  const cache = memoryCache();
  const failing: PromptSource = {
    ...sampleSource,
    url: "https://example.com/broken.json",
  };
  const library = createPromptLibrary({
    sources: [failing],
    cache,
    fetcher: async () => new Response("bad", { status: 500, ok: false }),
  });
  await assert.rejects(() => library.fetchSourcePrompts(failing.id), /拉取/);
  const status = await library.statuses();
  assert.ok(status[failing.id].lastError);
  assert.equal(status[failing.id].count, 0);
});

test("refreshAllSources 汇总成功/失败数量", async () => {
  const okSource: PromptSource = { ...sampleSource, id: "ok" };
  const badSource: PromptSource = {
    ...sampleSource,
    id: "bad",
    url: "https://example.com/bad.json",
  };
  const library = createPromptLibrary({
    sources: [okSource, badSource],
    cache: memoryCache(),
    fetcher: (async (input: RequestInfo | URL) =>
      String(input).includes("bad")
        ? new Response("x", { status: 500, ok: false })
        : jsonResponse(sampleItems)) as typeof fetch,
  });
  const summary = await library.refreshAllSources();
  assert.equal(summary.results.length, 2);
  assert.equal(summary.successCount, 1);
  assert.equal(summary.failureCount, 1);
  assert.equal(summary.total, 2);
});

test("formatPromptDate 格式化合法日期并容忍空值", () => {
  assert.equal(formatPromptDate("2026-09-22T10:00:00Z", "zh-CN"), "2026/09/22");
  assert.equal(formatPromptDate("not-a-date"), "");
});
