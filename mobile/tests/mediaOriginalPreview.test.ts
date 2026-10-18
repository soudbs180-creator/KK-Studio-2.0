import test from "node:test";
import assert from "node:assert/strict";
import { verifiedPreviewSource } from "../src/ui/MediaOriginalPreviewResource.ts";

test("verified media source contains unchanged bytes, with explicitly disposable lifetime", async () => {
  const original = new Uint8Array([1, 2, 3, 4]);
  let disposed = false;
  const source = await verifiedPreviewSource(
    {
      async readOriginal() {
        return original.slice();
      },
    },
    "media-1",
    () => true,
    (bytes) => {
      assert.deepEqual(bytes, original);
      return {
        uri: "file:///verified-local-copy",
        dispose() {
          disposed = true;
        },
      };
    },
  );
  assert.equal(disposed, false);
  source.dispose();
  assert.equal(disposed, true);
  assert.deepEqual(original, new Uint8Array([1, 2, 3, 4]));
});

test("hash read failure cannot create a playable URI", async () => {
  let created = false;
  await assert.rejects(
    verifiedPreviewSource(
      {
        async readOriginal() {
          throw new Error("hash mismatch");
        },
      },
      "media-1",
      () => true,
      () => {
        created = true;
        return { uri: "bad", dispose() {} };
      },
    ),
    /hash mismatch/,
  );
  assert.equal(created, false);
});

test("late cancelled or changed account read cannot create a playable URI", async () => {
  let valid = true,
    created = false;
  await assert.rejects(
    verifiedPreviewSource(
      {
        async readOriginal() {
          valid = false;
          return new Uint8Array([1]);
        },
      },
      "media-1",
      () => valid,
      () => {
        created = true;
        return { uri: "bad", dispose() {} };
      },
    ),
    /取消|会话/,
  );
  assert.equal(created, false);
});

test("scope changed while allocating source disposes it without publication", async () => {
  let valid = true,
    disposed = false;
  await assert.rejects(
    verifiedPreviewSource(
      {
        async readOriginal() {
          return new Uint8Array([1]);
        },
      },
      "media-1",
      () => valid,
      () => {
        valid = false;
        return {
          uri: "bad",
          dispose() {
            disposed = true;
          },
        };
      },
    ),
    /取消|会话/,
  );
  assert.equal(disposed, true);
});
