import { test } from "node:test";
import assert from "node:assert/strict";
import type { CanvasCollectionItem } from "../../src/domain/canvasItems.ts";
import { resolveWorkflowSource } from "../../src/components/canvas/canvasWorkflowSource.ts";

const workflow: CanvasCollectionItem = {
  id: "workflow-card",
  kind: "text",
  title: "ComfyUI 工作流",
  description: "源卡片",
};
const output: CanvasCollectionItem = {
  id: "comfy-output-0123456789abcdef01234567",
  kind: "image",
  title: "生成图片",
  description: "已生成",
  comfyWorkflowSourceId: workflow.id,
};

test("workflow source resolver returns the stable source card", () => {
  assert.equal(resolveWorkflowSource(output, [workflow, output]), workflow);
});

test("workflow source resolver returns undefined when the source card is gone", () => {
  assert.equal(resolveWorkflowSource(output, [output]), undefined);
});
