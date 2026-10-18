import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { randomUUID } from "node:crypto";
import { createComfyUiClient } from "../src/services/comfyClient.ts";
import type { ComfyWorkflowInput } from "../src/services/comfyTypes.ts";
import { ServiceError } from "../src/services/httpClient.ts";
import {
  comfyFixture,
  asReceipt,
  actualPromptId,
} from "./storageComfyFixture.ts";

const workflow = {
  "1": {
    class_type: "SaveImage",
    inputs: { filename_prefix: "Captured" },
    _meta: { title: "Output" },
  },
};
function handle(request: IncomingMessage, response: ServerResponse) {
  response.writeHead(200, { "content-type": "application/json" });
  response.end(
    JSON.stringify(
      request.url === "/object_info"
        ? {
            SaveImage: {
              input: { required: { filename_prefix: ["STRING"] } },
              output: [],
              output_node: true,
            },
          }
        : { prompt_id: actualPromptId, number: 1, node_errors: {} },
    ),
  );
}
async function fixture(
  run: (baseUrl: string, calls: string[]) => Promise<void>,
) {
  const calls: string[] = [];
  const server = createServer((request, response) => {
    calls.push(request.url ?? "");
    handle(request, response);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  try {
    await run(`http://127.0.0.1:${address.port}`, calls);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}
const inputFor = (
  baseUrl: string,
): ComfyWorkflowInput & { capturedAt?: number } => ({
  submissionId: randomUUID(),
  projectId: "fixture-project",
  workflowRevision: 7,
  connection: {
    id: "comfy",
    protocol: "comfyui",
    baseUrl,
    credentialRef: "vault-only",
  },
  workflow,
});

test("Comfy service retains predurable capturedAt through vault wait and real HTTP acceptance so storage can archive without replacing identity", async () => {
  await fixture(async (baseUrl, calls) => {
    const f = comfyFixture({ baseUrl, allowLoopbackHttp: true });
    try {
      const { repo, projectId } = await f.ready();
      const capture = f.receipt(projectId);
      let project = (await repo.load()).projects[0];
      project = (
        await repo.saveExecutionReceipt(
          projectId,
          asReceipt(capture),
          project.revision,
        )
      ).projects[0];
      assert.deepEqual(
        JSON.parse(f.raw()).projects[0].executionReceipts[0].comfy.identity,
        capture.comfy.identity,
      );
      project = (
        await repo.updateTask(
          projectId,
          {
            ...project.tasks[0],
            status: "running",
            submissionState: "submitted",
            submittedAt: 100,
          },
          project.revision,
        )
      ).projects[0];
      let entered!: () => void;
      const waiting = new Promise<void>((resolve) => (entered = resolve));
      let release!: () => void;
      const ready = new Promise<void>((resolve) => (release = resolve));
      const client = createComfyUiClient({
        allowLoopbackHttp: true,
        timeoutMs: 1000,
        credentials: {
          read: async () => {
            entered();
            await ready;
            return "PUBLIC-TEST-ONLY";
          },
        },
      });
      const input = {
        ...inputFor(baseUrl),
        submissionId: capture.comfy.identity.submissionId,
        projectId,
        workflow: capture.comfy.identity.workflow,
        capturedAt: capture.comfy.identity.capturedAt,
      };
      const pending = client.submitWorkflow(input);
      await waiting;
      assert.equal(calls.length, 0);
      input.capturedAt = 9999;
      release();
      const receipt = await pending;
      assert.deepEqual(receipt.identity, capture.comfy.identity);
      const saved = await repo.saveExecutionReceipt(
        projectId,
        {
          ...asReceipt(capture),
          providerRequestId: receipt.promptId,
          comfy: {
            ...capture.comfy,
            identity: receipt.identity,
            promptId: receipt.promptId,
            promptIdConfirmed: true,
            queueNumber: receipt.queueNumber,
          },
        },
        project.revision,
      );
      assert.equal(
        saved.projects[0].executionReceipts![0].comfy!.identity.capturedAt,
        100,
      );
      assert.equal(
        (await f.create().load()).projects[0].executionReceipts![0]
          .providerRequestId,
        actualPromptId,
      );
      assert.deepEqual(calls, ["/object_info", "/prompt"]);
    } finally {
      f.close();
    }
  });
});

test("Comfy capturedAt invalid values never read vault or send HTTP or reserve submission intent", async () => {
  await fixture(async (baseUrl, calls) => {
    let reads = 0;
    const client = createComfyUiClient({
      allowLoopbackHttp: true,
      credentials: {
        read: async () => {
          reads++;
          return "PUBLIC-TEST-ONLY";
        },
      },
    });
    const input = inputFor(baseUrl);
    for (const value of [
      NaN,
      Infinity,
      -Infinity,
      -1,
      1.5,
      Number.MAX_SAFE_INTEGER + 1,
      null,
      "100",
    ]) {
      await assert.rejects(
        client.submitWorkflow({ ...input, capturedAt: value as number }),
        (error) =>
          error instanceof ServiceError &&
          error.code === "INVALID_COMFY_WORKFLOW_IDENTITY" &&
          error.submissionState === "intent",
      );
      assert.equal(reads, 0);
      assert.equal(calls.length, 0);
    }
    const valid = await client.submitWorkflow({ ...input, capturedAt: 0 });
    assert.equal(valid.identity.capturedAt, 0);
    assert.equal(reads, 1);
    assert.deepEqual(calls, ["/object_info", "/prompt"]);
  });
});

test("Comfy capturedAt keeps exact safe upper bound and omitted value remains backward compatible", async () => {
  await fixture(async (baseUrl) => {
    const client = createComfyUiClient({
      allowLoopbackHttp: true,
      credentials: { read: async () => "PUBLIC-TEST-ONLY" },
    });
    assert.equal(
      (
        await client.submitWorkflow({
          ...inputFor(baseUrl),
          capturedAt: Number.MAX_SAFE_INTEGER,
        })
      ).identity.capturedAt,
      Number.MAX_SAFE_INTEGER,
    );
    const before = Date.now();
    const receipt = await client.submitWorkflow(inputFor(baseUrl));
    assert.ok(Number.isSafeInteger(receipt.identity.capturedAt));
    assert.ok(
      receipt.identity.capturedAt >= before &&
        receipt.identity.capturedAt <= Date.now(),
    );
  });
});
