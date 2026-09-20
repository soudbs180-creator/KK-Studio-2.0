import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GenerationRepository } from "../../src/features/generation-server/repository.ts";
import type { ProviderConnection } from "../../src/domain/providerConnections.ts";
const connection: ProviderConnection = {
  id: "byok",
  provider: "OpenAI",
  kind: "user_byok",
  displayName: "Own API",
  baseUrl: "https://api.openai.com/v1",
  credentialRef: "own-key",
  capabilities: {
    modalities: ["image"],
    operations: ["generate"],
    maxOutputs: 1,
    async: false,
  },
  state: "active",
  concurrencyLimit: 2,
};
function setup(path = ":memory:") {
  const r = new GenerationRepository(path);
  r.account("alice", 200, 2);
  r.account("bob", 200);
  r.register(connection, { ownerId: "alice", unitPrice: 1, costLimit: 200 });
  return r;
}
const input = (idempotencyKey = "one", requestedOutputs = 1) => ({
  connectionId: "byok",
  idempotencyKey,
  model: "test",
  prompt: "a landscape",
  privacyMode: "byok_local",
  requestedOutputs,
});
const asset = {
  assetId: "asset-" + "a".repeat(64),
  sha256: "a".repeat(64),
  mime: "image/png",
  size: 68,
};

test("semantic idempotency canonicalizes workflow key ordering and never reserves twice", () => {
  const r = setup();
  try {
    const a = r.submit("alice", { ...input(), workflow: { a: 1, b: 2 } });
    const b = r.submit("alice", { ...input(), workflow: { b: 2, a: 1 } });
    assert.equal(a.id, b.id);
    assert.equal(
      r.db.prepare("SELECT COUNT(*) n FROM credit_reservations").get()!.n,
      1,
    );
    assert.throws(
      () => r.submit("alice", { ...input(), prompt: "different" }),
      /IDEMPOTENCY_CONFLICT/,
    );
  } finally {
    r.close();
  }
});
test("poll retries keep their durable provider identity and occupy concurrency", () => {
  const r = setup();
  try {
    r.submit("alice", input("batch", 4));
    const a = r.claim("w", 0)!;
    const b = r.claim("w", 0)!;
    r.waiting(a, "p1", 0, 0);
    r.waiting(b, "p2", 0, 0);
    const p = r.claim("w", 0)!;
    r.fail(p, "network", { retryable: true }, 0);
    assert.equal(
      r.output(p.job.id, p.output.output_index)?.status,
      "waiting_provider",
    );
    assert.equal(r.claim("w", 1)?.operation, "poll");
  } finally {
    r.close();
  }
});
for (const n of [1, 4, 20, 100])
  test(`SQLite accounts for ${n} outputs including identical image bytes`, () => {
    const r = setup();
    try {
      const j = r.submit("alice", input("batch", n));
      for (let i = 0; i < n; i++) {
        const c = r.claim("w")!;
        assert.ok(c);
        assert.equal(r.complete(c, asset), true);
      }
      assert.equal(r.publicJob("alice", j.id).completedOutputs, n);
      assert.equal(
        r.db
          .prepare("SELECT balance FROM credit_accounts WHERE owner_id=?")
          .get("alice")!.balance,
        200 - n,
      );
    } finally {
      r.close();
    }
  });
test("restart preserves held credits, resumes known jobs, and fences unknown submission", () => {
  const path = join(mkdtempSync(join(tmpdir(), "kk-worker-")), "ledger.sqlite");
  let r = setup(path);
  const job = r.submit("alice", input("restart", 4));
  const a = r.claim("one", 0, 10)!;
  const b = r.claim("one", 0, 10)!;
  r.waiting(a, "provider-1", 0, 0);
  r.close();
  r = setup(path);
  try {
    r.recover(11);
    assert.equal(r.output(job.id, 1)?.status, "manual_review");
    const resumed = r.claim("two", 11)!;
    assert.equal(resumed.operation, "poll");
    assert.equal(resumed.output.provider_job_id, "provider-1");
    assert.equal(r.complete(b, asset, 12), false);
    assert.equal(
      r.db
        .prepare("SELECT balance FROM credit_accounts WHERE owner_id=?")
        .get("alice")!.balance,
      200,
    );
    assert.throws(
      () => r.submit("alice", input("too-many", 100), 12),
      /CONCURRENCY_LIMIT/,
    );
  } finally {
    r.close();
  }
});
test("cancel while provider is in flight discards results and retains uncertain bill for review", () => {
  const r = setup();
  try {
    const job = r.submit("alice", input("cancel", 4));
    const c = r.claim("w")!;
    r.cancel("alice", job.id);
    assert.equal(r.complete(c, asset), false);
    assert.equal(r.publicJob("alice", job.id).status, "cancelled");
    assert.equal(
      r.db.prepare("SELECT COUNT(*) n FROM asset_owners").get()!.n,
      0,
    );
    assert.equal(
      r.db
        .prepare(
          "SELECT COUNT(*) n FROM credit_reservations WHERE status='released'",
        )
        .get()!.n,
      3,
    );
    assert.equal(
      r.db
        .prepare(
          "SELECT COUNT(*) n FROM credit_reservations WHERE status='manual_review'",
        )
        .get()!.n,
      1,
    );
  } finally {
    r.close();
  }
});
test("partial single-output retry charges only its new successful slot", () => {
  const r = setup();
  try {
    const j = r.submit("alice", input("partial", 4));
    for (let i = 0; i < 4; i++) {
      const c = r.claim("w")!;
      if (i === 0) r.complete(c, asset);
      else r.fail(c, "invalid_request");
    }
    assert.equal(r.publicJob("alice", j.id).status, "partial");
    r.retry("alice", j.id, [2]);
    r.complete(r.claim("w")!, asset);
    assert.equal(r.publicJob("alice", j.id).completedOutputs, 2);
    assert.equal(
      r.db
        .prepare("SELECT balance FROM credit_accounts WHERE owner_id=?")
        .get("alice")!.balance,
      198,
    );
  } finally {
    r.close();
  }
});
test("preflight rejects privacy, ACL, secrets, credit exhaustion and global fuse", () => {
  const r = setup();
  try {
    assert.throws(() => r.submit("bob", input()), /CONNECTION_FORBIDDEN/);
    assert.throws(
      () => r.submit("alice", { ...input(), privacyMode: "platform_backed" }),
      /PLATFORM_BACKED_DISABLED/,
    );
    assert.throws(
      () =>
        r.submit("alice", {
          ...input(),
          workflow: { headers: { Authorization: "secret" } },
        }),
      /SECRET_IN_INPUT/,
    );
    r.submit("alice", input("reserve1", 100));
    r.submit("alice", input("reserve2", 100));
    assert.throws(
      () => r.submit("alice", input("over")),
      /INSUFFICIENT_CREDITS/,
    );
    r.controls({ circuitOpen: true });
    assert.equal(r.claim("w"), null);
  } finally {
    r.close();
  }
});
test("poll quarantine preserves accepted-job credit until review and fences other in-flight slots", () => {
  const r = setup();
  try {
    const j = r.submit("alice", input("poll-quarantine", 4));
    const a = r.claim("w", 0)!;
    const b = r.claim("w", 0)!;
    r.waiting(a, "p1", 0, 0);
    const poll = r.claim("w", 0)!;
    r.fail(poll, "unauthorized", { status: 401 }, 0);
    assert.equal(
      r.db
        .prepare("SELECT status FROM credit_reservations WHERE id=?")
        .get(a.output.reservation_id)!.status,
      "manual_review",
    );
    assert.equal(r.complete(b, asset), false);
    r.controls({ connectionId: "byok", state: "active" });
    assert.throws(() => r.retry("alice", j.id, [0]), /OUTPUT_REQUIRES_REVIEW/);
    r.review(a.output.reservation_id, 1);
    r.retry("alice", j.id, [0]);
    assert.equal(
      r.db
        .prepare("SELECT balance FROM credit_accounts WHERE owner_id=?")
        .get("alice")!.balance,
      199,
    );
  } finally {
    r.close();
  }
});
test("administrator rotation, disable, budget and platform controls persist and affect claims", () => {
  const r = setup();
  try {
    const j = r.submit("alice", input());
    r.controls({ connectionId: "byok", state: "disabled" });
    assert.equal(r.claim("w"), null);
    r.controls({
      connectionId: "byok",
      state: "active",
      credentialRef: "rotated-ref",
      costLimit: 0,
    });
    assert.equal(r.claim("w"), null);
    r.controls({ connectionId: "byok", costLimit: 10 });
    const c = r.claim("w")!;
    assert.equal(c.credentialRef, "rotated-ref");
    r.waiting(c, "known", 0, 0);
    r.controls({ circuitOpen: true });
    assert.equal(r.claim("w", 1)?.operation, "poll");
    assert.equal(r.publicJob("alice", j.id).completedOutputs, 0);
  } finally {
    r.close();
  }
});
test("managed API is opt-in and closing platform_backed blocks new submissions", () => {
  const r = new GenerationRepository(":memory:", "managed");
  try {
    r.account("alice", 10);
    r.register(
      { ...connection, id: "managed", kind: "managed_api" },
      { allowedOwners: ["alice"], unitPrice: 1, costLimit: 10 },
    );
    const data = {
      ...input(),
      connectionId: "managed",
      privacyMode: "platform_backed",
    };
    assert.throws(() => r.submit("alice", data), /PLATFORM_BACKED_DISABLED/);
    r.controls({ platformEnabled: true });
    r.submit("alice", data);
    r.controls({ platformEnabled: false });
    assert.equal(r.claim("w"), null);
    assert.throws(
      () => r.submit("alice", { ...data, idempotencyKey: "next" }),
      /PLATFORM_BACKED_DISABLED/,
    );
  } finally {
    r.close();
  }
});
test("all connections in cooldown fail closed without account hopping", () => {
  const r = setup();
  try {
    r.db
      .prepare(
        "UPDATE gateway_connections SET state='cooldown',cooldown_until=9999999999999",
      )
      .run();
    assert.throws(
      () => r.submit("alice", input("cooldown")),
      /ALL_CONNECTIONS_COOLDOWN/,
    );
    assert.equal(r.claim("w", Date.now()), null);
  } finally {
    r.close();
  }
});
