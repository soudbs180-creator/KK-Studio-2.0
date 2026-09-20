import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "node:crypto";
import { GenerationRepository } from "../../src/features/generation-server/repository.ts";
import { receiveWebhook } from "../../src/features/generation-server/webhook.ts";
const secret = "test-signature-secret-long-enough";
function setup() {
  const r = new GenerationRepository(":memory:");
  r.account("a", 20);
  r.register(
    {
      id: "c",
      provider: "ComfyUI",
      kind: "local_comfyui",
      displayName: "local",
      baseUrl: "http://127.0.0.1:8188",
      capabilities: {
        modalities: ["image"],
        operations: ["generate"],
        async: true,
      },
      state: "active",
      concurrencyLimit: 1,
    },
    { ownerId: "a", unitPrice: 1, costLimit: 20 },
  );
  const j = r.submit("a", {
    connectionId: "c",
    idempotencyKey: "x",
    model: "test",
    prompt: "test",
    privacyMode: "local_only",
    requestedOutputs: 1,
    workflow: { a: 1 },
  });
  const c = r.claim("w", 0)!;
  return { r, j, c };
}
function send(
  r: GenerationRepository,
  jobId: string,
  sequence: number,
  extra: Record<string, unknown> = {},
  delivery = "delivery-" + sequence,
) {
  const raw = Buffer.from(
    JSON.stringify({
      eventId: "event-" + sequence,
      jobId,
      outputIndex: 0,
      generation: 1,
      providerJobId: "pid",
      idempotencyKey: jobId + ":0:1",
      sequence,
      status: "succeeded",
      ...extra,
    }),
  );
  const signature = createHmac("sha256", secret)
    .update("1000.")
    .update(raw)
    .digest("hex");
  return receiveWebhook(
    r,
    "c",
    delivery,
    "1000",
    signature,
    raw,
    secret,
    1000000,
  );
}
test("webhook signature binds timestamp/raw body and rejects replay outside window", () => {
  const { r } = setup();
  try {
    assert.throws(
      () =>
        receiveWebhook(
          r,
          "c",
          "d",
          "0",
          "0".repeat(64),
          Buffer.from("{}"),
          secret,
          1000000,
        ),
      /WEBHOOK_TIMESTAMP/,
    );
    assert.throws(
      () =>
        receiveWebhook(
          r,
          "c",
          "d",
          "1000",
          "0".repeat(64),
          Buffer.from("{}"),
          secret,
          1000000,
        ),
      /WEBHOOK_SIGNATURE/,
    );
  } finally {
    r.close();
  }
});
test("signed duplicates, changed delivery bodies, out-of-order events and cancellation are fenced", () => {
  const { r, j, c } = setup();
  try {
    r.waiting(c, "pid", 0, 6000000);
    assert.equal(send(r, j.id, 2), "processed");
    assert.equal(send(r, j.id, 2), "duplicate");
    assert.equal(send(r, j.id, 2, {}, "new-delivery"), "duplicate");
    assert.throws(
      () => send(r, j.id, 2, { status: "running" }),
      /WEBHOOK_CONFLICT/,
    );
    assert.equal(send(r, j.id, 1), "stale");
    assert.equal(r.output(j.id, 0)?.webhook_sequence, 2);
    assert.equal(r.publicJob("a", j.id).completedOutputs, 0);
    r.cancel("a", j.id);
    assert.equal(send(r, j.id, 3), "stale");
    assert.equal(r.publicJob("a", j.id).status, "cancelled");
  } finally {
    r.close();
  }
});
test("webhook arriving before provider id is stored remains durable and wakes a later poll", () => {
  const { r, j, c } = setup();
  try {
    assert.equal(send(r, j.id, 1), "pending");
    r.waiting(c, "pid", 0, 6000000);
    r.applyWebhooks(1000000);
    assert.equal(r.output(j.id, 0)?.next_run, 1000000);
    assert.equal(
      r.db.prepare("SELECT state FROM webhook_deliveries").get()!.state,
      "processed",
    );
  } finally {
    r.close();
  }
});
