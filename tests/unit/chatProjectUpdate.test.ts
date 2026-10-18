import assert from "node:assert/strict";
import test from "node:test";
import {
  createProject,
  projectChatView,
  serializeCreationSnapshot,
  emptySnapshot,
} from "../../src/features/creation/model.ts";
import {
  appendChatTaskReply,
  updateProjectChatView,
} from "../../src/features/agent/chatProjectUpdate.ts";

test("editing derived chat fields persists only that chat and reloads from canonical data", () => {
  const project = createProject({
    prompt: "",
    kind: "text",
    model: "fixture",
    attachments: [],
  });
  const first = project.chats![project.activeChatId!];
  project.chats!.other = {
    ...first,
    id: "other",
    draft: { prompt: "other draft" },
    messages: [
      { id: "other-message", role: "assistant", content: "other history" },
    ],
  };
  const originalOther = JSON.stringify(project.chats!.other);
  const edited = updateProjectChatView(project, (view) => ({
    ...view,
    composerDraft: { ...view.composerDraft, prompt: "durable edit" },
    messages: [
      ...view.messages,
      {
        id: "answer",
        role: "assistant",
        content: "saved answer",
        createdAt: 1,
      },
    ],
  }));
  assert.equal(edited.chats![first.id].draft.prompt, "durable edit");
  assert.equal(edited.chats![first.id].draft.text, "durable edit");
  const raw = serializeCreationSnapshot({
    ...emptySnapshot(),
    version: 3,
    projects: [edited],
    activeProjectId: project.id,
  });
  assert.equal(Object.hasOwn(raw.projects[0], "composerDraft"), false);
  assert.equal(Object.hasOwn(raw.projects[0], "messages"), false);
  const loaded = projectChatView(JSON.parse(JSON.stringify(raw)).projects[0]);
  assert.equal(loaded.composerDraft.prompt, "durable edit");
  assert.equal(loaded.messages.at(-1)?.content, "saved answer");
  assert.equal(JSON.stringify(loaded.chats!.other), originalOther);
});

test("switching chat or receiving an accepted task never moves draft or reply to the new chat", () => {
  const project = createProject({
    prompt: "",
    kind: "text",
    model: "fixture",
    attachments: [],
  });
  const first = project.chats![project.activeChatId!];
  first.draft.prompt = "A draft";
  first.messages.push({
    id: "request",
    role: "user",
    content: "A request",
    taskId: "accepted",
  });
  project.chats!.other = {
    ...first,
    id: "other",
    draft: { prompt: "B draft" },
    messages: [],
  };
  const switched = updateProjectChatView(project, (view) => ({
    ...view,
    activeChatId: "other",
  }));
  assert.equal(switched.composerDraft.prompt, "B draft");
  const completed = appendChatTaskReply(
    switched,
    "accepted",
    first.id,
    "A reply",
  );
  assert.equal(completed.chats![first.id].messages.at(-1)?.content, "A reply");
  assert.deepEqual(completed.chats!.other.messages, []);
  assert.equal(completed.composerDraft.prompt, "B draft");
  assert.deepEqual(
    appendChatTaskReply(completed, "accepted", first.id, "A reply").chats![
      first.id
    ].messages,
    completed.chats![first.id].messages,
  );
});
