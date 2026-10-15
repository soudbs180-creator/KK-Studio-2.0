import assert from "node:assert/strict";
import test from "node:test";
import type { ProviderConnection } from "../../src/domain/providerConnections.ts";
import {
  TwelveAiTaskAdapter,
  TwelveAiTaskError,
  type TwelveAiGenerationRequest,
  type TwelveAiSubmissionReceipt,
} from "../../src/integrations/generation/twelveAiTaskAdapter.ts";
import { buildTwelveAiTaskBody } from "../../src/integrations/generation/twelveAiTaskProtocol.ts";

const connection: ProviderConnection = {
  id: "relay",
  provider: "relay",
  kind: "user_byok",
  displayName: "Relay",
  baseUrl: "https://cdn.12ai.org/v1",
  credentialRef: "vault-ref",
  state: "active",
  concurrencyLimit: 1,
  capabilities: {
    modalities: ["image", "video"],
    operations: ["generate", "edit"],
    async: true,
  },
};
const image = "data:image/png;base64,aGVsbG8=";
const request = (): TwelveAiGenerationRequest => ({
  model: "gpt-image-2",
  prompt: "Keep quality high and use 4K",
  attachments: [],
  requestedOutputs: 1,
  idempotencyKey: "intent-two",
  signal: new AbortController().signal,
});
const queued = () =>
  new Response(JSON.stringify({ id: "task_two", status: "queued" }));

test("12AI malformed acceptance preserves a safe returned task ID for recovery without resubmitting", async () => {
  let calls = 0;
  const adapter = new TwelveAiTaskAdapter(connection, {
    resolveCredential: async () => "secret",
    fetch: async () => {
      calls++;
      return new Response(
        JSON.stringify({ id: "task_two", status: "unrecognized" }),
      );
    },
  });
  await assert.rejects(adapter.submit(request()), (error: unknown) => {
    assert.ok(error instanceof TwelveAiTaskError);
    assert.equal(error.uncertain, true);
    assert.equal(error.providerJobId, "task_two");
    return true;
  });
  assert.deepEqual(adapter.submissionReceipt("intent-two"), {
    idempotencyKey: "intent-two",
    acceptance: "unknown",
    providerJobId: "task_two",
  });
  const restored = new TwelveAiTaskAdapter(connection, {
    resolveCredential: async () => "secret",
    fetch: async () => {
      calls++;
      return queued();
    },
    submissionReceipts: [adapter.submissionReceipt("intent-two")!],
  });
  await assert.rejects(restored.submit(request()));
  assert.equal(calls, 1);
});

test("12AI persists opaque intent before POST and accepted receipt before returning", async () => {
  const receipts: TwelveAiSubmissionReceipt[] = [];
  const adapter = new TwelveAiTaskAdapter(connection, {
    resolveCredential: async () => "secret",
    persistSubmissionReceipt: async (receipt) => {
      receipts.push(receipt);
    },
    fetch: async () => {
      assert.deepEqual(receipts, [
        { idempotencyKey: "intent-two", acceptance: "unknown" },
      ]);
      return queued();
    },
  });
  await adapter.submit(request());
  assert.deepEqual(receipts[1], {
    idempotencyKey: "intent-two",
    acceptance: "accepted",
    providerJobId: "task_two",
  });
});

test("12AI receipt persistence failure prevents POST or preserves already accepted task identity", async () => {
  for (const failAt of ["unknown", "accepted"] as const) {
    let calls = 0;
    const adapter = new TwelveAiTaskAdapter(connection, {
      resolveCredential: async () => "secret",
      persistSubmissionReceipt: async (receipt) => {
        if (receipt.acceptance === failAt) throw new Error("secret");
      },
      fetch: async () => {
        calls++;
        return queued();
      },
    });
    await assert.rejects(adapter.submit(request()), (error: unknown) => {
      assert.ok(error instanceof TwelveAiTaskError);
      assert.equal(error.reason, "receipt_persistence_failed");
      assert.equal(error.uncertain, failAt === "accepted");
      assert.equal(
        error.providerJobId,
        failAt === "accepted" ? "task_two" : undefined,
      );
      assert.equal(error.message.includes("secret"), false);
      return true;
    });
    assert.equal(calls, failAt === "accepted" ? 1 : 0);
  }
});

test("12AI abort while reading a poll response stops local polling without claiming cancellation", async () => {
  const controller = new AbortController();
  const adapter = new TwelveAiTaskAdapter(connection, {
    resolveCredential: async () => "secret",
    fetch: async () =>
      new Response(
        new ReadableStream({
          pull(stream) {
            controller.abort();
            stream.error(new Error("secret"));
          },
        }),
      ),
  });
  await assert.rejects(
    adapter.getTask("task_two", controller.signal),
    (error: unknown) => {
      assert.ok(error instanceof TwelveAiTaskError);
      assert.equal(error.failureClass, "cancelled");
      assert.equal(error.reason, "polling_stopped");
      assert.equal(error.uncertain, false);
      return true;
    },
  );
});

test("12AI rejects empty, control-containing and oversized credentials without network", async () => {
  let calls = 0;
  for (const secret of [
    "",
    " ",
    "has\u0000control",
    "key\tvalue",
    "x".repeat(8193),
    5,
  ]) {
    const adapter = new TwelveAiTaskAdapter(connection, {
      resolveCredential: async () => secret as string,
      fetch: async () => {
        calls++;
        return queued();
      },
    });
    await assert.rejects(adapter.submit(request()), (error: unknown) => {
      assert.ok(error instanceof TwelveAiTaskError);
      assert.equal(error.failureClass, "unauthorized");
      assert.equal(error.uncertain, false);
      return true;
    });
  }
  assert.equal(calls, 0);
});

test("12AI accepted receipts recover task identity without any new network submission", async () => {
  const adapter = new TwelveAiTaskAdapter(connection, {
    submissionReceipts: [
      {
        idempotencyKey: "intent-two",
        acceptance: "accepted",
        providerJobId: "task_two",
      },
    ],
    fetch: async () => {
      throw new Error("must not send");
    },
    resolveCredential: async () => {
      throw new Error("must not read");
    },
  });
  assert.deepEqual(await adapter.submit(request()), {
    providerJobId: "task_two",
    async: true,
    status: "queued",
  });
});

test("12AI uses only explicit image parameters across documented model families", () => {
  for (const model of [
    "gpt-image-2",
    "gpt-image-2.5-flare",
    "gpt-image-2.5-sunburst",
    "gemini-2.5-flash-image",
    "gemini-3-pro-image-preview",
    "gemini-3.1-flash-image-preview",
  ]) {
    assert.deepEqual(
      buildTwelveAiTaskBody({ ...request(), model, images: [] }),
      {
        model,
        input: { prompt: request().prompt, n: 1 },
      },
    );
  }
  for (const size of ["auto", "1024x1024", "1536x1024", "3840x2160"]) {
    assert.equal(
      buildTwelveAiTaskBody({
        ...request(),
        images: [],
        media: { kind: "image", size },
      }).input.size,
      size,
    );
  }
  for (const size of [
    "100x100",
    "3840x3840",
    "1025x1024",
    "3072x512",
    "1024*1024",
  ]) {
    assert.throws(() =>
      buildTwelveAiTaskBody({
        ...request(),
        images: [],
        media: { kind: "image", size },
      }),
    );
  }
});

test("12AI Veo frame pairs remain explicit and cannot mix unsupported reference modes", () => {
  assert.deepEqual(
    buildTwelveAiTaskBody({
      ...request(),
      model: "veo-3.1-fast-generate-preview",
      images: [],
      media: {
        kind: "video",
        duration: 6,
        aspectRatio: "16:9",
        resolution: "720p",
        startFrame: image,
        endFrame: image,
      },
    }).input,
    {
      prompt: request().prompt,
      n: 1,
      duration: 6,
      aspect_ratio: "16:9",
      resolution: "720p",
      start_frames: [image],
      end_frames: [image],
    },
  );
  for (const media of [
    { kind: "video", duration: 5, aspectRatio: "16:9", resolution: "720p" },
    { kind: "video", duration: 6, aspectRatio: "1:1", resolution: "720p" },
    { kind: "video", duration: 6, aspectRatio: "16:9", resolution: "4k" },
    {
      kind: "video",
      duration: 6,
      aspectRatio: "16:9",
      resolution: "720p",
      startFrame: image,
      endFrame: image,
      imageReferences: [image],
    },
  ])
    assert.throws(() =>
      buildTwelveAiTaskBody({
        ...request(),
        model: "veo-3.1-generate-preview",
        images: [],
        media: media as never,
      }),
    );
});

test("12AI has bounded aggregate reference payloads and rejects invalid base64", () => {
  const reference = `data:image/png;base64,${"AAAA".repeat(3_000_000)}`;
  assert.throws(() =>
    buildTwelveAiTaskBody({
      ...request(),
      images: [reference, reference, reference],
    }),
  );
  for (const reference of [
    "data:image/png;base64,",
    "data:image/png;base64,A",
    "data:image/png;base64,!!!!",
    "data:text/plain;base64,aGVsbG8=",
  ]) {
    assert.throws(() =>
      buildTwelveAiTaskBody({ ...request(), images: [reference] }),
    );
  }
});

test("12AI never returns the active credential through malicious task IDs or output URLs", async () => {
  for (const payload of [
    { id: "task_secret-value", status: "queued" },
    {
      id: "task_two",
      status: "completed",
      outputs: ["https://img.12ai.org/output?key=secret-value"],
    },
  ]) {
    const adapter = new TwelveAiTaskAdapter(connection, {
      resolveCredential: async () => "secret-value",
      fetch: async () => new Response(JSON.stringify(payload)),
    });
    await assert.rejects(adapter.getTask("task_two"), (error: unknown) => {
      assert.ok(error instanceof TwelveAiTaskError);
      assert.equal(JSON.stringify(error).includes("secret-value"), false);
      return true;
    });
  }
});

test("12AI unknown configured models advertise no enabled media capability", async () => {
  const adapter = new TwelveAiTaskAdapter({
    ...connection,
    model: "unknown-unreviewed",
  });
  assert.deepEqual((await adapter.discoverCapabilities()).modalities, []);
  assert.deepEqual((await adapter.discoverCapabilities()).operations, []);
});

test("12AI malformed recovered receipts fail closed before network", () => {
  for (const receipt of [
    null,
    { idempotencyKey: "intent-two", acceptance: "accepted" },
    {
      idempotencyKey: "intent-two",
      acceptance: "unknown",
      providerJobId: "../unsafe",
    },
  ]) {
    assert.throws(
      () =>
        new TwelveAiTaskAdapter(connection, {
          submissionReceipts: [receipt as never],
        }),
      (error: unknown) =>
        error instanceof TwelveAiTaskError &&
        error.reason === "invalid_request",
    );
  }
});
