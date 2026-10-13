import assert from "node:assert/strict";
import test from "node:test";
import { connectionFromModelProfile } from "../../src/features/creation/providerRegistry.ts";
import {
  prepareProviderConversationRound,
  providerConversationReplies,
  providerConversationCancellationIds,
  matchesProviderConversationTask,
} from "../../src/features/conversation/providerConversationRound.ts";
import type { CreationTask } from "../../src/features/creation/model.ts";

function input() {
  const connections = ["one", "two"].map((name) =>
    connectionFromModelProfile({
      version: 1,
      name,
      model: "opaque-text",
      baseUrl: "http://127.0.0.1:11434/v1",
      protocol: "openai-compatible",
      authMode: "none",
    }),
  );
  return {
    roundId: "round-1",
    projectId: "project-1",
    userMessageId: "user-current",
    prompt: "same question",
    createdAt: 10,
    history: [
      {
        id: "user-old",
        role: "user" as const,
        content: "old question",
        createdAt: 1,
      },
    ],
    historyTasks: [] as CreationTask[],
    assistantInstructions: "user-selected preferences",
    routes: connections.map((connection) => ({
      connectionId: connection.id,
      modelId: "opaque-text",
    })),
    connections,
    catalogs: Object.fromEntries(
      connections.map((connection) => [
        connection.id,
        [{ id: "opaque-text", kind: "text" as const }],
      ]),
    ),
  };
}

test("comparison prepares independent existing text tasks with exact credentials and stable submission keys", () => {
  const source = input();
  const round = prepareProviderConversationRound(source);
  assert.equal(round.tasks.length, 2);
  assert.equal(new Set(round.tasks.map((task) => task.id)).size, 2);
  assert.equal(new Set(round.tasks.map((task) => task.idempotencyKey)).size, 2);
  for (const [index, task] of round.tasks.entries()) {
    assert.equal(task.providerConnectionId, source.connections[index].id);
    assert.equal(
      task.providerCredentialRef,
      source.connections[index].credentialRef,
    );
    assert.equal(task.kind, "text");
    assert.equal(task.status, "queued");
    assert.equal(task.submissionState, "intent");
    assert.equal(task.requestedOutputs, 1);
    assert.equal(task.batchId, "round-1");
    assert.equal(task.conversationUserMessageId, "user-current");
    assert.deepEqual(task.conversationMessages, [
      { role: "system", content: "user-selected preferences" },
      { role: "user", content: "old question" },
      { role: "user", content: "same question" },
    ]);
  }
  source.connections[0].baseUrl = "https://changed.example.test/v1";
  source.history[0].content = "changed draft";
  assert.equal(round.tasks[0].providerBaseUrl, "http://127.0.0.1:11434/v1");
  assert.equal(round.tasks[0].conversationMessages[1].content, "old question");
  assert.equal(Object.isFrozen(round.tasks[0].conversationMessages), true);
  assert.equal(Object.isFrozen(round.tasks[0]), true);
});

test("history includes only the selected route's successful outputs, never system messages or another model", () => {
  const source = input();
  const prior = prepareProviderConversationRound({
    ...source,
    roundId: "old",
    userMessageId: "user-old",
    prompt: "old question",
    history: [],
  });
  source.historyTasks = prior.tasks.map((task, index) => ({
    ...task,
    status: "succeeded",
    outputs: [
      {
        index: 0,
        model: task.model,
        status: "succeeded",
        text: "reply-" + index,
        createdAt: 2,
      },
    ],
    completedOutputs: 1,
  }));
  const round = prepareProviderConversationRound(source);
  assert.equal(round.tasks[0].conversationMessages[2].content, "reply-0");
  assert.equal(round.tasks[1].conversationMessages[2].content, "reply-1");
  assert.equal(
    JSON.stringify(round.tasks[0].conversationMessages).includes("reply-1"),
    false,
  );
  source.historyTasks[0] = { ...source.historyTasks[0], status: "unknown" };
  assert.equal(
    prepareProviderConversationRound(source).tasks[0].conversationMessages.some(
      (message) => message.role === "assistant",
    ),
    false,
  );
});

test("comparison rejects missing, disabled, duplicate, non-text and unsafe routes without fallback", () => {
  const source = input();
  assert.throws(() =>
    prepareProviderConversationRound({ ...source, routes: [source.routes[0]] }),
  );
  assert.throws(() =>
    prepareProviderConversationRound({
      ...source,
      routes: [source.routes[0], source.routes[0]],
    }),
  );
  assert.throws(() =>
    prepareProviderConversationRound({
      ...source,
      connections: [source.connections[0]],
    }),
  );
  assert.throws(() =>
    prepareProviderConversationRound({ ...source, catalogs: {} }),
  );
  assert.throws(() =>
    prepareProviderConversationRound({
      ...source,
      connections: source.connections.map((connection) => ({
        ...connection,
        state: "disabled" as const,
      })),
    }),
  );
  assert.throws(() =>
    prepareProviderConversationRound({
      ...source,
      connections: source.connections.map((connection) => ({
        ...connection,
        baseUrl: "https://remote.example.test/v1",
      })),
    }),
  );
});

test("history trimming preserves complete user/reply groups and reports a bounded context", () => {
  const source = input();
  const history = Array.from({ length: 40 }, (_, index) => ({
    id: "user-" + index,
    role: "user" as const,
    content: "history " + index,
    createdAt: index,
  }));
  const round = prepareProviderConversationRound({ ...source, history });
  assert.equal(round.truncatedRouteIds.length, 2);
  assert.equal(
    round.tasks.every((task) => task.conversationMessages.length <= 32),
    true,
  );
  assert.equal(
    round.tasks[0].conversationMessages.at(-1)?.content,
    "same question",
  );
  assert.equal(round.tasks[0].conversationMessages[0].role, "system");
});

test("reply projection and cancellation preserve another route's success and accepted-unknown state", () => {
  const round = prepareProviderConversationRound(input());
  const first = round.tasks[0],
    second = round.tasks[1];
  const tasks = [
    {
      ...first,
      status: "succeeded" as const,
      completedOutputs: 1,
      outputs: [
        {
          index: 0,
          status: "succeeded" as const,
          model: first.model,
          text: "kept",
          createdAt: 11,
        },
      ],
    },
    {
      ...second,
      status: "unknown" as const,
      submissionState: "unknown" as const,
      error: "acceptance unknown",
    },
  ];
  const replies = providerConversationReplies(round, "project-1", tasks);
  assert.deepEqual(
    replies.map((reply) => reply.status),
    ["succeeded", "unknown"],
  );
  assert.equal(replies[0].text, "kept");
  assert.deepEqual(
    providerConversationCancellationIds(round, "project-1", tasks),
    [],
  );
  const running = { ...second, status: "running" as const };
  assert.deepEqual(
    providerConversationCancellationIds(round, "project-1", [
      tasks[0],
      running,
    ]),
    [second.id],
  );
});

test("changed project, route or frozen messages cannot receive a comparison receipt", () => {
  const round = prepareProviderConversationRound(input());
  const task = round.tasks[0];
  assert.equal(matchesProviderConversationTask(round, "project-1", task), true);
  assert.equal(
    matchesProviderConversationTask(round, "other-project", task),
    false,
  );
  assert.equal(
    matchesProviderConversationTask(round, "project-1", {
      ...task,
      providerConnectionId: round.tasks[1].providerConnectionId,
    }),
    false,
  );
  assert.equal(
    matchesProviderConversationTask(round, "project-1", {
      ...task,
      providerProtocol: "gemini",
    }),
    false,
  );
  assert.equal(
    matchesProviderConversationTask(round, "project-1", {
      ...task,
      conversationMessages: [{ role: "user", content: "changed" }],
    }),
    false,
  );
  assert.deepEqual(
    providerConversationReplies(round, "other-project", round.tasks),
    [],
  );
});

test("an already persisted round cannot be regenerated, even when its acceptance is unknown", () => {
  const source = input();
  const round = prepareProviderConversationRound(source);
  assert.throws(() =>
    prepareProviderConversationRound({
      ...source,
      historyTasks: round.tasks.map((task) => ({
        ...task,
        status: "unknown",
        submissionState: "unknown",
      })),
    }),
  );
  assert.equal(
    providerConversationReplies(round, "project-1", [
      round.tasks[0],
      round.tasks[0],
      round.tasks[1],
    ])[0].available,
    false,
  );
});

test("three explicit routes and a 64 KiB history stay bounded without mutating input", () => {
  const source = input();
  const third = {
    ...source.connections[1],
    id: "third-connection",
    credentialRef: "third-vault",
  };
  const history = Array.from({ length: 20 }, (_, index) => ({
    id: "large-" + index,
    role: "user" as const,
    content: "x".repeat(4000),
    createdAt: index,
  }));
  const round = prepareProviderConversationRound({
    ...source,
    history,
    assistantInstructions: "偏好".repeat(3000),
    connections: [...source.connections, third],
    routes: [
      ...source.routes,
      { connectionId: third.id, modelId: "opaque-text" },
    ],
    catalogs: {
      ...source.catalogs,
      [third.id]: [{ id: "opaque-text", kind: "text" }],
    },
  });
  assert.equal(round.tasks.length, 3);
  assert.equal(round.truncatedRouteIds.length, 3);
  assert.equal(
    round.tasks.every(
      (task) =>
        new TextEncoder().encode(
          task.conversationMessages.map((message) => message.content).join(""),
        ).byteLength <= 65536,
    ),
    true,
  );
  assert.equal(history.length, 20);
  assert.equal(history[0].content.length, 4000);
});

test("each route's failure or cancellation preserves completed siblings and partial drafts", () => {
  const round = prepareProviderConversationRound(input());
  const first = {
    ...round.tasks[0],
    status: "succeeded" as const,
    completedOutputs: 1,
    outputs: [
      {
        index: 0,
        status: "succeeded" as const,
        model: round.tasks[0].model,
        text: "completed sibling",
        createdAt: 11,
      },
    ],
  };
  for (const status of [
    "failed",
    "cancelled",
    "unknown",
    "offline",
    "interrupted",
    "partial",
    "running",
    "queued",
  ] as const) {
    const second = {
      ...round.tasks[1],
      status,
      error: "route-specific error",
      outputs: [
        {
          index: 0,
          status: "running" as const,
          model: round.tasks[1].model,
          text: "partial draft",
          createdAt: 11,
        },
      ],
    };
    const replies = providerConversationReplies(round, "project-1", [
      first,
      second,
    ]);
    assert.equal(replies[0].status, "succeeded");
    assert.equal(replies[0].text, "completed sibling");
    assert.equal(replies[1].status, status);
    assert.equal(replies[1].text, "partial draft");
    assert.equal(
      replies[1].canCancel,
      status === "queued" || status === "running",
    );
  }
});

test("two models on one connection require enough currently available connection slots", () => {
  const source = input();
  const connection = { ...source.connections[0], concurrencyLimit: 1 };
  const routes = ["model-one", "model-two"].map((modelId) => ({
    connectionId: connection.id,
    modelId,
  }));
  const catalogs = {
    [connection.id]: routes.map((route) => ({
      id: route.modelId,
      kind: "text" as const,
    })),
  };
  assert.throws(() =>
    prepareProviderConversationRound({
      ...source,
      connections: [connection],
      routes,
      catalogs,
    }),
  );
  assert.equal(
    prepareProviderConversationRound({
      ...source,
      connections: [{ ...connection, concurrencyLimit: 2 }],
      routes,
      catalogs,
    }).tasks.length,
    2,
  );
  assert.throws(() =>
    prepareProviderConversationRound({
      ...source,
      connections: [{ ...connection, concurrencyLimit: 2, activeJobs: 1 }],
      routes,
      catalogs,
    }),
  );
});
