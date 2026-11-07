import assert from "node:assert/strict";
import test from "node:test";
import { createSubmissionLogic } from "../../src/features/creation/useImageCommandSubmission.ts";
import {
  createProject,
  emptySnapshot,
  type CreateProjectInput,
  type CreationTask,
} from "../../src/features/creation/model.ts";
import { newModelProfileConnection } from "../../src/features/creation/providerRegistry.ts";

Object.defineProperty(navigator, "onLine", { value: true, configurable: true });

const connection = newModelProfileConnection({
  name: "video",
  baseUrl: "https://api.12ai.org/v1",
  model: "veo-3.1-generate-preview",
});
const input: CreateProjectInput = {
  prompt: "A flying bird",
  model: connection.model!,
  providerConnectionId: connection.id,
  kind: "video",
  attachments: [],
  media: {
    kind: "video",
    duration: 4,
    aspectRatio: "16:9",
    resolution: "720p",
  },
  privacyMode: "byok_local",
};

function setup() {
  const project = createProject({
    ...input,
    modelSelection: {
      source: "api",
      model: input.model,
      connectionId: connection.id,
      kind: "video",
    },
  });
  const creationRef = {
    current: {
      ...emptySnapshot(),
      version: 3 as const,
      activeProjectId: project.id,
      projects: [project],
    },
  };
  const prepared: CreateProjectInput[] = [];
  const executed: CreationTask[] = [];
  const logic = createSubmissionLogic({
    creationRef,
    activeProjectIdRef: { current: project.id },
    persistence: { state: "saved", flush: async () => {} },
    homeModelConfig: { configured: false, model: "" },
    prepareTask: async (value) => {
      prepared.push(value);
      return connection;
    },
    executeTask: async (_projectId, taskId, initial) => {
      executed.push(initial!.tasks.find((t) => t.id === taskId)!);
    },
    cancelTask: () => {},
    commitCreation: (next) => {
      creationRef.current = next as typeof creationRef.current;
    },
    replaceCanvasItems: () => project.items,
  });
  return { project, logic, prepared, executed };
}

test("explicit home media selection does not require an unrelated image connection", async () => {
  const state = setup();
  assert.equal(
    await state.logic.submitImageCommand({ origin: "home", input }),
    undefined,
  );
  assert.equal(state.executed[0]?.kind, "video");
  assert.deepEqual(state.executed[0]?.media, input.media);
});

test("canvas video captures provider parameters and keeps its real modality", async () => {
  const state = setup();
  const source = state.project.items[0];
  source.parameters = {
    ratio: "9:16",
    quality: "1080p",
    duration: "6",
    soundEnabled: true,
    count: "2",
  };
  assert.equal(
    await state.logic.submitImageCommand({
      origin: "canvas",
      input: {
        sourceItemId: source.id,
        providerConnectionId: connection.id,
        model: input.model,
        prompt: input.prompt,
        count: 2,
        signal: new AbortController().signal,
      },
    }),
    undefined,
  );
  assert.equal(state.executed[0]?.kind, "video");
  assert.deepEqual(state.executed[0]?.media, {
    kind: "video",
    duration: 6,
    aspectRatio: "9:16",
    resolution: "1080p",
    audio: true,
  });
});
