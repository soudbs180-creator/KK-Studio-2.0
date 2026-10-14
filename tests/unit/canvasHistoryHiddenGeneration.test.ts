import assert from "node:assert/strict";
import test from "node:test";
import {
  commitCanvasHistory,
  createCanvasHistory,
  undoCanvasHistory,
  redoCanvasHistory,
  settleCanvasHistoryGeneration,
  settleCanvasGenerationItems,
  type CanvasHistorySnapshot,
} from "../../src/domain/canvasHistory.ts";
import type { CanvasCollectionItem } from "../../src/domain/canvasItems.ts";

function fixtures() {
  const source: CanvasCollectionItem = {
    id: "source",
    kind: "video",
    title: "原视频",
    description: "原说明",
    assetId: "original-asset",
    prompt: "源草稿",
    tags: ["原件"],
  };
  const waiting: CanvasCollectionItem = {
    id: "waiting",
    kind: "video",
    title: "生成中",
    description: "等待说明",
    generationStatus: "pending",
    generationIndex: 0,
    prompt: "历史草稿",
    tags: ["人物"],
    model: "minimax-h3",
  };
  const provider: CanvasCollectionItem = {
    id: "provider",
    kind: "image",
    title: "Provider等待",
    description: "",
    generationStatus: "pending",
    generationIndex: 0,
  };
  const base: CanvasHistorySnapshot = {
    items: [source, provider],
    positions: { source: { x: 7, y: 13 }, provider: { x: 31, y: 67 } },
    edges: [],
    viewport: { x: 19, y: 23, scale: 0.5 },
  };
  const reserved: CanvasHistorySnapshot = {
    ...base,
    items: [source, provider, waiting],
    positions: { ...base.positions, waiting: { x: 541, y: -97 } },
    edges: [
      { id: "edge", source: "source", target: "waiting", kind: "result" },
    ],
  };
  const ready: CanvasCollectionItem = {
    ...waiting,
    title: "本地完成",
    description: "固定素材",
    preview: "/poster.png",
    prompt: "不能覆盖历史草稿",
    generationStatus: "ready",
    result: {
      id: "demo",
      kind: "video",
      source: "demo",
      title: "本地完成",
      description: "固定素材",
      src: "/demo.webm",
    },
  };
  const cancelled: CanvasCollectionItem = {
    ...waiting,
    title: "已取消生成",
    generationStatus: "error",
  };
  return { base, reserved, ready, cancelled };
}

for (const ending of ["ready", "cancelled"] as const) {
  test(`Undo while local loading, then ${ending}, then Redo restores terminal at its original position`, () => {
    const { base, reserved, ready, cancelled } = fixtures();
    const loading = commitCanvasHistory(createCanvasHistory(base), reserved);
    const hidden = undoCanvasHistory(loading);
    const terminal = ending === "ready" ? ready : cancelled;
    const settled = settleCanvasHistoryGeneration(hidden, [terminal]);
    const live = settleCanvasGenerationItems(hidden.present.items, [terminal]);
    assert.deepEqual(
      live,
      base.items,
      "completion never inserts a hidden result",
    );
    assert.deepEqual(
      settled.present,
      base,
      "source and draft remain untouched",
    );
    assert.equal(
      settled.future.length,
      hidden.future.length,
      "Redo is retained",
    );
    assert.equal(
      settled.past.length,
      hidden.past.length,
      "no synthetic history step",
    );
    const committed = commitCanvasHistory(settled, {
      ...settled.present,
      items: live,
    });
    const redone = redoCanvasHistory(committed);
    const result = redone.present.items.find((item) => item.id === "waiting")!;
    assert.equal(
      result.generationStatus,
      ending === "ready" ? "ready" : "error",
    );
    assert.equal(result.title, terminal.title);
    assert.equal(result.prompt, "历史草稿");
    assert.deepEqual(result.tags, ["人物"]);
    assert.deepEqual(redone.present.positions, reserved.positions);
    assert.deepEqual(redone.present.edges, reserved.edges);
    assert.deepEqual(redone.present.viewport, reserved.viewport);
    assert.deepEqual(
      redone.present.items[0],
      base.items[0],
      "original asset retained",
    );
    assert.equal(
      redone.present.items[1].generationStatus,
      "pending",
      "Provider unaffected",
    );
    assert.equal(
      hidden.future[0].items[2].generationStatus,
      "pending",
      "input immutable",
    );
    if (ending === "ready") {
      assert.deepEqual(result.result, ready.result);
      ready.result!.title = "mutated input";
      assert.equal(result.result!.title, "本地完成", "terminal data cloned");
    }
    const hiddenAgain = undoCanvasHistory(redone);
    assert.deepEqual(hiddenAgain.present.items, base.items);
    assert.equal(
      redoCanvasHistory(hiddenAgain).present.items[2].generationStatus,
      result.generationStatus,
    );
  });
}

test("source and result hidden by Undo stay hidden after cancellation, with future settled", () => {
  const { base, reserved, cancelled } = fixtures();
  const empty = {
    ...base,
    items: [base.items[1]],
    positions: { provider: base.positions.provider },
  };
  let state = commitCanvasHistory(createCanvasHistory(empty), base);
  state = commitCanvasHistory(state, reserved);
  state = undoCanvasHistory(undoCanvasHistory(state));
  const settled = settleCanvasHistoryGeneration(state, [cancelled]);
  assert.deepEqual(settled.present, empty);
  assert.equal(settled.future.length, 2);
  const restored = redoCanvasHistory(redoCanvasHistory(settled));
  assert.equal(restored.present.items[2].generationStatus, "error");
  assert.equal(restored.present.items[0].assetId, "original-asset");
  assert.deepEqual(restored.present.positions, reserved.positions);
});

test("partial visibility settles only matching local video pending IDs, preserving unrelated history", () => {
  const { base, reserved, ready, cancelled } = fixtures();
  const second = { ...reserved.items[2], id: "waiting-2", generationIndex: 1 };
  const expanded = {
    ...reserved,
    items: [...reserved.items, second],
    positions: { ...reserved.positions, "waiting-2": { x: 981, y: -97 } },
  };
  let state = commitCanvasHistory(createCanvasHistory(base), reserved);
  state = undoCanvasHistory(commitCanvasHistory(state, expanded));
  const terminal = [
    ready,
    { ...cancelled, id: "waiting-2", generationIndex: 1 },
    { ...cancelled, id: "provider" },
  ];
  const settled = settleCanvasHistoryGeneration(state, terminal);
  assert.equal(
    settled.present.items.find((item) => item.id === "waiting")!
      .generationStatus,
    "ready",
  );
  assert.equal(
    settled.present.items.some((item) => item.id === "waiting-2"),
    false,
  );
  assert.equal(
    settled.present.items.find((item) => item.id === "provider")!
      .generationStatus,
    "pending",
  );
  const redone = redoCanvasHistory(settled);
  assert.equal(redone.present.items.at(-1)!.generationStatus, "error");
  assert.deepEqual(redone.present.positions, expanded.positions);
  const late = settleCanvasHistoryGeneration(redone, [cancelled]);
  assert.equal(
    late.present.items.find((item) => item.id === "waiting")!.generationStatus,
    "ready",
    "late cancellation cannot replace success",
  );
});

test("a Provider video terminal update does not settle a local placeholder", () => {
  const { reserved, ready } = fixtures();
  const provider = {
    ...ready,
    result: { ...ready.result!, source: "provider" as const },
  };
  const settled = settleCanvasHistoryGeneration(createCanvasHistory(reserved), [
    provider,
  ]);
  assert.equal(settled.present.items[2].generationStatus, "pending");
});
