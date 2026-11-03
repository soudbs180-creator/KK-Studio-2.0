import test from "node:test";
import assert from "node:assert/strict";
import { readEditorSnapshot } from "../../src/features/comfyui/editorSnapshot.ts";
import {
  createImportedWorkflow,
  parseComfyWorkflow,
} from "../../src/features/comfyui/workflowRegistry.ts";
const record = createImportedWorkflow(
  "Mine",
  parseComfyWorkflow({
    "1": { class_type: "CLIPTextEncode", inputs: { text: "old" } },
  }),
);
test("native editor snapshot keeps API inputs and layout in the selected card", () => {
  const updated = readEditorSnapshot(
    {
      workflow: {
        "1": { class_type: "CLIPTextEncode", inputs: { text: "changed" } },
      },
      editorWorkflow: { nodes: [{ id: 1, pos: [100, 200] }] },
    },
    record,
  );
  assert.equal(updated.id, record.id);
  assert.equal(updated.workflow["1"].inputs?.text, "changed");
  assert.deepEqual(updated.editorWorkflow?.nodes, [{ id: 1, pos: [100, 200] }]);
  assert.equal(updated.needsConversion, false);
  assert.equal(record.workflow["1"].inputs?.text, "old");
});
test("rejects incomplete or credential-bearing snapshots before project persistence", () => {
  assert.throws(() => readEditorSnapshot({ workflow: {} }, record));
  assert.throws(() =>
    readEditorSnapshot(
      { workflow: record.workflow, editorWorkflow: { api_key: "private" } },
      record,
    ),
  );
});
