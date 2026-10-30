import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate } from "node:timers/promises";
import * as comfy from "../../src/features/comfyui/index.ts";
import { createProjectCanvas } from "../../src/domain/projectCanvas.ts";
import {
  createProject,
  emptySnapshot,
  normalizeCreationSnapshot,
} from "../../src/domain/creationModel.ts";

for (const recovery of [
  "known",
  "unknown",
  "failed",
  "foreign",
  "invalid",
] as const) {
  test(`workflow reopening recovers ${recovery} history beyond the latest 100`, async (t) => {
    const originalSocket = globalThis.WebSocket;
    globalThis.WebSocket = class {
      close() {}
    } as unknown as typeof WebSocket;
    t.after(() => {
      globalThis.WebSocket = originalSocket;
    });
    t.mock.timers.enable({ apis: ["setInterval"] });
    const requests: string[] = [],
      delivered: string[] = [],
      failed: string[] = [];
    const recent = Object.fromEntries(
      Array.from({ length: 100 }, (_, i) => [
        `other-${i}`,
        { prompt: [i, `other-${i}`, {}, { client_id: "other" }] },
      ]),
    );
    const old = {
      old: {
        prompt: [
          0,
          "old",
          {},
          {
            client_id: recovery === "foreign" ? "other" : "card-host",
            kk_submission_id: "saved-key",
          },
        ],
        status: { status_str: recovery === "failed" ? "error" : "success" },
        outputs:
          recovery === "failed"
            ? {}
            : { "3": { images: [{ filename: "old.png", type: "output" }] } },
      },
    };
    const stop = comfy.watchWorkflow({
      clientId: "card",
      pendingSubmission: () => ({
        key: "saved-key",
        promptId:
          recovery === "unknown"
            ? undefined
            : recovery === "invalid"
              ? "../config"
              : "old",
      }),
      runtime: {
        ...comfy.nativeComfyRuntime,
        async json(path) {
          requests.push(path);
          return path === "/history/old" ||
            (recovery === "unknown" &&
              path === "/history?max_items=100&offset=100")
            ? old
            : recent;
        },
      },
      progress() {},
      async deliver(output) {
        delivered.push(output.promptId);
      },
      failed: (id) => {
        failed.push(id);
      },
    });
    t.after(stop);
    await setImmediate();
    if (recovery === "unknown") {
      t.mock.timers.tick(2000);
      await setImmediate();
    }
    if (recovery === "invalid") {
      assert(!requests.some((path) => path.includes("..")));
      return;
    }
    assert(
      requests.includes(
        recovery === "unknown"
          ? "/history?max_items=100&offset=100"
          : "/history/old",
      ),
    );
    assert.deepEqual(
      delivered,
      recovery === "failed" || recovery === "foreign" ? [] : ["old"],
    );
    assert.deepEqual(failed, recovery === "failed" ? ["old"] : []);
    const count = requests.length;
    stop();
    t.mock.timers.tick(2000);
    await setImmediate();
    assert.equal(requests.length, count);
  });
}

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

test("Comfy mixed video history only publishes supported image files", () => {
  const history = {
    h3: {
      prompt: [0, "h3", {}, { client_id: "card-host" }],
      outputs: {
        "92": {
          images: [{ filename: "h3.mp4", subfolder: "video", type: "output" }],
          animated: [true],
        },
        "first-frame": {
          images: ["frame.PNG", "photo.jpeg", "preview.webp", "animation.gif"].map(
            (filename) => ({ filename, type: "output" }),
          ),
        },
      },
    },
  };
  assert.deepEqual(
    comfy.workflowOutputs(history, ["card-host"]).map((file) => file.filename),
    ["frame.PNG", "photo.jpeg", "preview.webp"],
  );
  history.h3.outputs["92"].images[0].filename = "../secret.mp4";
  assert.throws(() => comfy.workflowOutputs(history, ["card-host"]));
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

test("legacy Comfy output source upgrades before captions change and malformed optional metadata stays safe", () => {
  const project = createProject({
    kind: "image",
    prompt: "fixture",
    model: "fixture",
    attachments: [],
  });
  project.items = [
    {
      id: "comfy-output-" + "a".repeat(24),
      kind: "image",
      title: "legacy",
      description: "ComfyUI · source-card",
    },
  ];
  project.canvas = createProjectCanvas(project.items);
  const upgraded = normalizeCreationSnapshot({
    ...emptySnapshot(),
    projects: [project],
  }).projects[0];
  assert.equal(upgraded.items[0].comfyWorkflowSourceId, "source-card");
  upgraded.items[0].description = "edited caption";
  const restored = normalizeCreationSnapshot({
    ...emptySnapshot(),
    projects: [upgraded],
  }).projects[0];
  assert.equal(restored.items[0].comfyWorkflowSourceId, "source-card");
  Object.assign(project.items[0], {
    description: "No legacy source marker",
    comfyWorkflowSourceId: { invalid: true },
  });
  const malformed = normalizeCreationSnapshot({
    ...emptySnapshot(),
    projects: [project],
  }).projects[0];
  assert.equal(malformed.items[0].comfyWorkflowSourceId, undefined);
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
