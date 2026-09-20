import assert from "node:assert/strict";
import test from "node:test";
import {
  createImportedWorkflow,
  createStarterWorkflow,
  parseComfyWorkflow,
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

test("starter and imported records retain a bounded local workflow", () => {
  const starter = createStarterWorkflow();
  assert.equal(starter.source, "created");
  assert.equal(Object.keys(starter.workflow).length, 5);
  const imported = createImportedWorkflow(
    "demo",
    parseComfyWorkflow({ "1": { class_type: "SaveImage" } }),
  );
  assert.equal(imported.source, "imported");
  assert.equal(imported.name, "demo");
});
