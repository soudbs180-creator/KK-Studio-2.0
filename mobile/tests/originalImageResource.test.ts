import test from "node:test";
import assert from "node:assert/strict";
import { originalImageResource } from "../src/ui/originalImageResource.ts";

test("native image sizing receives a disposable file source from verified unchanged bytes", async () => {
  const bytes = new Uint8Array([137, 80, 78, 71]);
  let disposed = 0;
  const image = await originalImageResource(
    {
      async readOriginal() {
        return bytes.slice();
      },
    },
    "original",
    () => true,
    (actual) => {
      assert.deepEqual(actual, bytes);
      return {
        uri: "file:///cache/original.png",
        dispose() {
          disposed++;
        },
      };
    },
    (uri, success, failure) => {
      if (uri.startsWith("data:"))
        failure(new Error("Unsupported uri scheme for encoded image fetch"));
      else {
        assert.equal(uri, "file:///cache/original.png");
        success(1672, 941);
      }
    },
  );
  assert.equal(image?.width, 1672);
  assert.equal(image?.height, 941);
  assert.equal(disposed, 0);
  image?.dispose();
  assert.equal(disposed, 1);
  assert.deepEqual(bytes, new Uint8Array([137, 80, 78, 71]));
});

test("leaving the account or page during native sizing disposes the unpublished source", async () => {
  let current = true,
    disposed = 0;
  const image = await originalImageResource(
    {
      async readOriginal() {
        return new Uint8Array([1]);
      },
    },
    "original",
    () => current,
    () => ({
      uri: "file:///cache/original.png",
      dispose() {
        disposed++;
      },
    }),
    (_uri, success) => {
      current = false;
      success(1672, 941);
    },
  );
  assert.equal(image, undefined);
  assert.equal(disposed, 1);
});

test("a stalled native dimension request releases the cache source at its deadline", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let disposed = 0,
    started!: () => void,
    complete!: (width: number, height: number) => void;
  const sizingStarted = new Promise<void>((resolve) => {
    started = resolve;
  });
  const pending = originalImageResource(
    {
      async readOriginal() {
        return new Uint8Array([1]);
      },
    },
    "original",
    () => true,
    () => ({
      uri: "file:///cache/original.png",
      dispose() {
        disposed++;
      },
    }),
    (_uri, success) => {
      complete = success;
      started();
    },
  );
  const rejected = assert.rejects(pending, /超时/);
  await sizingStarted;
  context.mock.timers.tick(14999);
  assert.equal(disposed, 0);
  context.mock.timers.tick(1);
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(disposed, 1);
  await rejected;
  assert.equal(disposed, 1);
  complete(1672, 941);
  await Promise.resolve();
  assert.equal(disposed, 1);
});

test("native decode failure disposes its temporary source without replacing the original", async () => {
  let disposed = 0;
  await assert.rejects(
    originalImageResource(
      {
        async readOriginal() {
          return new Uint8Array([1]);
        },
      },
      "original",
      () => true,
      () => ({
        uri: "file:///cache/original.png",
        dispose() {
          disposed++;
        },
      }),
      (_uri, _success, failure) => failure(new Error("decode failed")),
    ),
    /decode failed/,
  );
  assert.equal(disposed, 1);
});
