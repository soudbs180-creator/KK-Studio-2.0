import { test } from "node:test";
import assert from "node:assert/strict";
import {
  filterAssets,
  normalizeTags,
  parseResourcePack,
  type Asset,
} from "../../src/domain/assets.ts";
import { storeGeneratedAsset } from "../../src/features/creation/assetRepository.ts";

test("标签在共享入口验证类型，归一化不把坏值转成字符串", () => {
  assert.deepEqual(normalizeTags([null, 4, {}, " 人物 ", "人物", ""]), [
    "人物",
  ]);
  assert.deepEqual(normalizeTags("人物"), []);
  assert.deepEqual(normalizeTags(undefined, " 收藏 "), ["收藏"]);
});

const items: Asset[] = [
  {
    id: "1",
    name: "静音冷风扇.png",
    type: "image",
    tag: "产品",
    createdAt: "2026-09-06T08:00:00Z",
  },
  {
    id: "2",
    name: "静音冷风扇.mp4",
    type: "video",
    tag: "产品",
    createdAt: "2026-08-01T08:00:00Z",
  },
  {
    id: "3",
    name: "人物.png",
    type: "image",
    tag: "人物",
    createdAt: "2026-09-06T08:00:00Z",
  },
];
const defaults = { query: "", type: "all", tag: "all", days: 0 } as const;
test("归档多标签和旧主标签都可搜索筛选", () => {
  const asset = { ...items[0], tag: "主标签", tags: ["AI生成", "人物"] };
  assert.equal(filterAssets([asset], { ...defaults, query: "人物" }).length, 1);
  for (const tag of ["人物", "主标签"])
    assert.equal(filterAssets([asset], { ...defaults, tag }).length, 1);
  assert.equal(filterAssets([asset], { ...defaults, tag: "服装" }).length, 0);
});
test("中文搜索与类型、标签过滤同时生效", () => {
  assert.deepEqual(
    filterAssets(items, {
      ...defaults,
      query: " 冷风 ",
      type: "image",
      tag: "产品",
    }).map((a) => a.id),
    ["1"],
  );
});
test("最近时间使用传入当前时间，未来日期也不匹配", () => {
  assert.deepEqual(
    filterAssets(
      items,
      { ...defaults, days: 7 },
      Date.parse("2026-09-06T09:00:00Z"),
    ).map((a) => a.id),
    ["1", "3"],
  );
  assert.equal(
    filterAssets(items, { ...defaults, days: 1 }, Date.parse("2026-08-31"))
      .length,
    0,
  );
});
test("搜索无结果后清空可以恢复所有资产", () => {
  assert.equal(filterAssets(items, { ...defaults, query: "不存在" }).length, 0);
  assert.equal(filterAssets(items, defaults).length, 3);
});

test("资源包、日期范围和时间排序组合筛选", () => {
  const packed = items.map((asset, index) => ({
    ...asset,
    id: `packed-${index}`,
    resourcePackId: index < 2 ? "pack-a" : "pack-b",
  }));
  assert.deepEqual(
    filterAssets(packed, {
      ...defaults,
      resourcePackId: "pack-a",
      from: "2026-08-01",
      to: "2026-09-06",
      sort: "oldest",
    }).map((asset) => asset.id),
    ["packed-1", "packed-0"],
  );
});

test("生成结果归档为内容寻址资产并不保留供应商 URL", async () => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      __TAURI_INTERNALS__: {
        invoke: async (
          _command: string,
          args: {
            dataBase64: string;
            metadata: { sha256: string; [key: string]: unknown };
          },
        ) => args.metadata,
      },
    },
  });
  try {
    const stored = await storeGeneratedAsset({
      source:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      provider: "测试供应商",
      model: "image-test",
    });
    assert.match(stored.assetId, /^asset-[0-9a-f]{24}$/);
    assert.match(stored.sha256, /^[0-9a-f]{64}$/);
    assert.equal(stored.preview.startsWith("data:image/png;base64,"), true);
    assert.equal(stored.provenance.provider, "测试供应商");
  } finally {
    Reflect.deleteProperty(globalThis, "window");
  }
});

test("归档保留 Provider 返回的 C2PA 和 SynthID 信号", async () => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      __TAURI_INTERNALS__: {
        invoke: async (
          _command: string,
          args: {
            dataBase64: string;
            metadata: { sha256: string; [key: string]: unknown };
          },
        ) => args.metadata,
      },
    },
  });
  try {
    const stored = await storeGeneratedAsset({
      source:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      provider: "测试供应商",
      model: "image-test",
      c2paPresent: true,
      synthIdSignal: false,
    });
    assert.equal(stored.provenance.c2paPresent, true);
    assert.equal(stored.provenance.synthIdSignal, false);
  } finally {
    Reflect.deleteProperty(globalThis, "window");
  }
});

test("资源包拒绝错误版本、非数组、远程URL和重复ID", () => {
  for (const value of [
    { version: 2, assets: items },
    { version: 1, assets: {} },
    {
      version: 1,
      assets: [{ ...items[0], src: "https://evil.example/a.png" }],
    },
    { version: 1, assets: [items[0], items[0]] },
  ]) {
    assert.throws(() => parseResourcePack(JSON.stringify(value)));
  }
  assert.deepEqual(
    parseResourcePack(JSON.stringify({ version: 1, assets: items })),
    items,
  );
});
