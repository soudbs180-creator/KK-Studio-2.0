import { test } from "node:test";
import assert from "node:assert/strict";
import {
  comfyFixture,
  asReceipt,
  actualPromptId,
} from "./storageComfyFixture.ts";
import { validateComfyCapture } from "../src/storage/comfyCapture.ts";
import { comfyOutputKey, sameComfyJson } from "../src/core/comfyIdentity.ts";
import type { MobileExecutionReceipt } from "../src/core/mobileModel.ts";

const descriptor = () => {
  const route = {
    nodeId: "1",
    filename: "A.png",
    subfolder: "",
    type: "output" as const,
  };
  return { slot: 0, key: comfyOutputKey(route), ...route };
};
test("shared Comfy JSON equality preserves array order and every value/field while accepting nested key reorder", () => {
  const a = {
    source: { inputs: { model: "one", seed: 1 }, class_type: "Image" },
    output: { inputs: { images: ["source", 0] }, class_type: "Save" },
  };
  const b = {
    output: { class_type: "Save", inputs: { images: ["source", 0] } },
    source: { class_type: "Image", inputs: { seed: 1, model: "one" } },
  };
  assert.equal(sameComfyJson(a, b), true);
  assert.equal(
    sameComfyJson(a, {
      ...b,
      source: { ...b.source, inputs: { model: "one", seed: 2 } },
    }),
    false,
  );
  assert.equal(sameComfyJson(["source", 0], [0, "source"]), false);
  assert.equal(sameComfyJson({ value: null }, {}), false);
});

test("Comfy output identity mapping rejects routes, duplicates, slot or hash forgery before changing stored bytes", async () => {
  const f = comfyFixture();
  try {
    const { repo, projectId } = await f.ready();
    let project = (await repo.load()).projects[0];
    const initial = asReceipt(f.receipt(projectId));
    project = (
      await repo.saveExecutionReceipt(projectId, initial, project.revision)
    ).projects[0];
    project = (
      await repo.updateTask(
        projectId,
        {
          ...project.tasks[0],
          status: "running",
          submissionState: "submitted",
        },
        project.revision,
      )
    ).projects[0];
    const accepted: MobileExecutionReceipt = {
      ...initial,
      providerRequestId: actualPromptId,
      comfy: {
        ...initial.comfy!,
        promptId: actualPromptId,
        promptIdConfirmed: true,
        queueNumber: 1,
        outputs: [descriptor()],
      },
    };
    project = (
      await repo.saveExecutionReceipt(projectId, accepted, project.revision)
    ).projects[0];
    const before = f.raw();
    for (const changed of [
      { ...descriptor(), filename: "B.png" },
      {
        ...descriptor(),
        filename: "B.png",
        key: comfyOutputKey({ ...descriptor(), filename: "B.png" }),
      },
      { ...descriptor(), slot: 1 },
      { ...descriptor(), key: "forged" },
      { ...descriptor(), nodeId: "missing-node" },
      { ...descriptor(), filename: "../A.png" },
      { ...descriptor(), subfolder: "../private" },
      { ...descriptor(), sha256: "not-a-hash" },
    ]) {
      await assert.rejects(
        repo.saveExecutionReceipt(
          projectId,
          { ...accepted, comfy: { ...accepted.comfy!, outputs: [changed] } },
          project.revision,
        ),
        /Comfy|output|slot|hash/i,
      );
      assert.equal(f.raw(), before);
      project = (await repo.load()).projects[0];
    }
    await assert.rejects(
      repo.saveExecutionReceipt(
        projectId,
        { ...accepted, comfy: { ...accepted.comfy!, outputs: [] } },
        project.revision,
      ),
      /Comfy|output/i,
    );
    assert.equal(f.raw(), before);
    project = (await repo.load()).projects[0];
    const hashed = {
      ...accepted,
      comfy: {
        ...accepted.comfy!,
        outputs: [{ ...descriptor(), sha256: "a".repeat(64) }],
      },
    };
    project = (
      await repo.saveExecutionReceipt(projectId, hashed, project.revision)
    ).projects[0];
    const hashedBefore = f.raw();
    await assert.rejects(
      repo.saveExecutionReceipt(
        projectId,
        {
          ...hashed,
          comfy: {
            ...hashed.comfy,
            outputs: [{ ...descriptor(), sha256: "b".repeat(64) }],
          },
        },
        project.revision,
      ),
      /hash cannot change/,
    );
    assert.equal(f.raw(), hashedBefore);
    assert.throws(
      () =>
        validateComfyCapture({
          ...initial.comfy!,
          promptId: actualPromptId,
          promptIdConfirmed: true,
          requestedOutputs: 2,
          outputs: [descriptor(), { ...descriptor(), slot: 1 }],
        }),
      /duplicated/,
    );
    validateComfyCapture(initial.comfy); // Legacy captures remain loadable.
  } finally {
    f.close();
  }
});
