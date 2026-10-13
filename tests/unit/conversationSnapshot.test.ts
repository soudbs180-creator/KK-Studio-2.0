import assert from "node:assert/strict";
import test from "node:test";
import {
  createProject,
  createTask,
  normalizeCreationSnapshot,
} from "../../src/features/creation/model.ts";

test("assistant choice and frozen conversation routing survive the existing project store", () => {
  const project = createProject({
    prompt: "hello",
    model: "chat",
    kind: "text",
    attachments: [],
  });
  project.composerDraft.assistantId = "assistant-code-builder";
  project.composerDraft.conversationRoutes = [
    { connectionId: "local", modelId: "chat" },
  ];
  const task = {
    ...createTask(project),
    providerProtocol: "anthropic-messages" as const,
    providerAuthMode: "api_key" as const,
    conversationRoundId: "round-1",
    conversationUserMessageId: "message-1",
    conversationMessages: [
      { role: "user" as const, content: "hello" },
      { role: "assistant" as const, content: "world" },
    ],
  };
  project.tasks = [task];
  const restored = normalizeCreationSnapshot({
    version: 2,
    revision: 1,
    activeProjectId: project.id,
    projects: [project],
  })!.projects[0];
  assert.equal(restored.composerDraft.assistantId, "assistant-code-builder");
  assert.deepEqual(restored.composerDraft.conversationRoutes, [
    { connectionId: "local", modelId: "chat" },
  ]);
  assert.equal(restored.tasks[0].providerProtocol, "anthropic-messages");
  assert.deepEqual(
    restored.tasks[0].conversationMessages,
    task.conversationMessages,
  );
  assert.equal(restored.tasks[0].conversationRoundId, "round-1");
});

test("corrupt protocol/history cannot silently become a different request on restore", () => {
  const project = createProject({
    prompt: "hello",
    model: "chat",
    kind: "text",
    attachments: [],
  });
  project.tasks = [
    {
      ...createTask(project),
      providerBaseUrl: "https://example.com/v1",
      providerProtocol: "unknown",
      conversationMessages: [{ role: "tool", content: "unsafe" }],
    },
  ] as never;
  const task = normalizeCreationSnapshot({
    version: 2,
    revision: 1,
    projects: [project],
  })!.projects[0].tasks[0];
  assert.equal(task.providerBaseUrl, undefined);
});
