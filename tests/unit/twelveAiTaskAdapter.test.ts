import assert from "node:assert/strict";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import test from "node:test";
import type { ProviderConnection } from "../../src/domain/providerConnections.ts";
import {
  TwelveAiTaskAdapter,
  TwelveAiTaskError,
  type TwelveAiGenerationRequest,
  type TwelveAiSubmissionPersistence,
  type TwelveAiSubmissionReceipt,
} from "../../src/integrations/generation/twelveAiTaskAdapter.ts";

const secret = "sk-private-fixture-12ai-never-print";
const image = "data:image/png;base64,aGVsbG8=";
const output = "https://img.12ai.org/images/task_one_0.png";
const connection = (
  baseUrl = "https://cdn.12ai.org/v1",
): ProviderConnection => ({
  id: "relay-one",
  provider: "custom relay",
  kind: "user_byok",
  displayName: "Relay",
  baseUrl,
  credentialRef: "opaque-ref",
  state: "active",
  concurrencyLimit: 1,
  capabilities: {
    modalities: ["image", "video"],
    operations: ["generate", "edit"],
    async: true,
  },
});
const request = (
  changes: Partial<TwelveAiGenerationRequest> = {},
): TwelveAiGenerationRequest => ({
  prompt: "A glass cup",
  model: "gemini-3.1-flash-image-preview",
  attachments: [],
  requestedOutputs: 1,
  idempotencyKey: "opaque-intent-one",
  signal: new AbortController().signal,
  ...changes,
});
function json(res: ServerResponse, value: unknown, status = 200, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json", ...headers });
  res.end(JSON.stringify(value));
}
async function body(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const value of req) chunks.push(Buffer.from(value));
  return JSON.parse(Buffer.concat(chunks).toString());
}
async function fixture(
  handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>,
) {
  const submissionPersistence = persistence();
  const errors: unknown[] = [];
  const server = createServer((req, res) => {
    Promise.resolve(handler(req, res)).catch((error) => {
      errors.push(error);
      res.destroy();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const fetchFixture: typeof fetch = async (url, init) => {
    const parsed = new URL(String(url));
    assert.ok(["cdn.12ai.org", "api.12ai.org"].includes(parsed.hostname));
    assert.equal(init?.redirect, "error");
    assert.equal(init?.credentials, "omit");
    return fetch(`http://127.0.0.1:${address.port}${parsed.pathname}`, init);
  };
  return {
    adapter: (baseUrl?: string) =>
      new TwelveAiTaskAdapter(connection(baseUrl), {
        submissionPersistence,
        fetch: fetchFixture,
        resolveCredential: async (base, ref) => {
          assert.ok(base.startsWith("https://"));
          assert.equal(ref, "opaque-ref");
          return secret;
        },
      }),
    fetchFixture,
    submissionPersistence,
    async close() {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      assert.deepEqual(errors, []);
    },
  };
}
function persistence(): TwelveAiSubmissionPersistence {
  const receipts = new Map<string, TwelveAiSubmissionReceipt>();
  return {
    connectionId: connection().id,
    async claimSubmission(receipt) {
      const existing = receipts.get(receipt.idempotencyKey);
      if (existing) return { created: false, receipt: { ...existing } };
      receipts.set(receipt.idempotencyKey, { ...receipt });
      return { created: true };
    },
    async persistSubmissionReceipt(receipt) {
      receipts.set(receipt.idempotencyKey, { ...receipt });
    },
  };
}
function errorIs(error: unknown, expected: Partial<TwelveAiTaskError>) {
  assert.ok(error instanceof TwelveAiTaskError);
  for (const [key, value] of Object.entries(expected))
    assert.equal(error[key as keyof TwelveAiTaskError], value);
  const serialized = `${error.stack}\n${JSON.stringify(error)}`;
  for (const value of [secret, "127.0.0.1", "evil.test", "private prompt"])
    assert.equal(serialized.includes(value), false);
  assert.equal(error.cause, undefined);
  return true;
}

test("12AI unknown configured models advertise no enabled media capability", async () => {
  const adapter = new TwelveAiTaskAdapter({
    ...connection(),
    model: "unknown-unreviewed",
  });
  assert.deepEqual((await adapter.discoverCapabilities()).modalities, []);
  assert.deepEqual((await adapter.discoverCapabilities()).operations, []);
});

test("12AI sends documented async image payload with transient Bearer credentials and coalesces submissions", async () => {
  let posts = 0;
  const server = await fixture(async (req, res) => {
    posts++;
    assert.equal(req.method, "POST");
    assert.equal(req.url, "/v1/task/submit");
    assert.equal(req.headers.authorization, `Bearer ${secret}`);
    assert.deepEqual(await body(req), {
      model: "gemini-3.1-flash-image-preview",
      input: {
        prompt: "A glass cup",
        n: 1,
        aspect_ratio: "16:9",
        image_size: "2K",
        images: [image],
      },
    });
    json(res, { id: "task_one", status: "queued" });
  });
  try {
    const adapter = server.adapter();
    const input = request({
      media: { kind: "image", aspectRatio: "16:9", imageSize: "2K" },
      attachments: [
        {
          id: "ref",
          name: "ref.png",
          mime: "image/png",
          size: 5,
          dataUrl: image,
        },
      ],
    });
    const receipts = await Promise.all([
      adapter.submit(input),
      adapter.submit(input),
    ]);
    assert.deepEqual(receipts[0], {
      providerJobId: "task_one",
      async: true,
      status: "queued",
    });
    assert.deepEqual(receipts[0], receipts[1]);
    assert.equal(posts, 1);
    assert.deepEqual(adapter.submissionReceipt(input.idempotencyKey), {
      connectionId: connection().id,
      idempotencyKey: input.idempotencyKey,
      acceptance: "accepted",
      providerJobId: "task_one",
    });
    assert.equal(
      JSON.stringify(adapter.submissionReceipt(input.idempotencyKey)).includes(
        secret,
      ),
      false,
    );
  } finally {
    await server.close();
  }
});

test("12AI task IDs recover running/completed results after adapter recreation without fetching output hosts", async () => {
  let polls = 0;
  const server = await fixture((req, res) => {
    assert.equal(req.method, "GET");
    assert.equal(req.url, "/v1/task/task_one");
    assert.equal(req.headers.authorization, `Bearer ${secret}`);
    polls++;
    json(
      res,
      polls === 1
        ? { id: "task_one", status: "in_progress" }
        : { id: "task_one", status: "completed", outputs: [output] },
    );
  });
  try {
    assert.equal(
      (await server.adapter().getStatus("task_one")).status,
      "running",
    );
    assert.deepEqual(
      await server.adapter("https://api.12ai.org").listResults("task_one"),
      [{ providerJobId: "task_one", url: output, index: 0 }],
    );
    assert.equal(polls, 2);
  } finally {
    await server.close();
  }
});

for (const state of [
  "queued",
  "processing",
  "in_progress",
  "completed",
  "partial_completed",
  "failed",
] as const)
  test(`12AI preserves ${state} terminal and partial evidence`, async () => {
    const successful = state === "completed" || state === "partial_completed";
    const server = await fixture((_req, res) =>
      json(res, {
        id: "task_one",
        status: state,
        ...(successful ? { outputs: [output] } : {}),
        ...(state === "partial_completed" || state === "failed"
          ? { error: `${secret} https://evil.test/private prompt` }
          : {}),
      }),
    );
    try {
      const task = await server.adapter().getTask("task_one");
      assert.equal(task.providerStatus, state);
      assert.equal(
        task.terminal,
        ["completed", "partial_completed", "failed"].includes(state),
      );
      assert.equal(task.partial, state === "partial_completed");
      assert.equal(
        task.status,
        state === "completed"
          ? "succeeded"
          : ["failed", "partial_completed"].includes(state)
            ? "failed"
            : state === "queued"
              ? "queued"
              : "running",
      );
      assert.equal(task.outputs.length, successful ? 1 : 0);
      assert.equal(
        task.failure?.providerErrorPresent,
        ["failed", "partial_completed"].includes(state) ? true : undefined,
      );
      assert.equal(JSON.stringify(task).includes(secret), false);
      if (state === "partial_completed")
        assert.equal(
          (await server.adapter().listResults("task_one")).length,
          1,
        );
    } finally {
      await server.close();
    }
  });

test("12AI explicit Veo parameters and data URI reference modes follow model-specific contracts", async () => {
  const server = await fixture(async (req, res) => {
    assert.deepEqual(await body(req), {
      model: "veo-3.1-generate-preview",
      input: {
        prompt: "A glass cup",
        n: 1,
        duration: 8,
        aspect_ratio: "9:16",
        resolution: "1080p",
        audio: false,
        image_references: [image],
      },
    });
    json(res, { id: "task_video", status: "queued" });
  });
  try {
    await server.adapter().submit(
      request({
        model: "veo-3.1-generate-preview",
        media: {
          kind: "video",
          duration: 8,
          aspectRatio: "9:16",
          resolution: "1080p",
          audio: false,
          imageReferences: [image],
        },
      }),
    );
  } finally {
    await server.close();
  }
});

test("12AI validates GPT quality and size without interpreting prompt parameters", async () => {
  const server = await fixture(async (req, res) => {
    assert.deepEqual(await body(req), {
      model: "gpt-image-2.5-flare",
      input: {
        prompt: "A glass cup",
        n: 1,
        size: "2048x2048",
        quality: "max",
      },
    });
    json(res, { id: "task_gpt", status: "queued" });
  });
  try {
    await server.adapter().submit(
      request({
        model: "gpt-image-2.5-flare",
        media: {
          kind: "image",
          size: "2048x2048",
          quality: "max",
        },
      }),
    );
  } finally {
    await server.close();
  }
});

test("12AI rejects unsupported or cross-family input before credential resolution/network", async () => {
  let calls = 0;
  const adapter = new TwelveAiTaskAdapter(connection(), {
    submissionPersistence: persistence(),
    fetch: async () => {
      calls++;
      throw new Error("must not fetch");
    },
    resolveCredential: async () => {
      calls++;
      return secret;
    },
  });
  const invalidRequests: Partial<TwelveAiGenerationRequest>[] = [
    { requestedOutputs: 2 },
    { model: "invented-video" },
    { model: "gpt-image-2", media: { kind: "image", quality: "max" } },
    { model: "gpt-image-2", media: { kind: "image", size: "4000x4000" } },
    { media: { kind: "image", quality: "high" } },
    { model: "veo-3.1-fast-generate-preview" },
    {
      model: "veo-3.1-fast-generate-preview",
      media: {
        kind: "video",
        duration: 8,
        aspectRatio: "16:9",
        resolution: "720p",
        imageReferences: [image],
      },
    },
    {
      model: "veo-3.1-generate-preview",
      media: {
        kind: "video",
        duration: 8,
        aspectRatio: "16:9",
        resolution: "720p",
        startFrame: image,
      },
    },
    {
      attachments: [
        {
          id: "bad",
          name: "bad",
          mime: "image/png",
          size: 1,
          dataUrl: "file:///private.png",
        },
      ],
    },
    { workflow: {} },
    { media: { kind: "image", seed: 1 } as never },
  ];
  for (const changes of invalidRequests)
    await assert.rejects(adapter.submit(request(changes)), (error) =>
      errorIs(error, { failureClass: "invalid_request", uncertain: false }),
    );
  assert.equal(calls, 0);
});

for (const payload of [
  { id: "task_one", status: "future_status" },
  { id: "other_task", status: "queued" },
  { id: "task_one", status: "completed" },
  {
    id: "task_one",
    status: "completed",
    outputs: ["http://127.0.0.1/private"],
  },
  {
    id: "task_one",
    status: "completed",
    outputs: ["https://u:pass@evil.test/private"],
  },
  { id: "task_one", status: "partial_completed", outputs: [1] },
  ["bad"],
])
  test("12AI fails closed on malformed or unknown task state", async () => {
    const server = await fixture((_req, res) => json(res, payload));
    try {
      await assert.rejects(server.adapter().getTask("task_one"), (error) =>
        errorIs(error, { reason: "invalid_response" }),
      );
    } finally {
      await server.close();
    }
  });

test("12AI rejects oversized and malformed submit responses as unknown and never resubmits", async () => {
  for (const raw of [
    "{bad",
    JSON.stringify({
      id: "task_one",
      status: "queued",
      padding: "x".repeat(1_048_577),
    }),
  ]) {
    let posts = 0;
    const server = await fixture((_req, res) => {
      posts++;
      res.end(raw);
    });
    try {
      const adapter = server.adapter();
      for (let i = 0; i < 2; i++)
        await assert.rejects(adapter.submit(request()), (error) =>
          errorIs(error, { uncertain: true, retryable: false }),
        );
      assert.equal(posts, 1);
      assert.equal(
        adapter.submissionReceipt("opaque-intent-one")?.acceptance,
        "unknown",
      );
    } finally {
      await server.close();
    }
  }
});

test("12AI known late acceptance retains task ID after local interruption", async () => {
  const controller = new AbortController();
  const adapter = new TwelveAiTaskAdapter(connection(), {
    submissionPersistence: persistence(),
    resolveCredential: async () => secret,
    fetch: async () => {
      controller.abort();
      return new Response(
        JSON.stringify({ id: "task_late", status: "queued" }),
      );
    },
  });
  assert.equal(
    (await adapter.submit(request({ signal: controller.signal })))
      .providerJobId,
    "task_late",
  );
  assert.equal(
    adapter.submissionReceipt("opaque-intent-one")?.acceptance,
    "accepted",
  );
});

test("12AI accepted socket abort is unknown and restored intent prevents another paid POST", async () => {
  let posts = 0;
  let accepted!: () => void;
  const seen = new Promise<void>((resolve) => {
    accepted = resolve;
  });
  const server = await fixture((_req, _res) => {
    posts++;
    accepted();
  });
  try {
    const controller = new AbortController();
    const adapter = server.adapter();
    const submitted = adapter.submit(request({ signal: controller.signal }));
    await seen;
    controller.abort();
    await assert.rejects(submitted, (error) =>
      errorIs(error, { uncertain: true, retryable: false }),
    );
    const receipt = adapter.submissionReceipt("opaque-intent-one");
    assert.ok(receipt);
    const restored = new TwelveAiTaskAdapter(connection(), {
      submissionPersistence: server.submissionPersistence,
      fetch: server.fetchFixture,
      resolveCredential: async () => secret,
      submissionReceipts: [receipt],
    });
    await assert.rejects(restored.submit(request()), (error) =>
      errorIs(error, { uncertain: true, retryable: false }),
    );
    assert.equal(posts, 1);
  } finally {
    await server.close();
  }
});

test("12AI pre-aborted work never submits; stopping polling and unsupported cancel never claim remote cancellation", async () => {
  let calls = 0;
  const adapter = new TwelveAiTaskAdapter(connection(), {
    fetch: async () => {
      calls++;
      throw new Error();
    },
    resolveCredential: async () => secret,
  });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    adapter.submit(request({ signal: controller.signal })),
    (error) => errorIs(error, { uncertain: false, failureClass: "cancelled" }),
  );
  await assert.rejects(
    adapter.getTask("task_one", controller.signal),
    (error) => errorIs(error, { uncertain: false, failureClass: "cancelled" }),
  );
  await assert.rejects(adapter.cancel("task_one"), (error) =>
    errorIs(error, { reason: "remote_cancel_unsupported" }),
  );
  assert.equal(calls, 0);
});

test("12AI blocks redirects and redacts response bodies and arbitrary transport errors", async () => {
  for (const status of [302, 401, 403, 429, 503]) {
    const server = await fixture((_req, res) =>
      json(
        res,
        { error: `${secret} private prompt https://evil.test/secret` },
        status,
        {
          Location: "http://127.0.0.1/private",
          "Retry-After": "2",
        },
      ),
    );
    try {
      await assert.rejects(server.adapter().getTask("task_one"), (error) =>
        errorIs(error, {
          failureClass:
            status === 302
              ? "network"
              : status === 401
                ? "unauthorized"
                : status === 403
                  ? "forbidden"
                  : status === 429
                    ? "rate_limited"
                    : "provider_unavailable",
        }),
      );
    } finally {
      await server.close();
    }
  }
  const adapter = new TwelveAiTaskAdapter(connection(), {
    resolveCredential: async () => secret,
    fetch: async () => {
      throw new Error(`${secret} private prompt https://evil.test/secret`);
    },
  });
  await assert.rejects(adapter.getTask("task_one"), (error) =>
    errorIs(error, { failureClass: "network" }),
  );
});
