import assert from "node:assert/strict";
import test from "node:test";
import { isProviderAuthAllowed } from "../../src/domain/providerProtocol.ts";
import type { ProviderConnection } from "../../src/domain/providerConnections.ts";
import { createGenerationAdapter } from "../../src/integrations/generation/providerAdapterFactory.ts";
import {
  TwelveAiTaskAdapter,
  TwelveAiTaskError,
  type TwelveAiGenerationRequest,
  type TwelveAiSubmissionPersistence,
  type TwelveAiSubmissionReceipt,
} from "../../src/integrations/generation/twelveAiTaskAdapter.ts";
import { createAgentHost } from "../../src/features/agent/agentHost.ts";
import { createProject } from "../../src/features/creation/model.ts";
import type { CanvasCollectionItem } from "../../src/domain/canvasItems.ts";

// Controlled host-port fixture; this Map is not production persistence or restart evidence.
function receiptPortFixture(
  connectionId: string,
): TwelveAiSubmissionPersistence {
  const receipts = new Map<string, TwelveAiSubmissionReceipt>();
  return {
    connectionId,
    async claimSubmission(receipt) {
      const existing = receipts.get(receipt.idempotencyKey);
      if (existing) return { created: false, receipt: { ...existing } };
      receipts.set(receipt.idempotencyKey, { ...receipt });
      return { created: true };
    },
    async persistSubmissionReceipt(receipt) {
      receipts.set(receipt.idempotencyKey, { ...receipt });
    },
  };
}

// =============================================================================
// CHALLENGE SUITE 1: ComfyUI Loopback None-Auth URL Validation Matrix
// =============================================================================

test("CHALLENGE 1.1: ComfyUI loopback none-auth accepts standard loopbacks (localhost, 127.0.0.1, ::1)", () => {
  const allowedUrls = [
    // Standard ComfyUI default port
    "http://localhost:8188",
    "http://127.0.0.1:8188",
    "http://[::1]:8188",
    // Trailing slash
    "http://localhost:8188/",
    "http://127.0.0.1:8188/",
    "http://[::1]:8188/",
    // Custom paths
    "http://localhost:8188/api",
    "http://127.0.0.1:8188/api/v1",
    "http://[::1]:8188/view",
  ];

  for (const url of allowedUrls) {
    // Via kind: "local_comfyui"
    assert.equal(
      isProviderAuthAllowed({
        baseUrl: url,
        kind: "local_comfyui",
        authMode: "none",
      }),
      true,
      `Should allow loopback URL: ${url} with kind: local_comfyui and authMode: none`,
    );

    // Via protocol: "local_comfyui"
    assert.equal(
      isProviderAuthAllowed({
        baseUrl: url,
        protocol:
          "local_comfyui" as unknown as import("../../src/domain/providerProtocol.ts").ProviderProtocol,
        authMode: "none",
      }),
      true,
      `Should allow loopback URL: ${url} with protocol: local_comfyui and authMode: none`,
    );
  }
});

test("CHALLENGE 1.2: ComfyUI loopback none-auth handles uppercase, mixed-case schemes and hostnames", () => {
  const caseInsensitiveUrls = [
    "HTTP://LOCALHOST:8188",
    "HTTP://127.0.0.1:8188",
    "HTTP://[::1]:8188",
    "http://LOCALHOST:8188",
    "http://LoCaLhOsT:8188",
    "HTTP://localhost:8188",
    "HTTP://[::1]:8188/API",
  ];

  for (const url of caseInsensitiveUrls) {
    assert.equal(
      isProviderAuthAllowed({
        baseUrl: url,
        kind: "local_comfyui",
        authMode: "none",
      }),
      true,
      `Should allow case-varied URL: ${url}`,
    );
  }
});

test("CHALLENGE 1.3: ComfyUI loopback none-auth accepts diverse custom ports and omitted port", () => {
  const customPortUrls = [
    "http://localhost", // Default HTTP port 80 implicit
    "http://localhost:80", // Explicit port 80
    "http://localhost:8080", // Alternate HTTP port
    "http://localhost:3000", // Node dev server port
    "http://localhost:5000", // Flask port
    "http://localhost:65535", // Maximum 16-bit port
    "http://127.0.0.1", // 127.0.0.1 with implicit port
    "http://127.0.0.1:9090", // Custom port
    "http://[::1]", // IPv6 with implicit port
    "http://[::1]:9999", // IPv6 with custom port
  ];

  for (const url of customPortUrls) {
    assert.equal(
      isProviderAuthAllowed({
        baseUrl: url,
        kind: "local_comfyui",
        authMode: "none",
      }),
      true,
      `Should allow loopback with custom port: ${url}`,
    );
  }
});

test("CHALLENGE 1.4: ComfyUI loopback none-auth strictly rejects non-loopback IPs and domains", () => {
  const nonLoopbackUrls = [
    // Private IPv4 LAN
    "http://192.168.1.1:8188",
    "http://192.168.0.100:8188",
    "http://10.0.0.1:8188",
    "http://10.254.254.254:8188",
    "http://172.16.0.1:8188",
    "http://172.31.255.255:8188",
    // Public IPv4
    "http://8.8.8.8:8188",
    "http://1.1.1.1:8188",
    // External hostnames
    "http://comfyui.local:8188",
    "http://comfyui.internal:8188",
    "http://my-comfyui-server.com:8188",
    "https://my-comfyui-server.com:8188", // HTTPS with authMode: none is rejected
    // Sneaky spoofing hostnames
    "http://localhost.evil.com:8188",
    "http://evil-localhost:8188",
    "http://127.0.0.1.nip.io:8188",
    "http://localhost.com:8188",
    // Non-loopback special addresses
    "http://0.0.0.0:8188", // INADDR_ANY (not loopback)
    "http://255.255.255.255:8188", // Broadcast
    // Non-loopback IPv6
    "http://[::2]:8188",
    "http://[fe80::1]:8188", // IPv6 Link-local
    "http://[2001:db8::1]:8188", // IPv6 Documentation prefix
    "http://[fc00::1]:8188", // IPv6 Unique local
  ];

  for (const url of nonLoopbackUrls) {
    assert.equal(
      isProviderAuthAllowed({
        baseUrl: url,
        kind: "local_comfyui",
        authMode: "none",
      }),
      false,
      `MUST reject non-loopback URL with authMode 'none': ${url}`,
    );
  }
});

test("CHALLENGE 1.5: ComfyUI loopback none-auth rejects URL query parameters, hash fragments, and userinfo", () => {
  const injectionUrls = [
    // User credentials in URL
    "http://admin:secret@localhost:8188",
    "http://foo:bar@127.0.0.1:8188",
    "http://user@localhost:8188",
    // Query strings
    "http://localhost:8188?key=secret",
    "http://127.0.0.1:8188?token=123",
    "http://[::1]:8188/?foo=bar",
    // Hash fragments
    "http://localhost:8188#admin",
    "http://127.0.0.1:8188/#anchor",
    // Malformed URLs
    "not-a-valid-url",
    "javascript:alert(1)",
    "file:///C:/Windows/System32",
    "data:text/html,test",
  ];

  for (const url of injectionUrls) {
    assert.equal(
      isProviderAuthAllowed({
        baseUrl: url,
        kind: "local_comfyui",
        authMode: "none",
      }),
      false,
      `MUST reject injection or malformed URL: ${url}`,
    );
  }
});

test("CHALLENGE 1.6: ComfyUI allows external HTTPS only when authMode is api-key", () => {
  // External HTTPS with api-key: allowed
  assert.equal(
    isProviderAuthAllowed({
      baseUrl: "https://comfy.external-cloud.com",
      kind: "local_comfyui",
      authMode: "api-key",
    }),
    true,
    "External HTTPS with api-key should be permitted",
  );

  // External HTTP with api-key: rejected (plain HTTP only permitted for loopback)
  assert.equal(
    isProviderAuthAllowed({
      baseUrl: "http://comfy.external-cloud.com:8188",
      kind: "local_comfyui",
      authMode: "api-key",
    }),
    false,
    "External plain HTTP with api-key must be rejected for security",
  );
});

// =============================================================================
// CHALLENGE SUITE 2: 12AI Task Adapter Submit Flow & Persistence Commits
// =============================================================================

test("CHALLENGE 2.1: 12AI submit flow executes claims and commits receipts atomically", async () => {
  const connectionId = "twelve-ai-conn-atomic-test";
  const connection: ProviderConnection = {
    id: connectionId,
    provider: "12AI",
    kind: "user_byok",
    displayName: "12AI Test",
    baseUrl: "https://api.12ai.org/v1",
    credentialRef: "cred-test",
    capabilities: {
      modalities: ["image"],
      operations: ["generate"],
      maxOutputs: 1,
      async: true,
    },
    state: "active",
    concurrencyLimit: 2,
  };

  const callOrder: string[] = [];
  const trackedReceipts: TwelveAiSubmissionReceipt[] = [];

  const mockPersistence: TwelveAiSubmissionPersistence = {
    connectionId,
    async claimSubmission(receipt) {
      callOrder.push("claimSubmission");
      trackedReceipts.push({ ...receipt });
      return { created: true };
    },
    async persistSubmissionReceipt(receipt) {
      callOrder.push("persistSubmissionReceipt");
      trackedReceipts.push({ ...receipt });
    },
  };

  const mockFetch: typeof fetch = async () => {
    callOrder.push("networkFetch");
    return new Response(
      JSON.stringify({
        id: "task_twelve_atomic_999",
        status: "queued",
        outputs: [],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  const adapter = createGenerationAdapter(connection, {
    fetch: mockFetch,
    resolveCredential: async () => "secret-token-abc",
    submissionPersistence: mockPersistence,
  });

  assert.ok(adapter instanceof TwelveAiTaskAdapter);

  const request: TwelveAiGenerationRequest = {
    prompt: "An empirical challenge prompt",
    model: "gpt-image-2.5-flare",
    attachments: [],
    requestedOutputs: 1,
    idempotencyKey: "intent-atomic-order-001",
    signal: new AbortController().signal,
  };

  const result = await adapter.submit(request);

  // 1. Verify exact order of execution: claimSubmission -> networkFetch -> persistSubmissionReceipt
  assert.deepEqual(callOrder, [
    "claimSubmission",
    "networkFetch",
    "persistSubmissionReceipt",
  ]);

  // 2. Verify claim was for unknown acceptance
  assert.equal(trackedReceipts[0].idempotencyKey, "intent-atomic-order-001");
  assert.equal(trackedReceipts[0].acceptance, "unknown");

  // 3. Verify committed receipt after fetch is accepted with correct task ID
  assert.equal(trackedReceipts[1].idempotencyKey, "intent-atomic-order-001");
  assert.equal(trackedReceipts[1].acceptance, "accepted");
  assert.equal(trackedReceipts[1].providerJobId, "task_twelve_atomic_999");

  // 4. Verify job result
  assert.equal(result.providerJobId, "task_twelve_atomic_999");
  assert.equal(result.async, true);
  assert.equal(result.status, "queued");
});

test("CHALLENGE 2.2: An explicit host port restores accepted receipts across adapter instances", async () => {
  const connectionId = "twelve-ai-cross-instance-test";
  const connection: ProviderConnection = {
    id: connectionId,
    provider: "12AI",
    kind: "user_byok",
    displayName: "12AI Cross-Instance",
    baseUrl: "https://api.12ai.org/v1",
    credentialRef: "cred-test-2",
    capabilities: {
      modalities: ["image"],
      operations: ["generate"],
      maxOutputs: 1,
      async: true,
    },
    state: "active",
    concurrencyLimit: 2,
  };

  let fetchCount = 0;
  const mockFetch: typeof fetch = async () => {
    fetchCount++;
    return new Response(
      JSON.stringify({
        id: "task_twelve_shared_111",
        status: "queued",
        outputs: [],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  const persistence = receiptPortFixture(connectionId);
  const adapter1 = createGenerationAdapter(connection, {
    fetch: mockFetch,
    resolveCredential: async () => "token-1",
    submissionPersistence: persistence,
  });
  assert.ok(adapter1 instanceof TwelveAiTaskAdapter);

  const request: TwelveAiGenerationRequest = {
    prompt: "First submit",
    model: "gpt-image-2.5-flare",
    attachments: [],
    requestedOutputs: 1,
    idempotencyKey: "intent-shared-store-001",
    signal: new AbortController().signal,
  };

  const res1 = await adapter1.submit(request);
  assert.equal(res1.providerJobId, "task_twelve_shared_111");
  assert.equal(fetchCount, 1);

  // The host port retains the accepted identity before another adapter resumes.
  const claimCheck = await persistence.claimSubmission({
    connectionId,
    idempotencyKey: "intent-shared-store-001",
    acceptance: "unknown",
  });
  assert.equal(claimCheck.created, false);
  if (!claimCheck.created) {
    assert.equal(claimCheck.receipt.acceptance, "accepted");
    assert.equal(claimCheck.receipt.providerJobId, "task_twelve_shared_111");
  }

  // This checks port injection across instances, not real host restart durability.
  const adapter2 = createGenerationAdapter(connection, {
    fetch: mockFetch,
    resolveCredential: async () => "token-1",
    submissionPersistence: persistence,
  });
  assert.ok(adapter2 instanceof TwelveAiTaskAdapter);

  // Submitting with same idempotencyKey MUST NOT trigger network fetch!
  const res2 = await adapter2.submit(request);
  assert.equal(
    fetchCount,
    1,
    "Must NOT make a second network fetch when receipt is already committed",
  );
  assert.equal(res2.providerJobId, "task_twelve_shared_111");
  assert.equal(res2.async, true);
  assert.equal(res2.status, "queued");
});

test("CHALLENGE 2.3: Concurrent submissions with same idempotencyKey are coalesced without duplicate fetch", async () => {
  const connection: ProviderConnection = {
    id: "twelve-ai-concurrent-test",
    provider: "12AI",
    kind: "user_byok",
    displayName: "12AI Concurrent",
    baseUrl: "https://api.12ai.org/v1",
    credentialRef: "cred-test-3",
    capabilities: {
      modalities: ["image"],
      operations: ["generate"],
      maxOutputs: 1,
      async: true,
    },
    state: "active",
    concurrencyLimit: 2,
  };

  let networkInvocations = 0;
  const mockFetch: typeof fetch = async () => {
    networkInvocations++;
    // Simulate slight network delay
    await new Promise((resolve) => setTimeout(resolve, 20));
    return new Response(
      JSON.stringify({
        id: "task_twelve_concurrent_888",
        status: "queued",
        outputs: [],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  const adapter = createGenerationAdapter(connection, {
    fetch: mockFetch,
    resolveCredential: async () => "token-3",
    submissionPersistence: receiptPortFixture(connection.id),
  });
  assert.ok(adapter instanceof TwelveAiTaskAdapter);

  const request: TwelveAiGenerationRequest = {
    prompt: "Concurrent prompt",
    model: "gpt-image-2.5-flare",
    attachments: [],
    requestedOutputs: 1,
    idempotencyKey: "intent-concurrent-race-001",
    signal: new AbortController().signal,
  };

  // Launch two concurrent submits simultaneously
  const [sub1, sub2] = await Promise.all([
    adapter.submit(request),
    adapter.submit(request),
  ]);

  assert.equal(
    networkInvocations,
    1,
    "Only one network request must be made for concurrent identical submits",
  );
  assert.equal(sub1.providerJobId, "task_twelve_concurrent_888");
  assert.equal(sub2.providerJobId, "task_twelve_concurrent_888");
});

test("CHALLENGE 2.4: Terminal remote rejection updates and commits persistence receipt to 'rejected'", async () => {
  const connectionId = "twelve-ai-rejection-test";
  const connection: ProviderConnection = {
    id: connectionId,
    provider: "12AI",
    kind: "user_byok",
    displayName: "12AI Rejection",
    baseUrl: "https://api.12ai.org/v1",
    credentialRef: "cred-test-4",
    capabilities: {
      modalities: ["image"],
      operations: ["generate"],
      maxOutputs: 1,
      async: true,
    },
    state: "active",
    concurrencyLimit: 2,
  };

  // Remote server rejects with HTTP 400 Bad Request
  const mockFetch: typeof fetch = async () => {
    return new Response(
      JSON.stringify({
        error: "Prompt contains prohibited terms",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  };

  const persistence = receiptPortFixture(connectionId);
  const adapter = createGenerationAdapter(connection, {
    fetch: mockFetch,
    resolveCredential: async () => "token-4",
    submissionPersistence: persistence,
  });
  assert.ok(adapter instanceof TwelveAiTaskAdapter);

  const request: TwelveAiGenerationRequest = {
    prompt: "Bad prompt triggering 400",
    model: "gpt-image-2.5-flare",
    attachments: [],
    requestedOutputs: 1,
    idempotencyKey: "intent-rejection-persist-001",
    signal: new AbortController().signal,
  };

  await assert.rejects(
    async () => {
      await adapter.submit(request);
    },
    (err: unknown) => {
      assert.ok(err instanceof TwelveAiTaskError);
      return true;
    },
  );

  // Check that the persistence store committed acceptance: "rejected"
  const claimCheck = await persistence.claimSubmission({
    connectionId,
    idempotencyKey: "intent-rejection-persist-001",
    acceptance: "unknown",
  });

  assert.equal(claimCheck.created, false);
  if (!claimCheck.created) {
    assert.equal(
      claimCheck.receipt.acceptance,
      "rejected",
      "Terminal rejection must be committed as 'rejected'",
    );
  }
});

test("CHALLENGE 2.5: Pre-aborted signal stops submit immediately without calling claim or fetch", async () => {
  const connectionId = "twelve-ai-abort-test";
  const connection: ProviderConnection = {
    id: connectionId,
    provider: "12AI",
    kind: "user_byok",
    displayName: "12AI Abort",
    baseUrl: "https://api.12ai.org/v1",
    credentialRef: "cred-test-5",
    capabilities: {
      modalities: ["image"],
      operations: ["generate"],
      maxOutputs: 1,
      async: true,
    },
    state: "active",
    concurrencyLimit: 2,
  };

  let claimCalled = false;
  let fetchCalled = false;

  const mockPersistence: TwelveAiSubmissionPersistence = {
    connectionId,
    async claimSubmission() {
      claimCalled = true;
      return { created: true };
    },
    async persistSubmissionReceipt() {},
  };

  const adapter = createGenerationAdapter(connection, {
    fetch: async () => {
      fetchCalled = true;
      return new Response("{}");
    },
    resolveCredential: async () => "token-5",
    submissionPersistence: mockPersistence,
  });

  const abortController = new AbortController();
  abortController.abort(); // Pre-abort

  const request: TwelveAiGenerationRequest = {
    prompt: "Aborted prompt",
    model: "gpt-image-2.5-flare",
    attachments: [],
    requestedOutputs: 1,
    idempotencyKey: "intent-abort-pre-001",
    signal: abortController.signal,
  };

  await assert.rejects(
    async () => {
      await adapter!.submit(request);
    },
    (err: unknown) => {
      assert.ok(err instanceof TwelveAiTaskError);
      assert.equal((err as TwelveAiTaskError).reason, "polling_stopped");
      return true;
    },
  );

  assert.equal(
    claimCalled,
    false,
    "Must not claim persistence when pre-aborted",
  );
  assert.equal(
    fetchCalled,
    false,
    "Must not make network request when pre-aborted",
  );
});

test("CHALLENGE 2.6: Mismatched connectionId in custom persistence is strictly rejected", async () => {
  const connection: ProviderConnection = {
    id: "twelve-ai-conn-real",
    provider: "12AI",
    kind: "user_byok",
    displayName: "12AI Mismatch",
    baseUrl: "https://api.12ai.org/v1",
    credentialRef: "cred-test-6",
    capabilities: {
      modalities: ["image"],
      operations: ["generate"],
      maxOutputs: 1,
      async: true,
    },
    state: "active",
    concurrencyLimit: 2,
  };

  const mismatchedPersistence: TwelveAiSubmissionPersistence = {
    connectionId: "wrong-connection-id-mismatch",
    async claimSubmission() {
      return { created: true };
    },
    async persistSubmissionReceipt() {},
  };

  const adapter = createGenerationAdapter(connection, {
    submissionPersistence: mismatchedPersistence,
  });

  const request: TwelveAiGenerationRequest = {
    prompt: "Mismatch test",
    model: "gpt-image-2.5-flare",
    attachments: [],
    requestedOutputs: 1,
    idempotencyKey: "intent-mismatch-001",
    signal: new AbortController().signal,
  };

  await assert.rejects(
    async () => {
      await adapter!.submit(request);
    },
    (err: unknown) => {
      assert.ok(err instanceof TwelveAiTaskError);
      assert.equal(
        (err as TwelveAiTaskError).reason,
        "receipt_persistence_required",
      );
      return true;
    },
  );
});

// =============================================================================
// CHALLENGE SUITE 3: Model Allowlist Boundary Verification
// =============================================================================

test("CHALLENGE 3.1: agentHost respects dynamic modelAllowlist function and node fallback", async () => {
  let project = createProject({
    kind: "image",
    prompt: "初始提示词",
    model: "model-a",
    attachments: [],
  });

  const node: CanvasCollectionItem = {
    id: "node-dyn-allowlist",
    kind: "image",
    title: "测试图片",
    description: "提示词",
    model: "model-a",
  };
  project = { ...project, items: [...project.items, node] };

  let currentAllowed = ["model-a"];
  let generateCount = 0;

  const host = createAgentHost({
    getProject: () => project,
    commit: (next) => {
      project = next;
    },
    generate: async () => {
      generateCount++;
      return { taskId: "task-dynamic-1" };
    },
    modelAllowlist: () => currentAllowed,
  });

  // When model-a is allowed:
  const res1 = await host.applyOps([
    {
      type: "run_generation",
      nodeId: "node-dyn-allowlist",
      prompt: "生图 1",
    },
  ]);
  assert.equal(res1.applied.length, 1);
  assert.equal(res1.rejected.length, 0);
  assert.equal(generateCount, 1);

  // Now dynamically change allowed list to model-b:
  currentAllowed = ["model-b"];

  // Same op on node-a should now be rejected:
  const res2 = await host.applyOps([
    {
      type: "run_generation",
      nodeId: "node-dyn-allowlist",
      prompt: "生图 2",
    },
  ]);
  assert.equal(res2.applied.length, 0);
  assert.equal(res2.rejected.length, 1);
  assert.match(
    res2.rejected[0].reason,
    /模型 model-a 不在允许调用的模型白名单中/,
  );
  assert.equal(
    generateCount,
    1,
    "generate must not be called when model is forbidden",
  );

  // Providing op.model with model-b should succeed:
  const res3 = await host.applyOps([
    {
      type: "run_generation",
      nodeId: "node-dyn-allowlist",
      model: "model-b",
      prompt: "生图 3",
    },
  ]);
  assert.equal(res3.applied.length, 1);
  assert.equal(res3.rejected.length, 0);
  assert.equal(generateCount, 2);
});
