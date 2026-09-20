import assert from "node:assert/strict";
import test from "node:test";
import {
  encodeSnapshotAssets,
  hydrateSnapshotAssets,
} from "../../src/features/creation/snapshotAssets.ts";
import {
  emptySnapshot,
  createProject,
} from "../../src/features/creation/model.ts";
import { decodeSnapshot } from "../../src/features/creation/snapshotCodec.ts";
import { resolveImageAttachments } from "../../src/features/creation/resolveAttachments.ts";

const assetId = "asset-0123456789abcdef01234567";
const source = "data:image/png;base64," + "A".repeat(17 * 1024 * 1024);
const asset = {
  assetId,
  preview: source,
  sha256: "0123456789abcdef01234567".padEnd(64, "0"),
  mime: "image/png",
  tags: [],
  provenance: { generatedAt: "2026-09-17T00:00:00.000Z" },
};
const read = async (id: string) => (id === assetId ? asset : null);
function fixture() {
  const project = createProject({
    prompt: "asset test",
    kind: "image",
    model: "image-test",
    attachments: [],
  });
  project.items[0].assetId = assetId;
  project.items[0].preview = source;
  project.items[0].result = {
    id: "r1",
    kind: "image",
    title: "原件",
    description: "",
    source: "provider",
    src: source,
    poster: "/fixtures/demo/video.jpg",
  };
  project.composerDraft.attachments = [
    {
      id: "a1",
      assetId,
      name: "large.png",
      mime: "image/png",
      size: 13 * 1024 * 1024,
      dataUrl: source,
    },
  ];
  return {
    ...emptySnapshot(),
    projects: [project],
    activeProjectId: project.id,
    revision: 1,
  };
}
test("大于16MiB的已归档媒体用稳定引用保存并完整恢复，独立poster不被替换", async () => {
  const snapshot = fixture();
  const encoded = await encodeSnapshotAssets(snapshot, read);
  assert.ok(JSON.stringify(encoded).length < 10000);
  assert.equal(snapshot.projects[0].items[0].preview, source);
  const decoded = decodeSnapshot(encoded);
  const hydrated = await hydrateSnapshotAssets(decoded, read);
  assert.equal(hydrated.projects[0].items[0].preview, source);
  assert.equal(hydrated.projects[0].items[0].result?.src, source);
  assert.equal(
    hydrated.projects[0].items[0].result?.poster,
    "/fixtures/demo/video.jpg",
  );
  assert.equal(
    hydrated.projects[0].composerDraft.attachments[0].dataUrl,
    source,
  );
});
test("缺失引用不能被静默水合，旧内嵌素材不自动迁移", async () => {
  const original = fixture();
  const encoded = await encodeSnapshotAssets(original, read);
  await assert.rejects(
    hydrateSnapshotAssets(encoded, async () => null),
    /缺失|找不到/,
  );
  const legacy = await encodeSnapshotAssets(original, async () => null);
  assert.equal(legacy.projects[0].items[0].preview, source);
});
test("内存媒体与assetId原件不符时拒绝剥离", async () => {
  await assert.rejects(
    encodeSnapshotAssets(fixture(), async () => ({
      ...asset,
      preview: "data:image/png;base64,bad",
    })),
    /不一致/,
  );
});
test("引用附件发送前恢复原件，缺失时不能降级为文生图", async () => {
  const attachments = [
    { id: "a", assetId, name: "input.png", mime: "image/png", size: 4 },
  ];
  const resolved = await resolveImageAttachments(attachments, read);
  assert.equal(resolved[0].dataUrl, source);
  await assert.rejects(
    resolveImageAttachments(attachments, async () => null),
    /未提交/,
  );
  await assert.rejects(
    resolveImageAttachments([{ ...attachments[0], assetId: undefined }], read),
    /未提交/,
  );
});
test("引用与附件身份冲突时阻止发出另一张图片", async () => {
  let reads = 0;
  await assert.rejects(
    resolveImageAttachments(
      [
        {
          id: "a",
          assetId,
          name: "input.png",
          mime: "image/png",
          size: 4,
          dataUrl: "kk-asset:asset-ffffffffffffffffffffffff",
        },
      ],
      async () => {
        reads += 1;
        return asset;
      },
    ),
    /不一致/,
  );
  assert.equal(reads, 0);
});
