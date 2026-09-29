import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalJson,
  createManifest,
  sha256Bytes,
} from "../../src/features/local-service/manifest.ts";

test("canonical JSON sorts object keys recursively but preserves array order", () => {
  assert.equal(
    canonicalJson({ z: 1, a: { d: true, c: [2, 1] } }),
    '{"a":{"c":[2,1],"d":true},"z":1}',
  );
});

test("manifest hashing is stable for the same bytes and file list", () => {
  const bytes = new Uint8Array([1, 2, 3]);
  assert.equal(
    sha256Bytes(bytes),
    "039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
  );
  const first = createManifest(
    2,
    [
      { path: "b", bytes },
      { path: "a", bytes: new Uint8Array([4]) },
    ],
    "2026-09-29T00:00:00.000Z",
  );
  const second = createManifest(
    2,
    [
      { path: "a", bytes: new Uint8Array([4]) },
      { path: "b", bytes },
    ],
    "2026-09-29T00:00:00.000Z",
  );
  assert.deepEqual(first, second);
  assert.match(first.manifestSha256, /^[a-f0-9]{64}$/);
  assert.equal(first.createdAt, "2026-09-29T00:00:00.000Z");
});
