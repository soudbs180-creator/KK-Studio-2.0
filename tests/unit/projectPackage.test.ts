import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  canonicalJson,
  collectReferencedAssetIds,
  createProjectPackageManifest,
  manifestChecksum,
  preflightProjectPackage,
  type ProjectPackageInput,
} from "../../src/features/projects/projectPackage.ts";
import {
  createProject,
  createTask,
  emptySnapshot,
} from "../../src/features/creation/model.ts";

const sha256 =
  "039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81";
const assetId = `asset-${sha256.slice(0, 24)}`;
const bytes = new Uint8Array([1, 2, 3]);
const preview = "data:image/png;base64,AQID";

function fixture() {
  const project = createProject({
    prompt: "package fixture",
    model: "image-test",
    kind: "image",
    attachments: [],
  });
  const attachment = {
    id: "attachment-1",
    assetId,
    name: "input.png",
    mime: "image/png",
    size: bytes.byteLength,
    dataUrl: preview,
  };
  project.attachments = [attachment];
  project.composerDraft.attachments = [attachment];
  project.items[0].assetId = assetId;
  project.items[0].parentAssetId = assetId;
  project.items[0].preview = preview;
  project.items[0].result = {
    id: "result-1",
    kind: "image",
    title: "result",
    description: "",
    source: "provider",
    src: preview,
  };
  const task = createTask(project);
  task.sourceItemId = project.items[0].id;
  task.attachments = [attachment];
  task.outputs = [
    {
      index: 0,
      status: "succeeded",
      assetId,
      model: "image-test",
      createdAt: 1,
    },
  ];
  project.tasks = [task];
  const snapshot = {
    ...emptySnapshot(),
    revision: 4,
    activeProjectId: project.id,
    projects: [project],
  };
  const asset = {
    assetId,
    sha256,
    preview,
    mime: "image/png",
    tags: ["AI生成"],
    source: "provider" as const,
    isAiGenerated: true,
    provenance: {
      provider: "test",
      model: "image-test",
      generatedAt: "2026-09-18T00:00:00.000Z",
    },
  };
  return { snapshot, asset };
}

async function validPackage(): Promise<{
  input: ProjectPackageInput;
  source: ReturnType<typeof fixture>;
}> {
  const source = fixture();
  const built = await createProjectPackageManifest(
    source.snapshot,
    async (id) => (id === assetId ? source.asset : null),
  );
  return { input: built, source };
}

test("canonical JSON sorts object keys while preserving array order", () => {
  assert.equal(
    canonicalJson({ z: 1, a: { y: 2, x: 3 }, list: [{ b: 1, a: 2 }] }),
    '{"a":{"x":3,"y":2},"list":[{"a":2,"b":1}],"z":1}',
  );
});

test("canonical JSON matches native fixture for numeric, escaped and astral keys", () => {
  const fixture = JSON.parse(
    readFileSync(
      new URL("../fixtures/project-package/canonical.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(canonicalJson(fixture.input), fixture.canonical);
});

test("portable packages reject unarchived media and preserve user text", async () => {
  const { snapshot, asset } = fixture();
  snapshot.homeDraft.prompt = "kk-asset:plain user text";
  snapshot.projects[0].items[0].assetId = undefined;
  await assert.rejects(
    createProjectPackageManifest(snapshot, async () => asset),
    /归档/,
  );
  snapshot.projects[0].items[0].assetId = assetId;
  const built = await createProjectPackageManifest(snapshot, async () => asset);
  assert.equal(
    (await preflightProjectPackage(built)).snapshot.homeDraft.prompt,
    snapshot.homeDraft.prompt,
  );
});

test("package creation collects graph, attachment and task output references", async () => {
  const { input, source } = await validPackage();
  assert.deepEqual(collectReferencedAssetIds(source.snapshot), [assetId]);
  assert.equal(input.manifest.assets.length, 1);
  assert.equal(input.manifest.assets[0].size, bytes.byteLength);
  assert.equal(input.entries[0].path, `assets/${sha256}.bin`);
  assert.deepEqual([...input.entries[0].bytes], [...bytes]);
  assert.equal(source.snapshot.projects[0].items[0].preview, preview);
  assert.equal(
    input.manifest.snapshot.projects[0].items[0].preview,
    `kk-asset:${assetId}`,
  );
});

test("valid package preflight verifies checksum, references and original bytes", async () => {
  const { input } = await validPackage();
  const checked = await preflightProjectPackage(input);
  assert.equal(checked.checksum, input.manifest.checksum);
  assert.equal(
    checked.snapshot.projects[0].items[0].preview,
    `kk-asset:${assetId}`,
  );
  assert.deepEqual([...checked.assets.get(assetId)!.bytes], [1, 2, 3]);
  assert.equal(
    checked.snapshot.projects[0].tasks[0].sourceItemId,
    checked.snapshot.projects[0].items[0].id,
  );
});

test("preflight rejects malformed paths, duplicates and unreferenced entries", async () => {
  const { input } = await validPackage();
  await assert.rejects(
    preflightProjectPackage({
      ...input,
      entries: [
        ...input.entries,
        { path: "../escape", bytes: new Uint8Array() },
      ],
    }),
    (error: unknown) => (error as { code?: string }).code === "path-traversal",
  );
  await assert.rejects(
    preflightProjectPackage({
      ...input,
      entries: [...input.entries, { ...input.entries[0] }],
    }),
    (error: unknown) => (error as { code?: string }).code === "duplicate-entry",
  );
  await assert.rejects(
    preflightProjectPackage({
      ...input,
      entries: [
        ...input.entries,
        {
          path: `assets/${"f".repeat(64)}.bin`,
          bytes: new Uint8Array([9]),
        },
      ],
    }),
    (error: unknown) =>
      (error as { code?: string }).code === "unreferenced-asset",
  );
});

test("preflight rejects missing, wrong-hash and checksum-tampered packages", async () => {
  const { input } = await validPackage();
  await assert.rejects(
    preflightProjectPackage({ ...input, entries: [] }),
    (error: unknown) => (error as { code?: string }).code === "missing-asset",
  );
  await assert.rejects(
    preflightProjectPackage({
      ...input,
      entries: [
        { path: input.entries[0].path, bytes: new Uint8Array([3, 2, 1]) },
      ],
    }),
    (error: unknown) =>
      (error as { code?: string }).code === "asset-hash-mismatch",
  );
  await assert.rejects(
    preflightProjectPackage({
      ...input,
      manifest: { ...input.manifest, checksum: "0".repeat(64) },
    }),
    (error: unknown) =>
      (error as { code?: string }).code === "checksum-mismatch",
  );
});

test("preflight rejects secrets, unknown manifest fields and duplicate metadata", async () => {
  const { input } = await validPackage();
  await assert.rejects(
    preflightProjectPackage({
      ...input,
      manifest: { ...input.manifest, apiKey: "synthetic-secret" },
    }),
    (error: unknown) => (error as { code?: string }).code === "secret-present",
  );
  await assert.rejects(
    preflightProjectPackage({
      ...input,
      manifest: { ...input.manifest, futureField: true },
    }),
    (error: unknown) => (error as { code?: string }).code === "corrupt",
  );
  await assert.rejects(
    preflightProjectPackage({
      ...input,
      manifest: {
        ...input.manifest,
        assets: [...input.manifest.assets, input.manifest.assets[0]],
      },
    }),
    (error: unknown) => (error as { code?: string }).code === "duplicate-entry",
  );
  const mismatch = structuredClone(input.manifest) as {
    snapshot: { projects: Array<{ items: Array<{ preview?: string }> }> };
  };
  mismatch.snapshot.projects[0].items[0].preview =
    "kk-asset:asset-ffffffffffffffffffffffff";
  await assert.rejects(
    preflightProjectPackage({ ...input, manifest: mismatch }),
    (error: unknown) => (error as { code?: string }).code === "corrupt",
  );
});

test("package creation rejects normalization loss, invalid output status and bad metadata", async () => {
  const source = fixture();
  const extension = structuredClone(
    source.snapshot,
  ) as typeof source.snapshot & {
    projects: Array<{ futureField?: string }>;
  };
  extension.projects[0].futureField = "must-preserve";
  await assert.rejects(
    createProjectPackageManifest(extension, async () => source.asset),
    (error: unknown) => (error as { code?: string }).code === "corrupt",
  );

  const invalidStatus = structuredClone(
    source.snapshot,
  ) as typeof source.snapshot;
  const task = createTask(invalidStatus.projects[0]);
  task.outputs![0].status = "bogus" as never;
  invalidStatus.projects[0].tasks = [task];
  await assert.rejects(
    createProjectPackageManifest(invalidStatus, async () => source.asset),
    (error: unknown) => (error as { code?: string }).code === "corrupt",
  );

  const invalidMetadata = {
    ...source.asset,
    mime: "image/svg+xml",
    preview: "data:image/svg+xml;base64,AQID",
  };
  const metadataSnapshot = structuredClone(source.snapshot);
  for (const project of metadataSnapshot.projects) {
    for (const attachment of [
      ...project.attachments,
      ...project.composerDraft.attachments,
      ...project.tasks.flatMap((task) => task.attachments),
    ])
      attachment.dataUrl = undefined;
    for (const item of project.items) {
      item.preview = undefined;
      if (item.result) item.result.src = undefined;
    }
  }
  await assert.rejects(
    createProjectPackageManifest(metadataSnapshot, async () => invalidMetadata),
    (error: unknown) => (error as { code?: string }).code === "corrupt",
  );
});

test("preflight rejects secret-shaped fields, zero-byte assets and UTC offsets, and clones bytes", async () => {
  const { input } = await validPackage();
  const withSecret = structuredClone(input.manifest) as typeof input.manifest;
  (
    withSecret.snapshot.homeDraft as typeof withSecret.snapshot.homeDraft & {
      providerApiKey?: string;
    }
  ).providerApiKey = "synthetic-secret";
  withSecret.checksum = await manifestChecksum(withSecret);
  await assert.rejects(
    preflightProjectPackage({ ...input, manifest: withSecret }),
    (error: unknown) => (error as { code?: string }).code === "secret-present",
  );

  const zero = structuredClone(input.manifest) as typeof input.manifest;
  zero.assets[0].size = 0;
  zero.checksum = await manifestChecksum(zero);
  await assert.rejects(
    preflightProjectPackage({
      ...input,
      manifest: zero,
      entries: [{ ...input.entries[0], bytes: new Uint8Array() }],
    }),
    (error: unknown) => (error as { code?: string }).code === "corrupt",
  );

  const offset = structuredClone(input.manifest) as typeof input.manifest;
  offset.exportedAt = "2026-09-18T08:00:00+08:00";
  offset.checksum = await manifestChecksum(offset);
  await assert.rejects(
    preflightProjectPackage({ ...input, manifest: offset }),
    (error: unknown) => (error as { code?: string }).code === "corrupt",
  );

  const checked = await preflightProjectPackage(input);
  checked.assets.get(assetId)!.bytes[0] = 99;
  assert.deepEqual([...input.entries[0].bytes], [1, 2, 3]);
});
