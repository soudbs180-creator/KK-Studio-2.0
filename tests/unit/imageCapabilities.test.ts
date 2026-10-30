import assert from "node:assert/strict";
import test from "node:test";
import * as contracts from "../../packages/creation-contracts/index.ts";
import * as capabilities from "../../src/features/capabilities/index.ts";
import { createProject, createTask } from "../../src/domain/creationModel.ts";

import { imageSpec } from "../fixtures/image-capability.ts";
import { imageTaskCapability } from "../../src/features/capabilities/imageTaskCapability.ts";

test("three image capability schemas reject missing bindings, identity changes and invalid parameters", () => {
  const schema = (contracts as Record<string, unknown>)
    .imageCapabilitySchema as {
    parse(value: unknown): unknown;
    safeParse(value: unknown): { success: boolean };
  };
  assert.ok(schema, "P6 image request schema must exist");
  for (const id of ["image.outpaint", "image.upscale", "image.layer-split"])
    assert.ok(schema.parse(imageSpec(id)));
  assert.equal(
    schema.safeParse({
      ...imageSpec(),
      parameters: { left: 0, right: 0, top: 0, bottom: 0 },
    }).success,
    false,
  );
  assert.equal(
    schema.safeParse({
      ...imageSpec("image.upscale"),
      parameters: { scale: 1 },
    }).success,
    false,
  );
  const broken = imageSpec();
  delete (broken.workflow.bindings as Record<string, unknown>).left;
  assert.equal(schema.safeParse(broken).success, false);
  const secret = imageSpec();
  secret.workflow.nodes["2"].inputs.api_key = "private-fixture";
  assert.equal(
    schema.safeParse(secret).success,
    false,
    "quoted JSON credential keys must be rejected",
  );
  const disconnected = imageSpec();
  delete disconnected.workflow.nodes["2"].inputs.image;
  assert.equal(
    schema.safeParse(disconnected).success,
    false,
    "output must depend on the declared original",
  );
});

test("each image capability dispatches only its exact prepared task and upgrades/rolls back independently", async () => {
  const factory = (capabilities as Record<string, unknown>)
    .createImageCapabilityRegistry as () => capabilities.CapabilityRegistry;
  assert.equal(
    typeof factory,
    "function",
    "P6 registry composition must exist",
  );
  const registry = factory();
  for (const id of ["image.outpaint", "image.upscale", "image.layer-split"]) {
    const task = {
      ...createTask(
        createProject({
          kind: "image",
          model: "fixture",
          prompt: "fixture",
          attachments: [],
        }),
      ),
      imageCapability: imageSpec(id),
    };
    let calls = 0;
    const context = {
      platform: "web" as const,
      projectId: "project",
      preparedTask: task,
      permissions: ["ai:generate", "asset:read", "asset:write"] as const,
      modelTraits: [],
      resources: [],
      availableAdapters: [`${id}/comfyui`],
      tasks: {
        async submit(projectId: string, actual: unknown) {
          assert.equal(projectId, "project");
          assert.equal(actual, task);
          calls++;
          return task;
        },
      },
    };
    assert.equal(
      await registry.run(
        id,
        { projectId: "project", taskId: task.id },
        context,
      ),
      task.id,
    );
    assert.equal(calls, 1);
    await assert.rejects(
      registry.run(id, { projectId: "other", taskId: task.id }, context),
    );
    await assert.rejects(
      registry.run(
        id,
        { projectId: "project", taskId: task.id },
        { ...context, permissions: [] },
      ),
    );
    const current = registry.list().find((m) => m.id === id)!;
    registry.register(
      { ...current, version: "1.1.0" },
      imageTaskCapability(id, "1.1.0"),
    );
    task.imageCapability = { ...task.imageCapability, version: "1.1.0" };
    assert.equal(
      await registry.run(
        id,
        { projectId: "project", taskId: task.id },
        { ...context, versionRange: "1.1.0" },
      ),
      task.id,
    );
    assert.equal(calls, 2);
    task.imageCapability = { ...task.imageCapability, version: "1.0.0" };
    assert.throws(() =>
      registry.resolve(id, {
        ...context,
        versionRange: "1.1.0",
        availableAdapters: [],
      }),
    );
    registry.unregister(id, "1.1.0");
    assert.equal(registry.resolve(id, context).manifest.version, "1.0.0");
    assert.equal(registry.list().filter((m) => m.id !== id).length, 2);
  }
});
