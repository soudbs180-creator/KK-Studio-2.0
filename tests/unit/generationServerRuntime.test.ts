import assert from "node:assert/strict";
import test from "node:test";
import { createServer, type Server } from "node:http";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GenerationRepository } from "../../src/features/generation-server/repository.ts";
import { PrivateAssetStore } from "../../src/features/generation-server/assets.ts";
import { createHostAdapter } from "../../src/features/generation-server/provider.ts";
import { PersistentGenerationWorker } from "../../src/features/generation-server/worker.ts";
import {
  createGenerationServer,
  tokenAuthenticator,
} from "../../src/features/generation-server/http.ts";
const png =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==";
async function listen(s: Server) {
  await new Promise<void>((resolve) => s.listen(0, "127.0.0.1", resolve));
  return "http://127.0.0.1:" + (s.address() as { port: number }).port;
}
async function close(s: Server) {
  await new Promise<void>((resolve) => s.close(() => resolve()));
}
async function setup() {
  let calls = 0;
  let release: () => void = () => {};
  let started: () => void = () => {};
  const seen = new Promise<void>((resolve) => {
    started = resolve;
  });
  const provider = createServer((req, res) => {
    void (async () => {
      let raw = "";
      for await (const chunk of req) raw += chunk;
      const input = JSON.parse(raw);
      calls++;
      assert.equal(
        req.headers.authorization,
        "Bearer sentinel-provider-credential",
      );
      if (input.model === "slow") {
        started();
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      }
      if (input.model === "network") {
        req.socket.destroy();
        return;
      }
      if (/^error/.test(input.model)) {
        const status = Number(input.model.slice(5));
        res.writeHead(status, {
          "Content-Type": "application/json",
          "Retry-After": "120",
        });
        res.end(
          JSON.stringify({
            error: { message: "do not persist sentinel-provider-credential" },
          }),
        );
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ data: [{ b64_json: png }] }));
    })();
  });
  const providerUrl = await listen(provider);
  const root = mkdtempSync(join(tmpdir(), "kk-runtime-"));
  const path = join(root, "ledger.sqlite");
  const r = new GenerationRepository(path);
  r.account("alice", 300, 4);
  r.account("bob", 300);
  r.register(
    {
      id: "own",
      provider: "OpenAI",
      kind: "user_byok",
      displayName: "Own API",
      baseUrl: providerUrl + "/v1",
      credentialRef: "vault-one",
      capabilities: {
        modalities: ["image"],
        operations: ["generate"],
        async: false,
      },
      state: "active",
      concurrencyLimit: 4,
    },
    { ownerId: "alice", unitPrice: 1, costLimit: 300 },
  );
  const assets = new PrivateAssetStore(join(root, "objects"));
  const worker = new PersistentGenerationWorker(r, assets, (c) =>
    createHostAdapter(c, async (ref) =>
      ref === "vault-two"
        ? "rotated-provider-credential"
        : "sentinel-provider-credential",
    ),
  );
  const gateway = createGenerationServer({
    repository: r,
    worker,
    assets,
    authenticate: tokenAuthenticator([
      { token: "alice-access", principal: { ownerId: "alice", admin: true } },
      { token: "bob-access", principal: { ownerId: "bob" } },
    ]),
    webhookSecret: async () => undefined,
  });
  const url = await listen(gateway);
  const request = (
    path: string,
    method = "GET",
    body?: unknown,
    owner = "alice",
  ) =>
    fetch(url + path, {
      method,
      headers: {
        Authorization: `Bearer ${owner}-access`,
        "Content-Type": "application/json",
        "Idempotency-Key":
          (body as { idempotencyKey?: string })?.idempotencyKey ?? "http-test",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const submit = async (model = "ok", n = 1, key = "batch") => {
    const response = await request("/v1/jobs", "POST", {
      connectionId: "own",
      idempotencyKey: key,
      model,
      prompt: "a scene",
      privacyMode: "byok_local",
      requestedOutputs: n,
    });
    assert.equal(response.status, 202);
    return response.json() as Promise<{ id: string }>;
  };
  return {
    r,
    worker,
    request,
    submit,
    path,
    seen,
    release: () => release(),
    calls: () => calls,
    cleanup: async () => {
      release();
      await worker.stop();
      await close(gateway);
      await close(provider);
      r.close();
    },
  };
}
for (const n of [1, 4, 20, 100])
  test(`real HTTP Gateway/Worker archives and privately serves ${n} outputs`, async () => {
    const s = await setup();
    try {
      const job = await s.submit("ok", n);
      assert.equal((await s.submit("ok", n)).id, job.id);
      while (s.r.publicJob("alice", job.id).status !== "succeeded") {
        await s.worker.runOnce();
        assert.ok(s.calls() <= n);
        const status = s.r.publicJob("alice", job.id).status;
        assert.ok(
          !["failed", "manual_review", "partial"].includes(status),
          status,
        );
      }
      const result = s.r.publicJob("alice", job.id);
      assert.equal(result.completedOutputs, n);
      assert.equal(s.calls(), n);
      const route = result.outputs[0].assetRoute!;
      assert.equal((await s.request(route)).status, 200);
      assert.equal(
        (await s.request(route, "GET", undefined, "bob")).status,
        404,
      );
      assert.equal(
        (await s.request("/v1/jobs/" + job.id, "GET", undefined, "bob")).status,
        404,
      );
      assert.equal(JSON.stringify(result).includes("provider"), false);
      s.r.db.exec("PRAGMA wal_checkpoint(FULL)");
      assert.equal(
        readFileSync(s.path).includes(
          Buffer.from("sentinel-provider-credential"),
        ),
        false,
      );
    } finally {
      await s.cleanup();
    }
  });
test("HTTP disconnect does not cancel a committed job; cancellation fences active provider results", async () => {
  const s = await setup();
  try {
    const j = await s.submit("slow");
    const running = s.worker.runOnce();
    await s.seen;
    const cancelled = await s.request("/v1/jobs/" + j.id + "/cancel", "POST");
    assert.equal(cancelled.status, 200);
    s.release();
    await running;
    assert.equal(s.r.publicJob("alice", j.id).status, "cancelled");
    assert.equal(
      s.r.db.prepare("SELECT COUNT(*) n FROM asset_owners").get()!.n,
      0,
    );
  } finally {
    await s.cleanup();
  }
});
for (const status of [401, 403, 429, 503])
  test(`HTTP ${status} reaches durable quarantine/cooldown/backoff`, async () => {
    const s = await setup();
    try {
      const j = await s.submit("error" + status);
      await s.worker.runOnce();
      const state = s.r.publicJob("alice", j.id).status;
      if (status === 401 || status === 403) {
        assert.equal(state, "quarantined");
        assert.equal(s.r.connection("own")?.state, "quarantined");
      } else if (status === 429) {
        assert.equal(state, "queued");
        assert.ok(s.r.connection("own")!.cooldown_until > Date.now() + 118000);
        await s.worker.runOnce();
        assert.equal(s.calls(), 1);
      } else {
        for (let i = 0; i < 4; i++) {
          s.r.db.prepare("UPDATE generation_outputs SET next_run=0").run();
          await s.worker.runOnce();
        }
        assert.equal(s.r.publicJob("alice", j.id).status, "dead_letter");
        assert.equal(s.calls(), 5);
      }
    } finally {
      await s.cleanup();
    }
  });
test("unknown submit transport failure retains reservation for manual reconciliation", async () => {
  const s = await setup();
  try {
    const j = await s.submit("network");
    await s.worker.runOnce();
    assert.equal(s.r.publicJob("alice", j.id).status, "manual_review");
    assert.equal(
      s.r.db.prepare("SELECT status FROM credit_reservations").get()!.status,
      "manual_review",
    );
    await s.worker.runOnce();
    assert.equal(s.calls(), 1);
  } finally {
    await s.cleanup();
  }
});
