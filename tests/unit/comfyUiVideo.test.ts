import assert from "node:assert/strict";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import test from "node:test";
import type { ProviderConnection } from "../../src/domain/providerConnections.ts";
import {
  extractComfyUiOutputs,
  LocalComfyUiAdapter,
} from "../../src/integrations/generation/localComfyUiAdapter.ts";
import { parseComfyUiProgressMessage } from "../../src/features/comfyui/comfyUiProgress.ts";

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString();
}

function sendJson(res: ServerResponse, value: unknown, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(value));
}

async function startFakeServer(
  handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> | void,
) {
  const server = createServer((req, res) => {
    Promise.resolve(handler(req, res)).catch((err) => {
      res.writeHead(500);
      res.end(String(err));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

const mockConnection = (baseUrl: string): ProviderConnection => ({
  id: "local-comfyui",
  provider: "ComfyUI",
  kind: "local_comfyui",
  displayName: "本地 ComfyUI",
  baseUrl,
  capabilities: {
    modalities: ["image", "video"],
    operations: ["generate"],
    maxOutputs: 1,
    async: true,
  },
  state: "active",
});

test("output parsing with .mp4 outputs generates video/mp4 task result", async () => {
  const jobId = "prompt-mp4-job";
  const historyData = {
    [jobId]: {
      outputs: {
        "10": {
          videos: [
            {
              filename: "animation_result.mp4",
              subfolder: "custom_subfolder",
              type: "output",
            },
          ],
        },
      },
    },
  };

  const server = await startFakeServer((req, res) => {
    if (req.url === `/history/${encodeURIComponent(jobId)}`) {
      sendJson(res, historyData);
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  try {
    const adapter = new LocalComfyUiAdapter(mockConnection(server.url));
    const results = await adapter.listResults(jobId);

    assert.equal(results.length, 1);
    const first = results[0];
    assert.equal(first.providerJobId, jobId);
    assert.equal(first.kind, "video");
    assert.equal(first.mime, "video/mp4");
    assert.equal(first.index, 0);
    assert.equal(
      first.url,
      `${server.url}/view?filename=animation_result.mp4&subfolder=custom_subfolder&type=output`,
    );

    // Also verify extractComfyUiOutputs directly
    const directResults = extractComfyUiOutputs(
      historyData[jobId].outputs,
      jobId,
      server.url,
    );
    assert.deepEqual(directResults, results);
  } finally {
    await server.close();
  }
});

test("output parsing with .webm outputs generates video/webm task result", async () => {
  const jobId = "prompt-webm-job";
  const historyData = {
    [jobId]: {
      outputs: {
        "12": {
          videos: [
            {
              filename: "sample_video.webm",
              subfolder: "",
              type: "output",
            },
          ],
        },
      },
    },
  };

  const server = await startFakeServer((req, res) => {
    if (req.url === `/history/${encodeURIComponent(jobId)}`) {
      sendJson(res, historyData);
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  try {
    const adapter = new LocalComfyUiAdapter(mockConnection(server.url));
    const results = await adapter.pollHistory(jobId);

    assert.equal(results.length, 1);
    const first = results[0];
    assert.equal(first.providerJobId, jobId);
    assert.equal(first.kind, "video");
    assert.equal(first.mime, "video/webm");
    assert.equal(first.index, 0);
    assert.equal(
      first.url,
      `${server.url}/view?filename=sample_video.webm&subfolder=&type=output`,
    );
  } finally {
    await server.close();
  }
});

test("WebSocket progress message parser calculates exact percentage", () => {
  // Test value and max percentage calculation
  const p1 = parseComfyUiProgressMessage({
    type: "progress",
    data: { value: 15, max: 30 },
  });
  assert.equal(p1.percent, 50);
  assert.equal(p1.stage, "progress");

  const p2 = parseComfyUiProgressMessage({
    type: "progress",
    data: { value: 25, max: 100 },
  });
  assert.equal(p2.percent, 25);
  assert.equal(p2.stage, "progress");

  const p3 = parseComfyUiProgressMessage({
    type: "progress",
    data: { value: 3, max: 12, node: "sampler-node" },
  });
  assert.equal(p3.percent, 25);
  assert.equal(p3.stage, "sampler-node");

  // Test JSON string input
  const jsonString = JSON.stringify({
    type: "progress",
    data: { value: 75, max: 100 },
  });
  const p4 = parseComfyUiProgressMessage(jsonString);
  assert.equal(p4.percent, 75);
  assert.equal(p4.stage, "progress");

  // Test zero max edge case
  const pZero = parseComfyUiProgressMessage({
    type: "progress",
    data: { value: 0, max: 0 },
  });
  assert.equal(pZero.percent, 0);

  // Test executing message with node ID as current stage
  const execNode = parseComfyUiProgressMessage({
    type: "executing",
    data: { node: "9", prompt_id: "test-prompt" },
  });
  assert.equal(execNode.stage, "9");
  assert.equal(execNode.percent, 0);

  // Test executing message with null node indicating completion
  const execComplete = parseComfyUiProgressMessage({
    type: "executing",
    data: { node: null, prompt_id: "test-prompt" },
  });
  assert.equal(execComplete.stage, "completed");
  assert.equal(execComplete.percent, 100);

  // Test executed message
  const executed = parseComfyUiProgressMessage({
    type: "executed",
    data: { node: "9", prompt_id: "test-prompt" },
  });
  assert.equal(executed.stage, "executed");
  assert.equal(executed.percent, 100);

  // Test execution_error message
  const execError = parseComfyUiProgressMessage({
    type: "execution_error",
    data: {
      node_id: "9",
      exception_message: "CUDA out of memory",
      exception_type: "RuntimeError",
    },
  });
  assert.equal(execError.stage, "9");
  assert.equal(execError.error, "CUDA out of memory");
  assert.equal(execError.percent, 0);
});

test("targeted cancellation request payload format", async () => {
  const targetPromptId = "targeted-prompt-xyz-12345";
  const recordedRequests: Array<{ url: string; method: string; body: unknown }> =
    [];

  const server = await startFakeServer(async (req, res) => {
    const rawBody = await readBody(req);
    const parsed = rawBody ? JSON.parse(rawBody) : null;
    recordedRequests.push({
      url: req.url!,
      method: req.method!,
      body: parsed,
    });
    sendJson(res, { success: true });
  });

  try {
    const adapter = new LocalComfyUiAdapter(mockConnection(server.url));
    await adapter.cancel(targetPromptId);

    // Verify exactly two requests were made
    assert.equal(recordedRequests.length, 2);

    // 1. Send targeted /queue delete request specifying exact prompt_id
    const queueReq = recordedRequests[0];
    assert.equal(queueReq.url, "/queue");
    assert.equal(queueReq.method, "POST");
    assert.deepEqual(queueReq.body, { delete: [targetPromptId] });

    // 2. Call /interrupt for the running prompt ID
    const interruptReq = recordedRequests[1];
    assert.equal(interruptReq.url, "/interrupt");
    assert.equal(interruptReq.method, "POST");
    assert.deepEqual(interruptReq.body, { prompt_id: targetPromptId });
  } finally {
    await server.close();
  }
});
