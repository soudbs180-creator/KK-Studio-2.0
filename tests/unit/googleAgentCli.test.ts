import assert from "node:assert/strict";
import test from "node:test";
import { createGoogleAgentConnection } from "../../src/features/agent/googleAgentConnection.ts";
import type { GoogleConversation } from "../../src/domain/googleConversation.ts";
import type { AgentBridge } from "../../src/features/agent/agentConnection.ts";
import { GeminiCliError } from "../../src/features/agent/geminiCliAdapter.ts";

function cliHarness(options: {
  status?: { installed: boolean; login: boolean };
  chat?: (
    input: { prompt: string; resumeSessionId?: string; model?: string },
    signal: AbortSignal,
  ) => Promise<{ text: string; sessionId?: string }>;
  models?: string[];
}) {
  const projectId = "project-a";
  let saved: GoogleConversation | undefined;
  const host: AgentBridge = {
    getSnapshot: () => ({
      projectId,
      title: "test",
      nodes: [],
      connections: [],
      selectedNodeIds: [],
      viewport: { x: 0, y: 0, scale: 1 },
    }),
    applyOps: async () => ({ applied: [], rejected: [] }),
    importGeneratedImage: async () => undefined,
    readGoogleConversation: () => saved,
    saveGoogleConversation: (record, id) => {
      assert.equal(id, projectId);
      saved = structuredClone(record);
    },
  };
  const store = createGoogleAgentConnection({
    getCredential: async () => ({ apiKey: "unused", identity: "google:1" }),
    clientFactory: () => ({
      create: async () => {
        throw new Error("API 通道不应在 CLI 模式下被调用");
      },
      models: async () => [],
    }),
    prepareAttachments: async () => [],
    cliStatus: async () => options.status ?? { installed: true, login: true },
    cliChat: options.chat ?? (async () => ({ text: "cli reply" })),
    cliModels: options.models ?? ["gemini-3.8-flash"],
  });
  store.setBridge(host);
  store.configure({ loginMode: "cli", bridgeUrl: "http://127.0.0.1:1424" });
  return { store, saved: () => saved };
}

test("CLI connect marks connected with CLI models when installed and logged in", async () => {
  const { store } = cliHarness({});
  await store.connect();
  const state = store.getState();
  assert.equal(state.status, "connected");
  assert.deepEqual(state.models, ["gemini-3.8-flash"]);
  assert.ok(state.activity.includes("Gemini CLI"));
});

test("CLI connect reports install guidance when gemini is missing", async () => {
  const { store } = cliHarness({ status: { installed: false, login: false } });
  await store.connect();
  const state = store.getState();
  assert.equal(state.status, "disconnected");
  assert.ok(state.error?.includes("npm install -g @google/gemini-cli"));
});

test("CLI connect reports login guidance when not logged in", async () => {
  const { store } = cliHarness({ status: { installed: true, login: false } });
  await store.connect();
  const state = store.getState();
  assert.equal(state.status, "disconnected");
  assert.ok(state.error?.includes("Login with Google"));
});

test("CLI send persists resume session for the next turn", async () => {
  const seen: Array<{
    prompt: string;
    resumeSessionId?: string;
    model?: string;
  }> = [];
  const { store, saved } = cliHarness({
    chat: async (input) => {
      seen.push(input);
      return input.prompt === "a"
        ? { text: "reply a", sessionId: "cli-s1" }
        : { text: "reply b" };
    },
  });
  await store.connect();
  assert.equal((await store.sendMessage("a")).ok, true);
  assert.equal(saved()?.cliSessionId, "cli-s1");
  assert.equal(
    saved()
      ?.messages.filter((m) => m.role === "assistant")
      .at(-1)?.text,
    "reply a",
  );
  assert.equal((await store.sendMessage("b")).ok, true);
  assert.equal(seen[1].resumeSessionId, "cli-s1");
  assert.equal(seen[0].resumeSessionId, undefined);
});

test("CLI send rejects attachments", async () => {
  const { store } = cliHarness({});
  await store.connect();
  const result = await store.sendMessage("hi", [
    {
      id: "attachment-1",
      name: "photo.png",
      type: "image/png",
      dataUrl: "data:image/png;base64,abc",
      size: 3,
    } as never,
  ]);
  assert.equal(result.ok, false);
  assert.ok(result.error?.includes("图片附件"));
  assert.equal(store.getState().sending, false);
});

test("CLI send maps GeminiCliError messages", async () => {
  const { store } = cliHarness({
    chat: async () => {
      throw new GeminiCliError(
        "not-logged-in",
        "Gemini CLI 未登录，请先登录。",
      );
    },
  });
  await store.connect();
  const result = await store.sendMessage("hi");
  assert.equal(result.ok, false);
  assert.ok(result.error?.includes("未登录"));
});

test("CLI send returns stopped message on timeout", async () => {
  const { store } = cliHarness({
    chat: async () => {
      throw new GeminiCliError("timeout", "请求已停止。");
    },
  });
  await store.connect();
  const result = await store.sendMessage("hi");
  assert.equal(result.ok, false);
  assert.ok(result.error?.includes("请求已停止"));
});

test("CLI configure forces text mode", async () => {
  const { store } = cliHarness({});
  store.configure({ mode: "image" });
  assert.equal(store.getState().settings.mode, "text");
  store.configure({ loginMode: "api-key", mode: "image" });
  assert.equal(store.getState().settings.mode, "image");
});
