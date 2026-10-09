import assert from "node:assert/strict";
import test from "node:test";
import {
  assertCredentialRef,
  LayeredCredentialStore,
  looksLikeSecret,
  MemoryCredentialStore,
  ProtectedCredentialStore,
  type CiphertextStoragePort,
  type SecretProtector,
} from "../../src/features/ai-gateway/credentials.ts";

test("a bare secret is rejected before the format check runs", () => {
  // Order matters: reporting only "malformed reference" would hide the real
  // problem, which is that a key was written where a reference belongs.
  assert.throws(
    () => assertCredentialRef("sk-abcdefghijklmnopqrstuvwxyz"),
    /CREDENTIAL_REF_IS_SECRET/,
  );
  assert.throws(
    () => assertCredentialRef("abcdefghijklmnopqrstuvwxyz0123456789abcd"),
    /CREDENTIAL_REF_IS_SECRET/,
  );
  assert.equal(assertCredentialRef("  conn.primary  "), "conn.primary");
});

test("secret detection covers the common provider prefixes", () => {
  for (const value of [
    "Bearer sk-abcdefghijklmnopqrstuvwxyz",
    "AIzaSyA1234567890abcdefghijklmnopqrstuvw",
    "ghp_abcdefghijklmnopqrstuvwxyz0123456789",
    "AKIAIOSFODNN7EXAMPLE",
  ])
    assert.ok(looksLikeSecret(value), `${value} should read as a secret`);
  assert.equal(looksLikeSecret("conn.primary"), false);
  assert.equal(looksLikeSecret("short"), false);
});

test("malformed references are rejected with their own error code", () => {
  assert.throws(() => assertCredentialRef(""), /CREDENTIAL_REF_REQUIRED/);
  assert.throws(() => assertCredentialRef("has space"), /CREDENTIAL_REF_MALFORMED/);
  assert.throws(() => assertCredentialRef("bad!chars$here"), /CREDENTIAL_REF_MALFORMED/);
  // A 200-character unpunctuated run is key material, so the secret check wins
  // over the length check; reporting "malformed" would hide the real mistake.
  assert.throws(() => assertCredentialRef("x".repeat(200)), /CREDENTIAL_REF_IS_SECRET/);
  assert.throws(
    () => assertCredentialRef(`conn.${"y".repeat(200)}`),
    /CREDENTIAL_REF_MALFORMED/,
  );
});

test("memory store round-trips and lists in sorted order", async () => {
  const store = new MemoryCredentialStore({ "b.two": "2", "a.one": "1" });
  assert.equal(await store.read("a.one"), "1");
  assert.deepEqual(await store.list(), ["a.one", "b.two"]);
  assert.equal(await store.delete("a.one"), true);
  assert.equal(await store.delete("a.one"), false);
  assert.equal(await store.read("a.one"), undefined);
});

/** Reversible stand-in so the round-trip is real without pulling in node:crypto. */
function xorProtector(): SecretProtector {
  return {
    async protect(plaintext: string): Promise<Uint8Array> {
      const bytes = Buffer.from(plaintext, "utf8");
      const mask = 0x5a;
      return Uint8Array.from(bytes.map((byte) => byte ^ mask)).reverse();
    },
    async unprotect(ciphertext: Uint8Array): Promise<string> {
      return Buffer.from([...ciphertext].reverse().map((byte) => byte ^ 0x5a)).toString(
        "utf8",
      );
    },
  };
}

function memoryBlobs(): CiphertextStoragePort & { blobs: Map<string, Uint8Array> } {
  const blobs = new Map<string, Uint8Array>();
  return {
    blobs,
    async read(ref) {
      return blobs.get(ref);
    },
    async write(ref, ciphertext) {
      // Copy so a later mutation of the caller's buffer cannot rewrite history.
      blobs.set(ref, new Uint8Array(ciphertext));
    },
    async delete(ref) {
      return blobs.delete(ref);
    },
    async list() {
      return [...blobs.keys()];
    },
  };
}

test("protected store keeps plaintext out of storage", async () => {
  const storage = memoryBlobs();
  const store = new ProtectedCredentialStore(xorProtector(), storage);
  await store.write("conn.primary", "super-secret-value");
  const blob = storage.blobs.get("conn.primary")!;
  // A reversible-but-echoing fake would make this assertion meaningless.
  assert.equal(Buffer.from(blob).toString("utf8").includes("super-secret-value"), false);
  assert.equal(await store.read("conn.primary"), "super-secret-value");
  assert.equal(await store.read("conn.missing"), undefined);
});

test("protected store refuses to key a vault entry by a secret", async () => {
  const store = new ProtectedCredentialStore(xorProtector(), memoryBlobs());
  await assert.rejects(
    () => store.write("sk-abcdefghijklmnopqrstuvwxyz", "value"),
    /CREDENTIAL_REF_IS_SECRET/,
  );
});

test("layered store prefers the durable side so rotation takes effect", async () => {
  const durable = new MemoryCredentialStore({ "conn.a": "durable" });
  const legacy = new MemoryCredentialStore({ "conn.a": "stale", "conn.b": "only-legacy" });
  const layered = new LayeredCredentialStore(durable, legacy);
  assert.equal(await layered.read("conn.a"), "durable");
  assert.equal(await layered.read("conn.b"), "only-legacy");
  assert.deepEqual(await layered.list(), ["conn.a", "conn.b"]);
  // A write must be visible without a restart even though the read was cached.
  await layered.write("conn.a", "rotated");
  assert.equal(await layered.read("conn.a"), "rotated");
  // Delete must clear BOTH layers. Short-circuiting on the first `true` would
  // leave a stale copy behind for the next read to resurrect.
  assert.equal(await layered.delete("conn.a"), true);
  assert.equal(await layered.read("conn.a"), undefined);
  assert.deepEqual(await layered.list(), ["conn.b"]);
});

test("every store rejects secret-shaped references on read", async () => {
  const secretish = "sk-abcdefghijklmnopqrstuvwxyz";
  for (const store of [
    new MemoryCredentialStore(),
    new ProtectedCredentialStore(xorProtector(), memoryBlobs()),
    new LayeredCredentialStore(new MemoryCredentialStore(), new MemoryCredentialStore()),
  ]) {
    await assert.rejects(() => store.read(secretish), /CREDENTIAL_REF_IS_SECRET/);
  }
});
