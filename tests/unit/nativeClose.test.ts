import assert from "node:assert/strict";
import test from "node:test";
import {
  createNativeCloseHandler,
  flushCreationBeforeClose,
} from "../../src/features/creation/nativeClose.ts";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test("native close is prevented synchronously until durable save resolves", async () => {
  const saved = deferred();
  const calls: string[] = [];
  const handler = createNativeCloseHandler({
    flush: () => saved.promise,
    destroy: async () => {
      calls.push("destroy");
    },
    active: () => true,
    report: () => assert.fail("unexpected failure"),
  });
  const closing = handler({ preventDefault: () => calls.push("prevent") });
  assert.deepEqual(calls, ["prevent"]);
  await Promise.resolve();
  assert.deepEqual(calls, ["prevent"]);
  saved.resolve();
  await closing;
  assert.deepEqual(calls, ["prevent", "destroy"]);
});

test("duplicate native close events cannot bypass the same pending save", async () => {
  const saved = deferred();
  let saves = 0,
    closes = 0,
    prevented = 0;
  const handler = createNativeCloseHandler({
    flush: async () => {
      saves++;
      await saved.promise;
    },
    destroy: async () => {
      closes++;
    },
    active: () => true,
    report: () => assert.fail("unexpected failure"),
  });
  const event = {
    preventDefault: () => {
      prevented++;
    },
  };
  const first = handler(event);
  await handler(event);
  assert.equal(prevented, 2);
  assert.equal(saves, 1);
  assert.equal(closes, 0);
  saved.resolve();
  await first;
  assert.equal(closes, 1);
});

test("failed save keeps the window open and a later successful retry may close", async () => {
  const failure = new Error("disk full");
  let fail = true,
    closed = 0;
  const reported: unknown[] = [];
  const handler = createNativeCloseHandler({
    flush: async () => {
      if (fail) throw failure;
    },
    destroy: async () => {
      closed++;
    },
    active: () => true,
    report: (error) => reported.push(error),
  });
  await handler({ preventDefault() {} });
  assert.equal(closed, 0);
  assert.deepEqual(reported, [failure]);
  fail = false;
  await handler({ preventDefault() {} });
  assert.equal(closed, 1);
});

test("disposed native listener cannot close or report against an unmounted owner", async () => {
  const saved = deferred();
  let active = true,
    closed = 0;
  const handler = createNativeCloseHandler({
    flush: () => saved.promise,
    destroy: async () => {
      closed++;
    },
    active: () => active,
    report: () => assert.fail("stale error"),
  });
  const closing = handler({ preventDefault() {} });
  active = false;
  saved.resolve();
  await closing;
  await handler({ preventDefault() {} });
  assert.equal(closed, 0);
});

test("close drains edits arriving while a preceding revision is being saved", async () => {
  const reading = deferred(),
    writing = deferred();
  let dirty = true;
  const revisions: number[] = [];
  let latest = 2;
  const saving = flushCreationBeforeClose({
    waitForRead: () => reading.promise,
    canWrite: () => true,
    hasChanges: () => dirty,
    flush: async () => {
      const revision = latest;
      revisions.push(revision);
      if (revision === 2) await writing.promise;
      dirty = latest > revision;
    },
  });
  assert.deepEqual(revisions, []);
  reading.resolve();
  await Promise.resolve();
  latest = 3;
  writing.resolve();
  await saving;
  assert.deepEqual(revisions, [2, 3]);
  assert.equal(dirty, false);
});

test("protected read with a dirty draft rejects close without issuing any write", async () => {
  let writes = 0;
  await assert.rejects(
    flushCreationBeforeClose({
      waitForRead: async () => {},
      canWrite: () => false,
      hasChanges: () => true,
      flush: async () => {
        writes++;
      },
    }),
    /尚未保存/,
  );
  assert.equal(writes, 0);
  await flushCreationBeforeClose({
    waitForRead: async () => {},
    canWrite: () => false,
    hasChanges: () => false,
    flush: async () => {
      writes++;
    },
  });
  assert.equal(writes, 0);
});

test("native destroy failure is reported without escaping an async event callback", async () => {
  const failure = new Error("window command denied");
  const errors: unknown[] = [];
  const handler = createNativeCloseHandler({
    flush: async () => {},
    destroy: async () => {
      throw failure;
    },
    active: () => true,
    report: (error) => errors.push(error),
  });
  await handler({ preventDefault() {} });
  assert.deepEqual(errors, [failure]);
});
