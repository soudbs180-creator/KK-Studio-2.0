import assert from "node:assert/strict";
import test from "node:test";
import { createAgentConnection } from "../../src/features/agent/agentConnection.ts";
import {
  createAgentHost,
  type AgentHostOptions,
} from "../../src/features/agent/agentHost.ts";
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
    if (url.endsWith("/models"))
      return Response.json({
        data: [
          {
            id: "reasoning-fixture",
            model: "reasoning-fixture",
            displayName: "Fixture",
            isDefault: true,
          },
        ],
      });
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

  return {
    conn,
    sources,
    getTurnCalls: () => turnCalls,
    getPostedTurns: () => postedTurns,
  };
}

// =============================================================================
// Suite 1: External generation grants belong at the real host boundary.
// =============================================================================

function externalGenerationFixture(
  modelAllowlist: AgentHostOptions["modelAllowlist"],
) {
  let { project } = createTestProjectWithNode("gpt-4o");
  const generated: string[] = [];
  const host = createAgentHost({
    getProject: () => project,
    commit: (next) => {
      project = next;
    },
    modelAllowlist,
    generate: async (node) => {
      generated.push(node.model!);
      return { taskId: "unexpected-paid-generation" };
    },
  });
  return { host, generated, getProject: () => project };
}

for (const scenario of [
  {
    name: "ADV-CONN-1 migrated: empty grants deny every external model",
    grant: [],
    models: [
      "gpt-4o",
      "claude-3-5-sonnet",
      "gemini-2.0-flash",
      "deepseek-r1",
      "local-model",
    ],
  },
  {
    name: "ADV-CONN-2 migrated: whitespace variants cannot acquire external authorization",
    grant: ["gpt-4o"],
    models: [
      " gpt-4o",
      "gpt-4o ",
      " gpt-4o ",
      "\tgpt-4o",
      "gpt-4o\t",
      "gpt-4o\n",
      "gpt-4o\r\n",
      "gpt-4o\0malicious",
    ],
  },
  {
    name: "ADV-CONN-3 migrated: casing variants cannot acquire external authorization",
    grant: ["gpt-4o"],
    models: ["GPT-4O", "Gpt-4o", "GPT-4o", "gpt-4O", "GpT-4O"],
  },
  {
    name: "ADV-CONN-4 migrated: injected model strings never reach external generation",
    grant: ["gpt-4o"],
    models: [
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
    ],
  },
]) {
  test(scenario.name, async () => {
    const h = externalGenerationFixture(scenario.grant);
    const before = structuredClone(h.getProject());
    for (const model of scenario.models) {
      const result = await h.host.applyOps([
        {
          type: "run_generation",
          nodeId: "img-adv-node-1",
          model,
          prompt: "synthetic adversarial generation",
        },
      ]);
      assert.equal(result.applied.length, 0, JSON.stringify(model));
      assert.equal(result.rejected.length, 1);
      assert.match(result.rejected[0].reason, /不在允许调用的模型白名单中/);
      assert.deepEqual(result.tasks, []);
    }
    assert.deepEqual(
      h.generated,
      [],
      "Denied operations must never reach the billable generation boundary",
    );
    assert.deepEqual(h.getProject(), before);
  });
}

test("ADV-CONN-5 migrated: null and malformed external grants fail closed", async (t) => {
  for (const scenario of [
    { layer: "turn", grant: null, model: "gpt-4o" },
    { layer: "turn", grant: "x", model: "x" },
    { layer: "turn", grant: [null, "gpt-4o"], model: "gpt-4o" },
    { layer: "host", grant: null, model: "gpt-4o" },
    { layer: "host", grant: "x", model: "x" },
    { layer: "host", grant: [null, "gpt-4o"], model: "gpt-4o" },
    { layer: "chat", grant: "x", model: "x" },
    { layer: "chat", grant: [null, "gpt-4o"], model: "gpt-4o" },
  ]) {
    await t.test(
      scenario.layer + ": " + JSON.stringify(scenario.grant),
      async () => {
        // These casts model invalid runtime input at the authorization boundary.
        const h = externalGenerationFixture(
          scenario.layer === "host"
            ? (scenario.grant as unknown as string[])
            : scenario.layer === "chat"
              ? undefined
              : [scenario.model],
        );
        const project = h.getProject();
        project.chats![project.activeChatId!].modelAllowlist =
          (scenario.layer === "chat"
            ? scenario.grant
            : [scenario.model]) as unknown as string[];
        const before = structuredClone(project);
        const result = await h.host.applyOps(
          [
            {
              type: "run_generation",
              nodeId: "img-adv-node-1",
              model: scenario.model,
              prompt: "synthetic",
            },
          ],
          scenario.layer === "turn"
            ? {
                signal: new AbortController().signal,
                modelAllowlist: scenario.grant as unknown as string[],
              }
            : undefined,
        );
        assert.equal(result.applied.length, 0);
        assert.equal(result.rejected.length, 1);
        assert.match(result.rejected[0].reason, /不在允许调用的模型白名单中/);
        assert.deepEqual(result.tasks, []);
        assert.deepEqual(h.generated, []);
        assert.deepEqual(h.getProject(), before);
      },
    );
  }
});

test("ADV-CONN-6 migrated: selection model values cannot grant external generation", async () => {
  const h = externalGenerationFixture(["gpt-4o"]);
  const selections = [
    { source: "codex", model: "unauthorized-claude", kind: "text" },
    { source: "codex", model: "GPT-4O", kind: "text" },
    { source: "codex", model: "gpt-4o ", kind: "text" },
    { source: "codex", model: "gpt-4o\nDROP", kind: "text" },
    { source: "codex", model: "__proto__", kind: "text" },
  ];
  for (const selection of selections) {
    const result = await h.host.applyOps([
      {
        type: "run_generation",
        nodeId: "img-adv-node-1",
        model: selection.model,
        prompt: "synthetic selection",
      },
    ]);
    assert.equal(result.applied.length, 0);
    assert.equal(result.rejected.length, 1);
    assert.match(result.rejected[0].reason, /不在允许调用的模型白名单中/);
    assert.deepEqual(result.tasks, []);
  }
  assert.deepEqual(h.generated, []);
});

test("valid Codex reasoning model and selection remain usable with empty or restricted external grants", async () => {
  for (const modelAllowlist of [[], ["external-image-model"]]) {
    for (const selection of [
      undefined,
      {
        source: "codex" as const,
        model: "reasoning-fixture",
        kind: "text" as const,
      },
    ]) {
      const { conn, getTurnCalls, getPostedTurns } = setupTestAgentConnection();
      try {
        await conn.connect();
        await new Promise((resolve) => setImmediate(resolve));
        const result = await conn.sendMessage("synthetic reasoning", {
          model: "reasoning-fixture",
          selection,
          modelAllowlist,
          memoryMode: "none",
        });
        assert.equal(result.ok, true);
        assert.equal(getTurnCalls(), 1);
        assert.equal(
          (getPostedTurns()[0] as { model?: string }).model,
          "reasoning-fixture",
        );
      } finally {
        conn.disconnect();
      }
    }
  }
});

test("ADV-CONN-7: valid Codex reasoning still works when the external grant is omitted", async () => {
  const { conn, getTurnCalls, getPostedTurns } = setupTestAgentConnection();
  await conn.connect();
  await new Promise((r) => setImmediate(r));

  const result = await conn.sendMessage("Unconstrained request", {
    model: "reasoning-fixture",
    modelAllowlist: undefined,
    memoryMode: "none",
  });

  assert.equal(
    result.ok,
    true,
    "An omitted external generation grant must not block Codex reasoning",
  );
  assert.equal(getTurnCalls(), 1, "Exactly 1 turn should execute");
  assert.equal(
    (getPostedTurns()[0] as { model?: string }).model,
    "reasoning-fixture",
  );
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

  const modelsToTest = [
    "flux-schnell",
    "dall-e-3",
    "stable-diffusion-xl",
    "midjourney",
  ];
  for (const model of modelsToTest) {
    const res = await host.applyOps([
      {
        type: "run_generation",
        nodeId: node.id,
        model,
        prompt: "生图",
      },
    ]);

    assert.equal(
      res.applied.length,
      0,
      `Op with model ${model} must not be applied`,
    );
    assert.equal(
      res.rejected.length,
      1,
      `Op with model ${model} must be rejected`,
    );
    assert.match(res.rejected[0].reason, /不在允许调用的模型白名单中/);
  }

  assert.equal(
    generateCalls,
    0,
    "options.generate must never be called when allowlist is []",
  );
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

    assert.equal(
      res.applied.length,
      0,
      `Bypass attempt ${JSON.stringify(attempt)} must be rejected`,
    );
    assert.equal(res.rejected.length, 1);
    assert.match(res.rejected[0].reason, /不在允许调用的模型白名单中/);
  }

  assert.equal(
    generateCalls,
    0,
    "No generation tool call should be dispatched for variants",
  );
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

    assert.equal(
      res.applied.length,
      0,
      `Payload ${JSON.stringify(payload)} must not be applied`,
    );
    assert.equal(res.rejected.length, 1);
    assert.match(res.rejected[0].reason, /不在允许调用的模型白名单中/);
  }

  assert.equal(
    generateCalls,
    0,
    "No generation executed for malicious payloads",
  );
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
  assert.match(
    res1.rejected[0].reason,
    /模型 unauthorized-backdoor-model 不在允许调用的模型白名单中/,
  );

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
  assert.match(
    res2.rejected[0].reason,
    /模型 未指定 不在允许调用的模型白名单中/,
  );

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
  assert.match(
    blockedRes.rejected[0].reason,
    /模型 chat-model-beta 不在允许调用的模型白名单中/,
  );
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
    {
      type: "eval_script",
      code: "process.exit(1)",
    } as unknown as CanvasAgentOp,
    {
      type: "network_fetch",
      url: "http://malicious.com",
    } as unknown as CanvasAgentOp,
    { type: "exec_cmd", cmd: "whoami" } as unknown as CanvasAgentOp,
  ];

  const res = await host.applyOps(unauthorizedOps);

  assert.equal(res.applied.length, 0, "No unauthorized ops must be applied");
  assert.equal(
    res.rejected.length,
    unauthorizedOps.length,
    "All unauthorized ops must be rejected",
  );
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
