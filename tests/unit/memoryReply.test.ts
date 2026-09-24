import assert from "node:assert/strict";
import test from "node:test";
import { completedAssistantReply } from "../../src/features/memory/reply.ts";

const old = {
  id: "old",
  role: "assistant" as const,
  text: "记忆：旧偏好",
  threadId: "thread-a",
  turnId: "turn-old",
};
const user = {
  id: "new-user",
  role: "user" as const,
  text: "请提炼记忆",
  threadId: "thread-a",
  turnId: "turn-new",
};
const assistant = {
  id: "new-assistant",
  role: "assistant" as const,
  text: "记忆：新偏好",
  threadId: "thread-a",
  turnId: "turn-new",
};

test("a newly appended user message cannot reuse an old assistant reply", () => {
  assert.equal(
    completedAssistantReply([old, user], new Set([old.id]), "thread-a", false),
    null,
  );
});

test("streaming assistant text is ignored until the turn completes", () => {
  assert.equal(
    completedAssistantReply(
      [old, user, { ...assistant, detail: { phase: "updated" } }],
      new Set([old.id]),
      "thread-a",
      false,
    ),
    null,
  );
  assert.equal(
    completedAssistantReply(
      [old, user, { ...assistant, detail: { phase: "completed" } }],
      new Set([old.id]),
      "thread-a",
      true,
    ),
    null,
  );
  assert.equal(
    completedAssistantReply(
      [old, user, { ...assistant, detail: { phase: "completed" } }],
      new Set([old.id]),
      "thread-a",
      false,
    ),
    assistant.text,
  );
});

test("a reply from a different turn or thread is ignored", () => {
  assert.equal(
    completedAssistantReply(
      [
        old,
        user,
        { ...assistant, turnId: "turn-other", detail: { phase: "completed" } },
      ],
      new Set([old.id]),
      "thread-a",
      false,
    ),
    null,
  );
  assert.equal(
    completedAssistantReply(
      [
        old,
        user,
        { ...assistant, threadId: "thread-b", detail: { phase: "completed" } },
      ],
      new Set([old.id]),
      "thread-a",
      false,
    ),
    null,
  );
});
