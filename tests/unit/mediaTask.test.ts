import assert from "node:assert/strict";
import test from "node:test";
import {
  createProject,
  createTask,
  emptySnapshot,
  normalizeCreationSnapshot,
} from "../../src/domain/creationModel.ts";
import {
  appendImageTask,
  canvasImageAttachments,
} from "../../src/features/creation/imageTaskCommand.ts";
import { taskSubmissionBinding } from "../../src/features/creation/providerSubmission.ts";
import { newModelProfileConnection } from "../../src/integrations/providers/providerStore.ts";

const video = {
  kind: "video",
  duration: 4,
  aspectRatio: "16:9",
  resolution: "720p",
  audio: true,
} as const;
const input = {
  prompt: "A bird flying",
  model: "veo-3.1-generate-preview",
  kind: "video" as const,
  media: video,
  attachments: [],
  outputCount: 2,
};
const profile = {
  name: "media",
  baseUrl: "https://api.12ai.org/v1",
  model: input.model,
  protocol: "openai-chat" as const,
  authMode: "api-key" as const,
};

test("media parameters survive project, task, append and snapshot boundaries", () => {
  const project = createProject(input);
  assert.deepEqual(project.composerDraft.media, video);
  assert.equal(project.items[0].parameters?.ratio, "16:9");
  assert.equal(project.items[0].parameters?.quality, "720p");
  assert.equal(project.items[0].parameters?.duration, "4");
  assert.equal(project.items[0].parameters?.soundEnabled, true);
  assert.equal(project.items[0].parameters?.count, "2");
  const task = createTask(project);
  assert.deepEqual(task.media, video);
  const appended = appendImageTask(
    project,
    input,
    newModelProfileConnection(profile),
    project.items[0].id,
  );
  assert.deepEqual(appended.task.media, video);
  const snapshot = normalizeCreationSnapshot({
    ...emptySnapshot(),
    projects: [appended.project],
  });
  assert.deepEqual(snapshot?.projects[0].tasks[0].media, video);
  assert.equal(snapshot?.projects[0].tasks[0].requestedOutputs, 2);
});

test("task binding preserves video and audio modality", () => {
  for (const kind of ["video", "audio"] as const) {
    const task = { ...createTask(createProject(input)), kind };
    assert.equal(taskSubmissionBinding(task).kind, kind);
  }
});

test("known Veo and speech profiles advertise the real modality", () => {
  assert.deepEqual(newModelProfileConnection(profile).capabilities.modalities, [
    "video",
  ]);
  assert.deepEqual(
    newModelProfileConnection({ ...profile, model: "tts-1" }).capabilities
      .modalities,
    ["audio"],
  );
});

test("video own output is not an implicit image edit reference", async () => {
  const project = createProject(input);
  const source = { ...project.items[0], assetId: "video-own" };
  assert.deepEqual(
    await canvasImageAttachments(project, source, async () => {
      throw new Error("must not read own video");
    }),
    [],
  );
});
import { prepareImageTask } from "../../src/features/creation/imageTaskCommand.ts";

test("invalid media parameters reject before connection selection with actionable validation", async () => {
  for (const media of [
    { ...video, duration: 7 },
    { ...video, resolution: "2K" },
    { ...video, aspectRatio: "auto" },
    { ...video, extra: true },
  ])
    await assert.rejects(
      prepareImageTask({ ...input, media } as never),
      /视频参数/,
    );
});

test("media rejects audio/video references instead of dropping conditioning", async () => {
  for (const mime of ["video/mp4", "audio/mpeg"])
    await assert.rejects(
      prepareImageTask({
        ...input,
        attachments: [
          { id: "ref", name: "ref", mime, size: 3, assetId: "ref" },
        ],
      }),
      /仅支持.*图片/,
    );
});

import { decodeSnapshot } from "../../src/domain/creationSnapshotCodec.ts";
test("snapshot rejects media parameters for a different modality instead of normalizing them away", () => {
  const project = createProject(input);
  project.tasks = [createTask(project)];
  const snapshot = {
    ...emptySnapshot(),
    projects: [project],
    activeProjectId: project.id,
  };
  assert.doesNotThrow(() => decodeSnapshot(snapshot));
  for (const target of [
    snapshot.homeDraft,
    project.composerDraft,
    project.tasks[0],
  ]) {
    const before = { ...target };
    Object.assign(target, { kind: "audio", media: video });
    assert.throws(() => decodeSnapshot(snapshot), /项目|结构/);
    for (const key of Object.keys(target))
      delete (target as Record<string, unknown>)[key];
    Object.assign(target, before);
  }
});

import { appendImageTaskResults } from "../../src/features/creation/imageTaskCommand.ts";
import { cardSelectionLayout } from "../../src/domain/canvasGraph.ts";
test("new media archives clear a manually placed source and preserve all prior positions", () => {
  const project = createProject(input);
  project.canvas.positions[project.items[0].id] = { x: 732, y: 107 };
  const result = {
    id: "media-result",
    title: "result",
    description: "result",
    kind: "audio" as const,
    result: {
      id: "media-result",
      title: "result",
      description: "result",
      kind: "audio" as const,
      src: "kk-asset:result",
      source: "provider" as const,
    },
  };
  const next = appendImageTaskResults(project, [result], project.items[0].id);
  const box = cardSelectionLayout(project.items[0]);
  assert.ok(
    next.canvas.positions[result.id].x >= 732 + box.left + box.width + 32,
  );
  assert.deepEqual(
    next.canvas.positions[project.items[0].id],
    project.canvas.positions[project.items[0].id],
  );
  assert.deepEqual(
    appendImageTaskResults(next, [result], project.items[0].id),
    next,
  );
});
