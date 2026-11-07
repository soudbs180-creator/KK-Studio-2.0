import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import {
  createProject,
  createTask,
} from "../../src/features/creation/model.ts";

async function host() {
  assert.ok(
    fs.existsSync("src/features/creation/inpaintCapabilityDispatch.ts"),
    "inpaint host adapter must exist",
  );
  return import("../../src/features/creation/inpaintCapabilityDispatch.ts");
}
function prepared() {
  const project = createProject({
    prompt: "red",
    kind: "image",
    model: "image-test",
    attachments: [],
    privacyMode: "byok_local",
  });
  const task = createTask(project);
  task.imageEdit = {
    sourceAssetId: "asset-aaaaaaaaaaaaaaaaaaaaaaaa",
    nativeMask: true,
    groupId: "group",
    document: {
      width: 10,
      height: 10,
      regions: [{ id: "region", runs: [[1, 1, 3]] }],
    },
    crop: { x: 0, y: 0, width: 10, height: 10, regionIds: ["region"] },
  };
  return { project, task };
}

test("host hands exactly the original prepared task to the existing lifecycle once", async () => {
  const { dispatchInpaintCapability } = await host();
  const { project, task } = prepared();
  const before = structuredClone(task);
  const events: unknown[] = [];
  let committed = 0;
  for (const adapter of ["provider-api", "comfyui"] as const) {
    const id = await dispatchInpaintCapability({
      projectId: project.id,
      task,
      platform: "web",
      adapter,
      submit: async () => {
        committed++;
        return undefined;
      },
      onDispatch: (event) => events.push(event),
    });
    assert.equal(id, task.id);
  }
  assert.equal(committed, 2);
  assert.deepEqual(task, before);
  assert.deepEqual(
    events,
    ["provider-api", "comfyui"].map((adapter) => ({
      id: "image.inpaint",
      version: "1.0.0",
      adapterId: `image.inpaint/${adapter}`,
    })),
  );
});

test("save rejection or unknown accepted work never enters a fallback or second submission", async () => {
  const { dispatchInpaintCapability } = await host();
  const { project, task } = prepared();
  for (const mode of ["save failure", "cancelled", "accepted unknown"]) {
    let called = 0;
    await assert.rejects(
      dispatchInpaintCapability({
        projectId: project.id,
        task,
        platform: "desktop",
        adapter: "provider-api",
        submit: async () => {
          called++;
          if (mode === "accepted unknown") throw new Error(mode);
          return mode;
        },
      }),
      new RegExp(mode),
    );
    assert.equal(called, 1);
  }
});

test("non-edit and already submitted tasks are refused before touching the original runtime", async () => {
  const { dispatchInpaintCapability } = await host();
  const { project, task } = prepared();
  let called = 0;
  for (const changed of [
    { ...task, imageEdit: undefined },
    { ...task, submissionState: "submitted" as const },
  ])
    await assert.rejects(
      dispatchInpaintCapability({
        projectId: project.id,
        task: changed,
        platform: "web",
        adapter: "provider-api",
        submit: async () => {
          called++;
          return undefined;
        },
      }),
    );
  assert.equal(called, 0);
});
