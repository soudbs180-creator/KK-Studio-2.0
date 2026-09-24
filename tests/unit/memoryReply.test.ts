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
  clientMessageId: "extract-request",
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
    completedAssistantReply([old, user], "extract-request", "thread-a", false),
    null,
  );
});

test("streaming assistant text is ignored until the turn completes", () => {
  assert.equal(
    completedAssistantReply(
      [old, user, { ...assistant, detail: { phase: "updated" } }],
      "extract-request",
      "thread-a",
      false,
    ),
    null,
  );
  assert.equal(
    completedAssistantReply(
      [old, user, { ...assistant, detail: { phase: "completed" } }],
      "extract-request",
      "thread-a",
      true,
    ),
    null,
  );
  assert.equal(
    completedAssistantReply(
      [old, user, { ...assistant, detail: { phase: "completed" } }],
      "extract-request",
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
      "extract-request",
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
      "extract-request",
      "thread-a",
      false,
    ),
    null,
  );
});

test("completed extraction stays bound to its client message when another turn follows", () => {
  const nextUser = {
    ...user,
    id: "next-user",
    clientMessageId: "next-request",
    turnId: "turn-after",
  };
  const nextAssistant = {
    ...assistant,
    id: "next-assistant",
    turnId: "turn-after",
    text: "记忆：无关内容",
    detail: { phase: "completed" },
  };
  assert.equal(
    completedAssistantReply(
      [
        old,
        user,
        { ...assistant, detail: { phase: "completed" } },
        nextUser,
        nextAssistant,
      ],
      "extract-request",
      "thread-a",
      false,
    ),
    assistant.text,
  );
  assert.equal(
    completedAssistantReply(
      [old, user, nextUser, nextAssistant],
      "extract-request",
      "thread-a",
      false,
    ),
    null,
  );
});
