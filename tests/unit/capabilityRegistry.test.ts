import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import * as contracts from "../../packages/creation-contracts/index.ts";
import type { CapabilityExecutionContext } from "../../src/features/capabilities/index.ts";
import {
  createProject,
  createTask,
} from "../../src/features/creation/model.ts";

async function registry() {
  assert.ok(
    fs.existsSync("src/features/capabilities/index.ts"),
    "public capability registry must exist",
  );
  const module = await import("../../src/features/capabilities/index.ts");
  return {
    module,
    value: new module.CapabilityRegistry(
      new Map([
        ["task.ref", { parse: (input: unknown) => input }],
        [
          "task.id",
          {
            parse: (output: unknown) => {
              assert.equal(typeof output, "string");
              return output;
            },
          },
        ],
        [
          "image.inpaint.task-reference",
          contracts.capabilityTaskReferenceSchema,
        ],
        ["creation.task-id", contracts.capabilityTaskIdSchema],
      ]),
    ),
  };
}
function manifest(id = "image.inpaint") {
  return {
    id,
    version: "1.0.0",
    title: id,
    kind: "builtin",
    input: "task.ref",
    output: "task.id",
    requires: { permissions: ["ai:generate"] },
    adapters: [
      {
        id: `${id}/provider-api`,
        kind: "provider-api",
        priority: 0,
        compat: "^1.0.0",
      },
    ],
    task: { progress: true, cancellable: true, resumable: false },
    lineage: { inputRoles: ["base", "mask"], relation: "derivedFrom" },
    platforms: ["desktop", "web"],
    degrade: "Model connection required.",
    card: "docs/features/feat-035-image-mask-editing.md",
  };
}
function context(
  overrides: Partial<CapabilityExecutionContext> = {},
): CapabilityExecutionContext {
  return {
    platform: "web",
    permissions: ["ai:generate", "asset:read", "asset:write"],
    modelTraits: [],
    resources: [],
    tasks: { submit: async (_id, task) => task },
    ...overrides,
  };
}
const execute = async () => "existing-task";

test("registry registers, lists defensively, resolves and unregisters without owning task state", async () => {
  const { value } = await registry();
  const declaration = manifest();
  value.register(declaration, execute);
  declaration.title = "changed by caller";
  const listed = value.list();
  listed[0].title = "changed by consumer";
  assert.equal(value.list()[0].title, "image.inpaint");
  assert.equal(
    value.resolve("image.inpaint", context()).adapter.id,
    "image.inpaint/provider-api",
  );
  assert.equal(
    await value.run("image.inpaint", {}, context()),
    "existing-task",
  );
  assert.equal(value.unregister("image.inpaint", ""), false);
  assert.equal(value.list().length, 1);
  assert.equal(value.unregister("image.inpaint", "1.0.0"), true);
  assert.equal(value.unregister("image.inpaint"), false);
  assert.throws(() => value.resolve("image.inpaint", context()), /不可用/);
});

test("invalid manifests, schema references and duplicate identity never replace a valid entry", async () => {
  const { value } = await registry();
  value.register(manifest(), execute);
  assert.throws(() => value.register(manifest(), execute), /重复/);
  for (const candidate of [
    { ...manifest("image.mask"), input: "missing" },
    { ...manifest("image.mask"), output: "missing" },
    { ...manifest("image.mask"), version: "invalid" },
    {
      ...manifest("image.mask"),
      requires: { permissions: ["filesystem:write"] },
    },
  ])
    assert.throws(() => value.register(candidate, execute));
  assert.equal(value.list().length, 1);
});

test("a forward dependency fails closed until present, and closing a three-node cycle is atomic", async () => {
  const { value } = await registry();
  value.register(
    { ...manifest("image.first"), uses: ["image.second"] },
    execute,
  );
  assert.throws(() => value.resolve("image.first", context()), /依赖/);
  value.register(
    { ...manifest("image.second"), uses: ["image.third"] },
    execute,
  );
  assert.throws(
    () =>
      value.register(
        { ...manifest("image.third"), uses: ["image.first"] },
        execute,
      ),
    /环/,
  );
  assert.equal(value.list().length, 2);
  value.register(manifest("image.third"), execute);
  assert.equal(
    value.resolve("image.first", context()).manifest.id,
    "image.first",
  );
  assert.throws(() => value.unregister("image.third"), /依赖/);
});

test("version constraints and adapter priority filter incompatible or unavailable adapters", async () => {
  const { value } = await registry();
  value.register(
    {
      ...manifest(),
      adapters: [
        {
          id: "image.inpaint/old",
          kind: "external-tool",
          priority: 100,
          compat: "^0.9.0",
        },
        {
          id: "image.inpaint/slow",
          kind: "provider-api",
          priority: 1,
          compat: "^1.0.0",
        },
        {
          id: "image.inpaint/fast",
          kind: "provider-api",
          priority: 2,
          compat: "^1.0.0",
        },
      ],
    },
    execute,
  );
  value.register({ ...manifest(), version: "1.1.0" }, execute);
  assert.equal(
    value.resolve("image.inpaint", { ...context(), versionRange: "1.0.x" })
      .adapter.id,
    "image.inpaint/fast",
  );
  assert.equal(
    value.resolve("image.inpaint", context()).manifest.version,
    "1.1.0",
  );
  assert.equal(
    value.resolve("image.inpaint", {
      ...context(),
      versionRange: "1.0.x",
      availableAdapters: ["image.inpaint/slow"],
    }).adapter.id,
    "image.inpaint/slow",
  );
  assert.throws(
    () => value.resolve("image.inpaint", { ...context(), versionRange: "^2" }),
    /不可用/,
  );
});

test("disabled, unsupported platform, missing traits and resources do not invoke executors", async () => {
  for (const extra of [
    { enabled: false },
    { platforms: ["desktop"] },
    { requires: { permissions: [], modelTraits: ["mask-native"] } },
    { requires: { permissions: [], resources: ["comfyui"] } },
  ]) {
    const { value } = await registry();
    let called = false;
    value.register({ ...manifest(), ...extra }, async () => {
      called = true;
      return "task";
    });
    await assert.rejects(value.run("image.inpaint", {}, context()));
    assert.equal(called, false);
  }
});

test("dependency permissions are enforced before any task is handed off", async () => {
  const { value } = await registry();
  let called = false;
  value.register(
    { ...manifest("image.source"), requires: { permissions: ["asset:read"] } },
    execute,
  );
  value.register({ ...manifest(), uses: ["image.source"] }, async () => {
    called = true;
    return "task";
  });
  await assert.rejects(
    value.run("image.inpaint", {}, context({ permissions: ["ai:generate"] })),
    /权限/,
  );
  assert.equal(called, false);
});

test("explicit pre-dispatch fallback requires an event and never retries an executor failure", async () => {
  const { value } = await registry();
  const events: unknown[] = [];
  let called = 0;
  value.register(manifest("image.safe"), async () => {
    called++;
    return "fallback-task";
  });
  value.register({ ...manifest(), fallback: "image.safe@1.0.0" }, async () => {
    throw new Error("not selected");
  });
  const available = ["image.safe/provider-api"];
  await assert.rejects(
    value.run("image.inpaint", {}, context({ availableAdapters: available })),
    /回退/,
  );
  assert.equal(called, 0);
  assert.equal(
    await value.run(
      "image.inpaint",
      {},
      context({
        availableAdapters: available,
        onFallback: (event) => events.push(event),
      }),
    ),
    "fallback-task",
  );
  assert.equal(events.length, 1);
  assert.equal(called, 1);
  const { value: failure } = await registry();
  failure.register(manifest("image.safe"), async () => {
    called++;
    return "duplicate";
  });
  failure.register(
    { ...manifest(), fallback: "image.safe@1.0.0" },
    async () => {
      throw new Error("accepted result unknown");
    },
  );
  await assert.rejects(
    failure.run(
      "image.inpaint",
      {},
      context({ onFallback: (event) => events.push(event) }),
    ),
    /accepted result unknown/,
  );
  assert.equal(called, 1);
});

test("fallback loops and invalid input or output cannot become successful dispatches", async () => {
  const { value } = await registry();
  value.register({ ...manifest(), fallback: "image.other@1.0.0" }, execute);
  value.register(
    { ...manifest("image.other"), fallback: "image.inpaint@1.0.0" },
    execute,
  );
  assert.throws(
    () =>
      value.resolve("image.inpaint", { ...context(), availableAdapters: [] }),
    /环/,
  );
  const { value: invalid } = await registry();
  invalid.register(manifest(), async () => 23);
  await assert.rejects(invalid.run("image.inpaint", {}, context()), /输出/);
});

test("inpaint dispatch preserves the prepared task object and never accepts a forged task reference", async () => {
  const { module, value } = await registry();
  assert.equal(fs.existsSync(module.inpaintCapabilityManifest.card), true);
  value.register(
    module.inpaintCapabilityManifest,
    module.executeInpaintCapability,
  );
  const project = createProject({
    kind: "image",
    prompt: "fixture",
    model: "image-test",
    attachments: [],
    privacyMode: "byok_local",
  });
  const task = createTask(project);
  task.imageEdit = {
    sourceAssetId: "asset-aaaaaaaaaaaaaaaaaaaaaaaa",
    groupId: "group",
    nativeMask: true,
    document: {
      width: 10,
      height: 10,
      regions: [{ id: "region", runs: [[1, 1, 3]] }],
    },
    crop: { x: 0, y: 0, width: 10, height: 10, regionIds: ["region"] },
  };
  let submitted = 0;
  const ctx = context({
    preparedTask: task,
    projectId: project.id,
    tasks: {
      submit: async (projectId, received) => {
        assert.equal(projectId, project.id);
        assert.equal(received, task);
        submitted++;
        return received;
      },
    },
  });
  assert.equal(
    await value.run(
      "image.inpaint",
      { projectId: project.id, taskId: task.id },
      ctx,
    ),
    task.id,
  );
  assert.equal(submitted, 1);
  await assert.rejects(
    value.run(
      "image.inpaint",
      { projectId: project.id, taskId: "forged" },
      ctx,
    ),
  );
  await assert.rejects(
    value.run(
      "image.inpaint",
      { projectId: project.id, taskId: task.id, task },
      ctx,
    ),
  );
  assert.equal(submitted, 1);
});
