import assert from "node:assert/strict";
import test from "node:test";
import {
  createImportedWorkflow,
  createStarterWorkflow,
  parseComfyWorkflow,
  writeLocalWorkflows,
  workflowToJson,
} from "../../src/features/comfyui/workflowRegistry.ts";

test("parses a ComfyUI API prompt and counts nodes", () => {
  const result = parseComfyWorkflow({
    "1": { class_type: "LoadImage", inputs: { image: "input.png" } },
    "2": { class_type: "SaveImage", inputs: {} },
  });
  assert.equal(result.format, "api");
  assert.equal(result.nodeCount, 2);
  assert.equal(result.workflow["1"].class_type, "LoadImage");
});

test("workflow persistence fails visibly when storage is unavailable or rejects a write", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  try {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { localStorage: null },
    });
    assert.throws(
      () => writeLocalWorkflows([createStarterWorkflow()]),
      /本地存储不可用/,
    );
    const old = JSON.stringify([createStarterWorkflow("保留旧工作流")]);
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem: () => old,
          setItem: () => {
            throw new Error("quota fixture");
          },
        },
      },
    });
    assert.throws(() => writeLocalWorkflows([]), /quota fixture/);
    assert.equal(
      (
        globalThis as unknown as { window: { localStorage: Storage } }
      ).window.localStorage.getItem("kk-studio.comfyui.workflows.v1"),
      old,
    );
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("converts a ComfyUI UI export without executing node data", () => {
  const result = parseComfyWorkflow({
    nodes: [
      { id: 7, type: "LoadImage", inputs: [{ name: "image", value: "x" }] },
      { id: 8, type: "SaveImage", inputs: [] },
    ],
  });
  assert.equal(result.format, "ui");
  assert.equal(result.nodeCount, 2);
  assert.equal(result.workflow["7"].class_type, "LoadImage");
});

test("rejects invalid or empty workflow payloads", () => {
  assert.throws(() => parseComfyWorkflow({}), /没有找到可执行/);
  assert.throws(() => parseComfyWorkflow("not-json"), /必须是 JSON/);
});
test("import refuses embedded credentials before persisting them to a card", () => {
  assert.throws(
    () =>
      parseComfyWorkflow({
        "1": { class_type: "CustomNode", inputs: { api_key: "private" } },
      }),
    /凭据/,
  );
});

test("starter and imported records retain a bounded local workflow", () => {
  const starter = createStarterWorkflow();
  assert.equal(starter.source, "created");
  assert.equal(Object.keys(starter.workflow).length, 7);
  assert.deepEqual(starter.workflow["4"].inputs?.negative, ["6", 0]);
  assert.deepEqual(starter.workflow["5"].inputs?.images, ["7", 0]);
  assert.equal(starter.workflow["1"].inputs?.ckpt_name, "");
  const imported = createImportedWorkflow(
    "demo",
    parseComfyWorkflow({ "1": { class_type: "SaveImage" } }),
  );
  assert.equal(imported.source, "imported");
  assert.equal(imported.name, "demo");
});

test("UI export retains widgets, links and layout until native conversion", () => {
  const original = {
    nodes: [
      {
        id: 7,
        type: "KSampler",
        widgets_values: [42, 20],
        pos: [200, 300],
        inputs: [{ name: "model", link: 1 }],
      },
    ],
    links: [[1, 1, 0, 7, 0, "MODEL"]],
  };
  const record = createImportedWorkflow(
    "UI graph",
    parseComfyWorkflow(original),
  );
  const exported = JSON.parse(workflowToJson(record));
  assert.deepEqual(exported, original);
  const restored = createImportedWorkflow(
    "restored",
    parseComfyWorkflow(exported),
  );
  assert.equal(restored.needsConversion, true);
  assert.deepEqual(restored.editorWorkflow, original);
});
