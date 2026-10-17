import assert from "node:assert/strict";
import test from "node:test";
import type { ProviderConnection } from "../../src/domain/providerConnections.ts";
import { MODEL_PROVIDER_STORAGE_KEY } from "../../src/domain/modelProvider.ts";
import { generateImages } from "../../src/features/creation/imageGeneration.ts";
import { setSessionApiKey } from "../../src/features/creation/providerCredentials.ts";
import { writeProviderConnections } from "../../src/features/creation/providerRegistry.ts";
import {
  assertSubmissionConnection,
  ProviderSubmissionError,
} from "../../src/features/creation/providerSubmission.ts";
import { prepareImageTask } from "../../src/features/creation/imageTaskCommand.ts";
import {
  createProject,
  createTask,
} from "../../src/features/creation/model.ts";
import {
  submitNativeTask,
  usesNativeTaskHost,
  type NativeTaskHostRequest,
} from "../../src/features/creation/nativeTaskHost.ts";
import { createGenerationAdapter } from "../../src/integrations/generation/providerAdapterFactory.ts";
import {
  TwelveAiTaskAdapter,
  TwelveAiTaskError,
} from "../../src/integrations/generation/twelveAiTaskAdapter.ts";

const baseUrl = "https://shared.example.test/v1";
const connection = (
  id: string,
  credentialRef: string,
  overrides: Partial<ProviderConnection> = {},
): ProviderConnection => ({
  id,
  credentialRef,
  baseUrl,
  provider: "fixture",
  displayName: id,
  kind: "user_byok",
  state: "active",
  capabilities: {
    modalities: ["image"],
    operations: ["generate"],
    maxOutputs: 10,
    async: false,
  },
  concurrencyLimit: 2,
  ...overrides,
});
const accountA = connection("account-a", "ref-a");
const accountB = connection("account-b", "ref-b");

async function withBrowser(
  run: (state: {
    storage: Map<string, string>;
    requests: { url: string; authorization: string | null }[];
  }) => Promise<void>,
) {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalNavigator = Object.getOwnPropertyDescriptor(
    globalThis,
    "navigator",
  );
  const originalFetch = globalThis.fetch;
  const storage = new Map<string, string>();
  const requests: { url: string; authorization: string | null }[] = [];
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: { protocol: "https:", hostname: "fixture.invalid" },
      setTimeout,
      clearTimeout,
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    },
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { onLine: true },
  });
  globalThis.fetch = async (url, init) => {
    requests.push({
      url: String(url),
      authorization: new Headers(init?.headers).get("Authorization"),
    });
    return Response.json({ data: [{ b64_json: "c3ludGhldGlj" }] });
  };
  for (const ref of [undefined, "ref-a", "ref-b", "legacy-ref"])
    setSessionApiKey(`synthetic-${ref ?? "legacy"}`, baseUrl, ref);
  try {
    await run({ storage, requests });
  } finally {
    for (const ref of [undefined, "ref-a", "ref-b", "legacy-ref"])
      setSessionApiKey("", baseUrl, ref);
    globalThis.fetch = originalFetch;
    if (originalWindow)
      Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
    if (originalNavigator)
      Object.defineProperty(globalThis, "navigator", originalNavigator);
    else Reflect.deleteProperty(globalThis, "navigator");
  }
}

const request = (
  overrides: Partial<Parameters<typeof generateImages>[0]> = {},
) => ({
  prompt: "synthetic fixture",
  model: "gpt-image-1",
  attachments: [],
  signal: new AbortController().signal,
  providerBaseUrl: baseUrl,
  credentialRef: "ref-b",
  ...overrides,
});

function desktopIpcFixture() {
  const calls: string[] = [];
  Object.defineProperty(window, "__TAURI_INTERNALS__", {
    configurable: true,
    value: {
      invoke: async (
        command: string,
        args: { request?: NativeTaskHostRequest },
      ) => {
        calls.push(command);
        if (command === "credential_get") return "synthetic-desktop-key";
        if (command === "task_host_submit")
          return {
            taskId: args.request!.taskId,
            idempotencyKey: args.request!.idempotencyKey,
            status: "submitted",
            outputIndices: [0],
            outputs: [{ index: 0, status: "pending" }],
            updatedAt: 1,
          };
        throw new Error(`Unexpected IPC: ${command}`);
      },
    },
  });
  return calls;
}

const nativeRequest = (url: string, model: string): NativeTaskHostRequest => ({
  taskId: "queued-fixture",
  idempotencyKey: "queued-fixture-intent",
  baseUrl: url,
  model,
  prompt: "synthetic fixture",
  credentialRef: "ref-b",
  outputIndices: [0],
  attachments: [],
});

test("recognized 12AI task models fail every Desktop preflight before credentials or acceptance", async () => {
  await withBrowser(async ({ requests, storage }) => {
    const calls = desktopIpcFixture();
    assert.equal(usesNativeTaskHost(), true);
    const taskConnection = {
      ...accountB,
      baseUrl: "https://api.12ai.org/v1",
      model: "gpt-image-2.5-flare",
      capabilities: { ...accountB.capabilities, async: true },
    };
    writeProviderConnections([taskConnection]);
    const input = {
      prompt: "synthetic fixture",
      model: taskConnection.model,
      kind: "image" as const,
      attachments: [],
      providerConnectionId: taskConnection.id,
    };
    assert.throws(
      () =>
        assertSubmissionConnection(
          {
            id: taskConnection.id,
            baseUrl: taskConnection.baseUrl,
            credentialRef: taskConnection.credentialRef,
            model: input.model,
            referenceCount: 0,
          },
          { skipCapacity: true },
        ),
      ProviderSubmissionError,
    );
    const project = createProject(input);
    project.tasks = [createTask(project)];
    const before = structuredClone(project);
    await assert.rejects(
      prepareImageTask(input, project),
      ProviderSubmissionError,
    );
    assert.deepEqual(
      project,
      before,
      "A known refusal must not publish an unknown submission",
    );
    writeProviderConnections([]);
    storage.set(
      MODEL_PROVIDER_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        name: "legacy-12ai",
        baseUrl: taskConnection.baseUrl,
        model: input.model,
      }),
    );
    const originalStorage = Object.getOwnPropertyDescriptor(
      globalThis,
      "localStorage",
    );
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: window.localStorage,
    });
    try {
      await assert.rejects(
        prepareImageTask({ ...input, providerConnectionId: undefined }),
        ProviderSubmissionError,
      );
    } finally {
      if (originalStorage)
        Object.defineProperty(globalThis, "localStorage", originalStorage);
      else Reflect.deleteProperty(globalThis, "localStorage");
    }
    assert.deepEqual(calls, []);
    assert.deepEqual(requests, []);
  });
});

test("old queued 12AI task requests never cross the native submission IPC boundary", async () => {
  await withBrowser(async ({ requests }) => {
    const calls = desktopIpcFixture();
    await assert.rejects(
      submitNativeTask(
        nativeRequest("https://api.12ai.org/v1", "gpt-image-2.5-flare"),
      ),
      ProviderSubmissionError,
    );
    assert.deepEqual(calls, []);
    assert.deepEqual(requests, []);
  });
});

for (const scenario of [
  {
    name: "12AI ordinary Images-compatible model",
    url: "https://api.12ai.org/v1",
    model: "gpt-image-1",
  },
  {
    name: "ordinary API using an otherwise recognized task model name",
    url: baseUrl,
    model: "gpt-image-2.5-flare",
  },
]) {
  test(`${scenario.name} keeps preflight, Images and native submission compatibility`, async () => {
    await withBrowser(async ({ requests }) => {
      const calls = desktopIpcFixture();
      const saved = {
        ...accountB,
        baseUrl: scenario.url,
        model: scenario.model,
      };
      writeProviderConnections([saved]);
      const selected = await prepareImageTask({
        prompt: "synthetic",
        model: scenario.model,
        kind: "image",
        attachments: [],
        providerConnectionId: saved.id,
      });
      assert.equal(selected.id, saved.id);
      assert.equal(
        (
          await generateImages(
            request({
              providerBaseUrl: scenario.url,
              providerConnectionId: saved.id,
              model: scenario.model,
            }),
          )
        ).sources.length,
        1,
      );
      const native = await submitNativeTask(
        nativeRequest(scenario.url, scenario.model),
      );
      assert.equal(native.status, "submitted");
      assert.equal(
        calls.filter((command) => command === "task_host_submit").length,
        1,
      );
      assert.equal(requests[0].url, `${scenario.url}/images/generations`);
      setSessionApiKey("", scenario.url, "ref-b");
    });
  });
}

test("legacy project bindings and explicit IDs reject duplicate registry identities before vault or IPC", async () => {
  await withBrowser(async ({ requests }) => {
    const calls = desktopIpcFixture();
    const saved = { ...accountB, model: "gpt-image-1" };
    writeProviderConnections([{ ...saved, id: "other-account" }, saved]);
    const input = {
      prompt: "synthetic",
      model: saved.model,
      kind: "image" as const,
      attachments: [],
    };
    const project = createProject(input);
    project.providerBaseUrl = saved.baseUrl;
    project.providerCredentialRef = saved.credentialRef;
    project.tasks = [];
    delete project.composerDraft.providerConnectionId;
    await assert.rejects(
      prepareImageTask(input, project),
      ProviderSubmissionError,
    );
    writeProviderConnections([saved, { ...saved }]);
    assert.throws(
      () =>
        assertSubmissionConnection(
          {
            id: saved.id,
            baseUrl: saved.baseUrl,
            credentialRef: saved.credentialRef,
            model: saved.model,
            referenceCount: 0,
          },
          { skipCapacity: true },
        ),
      ProviderSubmissionError,
    );
    await assert.rejects(
      prepareImageTask({ ...input, providerConnectionId: saved.id }),
      ProviderSubmissionError,
    );
    assert.deepEqual(calls, []);
    assert.deepEqual(requests, []);
  });
});

test("unregistered ordinary API profiles still bootstrap without manual registry setup", async () => {
  await withBrowser(async ({ storage, requests }) => {
    const calls = desktopIpcFixture();
    writeProviderConnections([]);
    storage.set(
      MODEL_PROVIDER_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        name: "legacy ordinary API",
        baseUrl,
        model: "gpt-image-1",
      }),
    );
    const originalStorage = Object.getOwnPropertyDescriptor(
      globalThis,
      "localStorage",
    );
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: window.localStorage,
    });
    try {
      const selected = await prepareImageTask({
        prompt: "synthetic",
        model: "gpt-image-1",
        kind: "image",
        attachments: [],
      });
      assert.equal(selected.baseUrl, baseUrl);
      assert.ok(selected.credentialRef);
      assert.ok(calls.includes("credential_get"));
      assert.equal(calls.includes("task_host_submit"), false);
      assert.deepEqual(requests, []);
      setSessionApiKey("", baseUrl, selected.credentialRef);
    } finally {
      if (originalStorage)
        Object.defineProperty(globalThis, "localStorage", originalStorage);
      else Reflect.deleteProperty(globalThis, "localStorage");
    }
  });
});

for (const scenario of [
  {
    name: "removed explicit ID",
    connections: [accountA],
    options: { providerConnectionId: "removed" },
  },
  {
    name: "explicit ID with another account credential",
    connections: [accountA, accountB],
    options: { providerConnectionId: "account-b", credentialRef: "ref-a" },
  },
  {
    name: "explicit ID with a changed endpoint",
    connections: [
      accountA,
      { ...accountB, baseUrl: "https://other.example.test/v1" },
    ],
    options: { providerConnectionId: "account-b" },
  },
  {
    name: "duplicate explicit ID",
    connections: [accountB, { ...accountB }],
    options: { providerConnectionId: "account-b" },
  },
  {
    name: "duplicate complete legacy binding",
    connections: [accountB, { ...accountB, id: "other-id" }],
    options: {},
  },
  {
    name: "multiple accounts without credential identity",
    connections: [accountA, accountB],
    options: { credentialRef: undefined },
  },
]) {
  test(`generation rejects ${scenario.name} before submission callbacks or HTTP`, async () => {
    await withBrowser(async ({ requests }) => {
      writeProviderConnections(scenario.connections);
      let callbacks = 0;
      let credentialReads = 0;
      Object.defineProperty(window, "__TAURI_INTERNALS__", {
        value: {
          invoke: async () => {
            credentialReads++;
            return "synthetic";
          },
        },
      });
      await assert.rejects(
        generateImages(
          request({
            ...scenario.options,
            beforeRequest: () => callbacks++,
            onRequestStart: () => callbacks++,
          }),
        ),
        ProviderSubmissionError,
      );
      assert.equal(callbacks, 0);
      assert.equal(credentialReads, 0);
      assert.equal(requests.length, 0);
    });
  });
}

test("second account uses its own credential for explicit ID and unique legacy binding", async () => {
  await withBrowser(async ({ requests }) => {
    writeProviderConnections([accountA, accountB]);
    for (const providerConnectionId of ["account-b", undefined]) {
      const result = await generateImages(request({ providerConnectionId }));
      assert.equal(result.sources.length, 1);
    }
    assert.deepEqual(
      requests.map((item) => item.authorization),
      ["Bearer synthetic-ref-b", "Bearer synthetic-ref-b"],
    );
  });
});

test("unregistered ordinary API keeps its own options and saved profile credential path", async () => {
  await withBrowser(async ({ storage, requests }) => {
    storage.set(
      MODEL_PROVIDER_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        name: "legacy profile",
        baseUrl,
        model: "gpt-image-1",
      }),
    );
    writeProviderConnections([accountA]);
    await generateImages(
      request({ providerBaseUrl: undefined, credentialRef: "legacy-ref" }),
    );
    writeProviderConnections([]);
    await generateImages(
      request({ providerBaseUrl: undefined, credentialRef: undefined }),
    );
    assert.deepEqual(
      requests.map((item) => item.authorization),
      ["Bearer synthetic-legacy-ref", "Bearer synthetic-legacy"],
    );
    assert.ok(
      requests.every((item) => item.url === `${baseUrl}/images/generations`),
    );
  });
});

test("12AI image entry rejects missing durable receipts before callbacks and never falls back", async () => {
  await withBrowser(async ({ requests }) => {
    const twelveAi = { ...accountB, baseUrl: "https://api.12ai.org/v1" };
    writeProviderConnections([twelveAi]);
    setSessionApiKey("synthetic-twelve", twelveAi.baseUrl, "ref-b");
    let callbacks = 0;
    globalThis.fetch = async (_url, init) => {
      requests.push({ url: "unexpected", authorization: null });
      return Response.json({
        id: "task-fixture",
        status: init?.method === "POST" ? "queued" : "completed",
        outputs:
          init?.method === "POST"
            ? []
            : ["https://result.example.test/image.png"],
      });
    };
    try {
      await assert.rejects(
        generateImages(
          request({
            providerBaseUrl: twelveAi.baseUrl,
            providerConnectionId: twelveAi.id,
            model: "gpt-image-2.5-flare",
            beforeRequest: () => callbacks++,
            onRequestStart: () => callbacks++,
          }),
        ),
        (error: unknown) =>
          error instanceof ProviderSubmissionError &&
          /持久.*回执/.test(error.message),
      );
      assert.equal(callbacks, 0);
      assert.equal(requests.length, 0);
    } finally {
      setSessionApiKey("", twelveAi.baseUrl, "ref-b");
    }
  });
});

test("factory without a durable receipt port refuses submit but keeps known-job queries", async () => {
  const twelveAi = { ...accountB, baseUrl: "https://api.12ai.org/v1" };
  let credentialReads = 0;
  let posts = 0;
  let gets = 0;
  const adapter = createGenerationAdapter(twelveAi, {
    resolveCredential: async () => {
      credentialReads++;
      return "synthetic-fixture";
    },
    fetch: async (_url, init) => {
      if (init?.method === "POST") posts++;
      else gets++;
      return Response.json({
        id: "known-job",
        status: init?.method === "POST" ? "queued" : "in_progress",
        outputs: [],
      });
    },
  });
  assert.ok(adapter instanceof TwelveAiTaskAdapter);
  await assert.rejects(
    adapter.submit({
      prompt: "synthetic fixture",
      model: "gpt-image-2.5-flare",
      attachments: [],
      requestedOutputs: 1,
      idempotencyKey: "fixture-no-durable-port",
      signal: new AbortController().signal,
    }),
    (error: unknown) =>
      error instanceof TwelveAiTaskError &&
      error.reason === "receipt_persistence_required",
  );
  assert.equal(credentialReads, 0);
  assert.equal(posts, 0);
  assert.equal((await adapter.getStatus("known-job")).status, "running");
  assert.equal(gets, 1);
});
