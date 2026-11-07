import assert from "node:assert/strict";
import test from "node:test";
import { executeMediaOutputs } from "../../src/features/creation/mediaTaskExecution.ts";
import { createProject, createTask } from "../../src/domain/creationModel.ts";
import { newModelProfileConnection } from "../../src/integrations/providers/providerStore.ts";
import { canRetryTask } from "../../src/domain/creationRecovery.ts";

test("definite speech rejection is failed while a transport interruption remains unknown", async () => {
  for (const network of [false, true]) {
    const state = setup();
    state.options.task = {
      ...state.options.task,
      kind: "audio",
      model: "tts-1",
      media: { kind: "audio", voice: "alloy", format: "mp3", speed: 1 },
    };
    state.options.fetch = async () => {
      if (network) throw new TypeError("synthetic network");
      return Response.json({}, { status: 400 });
    };
    await executeMediaOutputs(state.options);
    assert.equal(state.outputs[0].status, network ? "unknown" : "failed");
  }
});

test("querying a partial video batch preserves definite rejection without network or replay", async () => {
  const state = setup();
  state.options.queryOnly = true;
  Object.assign(state.outputs[0], {
    status: "failed",
    error: "request rejected",
    mediaReceipt: {
      connectionId: state.options.connection.id,
      idempotencyKey: `${state.options.task.idempotencyKey}-output-0`,
      acceptance: "rejected",
    },
  });
  state.options.fetch = async () => {
    throw new Error("No query or submit for a definite rejection");
  };
  await executeMediaOutputs(state.options);
  assert.equal(state.outputs[0].status, "failed");
  assert.equal(state.outputs[0].error, "request rejected");
});

function setup() {
  const connection = newModelProfileConnection({
    version: 1,
    name: "video",
    baseUrl: "https://api.12ai.org/v1",
    model: "veo-3.1-generate-preview",
  });
  const project = createProject({
    prompt: "bird",
    model: connection.model!,
    kind: "video",
    attachments: [],
    media: {
      kind: "video",
      duration: 4,
      aspectRatio: "16:9",
      resolution: "720p",
    },
  });
  const task = {
    ...createTask(project),
    providerConnectionId: connection.id,
    providerBaseUrl: connection.baseUrl,
    providerCredentialRef: connection.credentialRef,
  };
  const outputs = structuredClone(task.outputs!);
  const events: string[] = [];
  const controller = new AbortController();
  let stale = false;
  const options = {
    task,
    connection,
    outputs,
    signal: controller.signal,
    queryOnly: false,
    assertCurrent: () => {
      if (stale) throw new Error("source changed");
    },
    persist: async () => {
      events.push(`persist:${outputs[0].mediaReceipt?.acceptance}`);
    },
    archive: async (blob: Blob) => {
      assert.equal(blob.type, "video/mp4");
      events.push("archive");
      outputs[0].assetId = "asset-result";
    },
    resolveCredential: async () => "fixture-secret",
    fetch: async (url: string | URL | Request, init?: RequestInit) => {
      if (init?.method === "POST") {
        events.push("POST");
        return Response.json({ id: "job-1", status: "queued" });
      }
      if (String(url).includes("/task/")) {
        events.push("GET");
        return Response.json({
          id: "job-1",
          status: "completed",
          outputs: ["https://cdn.12ai.org/result.mp4"],
        });
      }
      events.push("download");
      assert.equal(init?.credentials, "omit");
      assert.equal(init?.redirect, "error");
      assert.equal(init?.headers, undefined);
      return new Response(
        new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109]),
        { headers: { "Content-Type": "video/mp4" } },
      );
    },
    pollDelayMs: 0,
  };
  return {
    options,
    outputs,
    events,
    controller,
    stale: () => {
      stale = true;
    },
  };
}

test("Web media persists intent before POST and accepted receipt before polling/archive", async () => {
  const { options, outputs, events } = setup();
  await executeMediaOutputs(options);
  assert.deepEqual(events.slice(0, 4), [
    "persist:unknown",
    "POST",
    "persist:accepted",
    "GET",
  ]);
  assert.equal(outputs[0].status, "succeeded");
  assert.equal(outputs[0].mediaReceipt?.providerJobId, "job-1");
});

test("accepted receipt recovery queries saved id without another POST", async () => {
  const { options, outputs, events } = setup();
  outputs[0].mediaReceipt = {
    connectionId: options.connection.id,
    idempotencyKey: `${options.task.idempotencyKey}-output-0`,
    acceptance: "accepted",
    providerJobId: "job-1",
  };
  options.queryOnly = true;
  await executeMediaOutputs(options);
  assert.equal(events.includes("POST"), false);
  assert.equal(events.includes("GET"), true);
  assert.equal(outputs[0].status, "succeeded");
});

test("unknown no-id receipt never POSTs or becomes safe to retry", async () => {
  const { options, outputs, events } = setup();
  outputs[0].mediaReceipt = {
    connectionId: options.connection.id,
    idempotencyKey: `${options.task.idempotencyKey}-output-0`,
    acceptance: "unknown",
  };
  await executeMediaOutputs(options);
  assert.equal(events.includes("POST"), false);
  assert.equal(outputs[0].status, "unknown");
});

test("HTTP 408 after a video POST remains unknown and cannot open a duplicate retry", async () => {
  const state = setup();
  let posts = 0;
  state.options.fetch = async (_url, init) => {
    if (init?.method === "POST") posts++;
    return Response.json({}, { status: 408 });
  };
  await executeMediaOutputs(state.options);
  assert.equal(posts, 1);
  assert.equal(state.outputs[0].status, "unknown");
  assert.equal(state.outputs[0].mediaReceipt?.acceptance, "unknown");
  assert.equal(
    canRetryTask({
      ...state.options.task,
      status: "unknown",
      outputs: state.outputs,
      submissionState: "unknown",
    }),
    false,
  );
  await executeMediaOutputs(state.options);
  assert.equal(posts, 1, "uncertain no-id receipt must never repeat POST");
});

test("stale source after provider response cannot publish an archive", async () => {
  const state = setup();
  const fetcher = state.options.fetch;
  state.options.fetch = async (url, init) => {
    const response = await fetcher(url, init);
    if (String(url).includes("/task/job-1")) state.stale();
    return response;
  };
  await executeMediaOutputs(state.options);
  assert.equal(state.events.includes("archive"), false);
  assert.equal(state.outputs[0].status, "unknown");
});
