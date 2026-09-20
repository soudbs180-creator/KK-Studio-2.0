import assert from "node:assert/strict";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import test from "node:test";
import type { ProviderConnection } from "../../src/domain/providerConnections.ts";
import {
  ProviderAdapterError,
  type GenerationRequest,
} from "../../src/integrations/generation/providerAdapter.ts";
import {
  createHostAdapter,
  HostProviderError,
} from "../../src/features/generation-server/provider.ts";

const png =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jE1sAAAAASUVORK5CYII=";
const secret = "sk-host-credential-do-not-leak-123456789";
const connection = (
  baseUrl: string,
  overrides: Partial<ProviderConnection> = {},
): ProviderConnection => ({
  id: "own-api",
  provider: "OpenAI",
  kind: "user_byok",
  displayName: "Own API",
  baseUrl,
  credentialRef: "host-ref",
  capabilities: {
    modalities: ["image"],
    operations: ["generate", "edit"],
    maxOutputs: 1,
    async: false,
  },
  state: "active",
  concurrencyLimit: 2,
  ...overrides,
});
const request = (
  overrides: Partial<GenerationRequest> = {},
): GenerationRequest => ({
  prompt: "A landscape",
  model: "image-model",
  attachments: [],
  requestedOutputs: 1,
  idempotencyKey: "job-one-output-zero",
  signal: new AbortController().signal,
  ...overrides,
});
async function body(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString();
}
function json(
  res: ServerResponse,
  value: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  res.writeHead(status, { "Content-Type": "application/json", ...headers });
  res.end(JSON.stringify(value));
}
async function fakeProvider(
  handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> | void,
) {
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
  return {
    url: `http://127.0.0.1:${address.port}`,
    async close() {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      assert.deepEqual(errors, []);
    },
  };
}
function failure(value: unknown, expected: Partial<HostProviderError>) {
  assert.ok(value instanceof HostProviderError);
  assert.ok(value instanceof ProviderAdapterError);
  for (const [key, want] of Object.entries(expected))
    assert.equal(value[key as keyof HostProviderError], want);
  assert.equal(
    `${value.stack}\n${JSON.stringify(value)}`.includes(secret),
    false,
  );
  assert.equal(
    `${value.stack}\n${JSON.stringify(value)}`.includes("127.0.0.1"),
    false,
  );
  assert.equal(value.cause, undefined);
  return true;
}

for (const kind of ["managed_api", "user_byok"] as const)
  test(`OpenAI ${kind} sends host header credentials and one output with a stable opaque request key`, async () => {
    const seen: string[] = [];
    const server = await fakeProvider(async (req, res) => {
      assert.equal(req.method, "POST");
      assert.equal(req.url, "/v1/images/generations");
      assert.equal(req.headers.authorization, `Bearer ${secret}`);
      const key = req.headers["idempotency-key"];
      assert.equal(typeof key, "string");
      assert.match(key as string, /^[A-Za-z0-9_-]{32,100}$/);
      seen.push(key as string);
      assert.deepEqual(JSON.parse(await body(req)), {
        model: "image-model",
        prompt: "A landscape",
        n: 1,
      });
      json(res, { created: 1, data: [{ b64_json: png }, { b64_json: png }] });
    });
    try {
      const refs: string[] = [];
      for (let i = 0; i < 2; i++) {
        const adapter = createHostAdapter(
          connection(`${server.url}/v1`, { kind }),
          async (ref) => {
            refs.push(ref);
            return secret;
          },
        );
        const submitted = await adapter.submit(
          request({ idempotencyKey: "unsafe\r\nkey" }),
        );
        assert.equal(submitted.async, false);
        assert.equal(submitted.status, "succeeded");
        assert.equal(submitted.providerJobId.includes("unsafe"), false);
        assert.equal(
          (await adapter.getStatus(submitted.providerJobId)).status,
          "succeeded",
        );
        assert.deepEqual(await adapter.listResults(submitted.providerJobId), [
          {
            providerJobId: submitted.providerJobId,
            b64Json: png,
            mime: "image/png",
            index: 0,
          },
        ]);
        await adapter.cancel(submitted.providerJobId);
        await assert.rejects(
          adapter.listResults(submitted.providerJobId),
          (error) => failure(error, { uncertain: true }),
        );
      }
      assert.deepEqual(refs, ["host-ref", "host-ref"]);
      assert.equal(seen[0], seen[1]);
    } finally {
      await server.close();
    }
  });

test("OpenAI image edits transmit the selected bytes as multipart and do not silently ignore references", async () => {
  const server = await fakeProvider(async (req, res) => {
    assert.equal(req.url, "/v1/images/edits");
    assert.match(
      req.headers["content-type"] ?? "",
      /^multipart\/form-data; boundary=/,
    );
    const multipart = await body(req);
    assert.match(multipart, /name="n"\r\n\r\n1/);
    assert.match(multipart, /name="image\[\]"/);
    assert.match(multipart, /Content-Type: image\/png/);
    assert.equal(multipart.includes(secret), false);
    json(res, { data: [{ b64_json: png }] });
  });
  try {
    const adapter = createHostAdapter(
      connection(`${server.url}/v1`),
      async () => secret,
    );
    await adapter.submit(
      request({
        attachments: [
          {
            id: "ref",
            name: "reference.png",
            mime: "image/png",
            size: 68,
            dataUrl: `data:image/png;base64,${png}`,
          },
        ],
      }),
    );
  } finally {
    await server.close();
  }
});

for (const kind of ["managed_api", "user_byok"] as const)
  test(`Gemini ${kind} uses header auth, inline reference data, and returns a single PNG`, async () => {
    const server = await fakeProvider(async (req, res) => {
      assert.equal(req.url, "/v1beta/models/gemini-image:generateContent");
      assert.equal(req.headers["x-goog-api-key"], secret);
      assert.equal(req.headers.authorization, undefined);
      assert.deepEqual(JSON.parse(await body(req)), {
        contents: [
          {
            role: "user",
            parts: [
              { text: "A landscape" },
              { inlineData: { mimeType: "image/png", data: png } },
            ],
          },
        ],
        generationConfig: { responseModalities: ["IMAGE"], candidateCount: 1 },
      });
      json(res, {
        candidates: [
          {
            content: {
              parts: [
                { text: "description" },
                { inlineData: { data: png, mimeType: "image/png" } },
                { inlineData: { data: png, mimeType: "image/png" } },
              ],
            },
          },
        ],
      });
    });
    try {
      const adapter = createHostAdapter(
        connection(`${server.url}/v1beta`, { provider: "Gemini", kind }),
        async () => secret,
      );
      const job = await adapter.submit(
        request({
          model: "gemini-image",
          attachments: [
            {
              id: "ref",
              name: "ref.png",
              mime: "image/png",
              size: 68,
              dataUrl: `data:image/png;base64,${png}`,
            },
          ],
        }),
      );
      assert.deepEqual(await adapter.listResults(job.providerJobId), [
        {
          providerJobId: job.providerJobId,
          b64Json: png,
          mime: "image/png",
          index: 0,
        },
      ]);
    } finally {
      await server.close();
    }
  });

for (const fixture of [
  {
    status: 429,
    detail: secret,
    failureClass: "rate_limited",
    retryable: true,
  },
  {
    status: 401,
    detail: secret,
    failureClass: "unauthorized",
    retryable: false,
  },
  {
    status: 403,
    detail: "invalid_scope " + secret,
    failureClass: "invalid_scope",
    retryable: false,
  },
  {
    status: 403,
    detail: "project_disabled " + secret,
    failureClass: "project_disabled",
    retryable: false,
  },
  { status: 403, detail: secret, failureClass: "forbidden", retryable: false },
  {
    status: 503,
    detail: secret,
    failureClass: "provider_unavailable",
    retryable: true,
  },
  {
    status: 400,
    detail: secret,
    failureClass: "invalid_request",
    retryable: false,
  },
] as const)
  test(`provider HTTP ${fixture.status}/${fixture.failureClass} is bounded and classified`, async () => {
    const server = await fakeProvider((_req, res) =>
      json(
        res,
        { error: { message: fixture.detail + " http://127.0.0.1/private" } },
        fixture.status,
        { "Retry-After": "3605" },
      ),
    );
    try {
      const adapter = createHostAdapter(
        connection(server.url),
        async () => secret,
      );
      await assert.rejects(adapter.submit(request()), (error) =>
        failure(error, {
          status: fixture.status,
          failureClass: fixture.failureClass,
          retryable: fixture.retryable,
          uncertain: false,
          retryAfterSeconds: 3605,
        }),
      );
    } finally {
      await server.close();
    }
  });

test("Retry-After HTTP dates preserve the complete server cooldown beyond a minute", async () => {
  const until = new Date(Date.now() + 7_200_000).toUTCString();
  const server = await fakeProvider((_req, res) =>
    json(res, {}, 429, { "Retry-After": until }),
  );
  try {
    const adapter = createHostAdapter(
      connection(server.url),
      async () => secret,
    );
    await assert.rejects(adapter.submit(request()), (error) => {
      failure(error, { failureClass: "rate_limited" });
      assert.ok((error as HostProviderError).retryAfterSeconds! > 7_190);
      assert.ok((error as HostProviderError).retryAfterSeconds! <= 7_200);
      return true;
    });
  } finally {
    await server.close();
  }
});

for (const response of [
  "not JSON " + secret,
  JSON.stringify({ data: [] }),
  JSON.stringify({ data: "unexpected scalar" }),
  JSON.stringify({ data: [null] }),
  JSON.stringify({ data: [{ url: 42 }] }),
  JSON.stringify({ data: [{ b64_json: "invalid!!!" }] }),
])
  test("accepted malformed or missing output is uncertain and cannot trigger an automatic fresh generation", async () => {
    const server = await fakeProvider((_req, res) => {
      res.writeHead(200);
      res.end(response);
    });
    try {
      const adapter = createHostAdapter(
        connection(server.url),
        async () => secret,
      );
      await assert.rejects(adapter.submit(request()), (error) =>
        failure(error, { uncertain: true, retryable: false }),
      );
    } finally {
      await server.close();
    }
  });

test("network failure during submission is uncertain while a history read can retry its existing prompt", async () => {
  const server = await fakeProvider((req, _res) => req.socket.destroy());
  try {
    await assert.rejects(
      createHostAdapter(connection(server.url), async () => secret).submit(
        request(),
      ),
      (error) => failure(error, { uncertain: true, failureClass: "network" }),
    );
    await assert.rejects(
      createHostAdapter(
        connection(server.url, { kind: "local_comfyui" }),
        async () => undefined,
      ).getStatus("prompt-one"),
      (error) =>
        failure(error, {
          uncertain: false,
          failureClass: "network",
          retryable: true,
        }),
    );
  } finally {
    await server.close();
  }
});

test("preflight rejects OAuth, unsafe metadata, multiple outputs and absent credentials before transmitting", async () => {
  let transmitted = 0;
  const server = await fakeProvider((_req, res) => {
    transmitted++;
    json(res, {});
  });
  try {
    for (const patch of [
      { kind: "user_oauth_local" },
      { baseUrl: "https://user:password@example.com" },
      { baseUrl: `${server.url}?key=${secret}` },
      { baseUrl: "http://example.com/v1" },
      { baseUrl: "https://example.com", kind: "local_comfyui" },
      { state: "quarantined" },
    ] as Partial<ProviderConnection>[])
      assert.throws(
        () =>
          createHostAdapter(connection(server.url, patch), async () => secret),
        (error) => failure(error, { uncertain: false, retryable: false }),
      );
    await assert.rejects(
      createHostAdapter(connection(server.url), async () => secret).submit(
        request({ requestedOutputs: 2 }),
      ),
      (error) =>
        failure(error, { failureClass: "invalid_request", uncertain: false }),
    );
    await assert.rejects(
      createHostAdapter(connection(server.url), async () => undefined).submit(
        request(),
      ),
      (error) =>
        failure(error, { failureClass: "unauthorized", uncertain: false }),
    );
    await assert.rejects(
      createHostAdapter(connection(server.url), async () => {
        throw new Error(secret);
      }).submit(request()),
      (error) => failure(error, { uncertain: false }),
    );
    assert.equal(transmitted, 0);
  } finally {
    await server.close();
  }
});

test("ComfyUI only completes on actual success, ignores partial previews, and cancels its exact queued prompt", async () => {
  let history: unknown = {};
  const paths: string[] = [];
  const server = await fakeProvider(async (req, res) => {
    paths.push(req.url!);
    assert.equal(req.headers.authorization, undefined);
    if (req.url === "/prompt") {
      const payload = JSON.parse(await body(req));
      assert.deepEqual(payload.prompt, {
        "9": { class_type: "SaveImage", inputs: {} },
      });
      assert.match(payload.client_id, /^[A-Za-z0-9_-]{32,100}$/);
      json(res, { prompt_id: "prompt-one", number: 1, node_errors: {} });
    } else if (req.url === "/history/prompt-one") json(res, history);
    else if (req.url === "/queue") {
      assert.equal(req.method, "POST");
      assert.deepEqual(JSON.parse(await body(req)), { delete: ["prompt-one"] });
      res.writeHead(200);
      res.end();
    } else throw new Error("unexpected route");
  });
  try {
    const adapter = createHostAdapter(
      connection(server.url, {
        kind: "local_comfyui",
        credentialRef: undefined,
      }),
      async () => {
        throw new Error("local must not resolve credentials");
      },
    );
    await assert.rejects(adapter.submit(request()), (error) =>
      failure(error, { failureClass: "invalid_request", uncertain: false }),
    );
    const job = await adapter.submit(
      request({ workflow: { "9": { class_type: "SaveImage", inputs: {} } } }),
    );
    assert.deepEqual(job, {
      providerJobId: "prompt-one",
      async: true,
      status: "queued",
    });
    history = {
      "prompt-one": {
        outputs: { "9": { images: [{ filename: "partial.png" }] } },
        status: { completed: false, status_str: "running", messages: [] },
      },
    };
    assert.equal(
      (await adapter.getStatus(job.providerJobId)).status,
      "running",
    );
    assert.deepEqual(await adapter.listResults(job.providerJobId), []);
    history = {
      "prompt-one": {
        outputs: {},
        status: {
          completed: false,
          status_str: "error",
          messages: [["execution_error", { exception_message: secret }]],
        },
      },
    };
    assert.equal((await adapter.getStatus(job.providerJobId)).status, "failed");
    history = {
      "prompt-one": {
        outputs: {
          "9": {
            images: [
              { filename: "final & one.png", subfolder: "a b", type: "output" },
              { filename: "second.png", type: "output" },
            ],
          },
        },
        status: { completed: true, status_str: "success", messages: [] },
      },
    };
    assert.equal(
      (await adapter.getStatus(job.providerJobId)).status,
      "succeeded",
    );
    const results = await adapter.listResults(job.providerJobId);
    assert.equal(results.length, 1);
    const url = new URL(results[0].url!);
    assert.equal(url.pathname, "/view");
    assert.equal(url.searchParams.get("filename"), "final & one.png");
    assert.equal(url.searchParams.get("subfolder"), "a b");
    assert.equal(url.searchParams.get("type"), "output");
    await adapter.cancel(job.providerJobId);
    assert.equal(paths.includes("/interrupt"), false);
  } finally {
    await server.close();
  }
});
