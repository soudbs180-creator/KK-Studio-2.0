import { test } from "node:test";
import assert from "node:assert/strict";
import { readAgentStream } from "../src/services/agentProtocol.ts";

const context = {
  requestId: "fresh-request",
  accountId: "owner",
  deviceId: "device",
  projectId: "project",
  clientId: "reused-client",
  threadId: "thread",
  conversationId: "conversation",
  expectedRevision: 4,
};
const conversation = {
  threadId: "thread",
  conversationId: "conversation",
  revision: 4,
  status: "ready",
};
const event = (type: string, value: unknown) =>
  `event: ${type}\ndata: ${JSON.stringify(value)}\n\n`;
const hello = event("hello", {
  protocolVersion: 6,
  clientId: context.clientId,
  conversation,
});
const scope = {
  threadId: "thread",
  turnId: "fresh-turn",
  sourceClientId: "reused-client",
};
const item = (phase: string, value: object, extra = {}) =>
  event("agent_event", {
    ...scope,
    type: `item.${phase}`,
    item: { id: "answer", type: "agent_message", ...value },
    ...extra,
  });
const terminal = (turnId: string, extra = {}) =>
  event("agent_event", {
    ...scope,
    turnId,
    type: "turn.completed",
    status: "completed",
    ...extra,
  });

test("fresh turn ignores delayed old replay chunks, then delivers only live current output", async () => {
  const encoder = new TextEncoder();
  let source!: ReadableStreamDefaultController<Uint8Array>;
  const response = new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        source = controller;
        controller.enqueue(encoder.encode(hello));
      },
    }),
    { headers: { "content-type": "text/event-stream" } },
  );
  let submitted = false;
  const messages: string[] = [];
  const observed: string[] = [];
  const result = await readAgentStream(
    response,
    context,
    (value) => {
      if (value.kind === "hello") {
        submitted = true;
        queueMicrotask(() => {
          source.enqueue(
            encoder.encode(
              item(
                "completed",
                { text: "Old retained answer" },
                { turnId: "previous-turn", replayed: true },
              ) + terminal("previous-turn", { replayed: true }),
            ),
          );
          source.enqueue(
            encoder.encode(
              event("agent_event", { ...scope, type: "turn.started" }) +
                item("updated", { delta: "Fresh answer" }) +
                item("completed", { text: "Fresh answer" }) +
                terminal("fresh-turn"),
            ),
          );
          source.close();
        });
      }
      if (value.kind === "message") messages.push(value.text);
    },
    new AbortController().signal,
    (captured) => {
      if (captured.turnId) observed.push(captured.turnId);
    },
    () => submitted,
  );
  assert.equal(result.status, "succeeded");
  assert.equal(result.context.requestId, "fresh-request");
  assert.equal(result.context.turnId, "fresh-turn");
  assert.deepEqual(messages, ["Fresh answer"]);
  assert.ok(observed.every((id) => id === "fresh-turn"));
});

test("explicit known turn recovery accepts matching completed replay and filters unrelated replay", async () => {
  const response = new Response(
    hello +
      item(
        "completed",
        { text: "Unrelated answer" },
        { turnId: "other-turn", replayed: true },
      ) +
      terminal("other-turn", { replayed: true }) +
      item("completed", { text: "Recovered answer" }, { replayed: true }) +
      terminal("fresh-turn", { replayed: true }),
    { headers: { "content-type": "text/event-stream" } },
  );
  const messages: string[] = [];
  const result = await readAgentStream(
    response,
    { ...context, turnId: "fresh-turn" },
    (value) => {
      if (value.kind === "message") messages.push(value.text);
    },
    new AbortController().signal,
    () => undefined,
    () => false,
  );
  assert.equal(result.status, "succeeded");
  assert.equal(result.context.turnId, "fresh-turn");
  assert.deepEqual(messages, ["Recovered answer"]);
});

test("real conversation changes and live/replay item updates preserve cumulative text and message identity", async () => {
  const seen: { kind: string; text?: string; id?: string }[] = [];
  const response = new Response(
    hello +
      event("conversation_changed", {
        ...conversation,
        revision: 5,
        status: "running",
      }) +
      item("started", { text: "" }) +
      item("updated", { delta: "A" }) +
      item("updated", { text: "A", delta: "A" }, { replayed: true }) +
      item("updated", { delta: "B" }) +
      item("completed", { text: "AB" }) +
      item("completed", { text: "AB" }, { replayed: true }) +
      terminal("fresh-turn"),
    { headers: { "content-type": "text/event-stream" } },
  );
  const result = await readAgentStream(
    response,
    { ...context, turnId: "fresh-turn" },
    (value) => {
      if (value.kind === "message")
        seen.push({ kind: value.kind, text: value.text, id: value.messageId });
      else seen.push({ kind: value.kind });
    },
    new AbortController().signal,
    () => undefined,
    () => true,
  );
  assert.equal(result.context.turnId, "fresh-turn");
  assert.deepEqual(
    seen.filter((value) => value.kind === "message"),
    [
      { kind: "message", text: "A", id: "answer" },
      { kind: "message", text: "AB", id: "answer" },
    ],
  );
  assert.ok(seen.some((value) => value.kind === "conversation"));
});

test("a completed assistant item never allows a different-turn terminal to finalize the current request", async () => {
  const response = new Response(
    hello +
      item("completed", { text: "Current output" }) +
      terminal("other-turn"),
    { headers: { "content-type": "text/event-stream" } },
  );
  let successes = 0;
  await assert.rejects(
    readAgentStream(
      response,
      { ...context, turnId: "fresh-turn" },
      (value) => {
        if (value.kind === "terminal") successes++;
      },
      new AbortController().signal,
      () => undefined,
      () => true,
    ),
    /AGENT_EVENT_STREAM_INTERRUPTED/,
  );
  assert.equal(successes, 0);
});

test("a queued old replay arriving after fresh submission never becomes the new request success", async () => {
  const old = { ...scope, turnId: "previous-turn", replayed: true };
  const response = new Response(
    hello +
      event("agent_event", {
        ...old,
        type: "item.completed",
        item: {
          id: "previous-answer",
          type: "agent_message",
          text: "Previous request output",
        },
      }) +
      event("agent_event", {
        ...old,
        type: "turn.completed",
        status: "completed",
      }),
    { headers: { "content-type": "text/event-stream" } },
  );
  let submitted = false;
  let terminalCount = 0;
  await assert.rejects(
    readAgentStream(
      response,
      context,
      (value) => {
        if (value.kind === "hello") submitted = true;
        if (value.kind === "terminal") terminalCount++;
      },
      new AbortController().signal,
      () => undefined,
      () => submitted,
    ),
    /AGENT_EVENT_STREAM_INTERRUPTED|AGENT_CONTEXT_CHANGED|AGENT_REPLAY/,
  );
  assert.equal(terminalCount, 0);
});
