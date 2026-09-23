import assert from "node:assert/strict";
import test from "node:test";
import { createRuntimeDrain } from "../../scripts/agent/runtimeDrain.ts";

test("shutdown is atomic with incoming work and rejects active or unacknowledged work", () => {
  let busy = false;
  const drain = createRuntimeDrain(() => busy);
  const release = drain.enter();
  assert.ok(release);
  assert.equal(drain.shutdown(), false);
  release();
  release();
  busy = true;
  assert.equal(drain.shutdown(), false);
  busy = false;
  const closeRead = drain.enter(false);
  assert.ok(closeRead);
  assert.equal(drain.shutdown(), true);
  closeRead();
  assert.equal(drain.enter(), null);
  assert.equal(drain.enter(false), null);
  assert.equal(drain.shutdown(), true);
});
