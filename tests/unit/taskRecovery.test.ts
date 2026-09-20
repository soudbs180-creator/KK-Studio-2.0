import assert from "node:assert/strict";
import test from "node:test";
import {
  createProject,
  type CreationProject,
  type CreationTask,
} from "../../src/features/creation/model.ts";
import {
  canRetryTask,
  recoverInterruptedTasks,
} from "../../src/features/creation/taskRecovery.ts";

function task(
  id: string,
  status: CreationTask["status"],
  sourceItemId?: string,
): CreationTask {
  return {
    id,
    sourceItemId,
    prompt: id,
    model: "image-test",
    kind: "image",
    status,
    submissionState: status === "running" ? "submitted" : "intent",
    createdAt: 1,
    updatedAt: 1,
    attachments: [],
    attempt: 1,
    requestedOutputs: 1,
    completedOutputs: 0,
    idempotencyKey: id,
    privacyMode: "byok_local",
  };
}

function project(
  items: CreationProject["items"],
  tasks: CreationTask[],
  id = "project-1",
): CreationProject {
  const value = createProject({
    prompt: "测试项目",
    model: "image-test",
    kind: "image",
    attachments: [],
  });
  return {
    ...value,
    id,
    items,
    tasks,
    updatedAt: 1,
  };
}

function snapshot(projects: CreationProject[]) {
  return {
    version: 2 as const,
    revision: 4,
    activeProjectId: projects[0]?.id ?? null,
    projects,
    homeDraft: {
      prompt: "",
      model: "",
      kind: "image" as const,
      attachments: [],
      approvalMode: "auto" as const,
      privacyMode: "byok_local" as const,
      outputCount: 1,
      updatedAt: 1,
    },
  };
}

test("marks each explicit source and leaves unrelated image nodes untouched", () => {
  const value = project(
    [
      { id: "project-1-prompt", title: "根", description: "", kind: "image" },
      { id: "source-a", title: "A", description: "", kind: "image" },
      { id: "source-b", title: "B", description: "", kind: "image" },
      { id: "unrelated", title: "无关", description: "", kind: "image" },
    ],
    [
      task("task-a", "queued", "source-a"),
      task("task-b", "running", "source-b"),
    ],
  );
  const recovered = recoverInterruptedTasks(snapshot([value]), 99);
  const items = recovered.projects[0].items;
  assert.equal(recovered.revision, 5);
  assert.deepEqual(
    items
      .filter((item) => item.generationStatus === "error")
      .map((item) => item.id),
    ["source-a", "source-b"],
  );
  assert.equal(recovered.projects[0].tasks[0].status, "interrupted");
  assert.equal(recovered.projects[0].tasks[1].status, "unknown");
  assert.equal(recovered.projects[0].tasks[1].updatedAt, 99);
  assert.equal(recovered.projects[0].updatedAt, 99);
});

test("marks an explicit source even when the source already has a result", () => {
  const source = {
    id: "result-source",
    title: "已有结果",
    description: "",
    kind: "image" as const,
    result: {
      id: "result-1",
      kind: "image" as const,
      title: "旧结果",
      description: "",
      source: "provider" as const,
    },
  };
  const value = project([source], [task("task-1", "running", source.id)]);
  const recovered = recoverInterruptedTasks(snapshot([value]), 99);
  assert.equal(recovered.projects[0].items[0].generationStatus, "error");
  assert.deepEqual(recovered.projects[0].items[0].result, source.result);
  assert.equal(recovered.projects[0].tasks[0].status, "unknown");
});

test("does not fall back when an explicit source was deleted", () => {
  const value = project(
    [
      { id: "project-1-prompt", title: "根", description: "", kind: "image" },
      { id: "other", title: "其他", description: "", kind: "image" },
    ],
    [task("task-1", "running", "deleted-source")],
  );
  const recovered = recoverInterruptedTasks(snapshot([value]), 99);
  assert.equal(
    recovered.projects[0].items.some((item) => item.generationStatus),
    false,
  );
  assert.equal(recovered.projects[0].tasks[0].status, "unknown");
});

test("uses the historical root or first unmaterialized image for old tasks", () => {
  const rootProject = project(
    [
      { id: "project-1-prompt", title: "根", description: "", kind: "image" },
      { id: "other", title: "其他", description: "", kind: "image" },
    ],
    [task("legacy-root", "queued")],
  );
  const firstImageProject = project(
    [
      { id: "text", title: "文案", description: "", kind: "text" },
      { id: "first-image", title: "图片", description: "", kind: "image" },
      { id: "second-image", title: "图片 2", description: "", kind: "image" },
    ],
    [task("legacy-image", "running")],
    "project-2",
  );
  const recovered = recoverInterruptedTasks(
    snapshot([rootProject, firstImageProject]),
    99,
  );
  assert.equal(
    recovered.projects[0].items.find((item) => item.id === "project-1-prompt")
      ?.generationStatus,
    "error",
  );
  assert.equal(
    recovered.projects[1].items.find((item) => item.id === "first-image")
      ?.generationStatus,
    "error",
  );
  assert.equal(
    recovered.projects[1].items.find((item) => item.id === "second-image")
      ?.generationStatus,
    undefined,
  );
});

test("unknown or submitted tasks cannot enter the ordinary retry path", () => {
  const unknown = task("unknown", "running");
  unknown.status = "unknown";
  unknown.submissionState = "unknown";
  const submitted = task("submitted", "failed");
  submitted.submissionState = "submitted";
  assert.equal(canRetryTask(unknown), false);
  assert.equal(canRetryTask(submitted), false);
  assert.equal(canRetryTask(task("failed", "failed")), true);
});
