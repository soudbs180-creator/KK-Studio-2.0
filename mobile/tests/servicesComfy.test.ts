import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { randomUUID } from "node:crypto";
import {
  createComfyUiClient,
  ComfyServiceError,
} from "../src/services/comfyClient.ts";
import type {
  ComfyConnection,
  ComfyWorkflowInput,
  ComfyWorkflow,
} from "../src/services/comfyTypes.ts";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
  "base64",
);
const catalog = {
  ImageSource: {
    input: { required: { model: [["fixture.safetensors"]] } },
    output: ["IMAGE"],
    output_node: false,
  },
  SaveImage: {
    input: { required: { images: ["IMAGE"], filename_prefix: ["STRING"] } },
    output: [],
    output_node: true,
  },
};
const workflow = (): ComfyWorkflow => ({
  "1": { class_type: "ImageSource", inputs: { model: "fixture.safetensors" } },
  "2": {
    class_type: "SaveImage",
    inputs: { images: ["1", 0], filename_prefix: "Fixture" },
  },
});
function json(response: ServerResponse, value: unknown, status = 200) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(value));
}
async function fixture(
  action: (request: IncomingMessage, response: ServerResponse) => void,
  run: (connection: ComfyConnection) => Promise<void>,
) {
  const server = createServer(action);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  try {
    await run({
      id: "comfy-fixture-only",
      baseUrl: `http://127.0.0.1:${address.port}`,
      protocol: "comfyui",
      credentialRef: "comfy-fixture-vault",
    });
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}
const client = () =>
  createComfyUiClient({
    allowLoopbackHttp: true,
    timeoutMs: 500,
    credentials: { read: async () => "test-only-comfy-secret" },
  });
const input = (connection: ComfyConnection): ComfyWorkflowInput => ({
  submissionId: randomUUID(),
  projectId: "project-one",
  workflowRevision: 7,
  connection,
  workflow: workflow(),
});
const history = (
  promptId: string,
  status = "success",
  completed = true,
  images: unknown[] = [
    { filename: "Fixture_001.png", subfolder: "runs", type: "output" },
  ],
) => ({
  [promptId]: {
    status: { status_str: status, completed, messages: [] },
    outputs: { "2": { images } },
  },
});

test("Comfy actual fixture protocol validates workflow against installed nodes, captures acceptance, polls and downloads originals", async () => {
  let acceptedId = "";
  let acceptedWorkflow: unknown;
  await fixture(
    (request, response) => {
      assert.equal(
        request.headers.authorization,
        "Bearer test-only-comfy-secret",
      );
      if (request.url === "/system_stats") {
        json(response, {
          system: { comfyui_version: "fixture-version" },
          devices: [],
        });
        return;
      }
      if (request.url === "/models") {
        json(response, ["checkpoints"]);
        return;
      }
      if (request.url === "/models/checkpoints") {
        json(response, ["fixture.safetensors"]);
        return;
      }
      if (request.url === "/object_info") {
        json(response, catalog);
        return;
      }
      if (request.url === "/prompt") {
        let text = "";
        request.setEncoding("utf8");
        request.on("data", (chunk) => {
          text += chunk;
        });
        request.on("end", () => {
          const body = JSON.parse(text);
          acceptedId = body.prompt_id;
          acceptedWorkflow = body.prompt;
          assert.equal(body.client_id, acceptedId);
          json(response, { prompt_id: acceptedId, number: 4, node_errors: {} });
        });
        return;
      }
      if (request.url?.startsWith("/history/")) {
        json(response, history(acceptedId));
        return;
      }
      if (request.url?.startsWith("/view?")) {
        const url = new URL(request.url, "http://fixture.test");
        assert.equal(url.searchParams.get("filename"), "Fixture_001.png");
        assert.equal(url.searchParams.get("subfolder"), "runs");
        response.writeHead(200, { "content-type": "image/png" });
        response.end(png);
        return;
      }
      json(response, {}, 404);
    },
    async (connection) => {
      const service = client();
      assert.equal(
        (await service.health(connection)).generationVerified,
        false,
      );
      assert.deepEqual(await service.listModelFolders(connection), [
        "checkpoints",
      ]);
      assert.deepEqual(await service.listModels(connection, "checkpoints"), [
        "fixture.safetensors",
      ]);
      const submitted = input(connection);
      const receipt = await service.submitWorkflow(submitted);
      submitted.workflow["2"].inputs.filename_prefix = "changed-later";
      assert.equal(
        receipt.identity.workflow["2"].inputs.filename_prefix,
        "Fixture",
      );
      assert.deepEqual(acceptedWorkflow, workflow());
      assert.equal(receipt.identity.projectId, "project-one");
      assert.equal(receipt.identity.workflowRevision, 7);
      assert.equal(receipt.promptId, submitted.submissionId);
      assert.equal(receipt.submissionState, "submitted");
      const polled = await service.pollPrompt(connection, receipt);
      assert.equal(polled.status, "succeeded");
      const original = await service.downloadOriginal(
        connection,
        receipt,
        polled.outputs[0],
      );
      assert.deepEqual(original.bytes, new Uint8Array(png));
      assert.equal(original.mime, "image/png");
      assert.equal(original.signatureVerified, true);
      await assert.rejects(
        service.submitWorkflow(submitted),
        /SUBMISSION_ALREADY_STARTED/,
      );
    },
  );
});

test("Comfy malformed or missing workflow/node/model/link preflight never submits compute", async () => {
  let submitted = 0;
  await fixture(
    (request, response) => {
      if (request.url === "/prompt") submitted++;
      json(response, catalog);
    },
    async (connection) => {
      const invalid: ComfyWorkflow[] = [
        {},
        { "1": { class_type: "MissingNode", inputs: {} } },
        {
          "1": {
            class_type: "ImageSource",
            inputs: { model: "unknown-model" },
          },
        },
        {
          "1": {
            class_type: "SaveImage",
            inputs: { images: ["missing-node", 0], filename_prefix: "fixture" },
          },
        },
      ];
      for (const candidate of invalid)
        await assert.rejects(
          client().submitWorkflow({
            ...input(connection),
            workflow: candidate,
          }),
          /WORKFLOW/,
        );
      assert.equal(submitted, 0);
      await assert.rejects(
        client().submitWorkflow(
          input({ ...connection, baseUrl: "http://remote.example.test" }),
        ),
        /HTTPS_REQUIRED/,
      );
    },
  );
});

test("Comfy submitted disconnect, timeout and abort remain unknown with stable prompt identity and no auto resubmit", async () => {
  for (const fault of ["disconnect", "timeout", "abort"] as const) {
    const controller = new AbortController();
    let paidRequests = 0;
    await fixture(
      (request, response) => {
        if (request.url === "/object_info") {
          json(response, catalog);
          return;
        }
        paidRequests++;
        if (fault === "disconnect") response.destroy();
        else if (fault === "abort") controller.abort();
      },
      async (connection) => {
        const service = createComfyUiClient({
          allowLoopbackHttp: true,
          timeoutMs: 100,
          credentials: { read: async () => "test-only-comfy-secret" },
        });
        const prepared = input(connection);
        await assert.rejects(
          service.submitWorkflow(prepared, controller.signal),
          (error) => {
            assert.ok(error instanceof ComfyServiceError);
            assert.equal(error.submissionState, "unknown");
            assert.equal(error.providerRequestId, prepared.submissionId);
            assert.ok(error.comfyReceipt);
            assert.equal(error.comfyReceipt.promptId, prepared.submissionId);
            return true;
          },
        );
        await assert.rejects(
          service.submitWorkflow(prepared),
          /SUBMISSION_ALREADY_STARTED/,
        );
        assert.equal(paidRequests, 1);
      },
    );
  }
});

test("Comfy server-assigned prompt identity is retained for older valid prompt endpoints", async () => {
  const assigned = randomUUID();
  await fixture(
    (request, response) => {
      if (request.url === "/object_info") json(response, catalog);
      else if (request.url === "/prompt")
        json(response, { prompt_id: assigned, number: 1, node_errors: {} });
      else json(response, history(assigned));
    },
    async (connection) => {
      const service = client();
      const prepared = input(connection);
      const receipt = await service.submitWorkflow(prepared);
      assert.equal(receipt.promptId, assigned);
      assert.equal(receipt.identity.submissionId, prepared.submissionId);
      assert.equal(
        (await service.pollPrompt(connection, receipt)).status,
        "succeeded",
      );
    },
  );
});

test("Comfy targeted cancellation never interrupts global work and needs explicit terminal history", async () => {
  let promptId = "";
  let cancelled = false;
  let supported = false;
  const writes: string[] = [];
  await fixture(
    (request, response) => {
      if (request.method === "POST") writes.push(request.url!);
      if (request.url === "/object_info") json(response, catalog);
      else if (request.url === "/prompt") {
        let body = "";
        request.on("data", (chunk) => {
          body += chunk;
        });
        request.on("end", () => {
          promptId = JSON.parse(body).prompt_id;
          json(response, { prompt_id: promptId, number: 0, node_errors: {} });
        });
      } else if (request.url === `/api/jobs/${promptId}/cancel`) {
        if (!supported) json(response, {}, 404);
        else {
          cancelled = true;
          json(response, { cancelled: true });
        }
      } else if (request.url?.startsWith("/history/")) {
        json(
          response,
          cancelled
            ? {
                [promptId]: {
                  status: {
                    status_str: "error",
                    completed: false,
                    messages: [
                      ["execution_interrupted", { prompt_id: promptId }],
                    ],
                  },
                  outputs: {},
                },
              }
            : {},
        );
      } else
        json(response, { queue_running: [[0, promptId]], queue_pending: [] });
    },
    async (connection) => {
      const service = client();
      const receipt = await service.submitWorkflow(input(connection));
      assert.equal(
        (await service.pollPrompt(connection, receipt)).status,
        "running",
      );
      assert.equal(
        (await service.requestCancel(connection, receipt)).available,
        false,
      );
      supported = true;
      const dispatched = await service.requestCancel(connection, receipt);
      assert.equal(dispatched.cancelRequested, true);
      assert.equal(dispatched.providerCancellationConfirmed, false);
      assert.equal(
        (await service.pollPrompt(connection, receipt)).status,
        "cancelled",
      );
      assert.ok(
        writes.every(
          (route) =>
            route === "/prompt" || route === `/api/jobs/${promptId}/cancel`,
        ),
      );
    },
  );
});

test("Comfy queue absence, malformed histories and failed originals preserve accepted uncertainty", async () => {
  let promptId = "";
  let broken = false;
  await fixture(
    (request, response) => {
      if (request.url === "/object_info") json(response, catalog);
      else if (request.url === "/prompt") {
        let body = "";
        request.on("data", (chunk) => {
          body += chunk;
        });
        request.on("end", () => {
          promptId = JSON.parse(body).prompt_id;
          json(response, { prompt_id: promptId, number: 0, node_errors: {} });
        });
      } else if (request.url?.startsWith("/history/"))
        json(response, broken ? { [promptId]: { outputs: {} } } : {});
      else if (request.url === "/queue")
        json(response, {
          queue_running: [[0, randomUUID()]],
          queue_pending: [],
        });
      else {
        response.writeHead(200, { "content-type": "image/jpeg" });
        response.end(png);
      }
    },
    async (connection) => {
      const service = client();
      const receipt = await service.submitWorkflow(input(connection));
      assert.equal(
        (await service.pollPrompt(connection, receipt)).status,
        "unknown",
      );
      broken = true;
      await assert.rejects(
        service.pollPrompt(connection, receipt),
        (error) =>
          error instanceof ComfyServiceError &&
          error.submissionState === "unknown" &&
          error.comfyReceipt?.promptId === receipt.promptId,
      );
      await assert.rejects(
        service.downloadOriginal(connection, receipt, {
          index: 0,
          nodeId: "2",
          promptId,
          connectionId: connection.id,
          filename: "fixture.png",
          subfolder: "",
          type: "output",
        }),
        /IMAGE_MIME_MISMATCH/,
      );
      await assert.rejects(
        service.pollPrompt(connection, { ...receipt, readOnly: true }),
        /READ_ONLY/,
      );
      await assert.rejects(
        service.downloadOriginal(connection, receipt, {
          index: 0,
          nodeId: "2",
          promptId,
          connectionId: connection.id,
          filename: "../private.png",
          subfolder: "",
          type: "output",
        }),
        /DESCRIPTOR/,
      );
      await assert.rejects(
        service.pollPrompt(
          { ...connection, baseUrl: "https://different.example.test" },
          receipt,
        ),
        /CONNECTION_CHANGED/,
      );
    },
  );
});
