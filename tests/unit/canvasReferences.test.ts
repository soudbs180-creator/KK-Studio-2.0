import { test } from "node:test";
import assert from "node:assert/strict";
import {
  swapReferenceFrames,
  canvasReferencesByTarget,
} from "../../src/components/canvas/canvasReferences.ts";
import { assignVideoReferenceFrames } from "../../src/components/nodes/referenceUpload.ts";
import type { CanvasCollectionItem } from "../../src/domain/canvasItems.ts";

test("画布参考索引保留图片帧角色、视频和音频，排除结果连线", () => {
  const items: CanvasCollectionItem[] = [
    {
      id: "image",
      kind: "image",
      title: "首帧.png",
      description: "",
      referenceFrame: "first",
    },
    {
      id: "video",
      kind: "video",
      title: "尾帧.webm",
      description: "",
      referenceFrame: "last",
    },
    { id: "audio", kind: "audio", title: "音乐.wav", description: "" },
  ];
  const edges = items.map((item) => ({
    id: "edge-" + item.id,
    source: item.id,
    target: "target",
  }));
  const result = canvasReferencesByTarget(items, [
    ...edges,
    { id: "result", source: "image", target: "other", kind: "result" },
  ]);
  assert.deepEqual(
    result.get("target")?.map((ref) => [ref.id, ref.kind, ref.frame]),
    [
      ["edge-image", "image", "first"],
      ["edge-video", "video", "last"],
      ["edge-audio", "audio", undefined],
    ],
  );
  assert.equal(result.has("other"), false);
});

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
