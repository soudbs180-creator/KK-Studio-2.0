import assert from "node:assert/strict";
import test from "node:test";
import {
  referenceLayout,
  referencePreviewPosition,
  referenceRatio,
} from "../../src/components/nodes/referenceLayout.ts";

test("video frames use their roles rather than source type or array order", () => {
  const first = {
    id: "edge-first",
    title: "first.png",
    kind: "image" as const,
    frame: "first" as const,
  };
  const last = {
    id: "edge-last",
    title: "last.webm",
    kind: "video" as const,
    frame: "last" as const,
  };
  const extra = {
    id: "edge-extra",
    title: "style.png",
    kind: "image" as const,
  };
  const input = [last, extra, first];
  const layout = referenceLayout(input, true);
  assert.equal(layout.first, first);
  assert.equal(layout.last, last);
  assert.deepEqual(layout.remaining, [extra]);
  assert.deepEqual(input, [last, extra, first]);
  assert.equal(referenceLayout(input, false).remaining.length, 3);
});

test("default references keep every entry without assigning semantic slots", () => {
  const references = Array.from({ length: 7 }, (_, index) => ({
    id: String(index),
    title: String(index),
    slot: index === 6 ? ("风格" as const) : undefined,
  }));
  const layout = referenceLayout(references, false);
  assert.deepEqual(layout.remaining, references);
  assert.equal(layout.remaining.length, 7);
  assert.equal(references[0].slot, undefined);
  assert.equal(references[6].slot, "风格");
});

test("reference ratios are limited to square and landscape 16:9", () => {
  assert.equal(referenceRatio(0, 0), "1:1");
  assert.equal(referenceRatio(100, 100), "1:1");
  assert.equal(referenceRatio(900, 1600), "1:1");
  assert.equal(referenceRatio(2000, 600), "16:9");
  assert.equal(referenceRatio(Infinity, 1), "1:1");
  assert.equal(referenceRatio(1, -1), "1:1");
});

test("reference popovers center above, flip below and stay in the viewport", () => {
  const size = { width: 320, height: 260 };
  const viewport = { width: 390, height: 844 };
  assert.deepEqual(
    referencePreviewPosition(
      { left: 16, top: 440, bottom: 512, width: 72 },
      size,
      viewport,
    ),
    { left: 8, top: 172 },
  );
  assert.deepEqual(
    referencePreviewPosition(
      { left: 300, top: 40, bottom: 112, width: 128 },
      size,
      viewport,
    ),
    { left: 62, top: 120 },
  );
  assert.deepEqual(
    referencePreviewPosition(
      { left: -10, top: -20, bottom: 20, width: 72 },
      size,
      viewport,
    ),
    { left: 8, top: 28 },
  );
  assert.deepEqual(
    referencePreviewPosition(
      { left: 600, top: 400, bottom: 472, width: 72 },
      size,
      { width: 1440, height: 1000 },
    ),
    { left: 476, top: 132 },
  );
});
