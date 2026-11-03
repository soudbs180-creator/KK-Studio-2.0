import test from "node:test";
import assert from "node:assert/strict";
import {
  workflowParameters,
  updateWorkflowParameter,
} from "../../src/features/comfyui/workflowParameters.ts";

const workflow = {
  model: {
    class_type: "CheckpointLoaderSimple",
    inputs: { ckpt_name: "sd15.safetensors" },
  },
  pos: { class_type: "CLIPTextEncode", inputs: { text: "cat" } },
  neg: { class_type: "CLIPTextEncode", inputs: { text: "blur" } },
  latent: {
    class_type: "EmptyLatentImage",
    inputs: { width: 512, height: 768 },
  },
  sampler: {
    class_type: "KSampler",
    inputs: {
      positive: ["pos", 0],
      negative: ["neg", 0],
      seed: 12,
      steps: 20,
      sampler_name: "euler",
    },
  },
};

test("extracts conditioning roles from graph links, not node order or prompt content", () => {
  const parameters = workflowParameters(workflow);
  assert.equal(parameters.find((p) => p.nodeId === "pos")?.label, "正向提示词");
  assert.equal(parameters.find((p) => p.nodeId === "neg")?.label, "反向提示词");
  assert.deepEqual(parameters.map((p) => p.input).sort(), [
    "ckpt_name",
    "height",
    "sampler_name",
    "seed",
    "steps",
    "text",
    "text",
    "width",
  ]);
});

test("updates one scalar immutably and preserves links and unknown custom nodes", () => {
  const graph = {
    ...workflow,
    custom: { class_type: "CustomNode", inputs: { setting: { keep: true } } },
  };
  const changed = updateWorkflowParameter(graph, "latent", "width", 1024);
  assert.equal(changed.latent.inputs?.width, 1024);
  assert.equal(graph.latent.inputs.width, 512);
  assert.deepEqual(changed.custom, graph.custom);
  assert.deepEqual(changed.sampler.inputs?.negative, ["neg", 0]);
  assert.throws(() => updateWorkflowParameter(graph, "latent", "width", -8));
  assert.throws(() =>
    updateWorkflowParameter(
      graph,
      "sampler",
      "seed",
      Number.MAX_SAFE_INTEGER + 1,
    ),
  );
  assert.throws(() =>
    updateWorkflowParameter(graph, "sampler", "negative", "overwrite-link"),
  );
});

test("ignores linked widget values and survives conditioning cycles", () => {
  const graph = {
    ...workflow,
    pos: { class_type: "CLIPTextEncode", inputs: { text: ["loop", 0] } },
    loop: {
      class_type: "ConditioningCombine",
      inputs: { conditioning_1: ["loop", 0] },
    },
  };
  assert.ok(!workflowParameters(graph).some((p) => p.nodeId === "pos"));
});

test("SDXL dual text inputs retain positive and negative conditioning roles", () => {
  const graph = {
    ...workflow,
    pos: {
      class_type: "CLIPTextEncodeSDXL",
      inputs: { text_g: "cat global", text_l: "cat local" },
    },
    neg: {
      class_type: "CLIPTextEncodeSDXL",
      inputs: { text_g: "blur global", text_l: "blur local" },
    },
  };
  const fields = workflowParameters(graph);
  assert.equal(fields.filter((p) => p.nodeId === "pos").length, 2);
  assert.ok(
    fields
      .filter((p) => p.nodeId === "neg")
      .every((p) => p.label.includes("反向提示词")),
  );
  const changed = updateWorkflowParameter(graph, "pos", "text_l", "blue glass");
  assert.equal(changed.pos.inputs?.text_l, "blue glass");
  assert.equal(changed.pos.inputs?.text_g, "cat global");
});
