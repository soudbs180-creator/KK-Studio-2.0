import { test } from "node:test";
import assert from "node:assert/strict";
import { swapReferenceFrames } from "../../src/components/canvas/canvasReferences.ts";
import { assignVideoReferenceFrames } from "../../src/components/nodes/referenceUpload.ts";
import type { CanvasCollectionItem } from "../../src/domain/canvasItems.ts";

test("交换视频首尾帧只更新来源节点，不改变连线标识", () => {
  const items: CanvasCollectionItem[] = [
    {
      id: "first",
      kind: "video",
      title: "首帧",
      description: "",
      referenceFrame: "first",
    },
    {
      id: "last",
      kind: "video",
      title: "尾帧",
      description: "",
      referenceFrame: "last",
    },
  ];
  const edges = [
    {
      id: "edge-first",
      source: "first",
      target: "target",
      kind: "reference" as const,
    },
    {
      id: "edge-last",
      source: "last",
      target: "target",
      kind: "reference" as const,
    },
  ];
  const updated = swapReferenceFrames(items, edges, "edge-first", "edge-last");
  assert.equal(
    updated.find((item) => item.id === "first")?.referenceFrame,
    "last",
  );
  assert.equal(
    updated.find((item) => item.id === "last")?.referenceFrame,
    "first",
  );
  assert.deepEqual(
    edges.map((edge) => edge.id),
    ["edge-first", "edge-last"],
  );
});

test("视频参考上传按现有占用补齐首尾帧，音频不占帧槽", () => {
  const assigned = assignVideoReferenceFrames(
    [
      { id: "image", title: "第二张", kind: "image" },
      { id: "audio", title: "配乐", kind: "audio" },
    ],
    [{ id: "existing", title: "第一张", kind: "image", frame: "first" }],
  );
  assert.equal(assigned[0]?.frame, "last");
  assert.equal(assigned[1]?.frame, undefined);
});
