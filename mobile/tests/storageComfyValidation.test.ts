import test from "node:test";
import assert from "node:assert/strict";
import { comfyFixture, asReceipt } from "./storageComfyFixture.ts";
import { validateStoredComfyWorkflow } from "../src/storage/comfyWorkflowSchema.ts";
import type { ComfyWorkflow } from "../src/core/comfyModel.ts";

type PortableCandidate = {
  project: {
    executionReceipts: {
      comfy: {
        identity: {
          projectId: string;
          connectionId: string;
          baseUrl: string;
          workflow: Record<string, { inputs: Record<string, unknown> }>;
          workflowRevision: number;
        };
        requestedOutputs: number;
        promptId: string;
        promptIdConfirmed: unknown;
      };
    }[];
    tasks: { idempotencyKey: string }[];
  };
};

test("Comfy development transport requires explicit runtime policy and cannot travel through backup", async () => {
  const dev = comfyFixture({
      baseUrl: "http://127.0.0.1:8188",
      allowLoopbackHttp: true,
    }),
    prod = comfyFixture();
  try {
    const { repo, projectId } = await dev.ready(),
      p = (await repo.load()).projects[0];
    await repo.saveExecutionReceipt(
      projectId,
      asReceipt(dev.receipt(projectId)),
      p.revision,
    );
    const before = dev.raw(),
      exported = await repo.backup(projectId);
    await assert.rejects(
      dev.create(false).load(),
      /HTTPS|Development loopback/i,
    );
    assert.equal(dev.raw(), before);
    const strict = prod.create();
    await strict.initialize();
    const empty = prod.raw();
    await assert.rejects(
      strict.restore(exported),
      /HTTPS|Development loopback/i,
    );
    assert.equal(prod.raw(), empty);
    assert.ok(!exported.includes("allowLoopbackHttp"));
  } finally {
    dev.close();
    prod.close();
  }
});

for (const mutation of [
  "missing-submission-state",
  "running-intent",
  "forged-live-origin",
] as const) {
  test(`Comfy backup rejects ${mutation} without treating it as recoverable execution`, async () => {
    const f = comfyFixture();
    try {
      const { repo, projectId } = await f.ready(),
        p = (await repo.load()).projects[0];
      await repo.saveExecutionReceipt(
        projectId,
        asReceipt(f.receipt(projectId)),
        p.revision,
      );
      const candidate = JSON.parse(await repo.backup(projectId)),
        before = f.raw();
      if (mutation === "missing-submission-state")
        delete candidate.project.tasks[0].submissionState;
      else if (mutation === "running-intent")
        candidate.project.tasks[0].status = "running";
      else
        candidate.project.executionReceipts[0].originalTaskId =
          candidate.project.tasks[0].id;
      await assert.rejects(
        repo.preflightRestore(JSON.stringify(candidate)),
        /Comfy|intent|identity|state/i,
      );
      assert.equal(f.raw(), before);
    } finally {
      f.close();
    }
  });
}

test("Comfy workflow retains valid 200-node and 100-input structural boundaries and the exact UTF8 byte cap", () => {
  const nodes: ComfyWorkflow = Object.fromEntries(
    Array.from({ length: 200 }, (_, i) => [
      String(i),
      { class_type: "SaveImage", inputs: { filename_prefix: "Captured" } },
    ]),
  );
  validateStoredComfyWorkflow(nodes);
  const inputs: ComfyWorkflow = {
    "1": {
      class_type: "SaveImage",
      inputs: Object.fromEntries(
        Array.from({ length: 100 }, (_, i) => [`field_${i}`, 0]),
      ),
    },
  };
  validateStoredComfyWorkflow(inputs);
  const large: ComfyWorkflow = {
    "1": {
      class_type: "SaveImage",
      inputs: Object.fromEntries(
        Array.from({ length: 32 }, (_, i) => [`field_${i}`, "x".repeat(16000)]),
      ),
    },
  };
  large["1"].inputs.filler = "";
  const remaining =
    512 * 1024 - Buffer.byteLength(JSON.stringify(large), "utf8");
  assert.ok(remaining > 0 && remaining <= 16000);
  large["1"].inputs.filler = "x".repeat(remaining);
  assert.equal(Buffer.byteLength(JSON.stringify(large), "utf8"), 512 * 1024);
  validateStoredComfyWorkflow(large);
  large["1"].inputs.filler += "x";
  assert.throws(() => validateStoredComfyWorkflow(large), /byte limit/i);
});

test("Comfy workflow storage rejects credentials, malformed nodes and UTF8 or structural overflow before changing bytes", async () => {
  const f = comfyFixture();
  try {
    const { repo, projectId } = await f.ready(),
      p = (await repo.load()).projects[0],
      capture = f.receipt(projectId),
      before = f.raw();
    const workflows: unknown[] = [
      {},
      { "1": { class_type: "SaveImage", inputs: { api_key: "private" } } },
      {
        "1": {
          class_type: "SaveImage",
          inputs: { text: "Bearer private-token" },
        },
      },
      {
        "1": { class_type: "SaveImage", inputs: { text: "password=private" } },
      },
      {
        "1": { class_type: "SaveImage", inputs: { cookie: "session=private" } },
      },
      {
        "1": {
          class_type: "SaveImage",
          inputs: { credentialRef: "vault-ref" },
        },
      },
      {
        "1": { class_type: "SaveImage", inputs: { text: { arbitrary: true } } },
      },
      { "1": { class_type: "SaveImage", inputs: { link: ["2", -1] } } },
      { "1": { class_type: "SaveImage", inputs: {}, extra: "hidden" } },
      JSON.parse(
        '{"1":{"class_type":"SaveImage","inputs":{"__proto__":"hidden"}}}',
      ),
      Object.fromEntries(
        Array.from({ length: 201 }, (_, i) => [
          String(i),
          { class_type: "SaveImage", inputs: {} },
        ]),
      ),
      {
        "1": {
          class_type: "SaveImage",
          inputs: Object.fromEntries(
            Array.from({ length: 101 }, (_, i) => [`field_${i}`, 0]),
          ),
        },
      },
      {
        "1": {
          class_type: "SaveImage",
          inputs: Object.fromEntries(
            Array.from({ length: 12 }, (_, i) => [
              `field_${i}`,
              "界".repeat(16000),
            ]),
          ),
        },
      },
    ];
    for (const workflow of workflows) {
      const candidate = structuredClone(capture);
      candidate.comfy.identity.workflow =
        workflow as typeof candidate.comfy.identity.workflow;
      await assert.rejects(
        repo.saveExecutionReceipt(projectId, asReceipt(candidate), p.revision),
        /Comfy|secret|credential|workflow|schema|integer/i,
      );
      assert.equal(f.raw(), before);
    }
  } finally {
    f.close();
  }
});

test("Comfy backup preflight rejects identity and workflow tampering before restore writes", async () => {
  const f = comfyFixture();
  try {
    const { repo, projectId } = await f.ready(),
      p = (await repo.load()).projects[0];
    await repo.saveExecutionReceipt(
      projectId,
      asReceipt(f.receipt(projectId)),
      p.revision,
    );
    const exported = await repo.backup(projectId),
      before = f.raw();
    const mutations: ((value: PortableCandidate) => void)[] = [
      (value) => {
        value.project.executionReceipts[0].comfy.identity.projectId = "foreign";
      },
      (value) => {
        value.project.executionReceipts[0].comfy.identity.connectionId =
          "foreign";
      },
      (value) => {
        value.project.executionReceipts[0].comfy.identity.baseUrl =
          "https://foreign.example";
      },
      (value) => {
        value.project.executionReceipts[0].comfy.requestedOutputs = 2;
      },
      (value) => {
        value.project.executionReceipts[0].comfy.promptId =
          "22222222-2222-4222-8222-222222222222";
      },
      (value) => {
        value.project.executionReceipts[0].comfy.promptIdConfirmed = "false";
      },
      (value) => {
        value.project.executionReceipts[0].comfy.identity.workflow[
          "1"
        ].inputs.api_key = "private";
      },
      (value) => {
        value.project.executionReceipts[0].comfy.identity.workflowRevision = -1;
      },
      (value) => {
        value.project.tasks[0].idempotencyKey = "different";
      },
    ];
    for (const mutate of mutations) {
      const value = JSON.parse(exported);
      mutate(value);
      const candidate = JSON.stringify(value);
      await assert.rejects(
        repo.preflightRestore(candidate),
        /Comfy|credential|secret|identity|hint|schema|integer/i,
      );
      await assert.rejects(
        repo.restore(candidate),
        /Comfy|credential|secret|identity|hint|schema|integer/i,
      );
      assert.equal(f.raw(), before);
    }
    const restored = (await repo.restore(exported)).projects[1],
      historical = JSON.parse(await repo.backup(restored.id));
    historical.project.executionReceipts[0].comfy.identity.projectId =
      restored.id;
    const retained = f.raw();
    await assert.rejects(
      repo.restore(JSON.stringify(historical)),
      /Comfy|origin|historical/i,
    );
    assert.equal(f.raw(), retained);
  } finally {
    f.close();
  }
});

test("Comfy intent exception never weakens existing OpenAI or gateway submitted-task requirements", async () => {
  const f = comfyFixture(),
    repo = f.create();
  try {
    await repo.initialize();
    for (const protocol of ["openai-compatible", "kk-image-jobs"] as const) {
      await repo.saveConnections([
        {
          id: "comfy",
          name: "Existing",
          provider: "Existing",
          protocol,
          baseUrl: "https://comfy.example",
        },
      ]);
      const state = await repo.create("Existing protocol"),
        p = state.projects[state.projects.length - 1];
      const task = {
        ...f.task(),
        id: `task-${protocol}`,
        idempotencyKey: `intent-${protocol}`,
      };
      const saved = await repo.appendTask(p.id, task, p.revision),
        before = f.raw();
      await assert.rejects(
        repo.saveExecutionReceipt(
          p.id,
          { taskId: task.id, connectionId: "comfy", protocol },
          saved.projects[saved.projects.length - 1].revision,
        ),
        /submitted/i,
      );
      assert.equal(f.raw(), before);
    }
  } finally {
    f.close();
  }
});
