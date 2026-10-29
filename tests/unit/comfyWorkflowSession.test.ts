import assert from "node:assert/strict";
import test from "node:test";
import * as comfy from "../../src/features/comfyui/index.ts";
import {
  createProject,
  emptySnapshot,
  normalizeCreationSnapshot,
} from "../../src/domain/creationModel.ts";

test("Comfy workflow output capture checks history client ownership, output type and safe path", () => {
  const parse = (comfy as Record<string, unknown>).workflowOutputs as (
    v: unknown,
    clients: string[],
  ) => Array<{ filename: string; promptId: string }>;
  assert.equal(typeof parse, "function");
  const history = {
    a: {
      prompt: [0, "a", {}, { client_id: "card-editor" }],
      outputs: {
        "3": {
          images: [
            { filename: "one.png", type: "output" },
            { filename: "preview.png", type: "temp" },
          ],
        },
      },
    },
    b: {
      prompt: [0, "b", {}, { client_id: "other" }],
      outputs: { "3": { images: [{ filename: "wrong.png", type: "output" }] } },
    },
  };
  assert.deepEqual(
    parse(history, ["card-host", "card-editor"]).map((x) => x.filename),
    ["one.png"],
  );
  const bad = structuredClone(history);
  bad.a.outputs["3"].images[0].filename = "../secret.png";
  assert.throws(() => parse(bad, ["card-editor"]));
});

test("Comfy output delivery writes the original asset before applyOps and is idempotent across replay", async () => {
  const factory = (comfy as Record<string, unknown>).createWorkflowDelivery as (
    options: unknown,
  ) => (output: unknown) => Promise<void>;
  assert.equal(typeof factory, "function");
  const calls: string[] = [];
  const published = new Set<string>();
  const write = factory({
    clientId: "card",
    isCurrent: () => true,
    hasOutput: (id: string) => published.has(id),
    readOutput: async () => "data:image/png;base64,original",
    assets: {
      async write() {
        calls.push("asset");
        return {
          assetId: "asset-" + "a".repeat(24),
          preview: "data:image/png;base64,original",
          mime: "image/png",
        };
      },
    },
    async applyOps(value: { id: string; asset: { assetId: string } }) {
      calls.push("canvas");
      assert.match(value.asset.assetId, /^asset-/);
      published.add(value.id);
    },
  });
  const output = {
    promptId: "job",
    nodeId: "3",
    filename: "one.png",
    subfolder: "",
    type: "output",
  };
  await Promise.all([write(output), write(output)]);
  await write(output);
  assert.deepEqual(calls, ["asset", "canvas"]);
});

test("late Comfy archival cannot attach to a replaced project or deleted workflow card", async () => {
  const factory = (comfy as Record<string, unknown>).createWorkflowDelivery as (
    options: unknown,
  ) => (output: unknown) => Promise<void>;
  assert.equal(typeof factory, "function");
  let current = true,
    applied = 0;
  const write = factory({
    clientId: "card",
    isCurrent: () => current,
    hasOutput: () => false,
    readOutput: async () => "data:image/png;base64,original",
    assets: {
      async write() {
        current = false;
        return { assetId: "asset-" + "a".repeat(24) };
      },
    },
    async applyOps() {
      applied++;
    },
  });
  await write({
    promptId: "job",
    nodeId: "3",
    filename: "one.png",
    subfolder: "",
    type: "output",
  });
  assert.equal(applied, 0);
});

test("workflow card metadata remains optional in old projects and round-trips submitted identity", () => {
  const project = createProject({
    kind: "image",
    prompt: "fixture",
    model: "fixture",
    attachments: [],
  });
  project.items[0].comfyWorkflow = {
    workflowId: "workflow-1",
    submission: { key: "intent-1", state: "submitted", promptId: "job-1" },
  };
  const snapshot = normalizeCreationSnapshot({
    ...emptySnapshot(),
    projects: [project],
  });
  assert.deepEqual(
    snapshot.projects[0].items[0].comfyWorkflow,
    project.items[0].comfyWorkflow,
  );
  delete project.items[0].comfyWorkflow;
  assert.equal(
    normalizeCreationSnapshot({ ...emptySnapshot(), projects: [project] })
      .projects[0].items[0].comfyWorkflow,
    undefined,
  );
});

test("only a failed job from this card may release its submitted marker", () => {
  const raw = {
    one: {
      prompt: [0, "one", {}, { client_id: "mine", kk_submission_id: "key" }],
      status: { status_str: "error" },
    },
    other: {
      prompt: [0, "other", {}, { client_id: "other" }],
      status: { status_str: "error" },
    },
  };
  assert.deepEqual(comfy.workflowFailures(raw, ["mine"]), [
    { promptId: "one", key: "key" },
  ]);
});

test("unknown submissions reconcile from their durable key; definitive prompt rejections may retry", () => {
  const owned = {
    prompt: [
      0,
      "accepted",
      {},
      { client_id: "card-host", kk_submission_id: "saved-intent" },
    ],
    outputs: { "3": { images: [{ filename: "one.png", type: "output" }] } },
  };
  assert.equal(
    comfy.workflowOutputs({ accepted: owned }, ["card-host"])[0].submissionKey,
    "saved-intent",
  );
  assert(comfy.isWorkflowRejection("ComfyUI 请求失败（HTTP 400）"));
  assert(!comfy.isWorkflowRejection("无法连接本机 ComfyUI"));
  assert(!comfy.isWorkflowRejection("ComfyUI 请求失败（HTTP 502）"));
});
