import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { createProviderClient } from "../src/services/providerClient.ts";
import type { ProviderConnection } from "../src/services/providerTypes.ts";
import { createGatewayImageClient } from "../src/services/gatewayImageClient.ts";
import { decodeBase64 } from "../src/services/imageBytes.ts";
import { ServiceError } from "../src/services/httpClient.ts";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
  "base64",
);
async function fixture(
  action: (request: IncomingMessage, response: ServerResponse) => void,
  run: (connection: ProviderConnection) => Promise<void>,
) {
  const server = createServer(action);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  try {
    await run({
      id: "fixture-only",
      baseUrl: `http://127.0.0.1:${address.port}/v1`,
      credentialRef: "vault-fixture",
      protocol: "openai-compatible",
      capabilities: { text: true, image: true },
    });
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}
const input = (
  connection: ProviderConnection,
  submissionId = "fixture-submit",
) => ({
  submissionId,
  projectId: "project-fixture",
  connection,
  model: "fixture-model",
  prompt: "Fixture only",
});
const client = () =>
  createProviderClient({
    allowLoopbackHttp: true,
    timeoutMs: 500,
    credentials: { read: async () => "fixture-secret-only" },
  });

test("real fixture HTTP models stay unknown and SSE deltas require completion", async () => {
  await fixture(
    (req, res) => {
      assert.equal(req.headers.authorization, "Bearer fixture-secret-only");
      if (req.url === "/v1/models") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ data: [{ id: "fixture-model" }] }));
        return;
      }
      assert.equal(req.headers["idempotency-key"], "fixture-submit");
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write(
        'data: {"id":"receipt-fixture","choices":[{"index":0,"delta":{"content":"hel"},"finish_reason":null}]}\r\n\r\n',
      );
      setTimeout(() => {
        res.end(
          'data: {"choices":[{"index":0,"delta":{"content":"lo"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n',
        );
      }, 10);
    },
    async (connection) => {
      const service = client();
      const probe = await service.probeModels(connection);
      assert.equal(probe.models[0].text, "unknown");
      assert.equal(probe.generationVerified, false);
      const deltas: string[] = [];
      const result = await service.generateText(input(connection), (delta) =>
        deltas.push(delta),
      );
      assert.deepEqual(deltas, ["hel", "lo"]);
      assert.equal(result.text, "hello");
      assert.equal(result.providerRequestId, "receipt-fixture");
      assert.equal(result.identity.projectId, "project-fixture");
      assert.equal(result.submissionState, "terminal");
    },
  );
});

test("incomplete paid stream and abort remain unknown and cannot ordinary-resubmit", async () => {
  let submissions = 0;
  await fixture(
    (_req, res) => {
      submissions++;
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.end(
        'data: {"choices":[{"delta":{"content":"partial"},"finish_reason":null}]}\n\n',
      );
    },
    async (connection) => {
      const service = client();
      await assert.rejects(
        service.generateText(input(connection), () => undefined),
        (error) =>
          error instanceof Error &&
          "submissionState" in error &&
          error.submissionState === "unknown",
      );
      await assert.rejects(
        service.generateText(input(connection), () => undefined),
        /SUBMISSION_ALREADY_STARTED/,
      );
      assert.equal(submissions, 1);
    },
  );
  await fixture(
    (_req, res) => {
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write(
        'data: {"choices":[{"delta":{"content":"partial"},"finish_reason":null}]}\n\n',
      );
    },
    async (connection) => {
      const controller = new AbortController();
      const service = client();
      await assert.rejects(
        service.generateText(
          input(connection),
          () => controller.abort(),
          controller.signal,
        ),
        (error) =>
          error instanceof Error &&
          "submissionState" in error &&
          error.submissionState === "unknown",
      );
    },
  );
});

test("image original retrieval validates signature and leaves archival pending", async () => {
  await fixture(
    (_req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ data: [{ b64_json: png.toString("base64") }] }));
    },
    async (connection) => {
      const service = client();
      const receipt = await service.generateImages(input(connection));
      assert.equal(receipt.originals[0].mime, "image/png");
      assert.deepEqual(receipt.originals[0].bytes, new Uint8Array(png));
      assert.equal(receipt.archivalState, "pending");
      await assert.rejects(
        service.generateImages(input(connection)),
        /SUBMISSION_ALREADY_STARTED/,
      );
    },
  );
  await fixture(
    (_req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          data: [{ b64_json: Buffer.from("not an image").toString("base64") }],
        }),
      );
    },
    async (connection) => {
      await assert.rejects(
        client().generateImages(input(connection)),
        /INVALID_IMAGE_SIGNATURE/,
      );
    },
  );
});

test("unsupported refs and modality never send a paid request", async () => {
  let requests = 0;
  await fixture(
    (_req, res) => {
      requests++;
      res.end();
    },
    async (connection) => {
      const service = client();
      await assert.rejects(
        service.generateImages({
          ...input(connection),
          attachments: [
            { id: "reference", name: "ref", mime: "image/png", size: 1 },
          ],
        }),
        /REFERENCE_INPUT_UNAVAILABLE/,
      );
      await assert.rejects(
        service.generateText(
          input({ ...connection, capabilities: { text: false, image: true } }),
          () => undefined,
        ),
        /TEXT_CAPABILITY_UNAVAILABLE/,
      );
      assert.equal(requests, 0);
    },
  );
});

test("explicit gateway image adapter preserves accepted job identity and downloads owner asset", async () => {
  let submissions = 0;
  const assetId = `asset-${"a".repeat(64)}`;
  await fixture(
    (req, res) => {
      if (req.url?.includes("/assets/")) {
        res.writeHead(200, { "content-type": "image/png" });
        res.end(png);
        return;
      }
      if (req.method === "POST" && req.url === "/v1/jobs") submissions++;
      res.writeHead(req.method === "POST" ? 202 : 200, {
        "content-type": "application/json",
      });
      res.end(
        JSON.stringify({
          id: "job-aabbcc",
          status: "succeeded",
          requestedOutputs: 1,
          completedOutputs: 1,
          outputs: [
            {
              index: 0,
              status: "succeeded",
              assetId,
              assetRoute: `/v1/assets/${assetId}`,
            },
          ],
        }),
      );
    },
    async (configured) => {
      const connection = { ...configured, protocol: "kk-image-jobs" as const };
      const gateway = createGatewayImageClient({
        allowLoopbackHttp: true,
        credentials: { read: async () => "fixture-gateway-token" },
      });
      const accepted = await gateway.submitImageJob(input(connection));
      assert.equal(accepted.submissionState, "submitted");
      assert.equal(accepted.job.id, "job-aabbcc");
      const job = await gateway.getImageJob(connection, accepted.job.id);
      assert.equal(job.completedOutputs, 1);
      const original = await gateway.downloadOriginal(
        connection,
        job.outputs[0],
      );
      assert.deepEqual(original.bytes, new Uint8Array(png));
      assert.equal(original.providerAssetId, assetId);
      const cancellation = await gateway.cancelImageJob(connection, job.id);
      assert.equal(cancellation.providerCancellationConfirmed, false);
      await assert.rejects(
        gateway.submitImageJob(input(connection)),
        /SUBMISSION_ALREADY_STARTED/,
      );
      assert.equal(submissions, 1);
    },
  );
});

test(
  "paid request timeout is bounded, classified unknown, and pre-abort sends nothing",
  { timeout: 5000 },
  async (context) => {
    context.mock.timers.enable({ apis: ["setTimeout"] });
    let requests = 0;
    let requestSeen!: () => void;
    const seen = new Promise<void>((resolve) => {
      requestSeen = resolve;
    });
    await fixture(
      (_req, res) => {
        requests++;
        res.writeHead(200, { "content-type": "text/event-stream" });
        res.write(": keepalive\n\n");
        requestSeen();
      },
      async (connection) => {
        const service = createProviderClient({
          allowLoopbackHttp: true,
          timeoutMs: 30,
          credentials: { read: async () => "fixture-token" },
        });
        let settled = false;
        const pending = service
          .generateText(input(connection), () => undefined)
          .finally(() => {
            settled = true;
          });
        const timedOut = assert.rejects(
          pending,
          (error) =>
            error instanceof Error &&
            "code" in error &&
            error.code === "REQUEST_TIMEOUT" &&
            "submissionState" in error &&
            error.submissionState === "unknown",
        );
        // Real HTTP must have reached the stalled SSE fixture before advancing the
        // production deadline. Parallel test scheduling cannot preempt acceptance.
        await seen;
        assert.equal(requests, 1);
        context.mock.timers.tick(29);
        await new Promise<void>((resolve) => setImmediate(resolve));
        assert.equal(
          settled,
          false,
          "29ms cannot expire the configured 30ms deadline",
        );
        context.mock.timers.tick(1);
        await timedOut;
        const controller = new AbortController();
        controller.abort();
        await assert.rejects(
          service.generateText(
            input(connection, "pre-aborted"),
            () => undefined,
            controller.signal,
          ),
          /CANCELLED_BEFORE_SUBMISSION/,
        );
        assert.equal(requests, 1);
      },
    );
  },
);

test("signed asset URL stays transient and download failure retains accepted receipt without resubmit", async () => {
  let generationRequests = 0;
  await fixture(
    (req, res) => {
      if (req.url?.startsWith("/asset")) {
        assert.equal(req.url, "/asset?fixtureSignature=transient");
        res.writeHead(200, { "content-type": "image/png" });
        res.end(png);
        return;
      }
      generationRequests++;
      res.writeHead(200, {
        "content-type": "application/json",
        "x-request-id": "accepted-fixture-receipt",
      });
      res.end(
        JSON.stringify({
          data: [
            {
              url: `http://${req.headers.host}/asset?fixtureSignature=transient`,
            },
            { b64_json: Buffer.from("invalid").toString("base64") },
          ],
        }),
      );
    },
    async (connection) => {
      connection.capabilities.maxOutputs = 2;
      const service = client();
      await assert.rejects(
        service.generateImages({ ...input(connection), count: 2 }),
        (error) => {
          assert.ok(error instanceof Error && "recoveryReceipt" in error);
          const recovered = error.recoveryReceipt;
          assert.ok(
            recovered &&
              typeof recovered === "object" &&
              "originals" in recovered &&
              Array.isArray(recovered.originals),
          );
          assert.equal(recovered.originals.length, 1);
          assert.ok(!JSON.stringify(recovered).includes("fixtureSignature"));
          return true;
        },
      );
      await assert.rejects(
        service.generateImages({ ...input(connection), count: 2 }),
        /SUBMISSION_ALREADY_STARTED/,
      );
      assert.equal(generationRequests, 1);
    },
  );
});

test("malformed or oversized SSE and forged completion stay unknown", async () => {
  for (const data of [
    "data: not-json\n\n",
    "data: [DONE]\n\n",
    `data: ${"x".repeat(70_000)}\n\n`,
  ]) {
    await fixture(
      (_req, res) => {
        res.writeHead(200, { "content-type": "text/event-stream" });
        res.end(data);
      },
      async (connection) => {
        await assert.rejects(
          client().generateText(input(connection), () => undefined),
          (error) =>
            error instanceof Error &&
            "submissionState" in error &&
            error.submissionState === "unknown",
        );
      },
    );
  }
});

test("accepted image followed by asset authorization failure cannot become safe paid retry", async () => {
  await fixture(
    (req, res) => {
      if (req.url === "/asset") {
        res.writeHead(401);
        res.end();
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({ data: [{ url: `http://${req.headers.host}/asset` }] }),
      );
    },
    async (connection) => {
      await assert.rejects(
        client().generateImages(input(connection)),
        (error) =>
          error instanceof Error &&
          "submissionState" in error &&
          error.submissionState === "unknown",
      );
    },
  );
});

test("stop suppresses all subsequent buffered deltas in the same network chunk", async () => {
  await fixture(
    (_req, res) => {
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.end(
        'data: {"choices":[{"delta":{"content":"first"},"finish_reason":null}]}\n\ndata: {"choices":[{"delta":{"content":"late"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n',
      );
    },
    async (connection) => {
      const controller = new AbortController();
      const deltas: string[] = [];
      await assert.rejects(
        client().generateText(
          input(connection),
          (delta) => {
            deltas.push(delta);
            controller.abort();
          },
          controller.signal,
        ),
      );
      assert.deepEqual(deltas, ["first"]);
    },
  );
});

test("multi-megabyte original base64 decodes without recursive validation", () => {
  const original = Buffer.alloc(2 * 1024 * 1024, 42);
  assert.deepEqual(
    decodeBase64(original.toString("base64")),
    new Uint8Array(original),
  );
});

for (const interruption of ["deadline", "abort"] as const) {
  test(`E4-R1 ${interruption} retains accepted image receipt and the first downloaded original`, async () => {
    const controller = new AbortController();
    let paidRequests = 0;
    let stalledAssetRequested = false;
    await fixture(
      (request, response) => {
        if (request.url === "/first-original") {
          response.writeHead(200, { "content-type": "image/png" });
          response.end(png);
          return;
        }
        if (request.url === "/stalled-original") {
          stalledAssetRequested = true;
          response.writeHead(200, { "content-type": "image/png" });
          response.write(png.subarray(0, 8));
          if (interruption === "abort") controller.abort();
          return;
        }
        paidRequests++;
        response.writeHead(200, {
          "content-type": "application/json",
          "x-request-id": "known-accepted-image-fixture",
        });
        response.end(
          JSON.stringify({
            data: [
              { url: `http://${request.headers.host}/first-original` },
              { url: `http://${request.headers.host}/stalled-original` },
            ],
          }),
        );
      },
      async (connection) => {
        connection.capabilities.maxOutputs = 2;
        const service = createProviderClient({
          allowLoopbackHttp: true,
          timeoutMs: 250,
          credentials: { read: async () => "fixture-only-token" },
        });
        await assert.rejects(
          service.generateImages(
            { ...input(connection), count: 2 },
            controller.signal,
          ),
          (error) => {
            assert.ok(error instanceof ServiceError);
            assert.equal(
              error.code,
              interruption === "deadline"
                ? "REQUEST_TIMEOUT"
                : "REQUEST_ABORTED",
            );
            assert.equal(error.submissionState, "unknown");
            assert.equal(
              error.providerRequestId,
              "known-accepted-image-fixture",
            );
            assert.ok(error.recoveryReceipt);
            assert.equal(
              error.recoveryReceipt.providerRequestId,
              "known-accepted-image-fixture",
            );
            assert.equal(
              error.recoveryReceipt.identity.projectId,
              "project-fixture",
            );
            assert.equal(
              error.recoveryReceipt.identity.submissionId,
              "fixture-submit",
            );
            assert.equal(error.recoveryReceipt.submissionState, "unknown");
            assert.equal(error.recoveryReceipt.archivalState, "pending");
            assert.equal(error.recoveryReceipt.originals.length, 1);
            assert.deepEqual(
              error.recoveryReceipt.originals[0].bytes,
              new Uint8Array(png),
            );
            assert.equal(error.recoveryReceipt.originals[0].mime, "image/png");
            assert.ok(
              !JSON.stringify(error.recoveryReceipt).includes(
                "fixture-only-token",
              ),
            );
            return true;
          },
        );
        assert.ok(stalledAssetRequested);
        await assert.rejects(
          service.generateImages({ ...input(connection), count: 2 }),
          /SUBMISSION_ALREADY_STARTED/,
        );
        assert.equal(paidRequests, 1);
      },
    );
  });
}

test("E4-R1 SSE deadline retains the provider request identity already received", async () => {
  await fixture(
    (_request, response) => {
      response.writeHead(200, { "content-type": "text/event-stream" });
      response.write(
        'data: {"id":"known-accepted-text-fixture","choices":[{"index":0,"delta":{"content":"partial"},"finish_reason":null}]}\n\n',
      );
    },
    async (connection) => {
      const service = createProviderClient({
        allowLoopbackHttp: true,
        timeoutMs: 250,
        credentials: { read: async () => "fixture-only-token" },
      });
      const deltas: string[] = [];
      await assert.rejects(
        service.generateText(input(connection), (delta) => deltas.push(delta)),
        (error) => {
          assert.ok(error instanceof ServiceError);
          assert.equal(error.code, "REQUEST_TIMEOUT");
          assert.equal(error.submissionState, "unknown");
          assert.equal(error.providerRequestId, "known-accepted-text-fixture");
          return true;
        },
      );
      assert.deepEqual(deltas, ["partial"]);
      await assert.rejects(
        service.generateText(input(connection), () => undefined),
        /SUBMISSION_ALREADY_STARTED/,
      );
    },
  );
});
