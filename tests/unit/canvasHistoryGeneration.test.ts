import assert from "node:assert/strict";
import test from "node:test";
import {
  commitCanvasHistory,
  createCanvasHistory,
  undoCanvasHistory,
  redoCanvasHistory,
  canvasHistoryFingerprint,
  type CanvasHistorySnapshot,
} from "../../src/domain/canvasHistory.ts";

test("local demo cancellation cannot revive waiting results when source deletion is undone or redone", () => {
  const waiting: CanvasHistorySnapshot = {
    items: [
      {
        id: "source",
        kind: "video",
        title: "原视频",
        description: "",
        assetId: "asset-original",
        prompt: "保留草稿",
      },
      {
        id: "local-result",
        kind: "video",
        title: "视频生成中",
        description: "",
        generationStatus: "pending",
        generationIndex: 0,
        tags: ["人物"],
      },
      {
        id: "provider-result",
        kind: "image",
        title: "图片生成中",
        description: "",
        generationStatus: "pending",
        generationIndex: 0,
      },
    ],
    positions: {
      source: { x: 12, y: 34 },
      "local-result": { x: 600, y: 34 },
      "provider-result": { x: 20, y: 600 },
    },
    edges: [
      { id: "edge", source: "source", target: "local-result", kind: "result" },
    ],
    viewport: { x: 3, y: 4, scale: 0.5 },
  };
  const deleted: CanvasHistorySnapshot = {
    ...waiting,
    items: waiting.items
      .filter((item) => item.id !== "source")
      .map((item) =>
        item.id === "local-result"
          ? { ...item, generationStatus: "error", title: "已取消生成" }
          : item,
      ),
    positions: {
      "local-result": waiting.positions["local-result"],
      "provider-result": waiting.positions["provider-result"],
    },
    edges: [],
  };
  const initial = createCanvasHistory(waiting);
  const state = commitCanvasHistory(initial, deleted);
  assert.equal(
    state.past.length,
    1,
    "deletion and cancellation are one undo step",
  );
  const undone = undoCanvasHistory(state);
  const restoredSource = undone.present.items.find(
    (item) => item.id === "source",
  )!;
  assert.equal(restoredSource.assetId, "asset-original");
  assert.equal(restoredSource.prompt, "保留草稿");
  assert.deepEqual(undone.present.positions, waiting.positions);
  assert.deepEqual(undone.present.edges, waiting.edges);
  assert.deepEqual(undone.present.viewport, waiting.viewport);
  const restoredResult = undone.present.items.find(
    (item) => item.id === "local-result",
  )!;
  assert.equal(restoredResult.generationStatus, "error");
  assert.equal(restoredResult.title, "已取消生成");
  assert.deepEqual(restoredResult.tags, ["人物"]);
  assert.equal(
    undone.present.items.find((item) => item.id === "provider-result")!
      .generationStatus,
    "pending",
  );
  assert.equal(
    initial.present.items.find((item) => item.id === "local-result")!
      .generationStatus,
    "pending",
    "input history stays immutable",
  );
  const redone = redoCanvasHistory(undone);
  assert.equal(
    redone.present.items.some((item) => item.id === "source"),
    false,
  );
  assert.equal(
    redone.present.items.find((item) => item.id === "local-result")!
      .generationStatus,
    "error",
  );
  const restoredAgain = undoCanvasHistory(redone);
  assert.equal(
    restoredAgain.present.items.find((item) => item.id === "local-result")!
      .generationStatus,
    "error",
  );
});

test("settling a local placeholder does not replace its historical content or revive provider work", () => {
  const pending: CanvasHistorySnapshot = {
    items: [
      {
        id: "result",
        kind: "video",
        title: "等待",
        description: "旧说明",
        prompt: "历史草稿",
        generationStatus: "pending",
        generationIndex: 0,
      },
    ],
    positions: { result: { x: 8, y: 16 } },
    edges: [],
    viewport: { x: 0, y: 0, scale: 1 },
  };
  const changed: CanvasHistorySnapshot = {
    ...pending,
    positions: { result: { x: 48, y: 16 } },
  };
  const state = commitCanvasHistory(createCanvasHistory(pending), changed);
  const finished: CanvasHistorySnapshot = {
    ...changed,
    items: [
      {
        ...changed.items[0],
        generationStatus: "error",
        title: "已取消生成",
        prompt: "当前草稿",
      },
    ],
  };
  const settled = commitCanvasHistory(state, finished);
  const previous = undoCanvasHistory(settled).present;
  assert.equal(previous.items[0].generationStatus, "error");
  assert.equal(previous.items[0].prompt, "历史草稿");
  assert.equal(previous.items[0].description, "旧说明");
});

test("successful local video cannot return to pending when undo restores an earlier position", () => {
  const pending: CanvasHistorySnapshot = {
    items: [
      {
        id: "result",
        kind: "video",
        title: "等待",
        description: "加载中",
        generationStatus: "pending",
        generationIndex: 0,
        prompt: "保留历史草稿",
      },
    ],
    positions: { result: { x: 8, y: 16 } },
    edges: [],
    viewport: { x: 0, y: 0, scale: 1 },
  };
  const moved = { ...pending, positions: { result: { x: 48, y: 16 } } };
  const state = commitCanvasHistory(createCanvasHistory(pending), moved);
  const ready: CanvasHistorySnapshot = {
    ...moved,
    items: [
      {
        ...moved.items[0],
        generationStatus: "ready",
        title: "演示完成",
        description: "固定素材",
        preview: "/poster.png",
        result: {
          id: "demo-video",
          kind: "video",
          source: "demo",
          title: "演示完成",
          description: "固定素材",
          src: "/video.webm",
        },
      },
    ],
  };
  const completed = commitCanvasHistory(state, ready);
  const undone = undoCanvasHistory(completed);
  assert.equal(undone.present.items[0].generationStatus, "ready");
  assert.deepEqual(undone.present.items[0].result, ready.items[0].result);
  assert.equal(undone.present.items[0].preview, "/poster.png");
  assert.equal(undone.present.items[0].prompt, "保留历史草稿");
  assert.deepEqual(undone.present.positions, pending.positions);
  assert.equal(state.present.items[0].generationStatus, "pending");
  assert.equal(
    redoCanvasHistory(undone).present.items[0].generationStatus,
    "ready",
  );
});

test("history identity ignores object property order but retains actual content changes", () => {
  const snapshot: CanvasHistorySnapshot = {
    items: [{ id: "a", kind: "video", title: "原名", description: "说明" }],
    positions: { a: { x: 1, y: 2 } },
    edges: [],
    viewport: { x: 0, y: 0, scale: 1 },
  };
  const reordered: CanvasHistorySnapshot = {
    ...snapshot,
    items: [{ description: "说明", title: "原名", kind: "video", id: "a" }],
    positions: { a: { y: 2, x: 1 } },
  };
  assert.equal(
    canvasHistoryFingerprint(snapshot),
    canvasHistoryFingerprint(reordered),
  );
  assert.notEqual(
    canvasHistoryFingerprint(snapshot),
    canvasHistoryFingerprint({
      ...reordered,
      items: [{ ...reordered.items[0], title: "新名" }],
    }),
  );
});
