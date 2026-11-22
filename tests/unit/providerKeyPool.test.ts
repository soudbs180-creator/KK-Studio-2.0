import assert from "node:assert/strict";
import test from "node:test";
import {
  createProviderKeyPool,
  pickPoolCredential,
  recordPoolFailure,
  recordPoolSuccess,
} from "../../src/features/ai-gateway/providerKeyPool.ts";

test("key pool sticks to one credential per session until failure", () => {
  let pool = createProviderKeyPool({
    connectionId: "conn-1",
    credentialRefs: ["ref-a", "ref-b"],
  });
  const first = pickPoolCredential(pool, { nowMs: 1000, sessionId: "s1" });
  assert.ok(first);
  assert.equal(first?.key.credentialRef, "ref-a");
  pool = first!.pool;
  const again = pickPoolCredential(pool, { nowMs: 1001, sessionId: "s1" });
  assert.equal(again?.key.keyId, first?.key.keyId);

  pool = recordPoolFailure(pool, first!.key.keyId, {
    nowMs: 1002,
    cooldownMs: 60_000,
    sessionId: "s1",
  });
  const failover = pickPoolCredential(pool, { nowMs: 1003, sessionId: "s1" });
  assert.equal(failover?.key.credentialRef, "ref-b");
  pool = recordPoolSuccess(failover!.pool, failover!.key.keyId);
  assert.equal(
    pool.keys.find((key) => key.keyId === failover!.key.keyId)?.consecutiveFailures,
    0,
  );
});
