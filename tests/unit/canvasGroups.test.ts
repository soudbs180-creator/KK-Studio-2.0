import assert from "node:assert/strict";
import test from "node:test";
import {
  createProjectCanvas,
  projectCanvasFingerprint,
  readProjectCanvas,
  reconcileProjectCanvas,
} from "../../src/domain/projectCanvas.ts";

test("canvas groups persist, filter removed members, and affect the fingerprint", () => {
  const base = createProjectCanvas([
    { id: "image", kind: "image", title: "图", description: "" },
    { id: "video", kind: "video", title: "视频", description: "" },
  ]);
  const grouped = {
    ...base,
    groups: [
      {
        id: "group-1",
        name: "资源包",
        itemIds: ["image", "video", "missing"],
        borderColor: "#21a673",
        collapseMode: "info" as const,
        layoutMode: "grid" as const,
        createdAt: 1,
        updatedAt: 1,
      },
    ],
  };
  const reconciled = reconcileProjectCanvas(grouped, [
    { id: "image", kind: "image", title: "图", description: "" },
  ]);
  assert.deepEqual(reconciled.groups?.[0]?.itemIds, ["image"]);
  assert.notEqual(
    projectCanvasFingerprint(base),
    projectCanvasFingerprint(grouped),
  );
  assert.deepEqual(
    readProjectCanvas(grouped, [
      { id: "image", kind: "image", title: "图", description: "" },
      { id: "video", kind: "video", title: "视频", description: "" },
    ]).groups?.[0]?.itemIds,
    ["image", "video"],
  );
});
