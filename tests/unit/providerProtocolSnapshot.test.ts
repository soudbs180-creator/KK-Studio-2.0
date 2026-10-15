import assert from "node:assert/strict";
import test from "node:test";
import {
  createProject,
  createTask,
  emptySnapshot,
  normalizeCreationSnapshot,
  type CreateProjectInput,
} from "../../src/features/creation/model.ts";
import {
  decodeSnapshot,
  parseSnapshot,
} from "../../src/features/creation/snapshotCodec.ts";
import {
  createProjectPackageManifest,
  preflightProjectPackage,
} from "../../src/features/projects/projectPackage.ts";

const protocols = [
  "openai-chat",
  "openai-responses",
  "anthropic",
  "azure-openai",
  "ollama",
] as const;
function input(): CreateProjectInput {
  return {
    prompt: "fixture",
    model: "fixture-text",
    kind: "text",
    attachments: [],
  };
}
function snapshot() {
  const project = createProject(input());
  project.tasks = [createTask(project)];
  return {
    ...emptySnapshot(),
    revision: 1,
    activeProjectId: project.id,
    projects: [project],
  };
}

test("legacy project/task snapshots do not gain protocol/auth fields", () => {
  const original = snapshot();
  const normalized = decodeSnapshot(original);
  for (const item of [
    original.projects[0],
    original.projects[0].tasks[0],
    normalized.projects[0],
    normalized.projects[0].tasks[0],
  ]) {
    assert.equal(Object.hasOwn(item, "providerProtocol"), false);
    assert.equal(Object.hasOwn(item, "providerAuthMode"), false);
  }
});

for (const protocol of protocols)
  test(`project/task metadata survives capture and snapshot: ${protocol}`, () => {
    const project = createProject({
      ...input(),
      providerBaseUrl:
        protocol === "azure-openai"
          ? "https://resource.openai.azure.com/openai/v1"
          : "https://provider.example/v1",
      providerProtocol: protocol,
      providerAuthMode: "api-key",
    });
    project.tasks = [createTask(project)];
    const source = {
      ...emptySnapshot(),
      revision: 1,
      activeProjectId: project.id,
      projects: [project],
    };
    const restored = parseSnapshot(JSON.stringify(source));
    assert.equal(restored.projects[0].providerProtocol, protocol);
    assert.equal(restored.projects[0].providerAuthMode, "api-key");
    assert.equal(restored.projects[0].tasks[0].providerProtocol, protocol);
    assert.equal(restored.projects[0].tasks[0].providerAuthMode, "api-key");
    assert.equal(
      restored.projects[0].tasks[0].idempotencyKey,
      project.tasks[0].idempotencyKey,
    );
  });

test("snapshot readers reject unknown enums instead of silently erasing them", () => {
  for (const field of ["providerProtocol", "providerAuthMode"])
    for (const scope of ["project", "task"]) {
      const bad = snapshot();
      const target =
        scope === "project" ? bad.projects[0] : bad.projects[0].tasks[0];
      Object.assign(target, { [field]: "unknown" });
      assert.throws(() => decodeSnapshot(bad));
      assert.equal(normalizeCreationSnapshot(bad), null);
    }
});

test("keyless protocol snapshots allow only strict loopback Chat/Ollama", () => {
  for (const providerBaseUrl of [
    "http://localhost:11434/v1",
    "http://127.0.0.1:11434/v1",
    "http://[::1]:11434/v1",
  ]) {
    const project = createProject({
      ...input(),
      providerBaseUrl,
      providerProtocol: "ollama",
      providerAuthMode: "none",
    });
    project.tasks = [createTask(project)];
    const restored = decodeSnapshot({
      ...emptySnapshot(),
      projects: [project],
      activeProjectId: project.id,
    });
    assert.equal(restored.projects[0].tasks[0].providerAuthMode, "none");
    assert.equal(restored.projects[0].providerCredentialRef, undefined);
  }
  for (const base of [
    "https://provider.example/v1",
    "http://127.0.0.2:11434/v1",
    "http://192.168.1.2/v1",
    "http://localhost.evil.test/v1",
  ]) {
    const bad = snapshot();
    Object.assign(bad.projects[0], {
      providerBaseUrl: base,
      providerProtocol: "ollama",
      providerAuthMode: "none",
    });
    assert.throws(() => decodeSnapshot(bad));
    assert.equal(normalizeCreationSnapshot(bad), null);
  }
});

test("task routes validate independently from their project's current connection", () => {
  const bad = snapshot();
  Object.assign(bad.projects[0], {
    providerBaseUrl: "http://127.0.0.1:11434/v1",
    providerProtocol: "ollama",
    providerAuthMode: "none",
  });
  Object.assign(bad.projects[0].tasks[0], {
    providerBaseUrl: "https://provider.example/v1",
    providerProtocol: "ollama",
    providerAuthMode: "none",
  });
  assert.throws(() => decodeSnapshot(bad));
  assert.equal(normalizeCreationSnapshot(bad), null);
  for (const providerProtocol of [
    "anthropic",
    "openai-responses",
    "azure-openai",
  ] as const) {
    Object.assign(bad.projects[0].tasks[0], {
      providerBaseUrl: "http://127.0.0.1:11434/v1",
      providerProtocol,
    });
    assert.throws(() => decodeSnapshot(bad));
  }
});

test("createProject/createTask reject corrupt runtime routing metadata", () => {
  assert.throws(() =>
    createProject({
      ...input(),
      providerProtocol: "unknown",
    } as unknown as CreateProjectInput),
  );
  const project = createProject(input());
  Object.assign(project, {
    providerBaseUrl: "https://provider.example/v1",
    providerAuthMode: "none",
  });
  assert.throws(() => createTask(project));
});

test("portable Web package retains captured protocol and plain text outputs", async () => {
  const project = createProject({
    ...input(),
    providerBaseUrl: "http://127.0.0.1:11434/v1",
    providerProtocol: "ollama",
    providerAuthMode: "none",
  });
  const task = createTask(project);
  task.status = "succeeded";
  task.submissionState = "terminal";
  task.outputs = [
    {
      index: 0,
      status: "succeeded",
      text: "正文🌍",
      model: task.model,
      createdAt: 1,
    },
  ];
  project.tasks = [task];
  const built = await createProjectPackageManifest(
    { ...emptySnapshot(), projects: [project], activeProjectId: project.id },
    async () => null,
  );
  const restored = await preflightProjectPackage(built);
  assert.equal(restored.snapshot.projects[0].providerProtocol, "ollama");
  assert.equal(restored.snapshot.projects[0].tasks[0].providerAuthMode, "none");
  assert.equal(
    restored.snapshot.projects[0].tasks[0].outputs?.[0].text,
    "正文🌍",
  );
});
