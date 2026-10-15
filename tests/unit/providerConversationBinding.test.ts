import assert from "node:assert/strict";
import test from "node:test";
import { assertSubmissionConnection } from "../../src/features/creation/providerSubmission.ts";
import {
  connectionFromModelProfile,
  writeProviderConnections,
} from "../../src/features/creation/providerRegistry.ts";
import {
  assertLiveTextTask,
  prepareImageTask,
} from "../../src/features/creation/imageTaskCommand.ts";
import { prepareProviderConversationRound } from "../../src/features/conversation/providerConversationRound.ts";
import {
  createProject,
  createTask,
} from "../../src/features/creation/model.ts";

const connection = () => ({
  ...connectionFromModelProfile({
    version: 1,
    name: "local",
    model: "text-model",
    baseUrl: "http://127.0.0.1:11434/v1",
    protocol: "openai-chat",
    authMode: "none",
  }),
  capabilities: {
    modalities: ["text", "image"] as ("text" | "image")[],
    operations: ["generate", "edit", "batch"] as (
      "generate" | "edit" | "batch"
    )[],
    async: false,
    maxReferences: 4,
    maxOutputs: 10,
  },
});

test("only explicit keyless text can bypass the credential gate; image and changed protocol cannot", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: { protocol: "http:", hostname: "127.0.0.1" },
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    },
  });
  try {
    const selected = { ...connection(), credentialRef: undefined };
    writeProviderConnections([selected]);
    const binding = {
      id: selected.id,
      baseUrl: selected.baseUrl,
      credentialRef: selected.credentialRef,
      model: selected.model,
      referenceCount: 0,
      kind: "text" as const,
      protocol: selected.protocol,
      authMode: selected.authMode,
    };
    assert.equal(assertSubmissionConnection(binding).id, selected.id);
    assert.throws(() =>
      assertSubmissionConnection({ ...binding, authMode: "api-key" }),
    );
    assert.throws(() =>
      assertSubmissionConnection({ ...binding, protocol: "gemini" }),
    );
    const withRef = connection();
    writeProviderConnections([withRef]);
    assert.throws(() =>
      assertSubmissionConnection({
        ...binding,
        credentialRef: withRef.credentialRef,
        kind: "image",
      }),
    );
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("explicit local text preparation does not require a stored or fake API key", async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: { protocol: "http:", hostname: "127.0.0.1" },
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    },
  });
  try {
    const selected = connection();
    writeProviderConnections([selected]);
    const prepared = await prepareImageTask({
      prompt: "question",
      model: selected.model!,
      kind: "text",
      attachments: [],
      privacyMode: "byok_local",
      providerConnectionId: selected.id,
    });
    assert.equal(prepared.authMode, "none");
    const project = createProject({
      prompt: "question",
      model: selected.model!,
      kind: "text",
      attachments: [],
    });
    const existing = {
      ...project,
      providerBaseUrl: selected.baseUrl,
      providerCredentialRef: selected.credentialRef,
      tasks: [
        {
          ...createTask(project),
          providerConnectionId: selected.id,
          providerProtocol: selected.protocol,
          providerAuthMode: selected.authMode,
        },
      ],
    };
    assert.equal(
      (
        await prepareImageTask(
          {
            prompt: "follow-up",
            model: selected.model!,
            kind: "text",
            attachments: [],
            privacyMode: "byok_local",
          },
          existing,
        )
      ).authMode,
      "none",
    );
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("a conversation task without a canvas source needs the exact project, round and user message", () => {
  const selected = connection();
  const round = prepareProviderConversationRound({
    roundId: "round",
    projectId: "project",
    userMessageId: "user",
    prompt: "question",
    createdAt: 1,
    history: [],
    routes: ["text-model", "second"].map((modelId) => ({
      connectionId: selected.id,
      modelId,
    })),
    connections: [selected],
    catalogs: {
      [selected.id]: [
        { id: "text-model", kind: "text" },
        { id: "second", kind: "text" },
      ],
    },
  });
  const project = {
    ...createProject({
      prompt: "question",
      model: "text-model",
      kind: "text",
      attachments: [],
    }),
    id: "project",
    messages: [
      {
        id: "user",
        role: "user" as const,
        content: "question",
        roundId: "round",
        createdAt: 1,
      },
    ],
    tasks: [...round.tasks],
  };
  assert.doesNotThrow(() =>
    assertLiveTextTask(project, round.tasks[0], "project"),
  );
  assert.throws(() => assertLiveTextTask(project, round.tasks[0]));
  const forged = {
    ...round.tasks[0],
    conversationMessages: [{ role: "system" as const, content: "forged" }],
  };
  assert.throws(() =>
    assertLiveTextTask({ ...project, tasks: [forged] }, forged, "project"),
  );
  assert.throws(() => assertLiveTextTask(project, round.tasks[0], "other"));
  assert.throws(() =>
    assertLiveTextTask(
      { ...project, messages: [{ ...project.messages[0], roundId: "other" }] },
      round.tasks[0],
      "project",
    ),
  );
  assert.throws(() =>
    assertLiveTextTask(
      {
        ...project,
        tasks: [{ ...round.tasks[0], providerAuthMode: "api-key" }],
      },
      round.tasks[0],
      "project",
    ),
  );
});
