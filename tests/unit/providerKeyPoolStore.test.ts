import assert from "node:assert/strict";
import test from "node:test";
import { createProviderKeyPool } from "../../src/features/ai-gateway/providerKeyPool.ts";
import {
  readProviderKeyPool,
  removeProviderKeyPool,
  upsertProviderKeyPool,
} from "../../src/features/ai-gateway/providerKeyPoolStore.ts";

function memoryStorage(seed: Record<string, string> = {}) {
  const data = { ...seed };
  return {
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
    dump: () => data,
  };
}

test("key pools persist credential refs only and round-trip by connection", () => {
  const storage = memoryStorage();
  const pool = createProviderKeyPool({
    connectionId: "conn-relay-1",
    credentialRefs: ["ref-one", "ref-two"],
  });
  assert.equal(upsertProviderKeyPool(pool, storage), true);
  assert.deepEqual(readProviderKeyPool("conn-relay-1", storage)?.keys.length, 2);
  assert.equal(removeProviderKeyPool("conn-relay-1", storage), true);
  assert.equal(readProviderKeyPool("conn-relay-1", storage), null);
  assert.doesNotMatch(JSON.stringify(storage.dump()), /sk-|api_key/i);
});
