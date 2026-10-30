import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import test from "node:test";
import { verifyEvidenceManifest } from "../../scripts/governance/check-evidence-manifest.mjs";

const sourcePath = "docs/changes/example/evidence/run.log";
const manifest = () => ({
  version: 1,
  entries: [
    {
      sourcePath,
      sourceCommit: "a".repeat(40),
      sourceGitBlob: "b".repeat(40),
      containerRelativePath: "output/example/run.log",
      bytes: 4,
      sha256: createHash("sha256").update("test").digest("hex"),
      description: "Original verification log",
    },
  ],
});

test("evidence manifest validates structure without claiming external byte checks", () => {
  assert.deepEqual(verifyEvidenceManifest(manifest()), {
    files: 1,
    bytes: 4,
    copiesVerified: false,
  });
});

test("evidence manifest rejects traversal, duplicate identity and malformed hashes/sizes", () => {
  for (const change of [
    { sourcePath: "../outside.log" },
    { sourcePath: "docs/control\u0000.log" },
    { containerRelativePath: "output/../outside.log" },
    { containerRelativePath: "C:/outside.log" },
    { containerRelativePath: "output\\outside.log" },
    { sha256: "wrong" },
    { bytes: -1 },
    { sourceGitBlob: "wrong" },
  ]) {
    const value = manifest();
    Object.assign(value.entries[0], change);
    assert.throws(() => verifyEvidenceManifest(value));
  }
  const duplicate = manifest();
  duplicate.entries.push(duplicate.entries[0]);
  assert.throws(() => verifyEvidenceManifest(duplicate));
  assert.throws(() => verifyEvidenceManifest({ version: 1, entries: [] }));
});

test("evidence manifest verifies real copies and rejects corruption or missing files", (t) => {
  const parent = path.resolve(".tmp");
  fs.mkdirSync(parent, { recursive: true });
  const root = fs.mkdtempSync(path.join(parent, "evidence-manifest-"));
  t.after(() => {
    assert.equal(path.dirname(fs.realpathSync(root)), fs.realpathSync(parent));
    fs.rmSync(root, { recursive: true, force: true });
  });
  fs.mkdirSync(path.join(root, "output/example"), { recursive: true });
  const target = path.join(root, "output/example/run.log");
  fs.writeFileSync(target, "test");
  assert.deepEqual(verifyEvidenceManifest(manifest(), root), {
    files: 1,
    bytes: 4,
    copiesVerified: true,
  });
  fs.writeFileSync(target, "bad!");
  assert.throws(() => verifyEvidenceManifest(manifest(), root));
  fs.writeFileSync(target, "short");
  assert.throws(() => verifyEvidenceManifest(manifest(), root));
  fs.unlinkSync(target);
  assert.throws(() => verifyEvidenceManifest(manifest(), root));
});
