import assert from "node:assert/strict";
import test from "node:test";
import {
  homeModelSelection,
  normalizeModelSelection,
} from "../../src/domain/modelSelection.ts";
import {
  codexGenerationPrompt,
  codexReasoningModel,
  codexHomeValidation,
} from "../../src/features/agent/codexGeneration.ts";
import { restoreConversationSelection } from "../../src/features/agent/conversationSelection.ts";
import {
  createProject,
  emptySnapshot,
} from "../../src/features/creation/model.ts";
import {
  createProjectPackageManifest,
  preflightProjectPackage,
} from "../../src/features/projects/projectPackage.ts";

test("home defaults to account image capability without rewriting old API metadata", () => {
  const oldDraft = { model: "image-test", providerConnectionId: "legacy-api" };
  assert.deepEqual(homeModelSelection(oldDraft), {
    source: "codex",
    model: "",
    kind: "image",
  });
  assert.deepEqual(oldDraft, {
    model: "image-test",
    providerConnectionId: "legacy-api",
  });
  const api = {
    source: "api",
    model: "image-v2",
    connectionId: "chosen-account",
    kind: "image",
  } as const;
  assert.deepEqual(homeModelSelection({ modelSelection: api }), api);
});

test("image instructions never select an image label as a reasoning model or permit API fallback", () => {
  const image = {
    source: "codex",
    kind: "image",
    model: "image-test",
  } as const;
  assert.equal(codexReasoningModel(image), undefined);
  assert.match(
    codexGenerationPrompt("保留原始需求", image, 2),
    /生成 2 张图片/,
  );
  assert.match(
    codexGenerationPrompt("保留原始需求", image),
    /任何外部生成 API/,
  );
  assert.equal(
    codexGenerationPrompt("普通对话", { source: "default", model: "" }),
    "普通对话",
  );
  assert.throws(() => codexGenerationPrompt("图片", image, 5), /1 至 4/);
  assert.throws(
    () => codexGenerationPrompt("图片", { source: "api", model: "image-v2" }),
    /不能提交/,
  );
  assert.equal(
    normalizeModelSelection({ source: "unknown", model: "bad" }),
    undefined,
  );
});

test("portable project roundtrip retains Codex routing and selected image capability", async () => {
  const project = createProject({
    prompt: "账号生图项目",
    model: "",
    modelSelection: { source: "codex", model: "", kind: "image" },
    kind: "image",
    attachments: [],
  });
  const snapshot = {
    ...emptySnapshot(),
    projects: [project],
    activeProjectId: project.id,
  };
  project.composerDraft.pendingAgent = true;
  project.composerDraft.conversationChannel = "codex";
  const built = await createProjectPackageManifest(snapshot);
  const restored = (await preflightProjectPackage(built)).snapshot.projects[0];
  assert.deepEqual(
    restored.composerDraft.modelSelection,
    project.composerDraft.modelSelection,
  );
  assert.equal(restored.items[0].generationSource, "codex");
  assert.equal(restored.items[0].generationStatus, undefined);
  assert.equal(restored.items[0].description, "Codex 内置生图");
  assert.equal(restored.items[0].providerConnectionId, undefined);
  assert.equal(restored.composerDraft.pendingAgent, true);
  assert.equal(restored.composerDraft.conversationChannel, "codex");
});

test("project selection restoration separates account image intent, API drafts, Google and legacy text", () => {
  const image = { source: "codex", model: "", kind: "image" } as const;
  assert.deepEqual(
    restoreConversationSelection(
      { modelSelection: image },
      { channel: "direct" },
    ),
    { channel: "codex", selection: image },
  );
  const api = {
    modelSelection: {
      source: "api",
      model: "image-test",
      connectionId: "old-api",
    } as const,
  };
  assert.equal(
    restoreConversationSelection(api, { channel: "codex" }).channel,
    "direct",
  );
  assert.equal(
    restoreConversationSelection({ ...api, conversationChannel: "google" }, {})
      .channel,
    "google",
  );
  const legacy = restoreConversationSelection(undefined, {
    channel: "codex",
    model: "account-text-model",
  });
  assert.equal(legacy.selection.kind, "text");
  assert.equal(legacy.selection.model, "account-text-model");
});

test("old API counts stay intact and account counts require explicit correction", () => {
  const draft = { privacyMode: "byok_local", outputCount: 8 };
  assert.match(
    codexHomeValidation(draft, { source: "codex", model: "", kind: "image" })
      .count ?? "",
    /8 张/,
  );
  assert.equal(draft.outputCount, 8);
  assert.equal(
    codexHomeValidation(
      { ...draft, outputCount: 1 },
      { source: "codex", model: "", kind: "image" },
    ).count,
    undefined,
  );
  assert.deepEqual(
    codexHomeValidation(draft, { source: "api", model: "image-test" }),
    {},
  );
  assert.match(
    codexHomeValidation(
      { ...draft, privacyMode: "local_only" },
      { source: "codex", model: "" },
    ).privacy ?? "",
    /需要发送/,
  );
});
