import assert from "node:assert/strict";
import test from "node:test";
import type { ProviderConnection } from "../../src/domain/providerConnections.ts";
import {
  TwelveAiTaskAdapter,
  TwelveAiTaskError,
  type TwelveAiGenerationRequest,
  type TwelveAiSubmissionReceipt,
  type TwelveAiSubmissionPersistence,
} from "../../src/integrations/generation/twelveAiTaskAdapter.ts";
import { buildTwelveAiTaskBody } from "../../src/integrations/generation/twelveAiTaskProtocol.ts";
import { createGenerationAdapter } from "../../src/integrations/generation/providerAdapterFactory.ts";
import { setSessionApiKey } from "../../src/features/creation/providerCredentials.ts";

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

function persistence(
  observe?: (receipt: TwelveAiSubmissionReceipt) => Promise<void>,
): TwelveAiSubmissionPersistence {
  const receipts = new Map<string, TwelveAiSubmissionReceipt>();
  return {
    connectionId: connection.id,
    async claimSubmission(receipt) {
      await observe?.(receipt);
      const existing = receipts.get(receipt.idempotencyKey);
      if (existing) return { created: false, receipt: { ...existing } };
      receipts.set(receipt.idempotencyKey, { ...receipt });
      return { created: true };
    },
    async persistSubmissionReceipt(receipt) {
      await observe?.(receipt);
      receipts.set(receipt.idempotencyKey, { ...receipt });
    },
  };
}

test("12AI fresh adapters without durable persistence never read credentials or POST", async () => {
  let posts = 0;
  let credentialReads = 0;
  const attempts = await Promise.allSettled(
    [0, 1].map(() =>
      new TwelveAiTaskAdapter(connection, {
        resolveCredential: async () => {
          credentialReads++;
          return "secret";
        },
        fetch: async () => {
          posts++;
          return queued();
        },
      }).submit(request()),
    ),
  );
  assert.equal(posts, 0);
  assert.equal(credentialReads, 0);
  for (const result of attempts) {
    assert.equal(result.status, "rejected");
    if (result.status === "rejected") {
      assert.ok(result.reason instanceof TwelveAiTaskError);
      assert.equal(result.reason.reason, "receipt_persistence_required");
    }
  }
});

test("12AI factory uses the explicit host port and allows task recovery and submission", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  setSessionApiKey(
    "synthetic-key",
    connection.baseUrl!,
    connection.credentialRef,
  );
  globalThis.fetch = async (_url, init) => {
    calls++;
    if (init?.method === "POST") {
      return new Response(
        JSON.stringify({ id: "task_two", status: "queued", outputs: [] }),
      );
    }
    assert.equal(init?.method, "GET");
    return new Response(
      JSON.stringify({ id: "task_two", status: "in_progress" }),
    );
  };
  try {
    const adapter = createGenerationAdapter(connection, {
      submissionPersistence: persistence(),
    });
    assert.ok(adapter instanceof TwelveAiTaskAdapter);
    const submitted = await adapter.submit(request());
    assert.equal(submitted.providerJobId, "task_two");
    assert.equal((await adapter.getTask("task_two")).status, "running");
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
    setSessionApiKey("", connection.baseUrl!, connection.credentialRef);
  }
});

test("12AI persistence must bind the actual execution connection before a paid submission", async () => {
  let calls = 0;
  const adapter = new TwelveAiTaskAdapter(connection, {
    submissionPersistence: {
      ...persistence(),
      connectionId: "another-connection",
    },
    resolveCredential: async () => {
      calls++;
      return "secret";
    },
    fetch: async () => {
      calls++;
      return queued();
    },
  });
  await assert.rejects(
    adapter.submit(request()),
    (error: unknown) =>
      error instanceof TwelveAiTaskError &&
      error.reason === "receipt_persistence_required",
  );
  assert.equal(calls, 0);
});

test("12AI durable intent claim prevents duplicate POSTs across fresh adapter instances", async () => {
  const port = persistence();
  let posts = 0;
  const adapters = [0, 1].map(
    () =>
      new TwelveAiTaskAdapter(connection, {
        submissionPersistence: port,
        resolveCredential: async () => "secret",
        fetch: async () => {
          posts++;
          return queued();
        },
      }),
  );
  const attempts = await Promise.allSettled(
    adapters.map((adapter) => adapter.submit(request())),
  );
  assert.equal(posts, 1);
  assert.equal(
    attempts.filter((result) => result.status === "fulfilled").length,
    1,
  );
  const rejected = attempts.find((result) => result.status === "rejected");
  assert.ok(
    rejected?.status === "rejected" &&
      rejected.reason instanceof TwelveAiTaskError,
  );
  assert.equal(rejected.reason.reason, "submission_unknown");
  const restored = new TwelveAiTaskAdapter(connection, {
    submissionPersistence: port,
    resolveCredential: async () => {
      throw new Error("must not read");
    },
    fetch: async () => {
      posts++;
      return queued();
    },
  });
  assert.equal((await restored.submit(request())).providerJobId, "task_two");
  assert.equal(posts, 1);
});

test("12AI malformed acceptance preserves a safe returned task ID for recovery without resubmitting", async () => {
  let calls = 0;
  const adapter = new TwelveAiTaskAdapter(connection, {
    submissionPersistence: persistence(),
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
    connectionId: connection.id,
    idempotencyKey: "intent-two",
    acceptance: "unknown",
    providerJobId: "task_two",
  });
  const restored = new TwelveAiTaskAdapter(connection, {
    submissionPersistence: persistence(),
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
    submissionPersistence: persistence(async (receipt) => {
      receipts.push(receipt);
    }),
    fetch: async () => {
      assert.deepEqual(receipts, [
        {
          connectionId: connection.id,
          idempotencyKey: "intent-two",
          acceptance: "unknown",
        },
      ]);
      return queued();
    },
  });
  await adapter.submit(request());
  assert.deepEqual(receipts[1], {
    connectionId: connection.id,
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
      submissionPersistence: persistence(async (receipt) => {
        if (receipt.acceptance === failAt) throw new Error("secret");
      }),
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
      submissionPersistence: persistence(),
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
    submissionPersistence: persistence(),
    submissionReceipts: [
      {
        connectionId: connection.id,
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

test("12AI malformed recovered receipts fail closed before network", () => {
  for (const receipt of [
    null,
    {
      connectionId: connection.id,
      idempotencyKey: "intent-two",
      acceptance: "accepted",
    },
    {
      connectionId: connection.id,
      idempotencyKey: "intent-two",
      acceptance: "unknown",
      providerJobId: "../unsafe",
    },
    {
      connectionId: "another-connection",
      idempotencyKey: "intent-two",
      acceptance: "accepted",
      providerJobId: "task_two",
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

test("12AI persistence cannot return a receipt for a different connection or intent", async () => {
  for (const changes of [
    { connectionId: "another-connection" },
    { idempotencyKey: "another-intent" },
  ]) {
    let calls = 0;
    const adapter = new TwelveAiTaskAdapter(connection, {
      submissionPersistence: {
        ...persistence(),
        claimSubmission: async (receipt) => ({
          created: false,
          receipt: { ...receipt, ...changes },
        }),
      },
      resolveCredential: async () => {
        calls++;
        return "secret";
      },
      fetch: async () => {
        calls++;
        return queued();
      },
    });
    await assert.rejects(
      adapter.submit(request()),
      (error: unknown) =>
        error instanceof TwelveAiTaskError &&
        error.reason === "receipt_persistence_failed",
    );
    assert.equal(calls, 0);
  }
});

test("12AI factory recognition uses exact secure hosts and never a provider-name substring", () => {
  const at = (baseUrl: string) => ({ ...connection, baseUrl });
  assert.equal(
    createGenerationAdapter({ ...connection, credentialRef: undefined }),
    null,
  );
  for (const host of ["cdn.12ai.org", "api.12ai.org"]) {
    assert.ok(
      createGenerationAdapter(at(`https://${host}/v1`)) instanceof
        TwelveAiTaskAdapter,
    );
    assert.ok(
      createGenerationAdapter(at(`https://${host}`)) instanceof
        TwelveAiTaskAdapter,
    );
  }
  for (const url of [
    "https://cdn.12ai.org.evil.test/v1",
    "https://evil.test/cdn.12ai.org",
    "http://cdn.12ai.org",
    "https://cdn.12ai.org:444/v1",
    "https://cdn.12ai.org/v1?key=secret",
  ]) {
    assert.throws(
      () => new TwelveAiTaskAdapter(at(url)),
      (error: unknown) =>
        error instanceof TwelveAiTaskError &&
        error.reason === "invalid_connection",
    );
    assert.equal(
      createGenerationAdapter({ ...at(url), provider: "12ai" }) instanceof
        TwelveAiTaskAdapter,
      false,
    );
  }
});
