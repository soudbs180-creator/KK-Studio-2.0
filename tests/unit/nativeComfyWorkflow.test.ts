import test from "node:test";
import assert from "node:assert/strict";
import { imageSpec } from "../fixtures/image-capability.ts";
import { nativeComfyWorkflow } from "../../src/features/creation/nativeComfyWorkflow.ts";
import { cardLayout } from "../../src/domain/canvasGraph.ts";
test("native capability workflow binds immutable parameters and declares its archived source input", () => {
  const spec = imageSpec("image.outpaint");
  const before = JSON.stringify(spec);
  const prepared = nativeComfyWorkflow(spec, "more sky");
  assert.deepEqual(prepared.imageBinding, spec.workflow.bindings.image);
  assert.deepEqual(prepared.outputNodeIds, spec.workflow.outputNodeIds);
  const binding = prepared.imageBinding;
  assert.equal(
    (prepared.nodes[binding.nodeId] as { inputs: Record<string, unknown> })
      .inputs[binding.input],
    "__kk_archived_original__",
  );
  assert.equal(JSON.stringify(spec), before);
});

test("retrying the second layer excludes the completed layer SaveImage from inference", () => {
  const spec = imageSpec("image.layer-split");
  const prepared = nativeComfyWorkflow(spec, "split", [1]);
  assert.deepEqual(prepared.outputNodeIds, ["4"]);
  assert.equal(prepared.nodes["3"], undefined);
  assert.ok(prepared.nodes["4"]);
  assert.ok(spec.workflow.nodes["3"]);
  assert.throws(() => nativeComfyWorkflow(spec, "split", [2]), /槽位/);
  assert.throws(() => nativeComfyWorkflow(spec, "split", [1, 1]), /槽位/);
});
test("expanded workflow parameters have matching node and connection geometry", () => {
  const base = {
    id: "workflow",
    kind: "text" as const,
    title: "Workflow",
    description: "",
    comfyWorkflow: { parametersOpen: true },
  };
  assert.equal(cardLayout(base).height, 560);
  assert.equal(cardLayout(base).anchor.y, 280);
});
