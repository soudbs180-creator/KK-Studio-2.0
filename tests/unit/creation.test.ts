import assert from "node:assert/strict";
import test from "node:test";
import {
  modelSupportsKind,
  normalizeCreationSnapshot,
} from "../../src/features/creation/model.ts";
import { credentialId } from "../../src/features/creation/providerCredentials.ts";
import {
  canEnterManagedPool,
  type ProviderConnection,
} from "../../src/domain/providerConnections.ts";
import { connectionFromModelProfile } from "../../src/features/creation/providerRegistry.ts";
import { compileDesignPrompt } from "../../src/features/creation/promptCompiler.ts";
import { requiredApprovalGates } from "../../src/domain/agentWorkflow.ts";

test("creation snapshots normalize old drafts without losing project content", () => {
  const snapshot = normalizeCreationSnapshot({
    version: 2,
    revision: 4,
    activeProjectId: "project-1",
    homeDraft: { prompt: "继续", model: "image-test", attachments: [] },
    projects: [
      {
        id: "project-1",
        name: "旧项目",
        kind: "image",
        prompt: "旧提示词",
        model: "image-test",
        attachments: [],
        items: [
          { id: "item-1", title: "结果", description: "", kind: "image" },
          { id: "bad" },
        ],
        messages: [{ id: "m-1", role: "user", content: "旧提示词" }],
        tasks: [],
        favoriteIds: [],
        likedIds: [],
        createdAt: 1,
        updatedAt: 2,
      },
    ],
  });
  assert.equal(snapshot?.activeProjectId, "project-1");
  assert.equal(snapshot?.homeDraft.approvalMode, "auto");
  assert.equal(snapshot?.projects[0]?.items.length, 1);
  assert.equal(snapshot?.projects[0]?.composerDraft.approvalMode, "auto");
});

test("task source item provenance is optional and survives normalization", () => {
  const snapshot = normalizeCreationSnapshot({
    version: 2,
    projects: [
      {
        id: "project-1",
        items: [
          { id: "item-1", title: "结果", description: "", kind: "image" },
        ],
        tasks: [
          {
            id: "task-1",
            sourceItemId: "item-1",
            prompt: "生成",
            model: "image-test",
            status: "queued",
          },
          {
            id: "task-2",
            prompt: "旧任务",
            model: "image-test",
            status: "succeeded",
          },
        ],
      },
    ],
  });
  assert.equal(snapshot?.projects[0]?.tasks[0]?.sourceItemId, "item-1");
  assert.equal(snapshot?.projects[0]?.tasks[1]?.sourceItemId, undefined);
});

test("unknown submissions normalize conservatively and retain the stable identity", () => {
  const snapshot = normalizeCreationSnapshot({
    version: 2,
    revision: 1,
    projects: [
      {
        id: "project-unknown",
        items: [],
        tasks: [
          {
            id: "task-unknown",
            prompt: "生成",
            model: "image-test",
            status: "unknown",
            submissionState: "unknown",
            submittedAt: 42,
            idempotencyKey: "stable-job-key",
          },
        ],
      },
    ],
  });
  const task = snapshot?.projects[0]?.tasks[0];
  assert.equal(task?.status, "unknown");
  assert.equal(task?.submissionState, "unknown");
  assert.equal(task?.submittedAt, 42);
  assert.equal(task?.idempotencyKey, "stable-job-key");
});

test("image capability rejects common text models and accepts image variants", () => {
  assert.equal(modelSupportsKind("gpt-4.1-mini", "image"), false);
  assert.equal(modelSupportsKind("gpt-image-1", "image"), true);
  assert.equal(modelSupportsKind("image-test", "image"), true);
  assert.equal(modelSupportsKind("image-test", "video"), false);
});

test("provider credentials use one canonical URL identity without exposing the key", () => {
  assert.equal(
    credentialId("HTTPS://Example.test/v1/?unused=1"),
    credentialId("https://example.test/v1"),
  );
  assert.notEqual(
    credentialId("https://example.test/V1"),
    credentialId("https://example.test/v1"),
  );
});

test("provider connection metadata is pool-safe and contains no secret field", () => {
  const connection = connectionFromModelProfile({
    version: 1,
    name: "测试 API",
    baseUrl: "https://models.example.test/v1",
    model: "image-test",
  });
  assert.equal(connection.kind, "user_byok");
  assert.equal(canEnterManagedPool(connection), true);
  assert.equal("apiKey" in connection, false);
  const oauth: ProviderConnection = {
    ...connection,
    id: "oauth",
    kind: "user_oauth_local",
  };
  assert.equal(canEnterManagedPool(oauth), false);
});

test("same endpoint accounts receive different vault references", () => {
  const baseUrl = "https://models.example.test/v1";
  const one = connectionFromModelProfile({
    version: 1,
    name: "设计账号 A",
    baseUrl,
    model: "image-test",
  });
  const two = connectionFromModelProfile({
    version: 1,
    name: "设计账号 B",
    baseUrl,
    model: "image-test",
  });
  assert.notEqual(one.id, two.id);
  assert.notEqual(one.credentialRef, two.credentialRef);
});

test("snapshot normalization strips secret-like unknown fields", () => {
  const snapshot = normalizeCreationSnapshot({
    version: 2,
    projects: [
      {
        id: "project-secret",
        name: "项目",
        kind: "image",
        prompt: "测试",
        model: "image-test",
        apiKey: "sk-never-persist",
        attachments: [],
        items: [],
        messages: [],
        tasks: [],
        favoriteIds: [],
        likedIds: [],
        composerDraft: { prompt: "", model: "image-test", attachments: [] },
        createdAt: 1,
        updatedAt: 1,
      },
    ],
  });
  assert.equal("apiKey" in (snapshot?.projects[0] ?? {}), false);
});

test("prompt compiler keeps designer wording and explicit constraints", () => {
  const compiled = compileDesignPrompt("白色风扇放在海边窗台", {
    referenceCount: 2,
    outputCount: 4,
    operation: "edit",
  });
  assert.match(compiled, /白色风扇放在海边窗台/);
  assert.match(compiled, /2 张参考图/);
  assert.match(compiled, /4 个相互独立的变体/);
});

test("approval gates cover remote transfer and expensive batches", () => {
  assert.deepEqual(
    requiredApprovalGates({
      privacyMode: "platform_backed",
      requestedOutputs: 16,
    }),
    ["remote_transfer", "high_cost_batch"],
  );
});
