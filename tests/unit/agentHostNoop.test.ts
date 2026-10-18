import assert from "node:assert/strict";
import test from "node:test";
import { createAgentHost } from "../../src/features/agent/agentHost.ts";
import { createProject } from "../../src/features/creation/model.ts";
import { mergeAgentChatItem } from "../../src/features/agent/agentEvents.ts";

function fixture() {
  let project = createProject({
    kind: "text",
    prompt: "saved draft",
    model: "",
    attachments: [],
  });
  const chat = project.chats![project.activeChatId!];
  chat.agentThreadId = "saved_thread";
  chat.updatedAt = 11;
  chat.messages = [
    {
      id: "saved-answer",
      role: "assistant",
      content: "saved answer",
      threadId: "saved_thread",
      detail: { phase: "completed", retained: { value: 7 } },
    },
  ];
  project.updatedAt = 12;
  let commits = 0;
  let flushes = 0;
  let flushError: Error | undefined;
  let blocked: string | undefined;
  const host = createAgentHost({
    getProject: () => project,
    getProjects: () => [project],
    getExecutionBlockReason: () => blocked,
    commit: (next) => {
      commits++;
      project = next;
    },
    flush: async () => {
      flushes++;
      if (flushError) throw flushError;
    },
    generate: async () => ({ taskId: "unused" }),
  });
  return {
    host,
    get project() {
      return project;
    },
    get commits() {
      return commits;
    },
    get flushes() {
      return flushes;
    },
    scope: { projectId: project.id, chatId: project.activeChatId! },
    failFlush: (error: Error) => {
      flushError = error;
    },
    block: () => {
      blocked = "read-only fixture";
    },
  };
}

test("reconnecting the same canonical thread flushes without changing its saved project", async () => {
  const h = fixture();
  const before = structuredClone(h.project);
  const original = h.project;
  await h.host.saveAgentThread("saved_thread", h.project.id);
  assert.equal(h.commits, 0);
  assert.equal(h.flushes, 1);
  assert.strictEqual(h.project, original);
  assert.deepEqual(h.project, before);
});

test("equal canonical history, including reordered metadata keys, never commits a new timestamp", async () => {
  const h = fixture();
  const before = structuredClone(h.project);
  const original = h.project;
  const messages = h.host
    .readAgentMessages()
    .map((message) => Object.fromEntries(Object.entries(message).reverse()));
  await h.host.saveAgentMessages(
    messages as ReturnType<typeof h.host.readAgentMessages>,
    h.scope,
  );
  assert.equal(h.commits, 0);
  assert.equal(h.flushes, 1);
  assert.strictEqual(h.project, original);
  assert.deepEqual(h.project, before);
});

test("reconnecting merged completed history ignores optional fields omitted by JSON persistence", async () => {
  const h = fixture();
  const original = h.project;
  const messages = h.host.readAgentMessages();
  const merged = messages.map((message) =>
    mergeAgentChatItem(message, structuredClone(message)),
  );
  assert.equal(Object.hasOwn(merged[0], "turnId"), true);
  assert.equal(merged[0].turnId, undefined);
  assert.equal(JSON.stringify(merged), JSON.stringify(messages));
  await h.host.saveAgentMessages(merged, h.scope);
  assert.equal(h.commits, 0);
  assert.equal(h.flushes, 1);
  assert.strictEqual(h.project, original);
});

for (const kind of ["thread", "messages"] as const) {
  test(`a same-value ${kind} save still reports a pending flush failure`, async () => {
    const h = fixture();
    const error = new Error("pending save failed");
    h.failFlush(error);
    await assert.rejects(
      kind === "thread"
        ? h.host.saveAgentThread("saved_thread", h.project.id)
        : h.host.saveAgentMessages(h.host.readAgentMessages(), h.scope),
      error,
    );
    assert.equal(h.commits, 0);
    assert.equal(h.flushes, 1);
  });
}

test("real thread and transcript metadata changes remain durable and replay becomes a no-op", async () => {
  const h = fixture();
  const oldDraft = structuredClone(h.project.chats![h.scope.chatId].draft);
  await h.host.saveAgentThread("new_thread", h.project.id);
  assert.equal(h.commits, 1);
  const messages = h.host.readAgentMessages();
  messages[0] = {
    ...messages[0],
    text: "updated answer",
    threadId: "new_thread",
    detail: { phase: "completed", retained: { value: 8 } },
  };
  await h.host.saveAgentMessages(messages, h.scope);
  assert.equal(h.commits, 2);
  const saved = h.project;
  assert.equal(
    saved.chats![h.scope.chatId].messages[0].content,
    "updated answer",
  );
  assert.deepEqual(saved.chats![h.scope.chatId].draft, oldDraft);
  await h.host.saveAgentThread("new_thread", h.project.id);
  await h.host.saveAgentMessages(h.host.readAgentMessages(), h.scope);
  assert.equal(h.commits, 2);
  assert.equal(h.flushes, 4);
  assert.strictEqual(h.project, saved);
});

test("a metadata-only history update is saved and its replay is idempotent", async () => {
  const h = fixture();
  const messages = h.host.readAgentMessages();
  messages[0] = {
    ...messages[0],
    detail: { phase: "completed", retained: { value: 8 } },
  };
  await h.host.saveAgentMessages(messages, h.scope);
  assert.equal(h.commits, 1);
  const saved = h.project;
  assert.deepEqual(saved.chats![h.scope.chatId].messages[0].detail, {
    phase: "completed",
    retained: { value: 8 },
  });
  assert.equal(
    saved.chats![h.scope.chatId].messages[0].content,
    "saved answer",
  );
  await h.host.saveAgentMessages(messages, h.scope);
  assert.equal(h.commits, 1);
  assert.equal(h.flushes, 2);
  assert.strictEqual(h.project, saved);
});

test("same-value optimization never bypasses write, scope, identity or history validation", async () => {
  const h = fixture();
  const before = structuredClone(h.project);
  const messages = h.host.readAgentMessages();
  await assert.rejects(
    h.host.saveAgentMessages(messages, { ...h.scope, chatId: "other" }),
    /聊天/,
  );
  await assert.rejects(
    h.host.saveAgentMessages(
      messages.map((message) => ({ ...message, threadId: "other_thread" })),
      h.scope,
    ),
    /其他聊天/,
  );
  const malformed = structuredClone(messages);
  Reflect.set(malformed[0], "role", "invalid");
  await assert.rejects(h.host.saveAgentMessages(malformed, h.scope), /格式/);
  h.project.chats!.other = {
    ...structuredClone(h.project.chats![h.scope.chatId]),
    id: "other",
  };
  await assert.rejects(
    h.host.saveAgentThread("saved_thread", h.project.id),
    /线程身份无效或重复/,
  );
  delete h.project.chats!.other;
  h.block();
  await assert.rejects(
    h.host.saveAgentThread("saved_thread", h.project.id),
    /read-only/,
  );
  await assert.rejects(
    h.host.saveAgentMessages(messages, h.scope),
    /read-only/,
  );
  assert.equal(h.commits, 0);
  assert.equal(h.flushes, 0);
  assert.deepEqual(h.project, before);
});
