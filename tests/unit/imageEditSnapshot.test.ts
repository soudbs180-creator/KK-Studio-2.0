import assert from "node:assert/strict";
import test from "node:test";
import {
  readImageEditSnapshot,
  editCapabilityReason,
} from "../../src/features/image-edit/snapshot.ts";
import { rectangleMask } from "../../src/features/image-edit/mask.ts";

test("edit snapshots preserve original-coordinate mask and reject corruption rather than drop protection", () => {
  const snapshot = {
    sourceAssetId: "asset-" + "a".repeat(24),
    maskAssetId: "asset-" + "b".repeat(24),
    groupId: "group-a",
    document: {
      width: 100,
      height: 80,
      regions: [
        {
          id: "a",
          runs: rectangleMask(100, 80, { x: 10, y: 20 }, { x: 30, y: 40 }),
        },
      ],
    },
    crop: { x: 9, y: 19, width: 22, height: 22, regionIds: ["a"] },
    nativeMask: true,
  };
  assert.deepEqual(readImageEditSnapshot(snapshot), snapshot);
  assert.throws(
    () =>
      readImageEditSnapshot({
        ...snapshot,
        crop: { ...snapshot.crop, regionIds: ["missing"] },
      }),
    /区域/,
  );
  assert.throws(
    () => readImageEditSnapshot({ ...snapshot, sourceAssetId: "missing" }),
    /原件/,
  );
  assert.throws(
    () =>
      readImageEditSnapshot({
        ...snapshot,
        document: {
          ...snapshot.document,
          regions: [{ id: "a", runs: [[900, 0, 2]] }],
        },
      }),
    /坐标/,
  );
});

test("local editing requires declared edit or inpaint and checks annotation reference overhead", () => {
  const caps = {
    operations: {
      generate: "supported",
      edit: "unknown",
      inpaint: "unknown",
      outpaint: "unknown",
    },
    maxReferences: 2,
  } as const;
  assert.match(editCapabilityReason(caps, 1)!, /明确/);
  assert.equal(
    editCapabilityReason(
      { ...caps, operations: { ...caps.operations, inpaint: "supported" } },
      2,
    ),
    undefined,
  );
  assert.match(
    editCapabilityReason(
      { ...caps, operations: { ...caps.operations, edit: "supported" } },
      2,
    )!,
    /3 张/,
  );
  assert.equal(
    editCapabilityReason(
      { ...caps, operations: { ...caps.operations, edit: "supported" } },
      1,
    ),
    undefined,
  );
});
