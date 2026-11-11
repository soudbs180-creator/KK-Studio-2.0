import test from "node:test";
import assert from "node:assert/strict";
import { createSubmissionLogic } from "../../src/features/creation/useImageCommandSubmission.ts";
import {
  createProject,
  emptySnapshot,
  createTask,
} from "../../src/features/creation/model.ts";
import { imageSpec } from "../fixtures/image-capability.ts";

for (const unknown of ["status", "submissionState"] as const) {
  test(`capability ${unknown} unknown blocks a fresh canvas request before prepare or persistence`, async () => {
    const project = createProject({
      kind: "image",
      prompt: "original",
      model: "ComfyUI",
      attachments: [],
    });
    const spec = imageSpec("image.upscale");
    project.items = [
      {
        id: "original",
        kind: "image",
        title: "Original",
        description: "",
        assetId: spec.sourceAssetId,
      },
    ];
    const task = createTask(project);
    Object.assign(task, {
      sourceItemId: "original",
      imageCapability: spec,
      status: "interrupted",
      submissionState: "terminal",
      [unknown]: "unknown",
    });
    project.tasks = [task];
    const snapshot = { ...emptySnapshot(), projects: [project] };
    const before = structuredClone(snapshot);
    const submission = createSubmissionLogic({
      creationRef: { current: snapshot },
      activeProjectIdRef: { current: project.id },
      persistence: {
        state: "saved",
        flush: async () => assert.fail("must not flush"),
      },
      homeModelConfig: { model: "", configured: false },
      prepareTask: async () => assert.fail("must not prepare"),
      executeTask: async () => assert.fail("must not execute"),
      cancelTask: () => assert.fail("must not cancel"),
      commitCreation: () => assert.fail("must not append"),
      replaceCanvasItems: () => [],
    });
    const error = await submission.submitImageCommand({
      origin: "canvas",
      input: {
        sourceItemId: "original",
        imageCapability: spec,
        providerConnectionId: "local",
        model: "ComfyUI",
        prompt: "again",
        count: 1,
        signal: new AbortController().signal,
      },
    });
    assert.match(error ?? "", /受理状态未知/);
    assert.deepEqual(snapshot, before);
  });
}
