import assert from "node:assert/strict";
import test from "node:test";
import type { ProviderConnection } from "../../src/domain/providerConnections.ts";
import { prepareImageTask } from "../../src/features/creation/imageTaskCommand.ts";
import {
  createProject,
  createTask,
  type CreationProject,
} from "../../src/features/creation/model.ts";
import {
  connectionFromModelProfile,
  writeProviderConnections,
} from "../../src/features/creation/providerRegistry.ts";
import { setSessionApiKey } from "../../src/features/creation/providerCredentials.ts";

function localConnection(id: string, baseUrl: string): ProviderConnection {
  return {
    ...connectionFromModelProfile({
      version: 1,
      name: id,
      baseUrl,
      model: "text-model",
      protocol: "openai-chat",
      authMode: "none",
    }),
    id,
    credentialRef: undefined,
    capabilities: {
      modalities: ["text"],
      operations: ["generate"],
      async: false,
      maxOutputs: 1,
    },
  };
}

function projectWithComparison(
  original: ProviderConnection,
  comparison: ProviderConnection,
  includeOriginalTask = true,
): CreationProject {
  const project = createProject({
    prompt: "initial",
    model: original.model!,
    kind: "text",
    attachments: [],
    providerBaseUrl: original.baseUrl,
    providerCredentialRef: original.credentialRef,
  });
  const originalTask = {
    ...createTask(project),
    id: "original-task",
    providerConnectionId: original.id,
    providerProtocol: original.protocol,
    providerAuthMode: original.authMode,
  };
  const comparisonTask = {
    ...createTask(project),
    id: "comparison-task",
    providerConnectionId: comparison.id,
    providerBaseUrl: comparison.baseUrl,
    providerCredentialRef: comparison.credentialRef,
    providerProtocol: comparison.protocol,
    providerAuthMode: comparison.authMode,
    conversationRoundId: "round",
    conversationUserMessageId: "round-user",
    conversationMessages: [{ role: "user" as const, content: "compare" }],
  };
  return {
    ...project,
    tasks: [...(includeOriginalTask ? [originalTask] : []), comparisonTask],
  };
}

async function withRegistry(
  connections: readonly ProviderConnection[],
  run: () => Promise<void>,
) {
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
    writeProviderConnections(connections);
    await run();
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
}

async function followUp(project: CreationProject) {
  return prepareImageTask(
    {
      prompt: "follow-up",
      model: project.model,
      kind: "text",
      attachments: [],
      privacyMode: "byok_local",
    },
    project,
  );
}

test("conversation-only history does not bind the first canvas image to a missing original account", async () => {
  const image = connectionFromModelProfile({
    version: 1,
    name: "image",
    baseUrl: "https://canvas-fixture.example.test/v1",
    model: "image-model",
    protocol: "openai-chat",
    authMode: "api-key",
  });
  const project = createProject({
    prompt: "first canvas image",
    model: "image-model",
    kind: "image",
    attachments: [],
  });
  project.tasks = [
    {
      ...createTask(project),
      kind: "text",
      status: "failed",
      conversationRoundId: "round-only",
      conversationUserMessageId: "round-user",
    },
  ];
  await withRegistry([image], async () => {
    setSessionApiKey("synthetic-test-key", image.baseUrl!, image.credentialRef);
    try {
      const prepared = await prepareImageTask(
        {
          prompt: "first canvas image",
          model: image.model!,
          kind: "image",
          attachments: [],
          privacyMode: "byok_local",
        },
        project,
      );
      assert.equal(prepared.id, image.id);
    } finally {
      setSessionApiKey("", image.baseUrl!, image.credentialRef);
    }
  });
});

test("a comparison route B never changes the original project A follow-up binding", async () => {
  const original = localConnection("a", "http://127.0.0.1:11434/v1");
  const comparison = {
    ...localConnection("b", "http://127.0.0.1:1234/v1"),
    protocol: "gemini" as const,
    authMode: "api-key" as const,
    credentialRef: "vault_compare",
  };
  await withRegistry([original, comparison], async () => {
    const prepared = await followUp(
      projectWithComparison(original, comparison),
    );
    assert.equal(prepared.id, original.id);
    assert.equal(prepared.protocol, original.protocol);
    assert.equal(prepared.authMode, "none");
    assert.equal(prepared.credentialRef, undefined);
  });
});

test("a project without a normal task restores only its complete registry binding", async () => {
  const original = localConnection("a", "http://127.0.0.1:11434/v1");
  const comparison = localConnection("b", "http://127.0.0.1:1234/v1");
  const project = projectWithComparison(original, comparison, false);
  await withRegistry([original, comparison], async () => {
    assert.equal((await followUp(project)).id, original.id);
    writeProviderConnections([
      { ...original, model: "another-text-model" },
      comparison,
    ]);
    await assert.rejects(() => followUp(project), /绑定|模型/);
    writeProviderConnections([
      original,
      { ...original, id: "duplicate-account" },
      comparison,
    ]);
    await assert.rejects(() => followUp(project), /绑定|明确|选择/);
  });
});

test("an original frozen connection cannot be replaced by a comparison account", async () => {
  const original = localConnection("a", "http://127.0.0.1:11434/v1");
  const comparison = {
    ...original,
    id: "b",
    protocol: "gemini" as const,
    authMode: "api-key" as const,
    credentialRef: "vault_compare",
  };
  const project = projectWithComparison(original, comparison);
  await withRegistry([comparison], async () => {
    await assert.rejects(() => followUp(project), /移除|绑定/);
    writeProviderConnections([{ ...original, protocol: "ollama" }, comparison]);
    await assert.rejects(() => followUp(project), /身份已变化/);
  });
});

test("an explicit project route without a normal task cannot change protocol on lookup", async () => {
  const original = localConnection("a", "http://127.0.0.1:11434/v1");
  const project = projectWithComparison(original, original, false);
  project.providerProtocol = "openai-chat";
  project.providerAuthMode = "none";
  await withRegistry([{ ...original, protocol: "ollama" }], async () => {
    await assert.rejects(() => followUp(project), /绑定|明确|选择/);
  });
});
