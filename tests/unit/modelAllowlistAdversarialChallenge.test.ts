import assert from "node:assert/strict";
import test from "node:test";
import { createAgentConnection } from "../../src/features/agent/agentConnection.ts";
import { createAgentHost } from "../../src/features/agent/agentHost.ts";
import { createProject } from "../../src/features/creation/model.ts";
import type { CanvasCollectionItem } from "../../src/domain/canvasItems.ts";
import type { CanvasAgentOp } from "../../src/features/agent/agentTypes.ts";

// =============================================================================
// Helper: Agent Connection Setup
// =============================================================================

function setupTestAgentConnection() {
  const sources: {
    onmessage: ((e: { type: string; data: string }) => void) | null;
    emit(e: { type: string; data: unknown }): void;
    close(): void;
  }[] = [];

  const eventSourceFactory = () => {
    const source = {
      onmessage: null as ((e: { type: string; data: string }) => void) | null,
      onerror: null,
      closed: false,
      emit(event: { type: string; data: unknown }) {
        source.onmessage?.({
          type: event.type,
          data: JSON.stringify(event.data),
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
            conversationId: "conv-adv-test",
            threadId: "thread-adv-test",
            status: "ready",
            mcpStatuses: {},
          },
        },
      });
    });
    return source;
  };

  const storageMap = new Map<string, string>();
  storageMap.set("kk-agent-thread:workspace", "thread-adv-test");
  const storage = {
    getItem: (k: string) => storageMap.get(k) ?? null,
    setItem: (k: string, v: string) => void storageMap.set(k, v),
    removeItem: (k: string) => void storageMap.delete(k),
  };

  let turnCalls = 0;
  const postedTurns: unknown[] = [];
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/turn")) {
      turnCalls++;
      if (init?.body) {
        try {
          postedTurns.push(JSON.parse(String(init.body)));
        } catch {
          postedTurns.push(init.body);
        }
      }
      return new Response(
        JSON.stringify({
          ok: true,
          turnId: `turn-${turnCalls}`,
          state: {
            revision: turnCalls + 1,
            conversationId: "conv-adv-test",
            threadId: "thread-adv-test",
            status: "ready",
            mcpStatuses: {},
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({ ok: true, protocolVersion: 6, data: [], messages: [] }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  const conn = createAgentConnection({
    storage,
    eventSourceFactory,
    fetcher,
  });

  return {
    conn,
    sources,
    getTurnCalls: () => turnCalls,
    getPostedTurns: () => postedTurns,
  };
}

// =============================================================================
// Suite 1: agentConnection Boundary Adversarial Stress Tests
// =============================================================================

test("ADV-CONN-1: agentConnection rejects adversarial bypass via empty array [] allowlist across multiple models", async () => {
  const { conn, getTurnCalls } = setupTestAgentConnection();
  await conn.connect();
  await new Promise((r) => setImmediate(r));

  const candidateModels = [
    "gpt-4o",
    "claude-3-5-sonnet",
    "gemini-2.0-flash",
    "deepseek-r1",
    "local-model",
  ];

  for (const model of candidateModels) {
    const result = await conn.sendMessage(`Test turn for ${model}`, {
      model,
      modelAllowlist: [], // Explicitly empty
    });

    assert.equal(result.ok, false, `Model ${model} must be blocked by empty allowlist []`);
    assert.match(
      result.error ?? "",
      /不在允许调用的模型白名单中/,
      `Expected allowlist error message for ${model}, got: ${result.error}`,
    );
  }

  assert.equal(getTurnCalls(), 0, "No turn must be dispatched when allowlist is empty []");
  conn.disconnect();
});

test("ADV-CONN-2: agentConnection rejects adversarial bypass via whitespace variants in model name", async () => {
  const { conn, getTurnCalls } = setupTestAgentConnection();
  await conn.connect();
  await new Promise((r) => setImmediate(r));

  const allowedModel = "gpt-4o";
  const whitespaceVariants = [
    " gpt-4o",
    "gpt-4o ",
    " gpt-4o ",
    "\tgpt-4o",
    "gpt-4o\t",
    "gpt-4o\n",
    "gpt-4o\r\n",
    "gpt-4o\0malicious",
  ];

  for (const variant of whitespaceVariants) {
    const result = await conn.sendMessage("Whitespace bypass test", {
      model: variant,
      modelAllowlist: [allowedModel],
    });

    assert.equal(
      result.ok,
      false,
      `Whitespace variant ${JSON.stringify(variant)} must be strictly rejected`,
    );
    assert.match(
      result.error ?? "",
      /不在允许调用的模型白名单中/,
      `Variant ${JSON.stringify(variant)} should fail with allowlist error`,
    );
  }

  assert.equal(getTurnCalls(), 0, "No turn should execute for any whitespace variant");
  conn.disconnect();
});

test("ADV-CONN-3: agentConnection rejects adversarial bypass via casing variants in model name", async () => {
  const { conn, getTurnCalls } = setupTestAgentConnection();
  await conn.connect();
  await new Promise((r) => setImmediate(r));

  const casingVariants = [
    "GPT-4O",
    "Gpt-4o",
    "GPT-4o",
    "gpt-4O",
    "GpT-4O",
  ];

  for (const variant of casingVariants) {
    const result = await conn.sendMessage("Casing variant test", {
      model: variant,
      modelAllowlist: ["gpt-4o"],
    });

    assert.equal(
      result.ok,
      false,
      `Casing variant ${variant} must not bypass allowlist for gpt-4o`,
    );
    assert.match(result.error ?? "", /不在允许调用的模型白名单中/);
  }

  assert.equal(getTurnCalls(), 0, "No turn should execute for casing variants");
  conn.disconnect();
});

test("ADV-CONN-4: agentConnection rejects injected payloads and prototype property models", async () => {
  const { conn, getTurnCalls } = setupTestAgentConnection();
  await conn.connect();
  await new Promise((r) => setImmediate(r));

  const maliciousPayloads = [
    "__proto__",
    "constructor",
    "toString",
    "valueOf",
    "hasOwnProperty",
    "gpt-4o; drop table models;",
    "gpt-4o && rm -rf /",
    "<script>alert('xss')</script>",
    "gpt-4o' OR '1'='1",
    "",
  ];

  for (const payload of maliciousPayloads) {
    const result = await conn.sendMessage("Injection test", {
      model: payload,
      modelAllowlist: ["gpt-4o"],
    });

    assert.equal(
      result.ok,
      false,
      `Payload ${JSON.stringify(payload)} must be rejected`,
    );
    assert.match(result.error ?? "", /不在允许调用的模型白名单中/);
  }

  assert.equal(getTurnCalls(), 0, "No turns dispatched for injection attempts");
  conn.disconnect();
});

test("ADV-CONN-5: agentConnection safely blocks when modelAllowlist is null without dispatching", async () => {
  const { conn, getTurnCalls } = setupTestAgentConnection();
  await conn.connect();
  await new Promise((r) => setImmediate(r));

  // Adversarially passing null as modelAllowlist
  const result = await conn.sendMessage("Null allowlist test", {
    model: "gpt-4o",
    modelAllowlist: null as unknown as string[],
  });

  assert.equal(result.ok, false, "Null allowlist should fail and not permit turn execution");
  assert.equal(getTurnCalls(), 0, "No turn must be dispatched when allowlist is null");
  conn.disconnect();
});

test("ADV-CONN-6: agentConnection enforces allowlist when selection object is adversarially manipulated", async () => {
  const { conn, getTurnCalls } = setupTestAgentConnection();
  await conn.connect();
  await new Promise((r) => setImmediate(r));

  const adversarialSelections = [
    { source: "codex" as const, model: "unauthorized-claude", kind: "text" as const },
    { source: "codex" as const, model: "GPT-4O", kind: "text" as const },
    { source: "codex" as const, model: "gpt-4o ", kind: "text" as const },
    { source: "codex" as const, model: "gpt-4o\nDROP", kind: "text" as const },
    { source: "codex" as const, model: "__proto__", kind: "text" as const },
  ];

  for (const selection of adversarialSelections) {
    const result = await conn.sendMessage("Selection manipulation", {
      selection,
      modelAllowlist: ["gpt-4o"],
    });

    assert.equal(
      result.ok,
      false,
      `Adversarial selection with model ${selection.model} must be blocked`,
    );
    assert.match(result.error ?? "", /不在允许调用的模型白名单中/);
  }

  assert.equal(getTurnCalls(), 0, "No turn should execute for adversarial selection objects");
  conn.disconnect();
});

test("ADV-CONN-7: agentConnection allows unconstrained access when modelAllowlist is undefined", async () => {
  const { conn, getTurnCalls } = setupTestAgentConnection();
  await conn.connect();
  await new Promise((r) => setImmediate(r));

  const result = await conn.sendMessage("Unconstrained request", {
    model: "any-custom-model-xyz",
    modelAllowlist: undefined,
  });

  assert.equal(result.ok, true, "Undefined allowlist should allow unconstrained operation");
  assert.equal(getTurnCalls(), 1, "Exactly 1 turn should execute");
  conn.disconnect();
});

// =============================================================================
// Suite 2: agentHost (run_generation) Tool Boundary Adversarial Stress Tests
// =============================================================================

function createTestProjectWithNode(nodeModel?: string): {
  project: ReturnType<typeof createProject>;
  node: CanvasCollectionItem;
} {
  let project = createProject({
    kind: "image",
    prompt: "初始画布提示词",
    model: nodeModel ?? "flux-schnell",
    attachments: [],
  });

  const node: CanvasCollectionItem = {
    id: "img-adv-node-1",
    kind: "image",
    title: "测试图片节点",
    description: "提示词",
    model: nodeModel,
  };
  project = { ...project, items: [...project.items, node] };
  return { project, node };
}

test("ADV-HOST-1: agentHost blocks run_generation when options.modelAllowlist is empty array []", async () => {
  const setup = createTestProjectWithNode("flux-schnell");
  let { project } = setup;
  const { node } = setup;

  let generateCalls = 0;
  const host = createAgentHost({
    getProject: () => project,
    commit: (next) => {
      project = next;
    },
    generate: async () => {
      generateCalls++;
      return { taskId: "task-adv-1" };
    },
    modelAllowlist: [], // Strictly empty
  });

  const modelsToTest = ["flux-schnell", "dall-e-3", "stable-diffusion-xl", "midjourney"];
  for (const model of modelsToTest) {
    const res = await host.applyOps([
      {
        type: "run_generation",
        nodeId: node.id,
        model,
        prompt: "生图",
      },
    ]);

    assert.equal(res.applied.length, 0, `Op with model ${model} must not be applied`);
    assert.equal(res.rejected.length, 1, `Op with model ${model} must be rejected`);
    assert.match(res.rejected[0].reason, /不在允许调用的模型白名单中/);
  }

  assert.equal(generateCalls, 0, "options.generate must never be called when allowlist is []");
});

test("ADV-HOST-2: agentHost blocks run_generation with whitespace/case variants against allowlist", async () => {
  const setup = createTestProjectWithNode("flux-schnell");
  let { project } = setup;
  const { node } = setup;

  let generateCalls = 0;
  const host = createAgentHost({
    getProject: () => project,
    commit: (next) => {
      project = next;
    },
    generate: async () => {
      generateCalls++;
      return { taskId: "task-adv-2" };
    },
    modelAllowlist: ["flux-schnell"],
  });

  const bypassAttempts = [
    "FLUX-SCHNELL",
    "Flux-Schnell",
    " flux-schnell",
    "flux-schnell ",
    " flux-schnell ",
    "flux-schnell\n",
    "flux-schnell\t",
    "flux-schnell\0injection",
  ];

  for (const attempt of bypassAttempts) {
    const res = await host.applyOps([
      {
        type: "run_generation",
        nodeId: node.id,
        model: attempt,
        prompt: "测试变体",
      },
    ]);

    assert.equal(res.applied.length, 0, `Bypass attempt ${JSON.stringify(attempt)} must be rejected`);
    assert.equal(res.rejected.length, 1);
    assert.match(res.rejected[0].reason, /不在允许调用的模型白名单中/);
  }

  assert.equal(generateCalls, 0, "No generation tool call should be dispatched for variants");
});

test("ADV-HOST-3: agentHost blocks run_generation with prototype properties and injected payloads", async () => {
  const setup = createTestProjectWithNode("flux-schnell");
  let { project } = setup;
  const { node } = setup;

  let generateCalls = 0;
  const host = createAgentHost({
    getProject: () => project,
    commit: (next) => {
      project = next;
    },
    generate: async () => {
      generateCalls++;
      return { taskId: "task-adv-3" };
    },
    modelAllowlist: ["flux-schnell"],
  });

  const maliciousPayloads = [
    "__proto__",
    "constructor",
    "toString",
    "valueOf",
    "hasOwnProperty",
    "flux-schnell; curl http://attacker.com",
    "flux-schnell\nDELETE /models",
    "<img src=x onerror=alert(1)>",
    "",
  ];

  for (const payload of maliciousPayloads) {
    const res = await host.applyOps([
      {
        type: "run_generation",
        nodeId: node.id,
        model: payload,
        prompt: "生图",
      },
    ]);

    assert.equal(res.applied.length, 0, `Payload ${JSON.stringify(payload)} must not be applied`);
    assert.equal(res.rejected.length, 1);
    assert.match(res.rejected[0].reason, /不在允许调用的模型白名单中/);
  }

  assert.equal(generateCalls, 0, "No generation executed for malicious payloads");
});

test("ADV-HOST-4: agentHost blocks run_generation when model is missing or unwhitelisted on node", async () => {
  // Node has unwhitelisted model
  const setup = createTestProjectWithNode("unauthorized-backdoor-model");
  let { project } = setup;
  const { node } = setup;

  let generateCalls = 0;
  const host = createAgentHost({
    getProject: () => project,
    commit: (next) => {
      project = next;
    },
    generate: async () => {
      generateCalls++;
      return { taskId: "task-adv-4" };
    },
    modelAllowlist: ["flux-schnell"],
  });

  // Op without model falls back to node.model which is unauthorized
  const res1 = await host.applyOps([
    {
      type: "run_generation",
      nodeId: node.id,
      prompt: "生图",
    },
  ]);
  assert.equal(res1.applied.length, 0);
  assert.equal(res1.rejected.length, 1);
  assert.match(res1.rejected[0].reason, /模型 unauthorized-backdoor-model 不在允许调用的模型白名单中/);

  // Node has undefined model and op has no model
  const nodeNoModel: CanvasCollectionItem = {
    id: "img-adv-node-no-model",
    kind: "image",
    title: "无模型节点",
    description: "提示词",
  };
  project = { ...project, items: [...project.items, nodeNoModel] };

  const res2 = await host.applyOps([
    {
      type: "run_generation",
      nodeId: nodeNoModel.id,
      prompt: "生图",
    },
  ]);
  assert.equal(res2.applied.length, 0);
  assert.equal(res2.rejected.length, 1);
  assert.match(res2.rejected[0].reason, /模型 未指定 不在允许调用的模型白名单中/);

  assert.equal(generateCalls, 0);
});

test("ADV-HOST-5: agentHost dynamic function allowlist adapts and blocks immediately on revocation", async () => {
  const setup = createTestProjectWithNode("flux-schnell");
  let { project } = setup;
  const { node } = setup;

  let currentAllowlist: string[] | undefined = ["flux-schnell"];
  let generateCalls = 0;

  const host = createAgentHost({
    getProject: () => project,
    commit: (next) => {
      project = next;
    },
    generate: async () => {
      generateCalls++;
      return { taskId: `task-dyn-${generateCalls}` };
    },
    modelAllowlist: () => currentAllowlist,
  });

  // 1. Initially allowed
  const res1 = await host.applyOps([
    {
      type: "run_generation",
      nodeId: node.id,
      model: "flux-schnell",
      prompt: "合规生图",
    },
  ]);
  assert.equal(res1.applied.length, 1);
  assert.equal(generateCalls, 1);

  // 2. Revoke allowlist dynamically to empty []
  currentAllowlist = [];
  const res2 = await host.applyOps([
    {
      type: "run_generation",
      nodeId: node.id,
      model: "flux-schnell",
      prompt: "尝试绕过撤销",
    },
  ]);
  assert.equal(res2.applied.length, 0);
  assert.equal(res2.rejected.length, 1);
  assert.match(res2.rejected[0].reason, /不在允许调用的模型白名单中/);
  assert.equal(generateCalls, 1, "Generate call count must remain 1");

  // 3. Dynamically set to different model "dall-e-3"
  currentAllowlist = ["dall-e-3"];
  const res3 = await host.applyOps([
    {
      type: "run_generation",
      nodeId: node.id,
      model: "flux-schnell",
      prompt: "尝试调用已剔除模型",
    },
  ]);
  assert.equal(res3.applied.length, 0);
  assert.equal(res3.rejected.length, 1);

  const res4 = await host.applyOps([
    {
      type: "run_generation",
      nodeId: node.id,
      model: "dall-e-3",
      prompt: "调用新授权模型",
    },
  ]);
  assert.equal(res4.applied.length, 1);
  assert.equal(generateCalls, 2);
});

test("ADV-HOST-6: agentHost respects active chat allowlist and blocks unauthorized models", async () => {
  let project = createProject({
    kind: "image",
    prompt: "提示词",
    model: "chat-model-alpha",
    attachments: [],
  });

  const chatId = project.activeChatId ?? "chat-adv";
  project = {
    ...project,
    chats: {
      ...project.chats,
      [chatId]: {
        id: chatId,
        name: "受控会话",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        draft: { prompt: "", attachments: [] },
        messages: [],
        mainAgent: "codex",
        modelAllowlist: ["chat-model-alpha"],
      },
    },
  };

  const node: CanvasCollectionItem = {
    id: "img-node-chat-scoped",
    kind: "image",
    title: "测试图片",
    description: "提示词",
    model: "chat-model-alpha",
  };
  project = { ...project, items: [...project.items, node] };

  let generateCalls = 0;
  // Omit host modelAllowlist so it falls back to active chat allowlist
  const host = createAgentHost({
    getProject: () => project,
    commit: (next) => {
      project = next;
    },
    generate: async () => {
      generateCalls++;
      return { taskId: "task-chat-adv" };
    },
  });

  // Chat-authorized model succeeds
  const okRes = await host.applyOps([
    {
      type: "run_generation",
      nodeId: node.id,
      model: "chat-model-alpha",
      prompt: "合规生图",
    },
  ]);
  assert.equal(okRes.applied.length, 1);
  assert.equal(generateCalls, 1);

  // Chat-unauthorized model fails
  const blockedRes = await host.applyOps([
    {
      type: "run_generation",
      nodeId: node.id,
      model: "chat-model-beta",
      prompt: "越界生图",
    },
  ]);
  assert.equal(blockedRes.applied.length, 0);
  assert.equal(blockedRes.rejected.length, 1);
  assert.match(blockedRes.rejected[0].reason, /模型 chat-model-beta 不在允许调用的模型白名单中/);
  assert.equal(generateCalls, 1);

  // Case variant on chat allowlist fails
  const caseVariantRes = await host.applyOps([
    {
      type: "run_generation",
      nodeId: node.id,
      model: "CHAT-MODEL-ALPHA",
      prompt: "大写变体越界生图",
    },
  ]);
  assert.equal(caseVariantRes.applied.length, 0);
  assert.equal(caseVariantRes.rejected.length, 1);
  assert.equal(generateCalls, 1);
});

test("ADV-HOST-7: agentHost strictly blocks arbitrary unauthorized and unrecognized tool calls", async () => {
  let { project } = createTestProjectWithNode("flux-schnell");

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
    modelAllowlist: ["flux-schnell"],
  });

  const unauthorizedOps = [
    { type: "shell_exec", command: "rm -rf /" } as unknown as CanvasAgentOp,
    { type: "read_file", path: "/etc/passwd" } as unknown as CanvasAgentOp,
    { type: "eval_script", code: "process.exit(1)" } as unknown as CanvasAgentOp,
    { type: "network_fetch", url: "http://malicious.com" } as unknown as CanvasAgentOp,
    { type: "exec_cmd", cmd: "whoami" } as unknown as CanvasAgentOp,
  ];

  const res = await host.applyOps(unauthorizedOps);

  assert.equal(res.applied.length, 0, "No unauthorized ops must be applied");
  assert.equal(res.rejected.length, unauthorizedOps.length, "All unauthorized ops must be rejected");
  for (const rejected of res.rejected) {
    assert.equal(rejected.reason, "未知操作类型");
  }
  assert.equal(generateCalls, 0, "Generate must not be invoked");
});

test("ADV-HOST-8: agentHost run_generation blocks invalid node targets and prompt defects", async () => {
  let { project } = createTestProjectWithNode("flux-schnell");

  // Add plugin node and unsupported kind node
  const pluginNode: CanvasCollectionItem = {
    id: "node-plugin-1",
    kind: "image",
    title: "Plugin Node",
    description: "plugin",
    plugin: { type: "custom-plugin", name: "Custom" },
    model: "flux-schnell",
  };
  const audioNode: CanvasCollectionItem = {
    id: "node-audio-1",
    kind: "audio",
    title: "Audio Node",
    description: "audio",
    model: "flux-schnell",
  };
  const emptyPromptNode: CanvasCollectionItem = {
    id: "node-empty-prompt",
    kind: "image",
    title: "No Prompt Node",
    description: "",
    prompt: "",
    model: "flux-schnell",
  };

  project = {
    ...project,
    items: [...project.items, pluginNode, audioNode, emptyPromptNode],
  };

  let generateCalls = 0;
  const host = createAgentHost({
    getProject: () => project,
    commit: (next) => {
      project = next;
    },
    generate: async () => {
      generateCalls++;
      return { taskId: "task-defects" };
    },
    modelAllowlist: ["flux-schnell"],
  });

  // 1. Non-existent node
  const resNonExistent = await host.applyOps([
    {
      type: "run_generation",
      nodeId: "non-existent-node-id",
      model: "flux-schnell",
      prompt: "生图",
    },
  ]);
  assert.equal(resNonExistent.applied.length, 0);
  assert.match(resNonExistent.rejected[0].reason, /生成节点不存在/);

  // 2. Plugin node
  const resPlugin = await host.applyOps([
    {
      type: "run_generation",
      nodeId: pluginNode.id,
      model: "flux-schnell",
      prompt: "生图",
    },
  ]);
  assert.equal(resPlugin.applied.length, 0);
  assert.match(resPlugin.rejected[0].reason, /此节点的生成模式暂未接入/);

  // 3. Audio node
  const resAudio = await host.applyOps([
    {
      type: "run_generation",
      nodeId: audioNode.id,
      model: "flux-schnell",
      prompt: "生图",
    },
  ]);
  assert.equal(resAudio.applied.length, 0);
  assert.match(resAudio.rejected[0].reason, /此节点的生成模式暂未接入/);

  // 4. Empty prompt
  const resEmptyPrompt = await host.applyOps([
    {
      type: "run_generation",
      nodeId: emptyPromptNode.id,
      model: "flux-schnell",
      prompt: "   ", // whitespace prompt
    },
  ]);
  assert.equal(resEmptyPrompt.applied.length, 0);
  assert.match(resEmptyPrompt.rejected[0].reason, /生成提示词为空/);

  assert.equal(generateCalls, 0, "No invalid ops should reach generate()");
});
