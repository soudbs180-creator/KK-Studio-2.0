import assert from "node:assert/strict";
import test from "node:test";
import { isProviderAuthAllowed } from "../../src/domain/providerProtocol.ts";
import type { ProviderConnection } from "../../src/domain/providerConnections.ts";
import { createGenerationAdapter } from "../../src/integrations/generation/providerAdapterFactory.ts";
import {
  TwelveAiTaskAdapter,
  TwelveAiTaskError,
  type TwelveAiGenerationRequest,
  type TwelveAiSubmissionReceipt,
} from "../../src/integrations/generation/twelveAiTaskAdapter.ts";
import { createAgentConnection } from "../../src/features/agent/agentConnection.ts";
import { createAgentHost } from "../../src/features/agent/agentHost.ts";
import { createProject } from "../../src/features/creation/model.ts";
import type { CanvasCollectionItem } from "../../src/domain/canvasItems.ts";

// =============================================================================
// 1. isProviderAuthAllowed: Local ComfyUI and Loopback Unauthenticated Flow
// =============================================================================

test("isProviderAuthAllowed permits authMode 'none' for local_comfyui on loopback addresses", () => {
  // Loopback IPv4
  assert.equal(
    isProviderAuthAllowed({
      baseUrl: "http://127.0.0.1:8188",
      kind: "local_comfyui",
      authMode: "none",
    }),
    true,
    "127.0.0.1 should be allowed with authMode: none for local_comfyui",
  );

  // Loopback localhost
  assert.equal(
    isProviderAuthAllowed({
      baseUrl: "http://localhost:8188",
      kind: "local_comfyui",
      authMode: "none",
    }),
    true,
    "localhost should be allowed with authMode: none for local_comfyui",
  );

  // Loopback IPv6
  assert.equal(
    isProviderAuthAllowed({
      baseUrl: "http://[::1]:8188",
      kind: "local_comfyui",
      authMode: "none",
    }),
    true,
    "[::1] should be allowed with authMode: none for local_comfyui",
  );

  // Protocol as local_comfyui
  assert.equal(
    isProviderAuthAllowed({
      baseUrl: "http://127.0.0.1:8188",
      protocol:
        "local_comfyui" as unknown as import("../../src/domain/providerProtocol.ts").ProviderProtocol,
      authMode: "none",
    }),
    true,
    "protocol 'local_comfyui' should be allowed with authMode: none on 127.0.0.1",
  );
});

test("isProviderAuthAllowed rejects authMode 'none' for local_comfyui on external addresses", () => {
  // External IP
  assert.equal(
    isProviderAuthAllowed({
      baseUrl: "http://192.168.1.100:8188",
      kind: "local_comfyui",
      authMode: "none",
    }),
    false,
    "Private non-loopback IP must reject authMode: none",
  );

  // External hostname
  assert.equal(
    isProviderAuthAllowed({
      baseUrl: "https://comfyui.external-server.com:8188",
      kind: "local_comfyui",
      authMode: "none",
    }),
    false,
    "External hostname must reject authMode: none",
  );

  // External address with api-key IS permitted (if allowed url)
  assert.equal(
    isProviderAuthAllowed({
      baseUrl: "https://comfyui.external-server.com",
      kind: "local_comfyui",
      authMode: "api-key",
    }),
    true,
    "External address with authMode: api-key is permitted",
  );
});

test("isProviderAuthAllowed enforces protocol restrictions on loopback addresses", () => {
  // Loopback with openai-chat allows none
  assert.equal(
    isProviderAuthAllowed({
      baseUrl: "http://127.0.0.1:11434",
      protocol: "openai-chat",
      authMode: "none",
    }),
    true,
  );

  // Loopback with ollama allows none
  assert.equal(
    isProviderAuthAllowed({
      baseUrl: "http://127.0.0.1:11434",
      protocol: "ollama",
      authMode: "none",
    }),
    true,
  );

  // Loopback with anthropic rejects none
  assert.equal(
    isProviderAuthAllowed({
      baseUrl: "http://127.0.0.1:8000",
      protocol: "anthropic",
      authMode: "none",
    }),
    false,
  );

  // Loopback with search/hash/credentials rejects
  assert.equal(
    isProviderAuthAllowed({
      baseUrl: "http://user:pass@127.0.0.1:8188",
      kind: "local_comfyui",
      authMode: "none",
    }),
    false,
  );
  assert.equal(
    isProviderAuthAllowed({
      baseUrl: "http://127.0.0.1:8188?token=secret",
      kind: "local_comfyui",
      authMode: "none",
    }),
    false,
  );
});

// =============================================================================
// 2. 12AI requires an explicit host persistence port before submission.
// =============================================================================

const twelveAiConnection: ProviderConnection = {
  id: "twelve-ai-conn-test",
  provider: "12AI",
  kind: "user_byok",
  displayName: "12AI Managed Test",
  baseUrl: "https://api.12ai.org/v1",
  credentialRef: "cred-12ai-valid",
  capabilities: {
    modalities: ["image"],
    operations: ["generate"],
    maxOutputs: 1,
    async: true,
  },
  state: "active",
  concurrencyLimit: 2,
};

test("factory refuses paid submission without a host persistence port", async () => {
  let calls = 0;
  const adapter = createGenerationAdapter(twelveAiConnection, {
    fetch: async () => {
      calls++;
      return Response.json({});
    },
    resolveCredential: async () => {
      calls++;
      return "synthetic";
    },
  });
  assert.ok(adapter instanceof TwelveAiTaskAdapter);
  await assert.rejects(
    adapter.submit({
      prompt: "synthetic",
      model: "gpt-image-2.5-flare",
      attachments: [],
      requestedOutputs: 1,
      idempotencyKey: "intent-without-port",
      signal: new AbortController().signal,
    }),
    (error: unknown) =>
      error instanceof TwelveAiTaskError &&
      error.reason === "receipt_persistence_required",
  );
  assert.equal(calls, 0);
});

test("createGenerationAdapter uses an explicit persistence port and submits once", async () => {
  const connection = twelveAiConnection;
  const receipts = new Map<string, TwelveAiSubmissionReceipt>();

  let fetchCalled = false;
  const mockFetch: typeof fetch = async (url, init) => {
    fetchCalled = true;
    const bodyStr = String(init?.body ?? "{}");
    assert.ok(bodyStr.includes("A scenic mountain"));
    return new Response(
      JSON.stringify({
        id: "task_twelve_12345",
        status: "queued",
        outputs: [],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  const adapter = createGenerationAdapter(connection, {
    fetch: mockFetch,
    resolveCredential: async () => "test-secret-key-123",
    submissionPersistence: {
      connectionId: connection.id,
      async claimSubmission(receipt) {
        const existing = receipts.get(receipt.idempotencyKey);
        if (existing) return { created: false, receipt: { ...existing } };
        receipts.set(receipt.idempotencyKey, { ...receipt });
        return { created: true };
      },
      async persistSubmissionReceipt(receipt) {
        receipts.set(receipt.idempotencyKey, { ...receipt });
      },
    },
  });

  assert.ok(
    adapter instanceof TwelveAiTaskAdapter,
    "Adapter should be TwelveAiTaskAdapter",
  );

  const request: TwelveAiGenerationRequest = {
    prompt: "A scenic mountain",
    model: "gpt-image-2.5-flare",
    attachments: [],
    requestedOutputs: 1,
    idempotencyKey: "intent-test-submit-cleanly",
    signal: new AbortController().signal,
  };

  const result = await adapter.submit(request);
  assert.equal(
    fetchCalled,
    true,
    "Fetch should have been called for task submit",
  );
  assert.equal(result.providerJobId, "task_twelve_12345");
  assert.equal(result.status, "queued");
  assert.equal(result.async, true);

  // Subsequent submit with same intent key returns cached submission without second fetch
  fetchCalled = false;
  const secondResult = await adapter.submit(request);
  assert.equal(
    fetchCalled,
    false,
    "Second submit with same idempotencyKey should not re-post",
  );
  assert.equal(secondResult.providerJobId, "task_twelve_12345");
});

// =============================================================================
// 3. External generation grants do not constrain Codex's own reasoning model.
// =============================================================================

function setupTestAgentConnection() {
  const sources: {
    onmessage: ((e: { type: string; data: string }) => void) | null;
    emit(e: { type: string; data: unknown }): void;
    close(): void;
  }[] = [];

  const eventSourceFactory = (url: string) => {
    const scope = JSON.parse(
      new URL(url, "http://localhost").searchParams.get("scope") ?? "null",
    );
    const source = {
      onmessage: null as ((e: { type: string; data: string }) => void) | null,
      onerror: null,
      closed: false,
      emit(event: { type: string; data: unknown }) {
        source.onmessage?.({
          type: event.type,
          data: JSON.stringify(
            event.data && typeof event.data === "object"
              ? {
                  scope,
                  ...(event.type === "tool_call"
                    ? { threadId: "", turnId: "" }
                    : {}),
                  ...event.data,
                }
              : event.data,
          ),
        });
      },
      close() {
        source.closed = true;
      },
    };
    sources.push(source);
    queueMicrotask(() => {
      source.emit({
        type: "hello",
        data: {
          codex: { busy: false },
          conversation: {
            revision: 1,
            conversationId: "conv-allowlist-test",
            threadId: "thread-allowlist-test",
            status: "ready",
            mcpStatuses: {},
          },
        },
      });
    });
    return source;
  };

  const storageMap = new Map<string, string>();
  storageMap.set("kk-agent-thread:workspace", "thread-allowlist-test");
  const storage = {
    getItem: (k: string) => storageMap.get(k) ?? null,
    setItem: (k: string, v: string) => void storageMap.set(k, v),
    removeItem: (k: string) => void storageMap.delete(k),
  };

  let turnCalls = 0;
  const fetcher = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/turn")) {
      turnCalls++;
      return new Response(
        JSON.stringify({
          ok: true,
          turnId: "turn-101",
          state: {
            revision: 2,
            conversationId: "conv-allowlist-test",
            threadId: "thread-allowlist-test",
            status: "ready",
            mcpStatuses: {},
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({ ok: true, protocolVersion: 7, data: [], messages: [] }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  const conn = createAgentConnection({
    storage,
    eventSourceFactory,
    fetcher,
  });

  return { conn, sources, getTurnCalls: () => turnCalls };
}

test("agentConnection allowlist validation allows allowed models", async () => {
  const { conn } = setupTestAgentConnection();
  await conn.connect();
  await new Promise((r) => setImmediate(r));

  const result = await conn.sendMessage("帮我编写提示词", {
    model: "gpt-4o",
    modelAllowlist: ["gpt-4o", "claude-3-5-sonnet"],
  });

  assert.equal(
    result.ok,
    true,
    `Expected allowed model to succeed, got: ${result.error}`,
  );
  conn.disconnect();
});

test("external generation allowlist does not block the Codex reasoning model", async () => {
  const { conn, getTurnCalls } = setupTestAgentConnection();
  await conn.connect();
  await new Promise((r) => setImmediate(r));

  const initialTurns = getTurnCalls();
  const result = await conn.sendMessage("调用未授权模型", {
    model: "claude-3-opus",
    modelAllowlist: ["gpt-4o", "claude-3-5-sonnet"],
  });

  assert.equal(result.ok, true);
  assert.equal(getTurnCalls(), initialTurns + 1);
  conn.disconnect();
});

test("empty external generation allowlist still allows a Codex reasoning turn", async () => {
  const { conn, getTurnCalls } = setupTestAgentConnection();
  await conn.connect();
  await new Promise((r) => setImmediate(r));

  const initialTurns = getTurnCalls();
  const result = await conn.sendMessage("空白名单测试", {
    model: "gpt-4o",
    modelAllowlist: [],
  });

  assert.equal(result.ok, true);
  assert.equal(getTurnCalls(), initialTurns + 1);
  conn.disconnect();
});

test("Codex selection remains independent of the external generation allowlist", async () => {
  // Selection with allowed model
  const { conn: allowedConn } = setupTestAgentConnection();
  await allowedConn.connect();
  await new Promise((r) => setImmediate(r));

  const allowed = await allowedConn.sendMessage("合理请求", {
    selection: { source: "codex", model: "gpt-4o", kind: "text" },
    modelAllowlist: ["gpt-4o"],
  });
  assert.equal(allowed.ok, true);
  allowedConn.disconnect();

  // A Codex selection is not an external generation tool invocation.
  const { conn: disallowedConn, getTurnCalls } = setupTestAgentConnection();
  await disallowedConn.connect();
  await new Promise((r) => setImmediate(r));

  const disallowed = await disallowedConn.sendMessage("越界请求", {
    selection: { source: "codex", model: "gemini-2.0-flash", kind: "text" },
    modelAllowlist: ["gpt-4o"],
  });
  assert.equal(disallowed.ok, true);
  assert.equal(getTurnCalls(), 1);
  disallowedConn.disconnect();
});

// =============================================================================
// 4. agentHost: Generation Tool Boundary and Model Allowlist Enforcement
// =============================================================================

test("agentHost blocks run_generation when model is not in options.modelAllowlist", async () => {
  let project = createProject({
    kind: "image",
    prompt: "初始提示词",
    model: "flux-schnell",
    attachments: [],
  });

  const node: CanvasCollectionItem = {
    id: "img-test-node-1",
    kind: "image",
    title: "测试图片",
    description: "提示词",
    model: "flux-schnell",
  };
  project = { ...project, items: [...project.items, node] };

  let generateCalls = 0;
  const host = createAgentHost({
    getProject: () => project,
    commit: (next) => {
      project = next;
    },
    generate: async () => {
      generateCalls++;
      return { taskId: "task-approved-1" };
    },
    modelAllowlist: ["flux-schnell", "dall-e-3"],
  });

  // 1. Allowed model passes
  const validResult = await host.applyOps([
    {
      type: "run_generation",
      nodeId: "img-test-node-1",
      model: "flux-schnell",
      prompt: "生成合法图片",
    },
  ]);
  assert.equal(validResult.applied.length, 1);
  assert.equal(validResult.rejected.length, 0);
  assert.equal(generateCalls, 1);

  // 2. Disallowed external model is blocked at boundary
  const blockedResult = await host.applyOps([
    {
      type: "run_generation",
      nodeId: "img-test-node-1",
      model: "unauthorized-external-tool-v9",
      prompt: "越界调用外部模型",
    },
  ]);
  assert.equal(blockedResult.applied.length, 0);
  assert.equal(blockedResult.rejected.length, 1);
  assert.match(
    blockedResult.rejected[0].reason,
    /模型 unauthorized-external-tool-v9 不在允许调用的模型白名单中/,
  );
  assert.equal(
    generateCalls,
    1,
    "generate must not be called when model is blocked",
  );
});

test("agentHost blocks run_generation when options.modelAllowlist is empty []", async () => {
  let project = createProject({
    kind: "image",
    prompt: "初始提示词",
    model: "dall-e-3",
    attachments: [],
  });

  const node: CanvasCollectionItem = {
    id: "img-node-empty-list",
    kind: "image",
    title: "测试图片",
    description: "提示词",
    model: "dall-e-3",
  };
  project = { ...project, items: [...project.items, node] };

  let generateCalls = 0;
  const host = createAgentHost({
    getProject: () => project,
    commit: (next) => {
      project = next;
    },
    generate: async () => {
      generateCalls++;
      return { taskId: "task-never" };
    },
    modelAllowlist: [], // Explicitly empty allowlist blocks all
  });

  const result = await host.applyOps([
    {
      type: "run_generation",
      nodeId: "img-node-empty-list",
      model: "dall-e-3",
      prompt: "生成图片",
    },
  ]);

  assert.equal(result.applied.length, 0);
  assert.equal(result.rejected.length, 1);
  assert.match(
    result.rejected[0].reason,
    /模型 dall-e-3 不在允许调用的模型白名单中/,
  );
  assert.equal(generateCalls, 0);
});

test("agentHost respects active chat modelAllowlist when host modelAllowlist is omitted", async () => {
  let project = createProject({
    kind: "image",
    prompt: "提示词",
    model: "chat-allowed-model",
    attachments: [],
  });

  const chatId = project.activeChatId ?? "chat-default";
  project = {
    ...project,
    chats: {
      ...project.chats,
      [chatId]: {
        id: chatId,
        name: "受限会话",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        draft: { prompt: "", attachments: [] },
        messages: [],
        mainAgent: "codex",
        modelAllowlist: ["chat-allowed-model"],
      },
    },
  };

  const node: CanvasCollectionItem = {
    id: "img-chat-allowlist-node",
    kind: "image",
    title: "测试图片",
    description: "提示词",
    model: "chat-allowed-model",
  };
  project = { ...project, items: [...project.items, node] };

  let generateCalls = 0;
  const host = createAgentHost({
    getProject: () => project,
    commit: (next) => {
      project = next;
    },
    generate: async () => {
      generateCalls++;
      return { taskId: "task-chat-1" };
    },
  });

  // Call with chat-allowed model succeeds
  const okResult = await host.applyOps([
    {
      type: "run_generation",
      nodeId: "img-chat-allowlist-node",
      model: "chat-allowed-model",
      prompt: "合规生图",
    },
  ]);
  assert.equal(okResult.applied.length, 1);
  assert.equal(generateCalls, 1);

  // Call with unauthorized model fails
  const failResult = await host.applyOps([
    {
      type: "run_generation",
      nodeId: "img-chat-allowlist-node",
      model: "forbidden-external-model",
      prompt: "违规生图",
    },
  ]);
  assert.equal(failResult.applied.length, 0);
  assert.equal(failResult.rejected.length, 1);
  assert.match(
    failResult.rejected[0].reason,
    /模型 forbidden-external-model 不在允许调用的模型白名单中/,
  );
  assert.equal(generateCalls, 1);
});
