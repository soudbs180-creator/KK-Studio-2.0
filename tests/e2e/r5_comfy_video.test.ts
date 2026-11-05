import test from "node:test";
import assert from "node:assert/strict";
import {
  extractComfyUiOutputs,
  LocalComfyUiAdapter,
} from "../../src/integrations/generation/localComfyUiAdapter.ts";
import { parseComfyUiProgressMessage } from "../../src/features/comfyui/comfyUiProgress.ts";
import type { ProviderConnection } from "../../src/domain/providerConnections.ts";
const base = "http://127.0.0.1:8188";
const connection: ProviderConnection = {
  id: "local",
  provider: "ComfyUI",
  displayName: "local",
  kind: "local_comfyui",
  baseUrl: base,
  state: "active",
  capabilities: {
    modalities: ["video", "image"],
    operations: ["generate"],
    async: true,
  },
};
test("R5-T1-01: actual output adapter preserves MP4 video MIME and job identity", () => {
  const [output] = extractComfyUiOutputs(
    { node: { videos: [{ filename: "scene.mp4" }] } },
    "job",
    base,
  );
  assert.equal(output.kind, "video");
  assert.equal(output.mime, "video/mp4");
  assert.equal(output.providerJobId, "job");
});
test("R5-T1-02: actual output adapter identifies WebM video", () => {
  const [output] = extractComfyUiOutputs(
    { node: { videos: [{ filename: "scene.webm" }] } },
    "job",
    base,
  );
  assert.equal(output.mime, "video/webm");
  assert.equal(output.kind, "video");
});
test("R5-T1-03: real output URL encodes filename folder and output type safely", () => {
  const [output] = extractComfyUiOutputs(
    {
      node: {
        videos: [
          { filename: "片段 & 1.mp4", subfolder: "folder/a", type: "temp" },
        ],
      },
    },
    "job",
    base,
  );
  const url = new URL(output.url);
  assert.equal(url.searchParams.get("filename"), "片段 & 1.mp4");
  assert.equal(url.searchParams.get("subfolder"), "folder/a");
  assert.equal(url.searchParams.get("type"), "temp");
});
test("R5-T1-04: production WebSocket parser reads actual progress and completion events", () => {
  assert.equal(
    parseComfyUiProgressMessage({
      type: "progress",
      data: { value: 25, max: 100, node: "9" },
    }).percent,
    25,
  );
  assert.equal(
    parseComfyUiProgressMessage({ type: "executing", data: { node: null } })
      .percent,
    100,
  );
});
test("R5-T1-05: production cancellation calls only the job-specific endpoint", async (t) => {
  const calls: Array<{ url: string; body?: BodyInit | null }> = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), body: init?.body });
      return new Response("{}", { status: 200 });
    },
  );
  await new LocalComfyUiAdapter(connection).cancel("job/a");
  assert.deepEqual(calls, [
    { url: base + "/api/jobs/job%2Fa/cancel", body: undefined },
  ]);
});
test("R5-T2-01: empty and malformed outputs do not fabricate provider results", () => {
  assert.deepEqual(extractComfyUiOutputs(undefined, "job", base), []);
  assert.deepEqual(
    extractComfyUiOutputs(
      { node: { videos: [{}, { filename: 42 }] } },
      "job",
      base,
    ),
    [],
  );
});
test("R5-T2-02: mixed actual image and video outputs keep distinct kinds and indices", () => {
  const result = extractComfyUiOutputs(
    {
      node: {
        images: [{ filename: "one.png" }],
        videos: [{ filename: "two.webm" }],
      },
    },
    "job",
    base,
  );
  assert.deepEqual(
    result.map((x) => [x.index, x.kind]),
    [
      [0, "image"],
      [1, "video"],
    ],
  );
});
test("R5-T2-03: WebSocket errors retain failure details and zero max does not divide by zero", () => {
  const err = parseComfyUiProgressMessage({
    type: "execution_error",
    data: { exception_message: "out of memory", node_id: "9" },
  });
  assert.equal(err.error, "out of memory");
  assert.equal(err.stage, "9");
  assert.equal(
    parseComfyUiProgressMessage({
      type: "progress",
      data: { value: 1, max: 0 },
    }).percent,
    0,
  );
});
test("R5-T2-04: older servers queue-delete only and explicitly refuse unsafe global interrupt", async (t) => {
  const calls: Array<{ url: string; body?: BodyInit | null }> = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), body: init?.body });
      return new Response("{}", { status: calls.length === 1 ? 404 : 200 });
    },
  );
  await assert.rejects(
    new LocalComfyUiAdapter(connection).cancel("target"),
    /不支持定向中断/,
  );
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, base + "/queue");
  assert.equal(calls[1].body, JSON.stringify({ delete: ["target"] }));
  assert.equal(
    calls.some((c) => c.url.endsWith("/interrupt")),
    false,
  );
});
test("R5-T2-05: explicit cancellation HTTP failure propagates without fallback replay", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return new Response("", { status: 500 });
  });
  await assert.rejects(new LocalComfyUiAdapter(connection).cancel("target"));
  assert.equal(calls, 1);
});
