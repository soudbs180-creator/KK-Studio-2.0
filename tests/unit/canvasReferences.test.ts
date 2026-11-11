import { test } from "node:test";
import assert from "node:assert/strict";
import {
  swapReferenceFrames,
  canvasReferencesByTarget,
} from "../../src/components/canvas/canvasReferences.ts";
import { assignVideoReferenceFrames } from "../../src/components/nodes/referenceUpload.ts";
import { canConnectTarget } from "../../src/components/canvas/connectionRules.ts";
import { reconcileCanvasConnections } from "../../src/domain/canvasConnections.ts";
import type { CanvasCollectionItem } from "../../src/domain/canvasItems.ts";

test("视频接受图片、视频和音频参考，图片保持仅接收图片的限制", () => {
  const items: CanvasCollectionItem[] = [
    { id: "image", kind: "image", title: "图片", description: "" },
    { id: "video", kind: "video", title: "视频", description: "" },
    { id: "audio", kind: "audio", title: "音频", description: "" },
    { id: "target", kind: "video", title: "视频任务", description: "" },
  ];
  for (const source of ["image", "video", "audio"])
    assert.equal(canConnectTarget(items, [], source, "target"), true);
  for (const source of ["video", "audio"]) {
    const edges = [
      {
        id: `edge-${source}`,
        source,
        target: "target",
        kind: "reference" as const,
      },
    ];
    assert.deepEqual(reconcileCanvasConnections(items, edges), edges);
  }
  assert.equal(canConnectTarget(items, [], "video", "image"), false);
  assert.equal(canConnectTarget(items, [], "audio", "image"), false);
  assert.equal(
    canConnectTarget(
      items,
      [{ id: "edge", source: "video", target: "target" }],
      "video",
      "target",
    ),
    false,
  );
  const occupied = Array.from(
    { length: 2 },
    (_, index): CanvasCollectionItem => ({
      id: `reference-${index}`,
      kind: index % 2 ? "video" : "audio",
      title: "已有参考",
      description: "",
    }),
  );
  assert.equal(
    canConnectTarget(
      [...items, ...occupied],
      occupied.map((entry) => ({
        id: `edge-${entry.id}`,
        source: entry.id,
        target: "target",
        kind: "reference",
      })),
      "image",
      "target",
    ),
    false,
  );
});

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

test("文字不占视频参考名额，对账保留媒体参考和结果连线", () => {
  const items: CanvasCollectionItem[] = [
    { id: "text", kind: "text", title: "文案", description: "" },
    { id: "image", kind: "image", title: "图片", description: "" },
    { id: "audio", kind: "audio", title: "音频", description: "" },
    { id: "target", kind: "video", title: "视频任务", description: "" },
  ];
  const invalid = {
    id: "text-ref",
    source: "text",
    target: "target",
    kind: "reference" as const,
  };
  const media = { ...invalid, id: "image-ref", source: "image" };
  const result = { ...invalid, id: "text-result", kind: "result" as const };
  assert.equal(canConnectTarget(items, [], "text", "target"), false);
  assert.equal(
    canConnectTarget(items, [invalid, media], "audio", "target"),
    true,
  );
  assert.deepEqual(
    reconcileCanvasConnections(items, [invalid, media, result]),
    [media, result],
  );
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

test("混合上传先保留整批素材的显式帧角色，未指定的图片不重复占用", () => {
  const assigned = assignVideoReferenceFrames(
    [
      { id: "image", title: "图片", kind: "image" },
      { id: "video", title: "视频", kind: "video", frame: "first" },
      { id: "audio", title: "音频", kind: "audio" },
      { id: "extra", title: "其他参考", kind: "image" },
    ],
    [],
  );
  assert.deepEqual(
    assigned.map((entry) => [entry.id, entry.frame]),
    [
      ["image", "last"],
      ["video", "first"],
      ["audio", undefined],
      ["extra", undefined],
    ],
  );
});
