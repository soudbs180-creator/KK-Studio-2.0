import assert from "node:assert/strict";
import test from "node:test";
import { createGoogleAgentConnection } from "../../src/features/agent/googleAgentConnection.ts";
import {
  normalizeGoogleConversation,
  type GoogleConversation,
} from "../../src/domain/googleConversation.ts";
import type { AgentBridge } from "../../src/features/agent/agentConnection.ts";
import type { GoogleResult } from "../../src/features/agent/googleInteractions.ts";

function harness(
  create: (input: unknown, signal: AbortSignal) => Promise<GoogleResult>,
) {
  let projectId = "project-a",
    saved: GoogleConversation | undefined;
  const images: string[] = [];
  const ops: unknown[] = [];
  const host: AgentBridge = {
    getSnapshot: () => ({
      projectId,
      title: "test",
      nodes: [],
      connections: [],
      selectedNodeIds: [],
      viewport: { x: 0, y: 0, scale: 1 },
    }),
    applyOps: async (items) => {
      ops.push(...items);
      return { applied: items, rejected: [] };
    },
    importGeneratedImage: async (input) => {
      images.push(input.id);
    },
    readGoogleConversation: () => saved,
    saveGoogleConversation: (record, id) => {
      assert.equal(id, projectId);
      saved = structuredClone(record);
    },
  };
  const store = createGoogleAgentConnection({
    getCredential: async () => ({ apiKey: "private", identity: "google:1" }),
    clientFactory: () => ({
      create,
      models: async () => ["gemini-3.8-flash", "gemini-3.1-flash-image"],
    }),
    prepareAttachments: async () => [],
  });
  store.setBridge(host);
  return {
    store,
    images,
    ops,
    host,
    saved: () => saved,
    switchProject() {
      projectId = "project-b";
      saved = undefined;
      store.syncProject();
    },
  };
}
const completed = (id: string, text = "hello"): GoogleResult => ({
  id,
  status: "completed",
  text,
  images: [],
  calls: [],
});

test("Google conversation continues the previous interaction, persists no credentials and archives images once", async () => {
  const inputs: unknown[] = [];
  const h = harness(async (input) => {
    inputs.push(input);
    return {
      ...completed("remote-1"),
      images: [new Blob(["image"], { type: "image/png" })],
    };
  });
  await h.store.connect();
  assert.equal((await h.store.sendMessage("draw")).ok, true);
  assert.equal((await h.store.sendMessage("continue")).ok, true);
  assert.equal(
    (inputs[1] as { previousInteractionId: string }).previousInteractionId,
    "remote-1",
  );
  assert.equal(h.images.length, 1);
  assert.equal(h.saved()?.status, "ready");
  assert.ok(!JSON.stringify(h.saved()).includes("private"));
  assert.equal(
    h.saved()?.messages.filter((m) => m.role === "assistant").length,
    2,
  );
});

test("unknown acceptance is persisted and never automatically reissued", async () => {
  let calls = 0;
  const h = harness(async () => {
    calls++;
    throw new TypeError("network private");
  });
  await h.store.connect();
  assert.equal((await h.store.sendMessage("draw")).ok, false);
  assert.equal(h.saved()?.status, "unknown");
  assert.equal((await h.store.sendMessage("draw")).ok, false);
  assert.equal(calls, 1);
  assert.ok(!h.store.getState().error?.includes("private"));
  const restored = normalizeGoogleConversation({
    ...h.saved(),
    status: "running",
    apiKey: "secret",
  });
  assert.equal(restored?.status, "unknown");
  assert.ok(!JSON.stringify(restored).includes("secret"));
});

test("switching project aborts a late response before it can write images or history", async () => {
  let done!: (result: GoogleResult) => void;
  const h = harness(
    () =>
      new Promise((resolve) => {
        done = resolve;
      }),
  );
  await h.store.connect();
  const pending = h.store.sendMessage("draw");
  while (!done) await new Promise((resolve) => setTimeout(resolve, 1));
  h.switchProject();
  done({
    ...completed("late"),
    images: [new Blob(["image"], { type: "image/png" })],
  });
  await pending;
  assert.deepEqual(h.images, []);
  assert.equal(h.saved(), undefined);
  assert.equal(h.store.getState().messages.length, 0);
});

test("Google canvas writes wait for approval and send the real function result without resubmitting the user prompt", async () => {
  const inputs: unknown[] = [];
  const h = harness(async (input) => {
    inputs.push(input);
    return inputs.length === 1
      ? {
          id: "call-turn",
          status: "requires_action",
          text: "",
          images: [],
          calls: [
            {
              id: "call-1",
              name: "canvas_apply_ops",
              arguments: {
                ops: [
                  {
                    type: "add_node",
                    nodeType: "text",
                    title: "Text",
                    metadata: { text: "hello" },
                  },
                ],
              },
            },
          ],
        }
      : completed("final");
  });
  await h.store.connect();
  h.store.setPermissionMode("request");
  const pending = h.store.sendMessage("add text");
  while (!h.store.getState().pendingApproval)
    await new Promise((resolve) => setTimeout(resolve, 1));
  assert.equal(h.ops.length, 0);
  await h.store.resolveApproval("accept");
  assert.equal((await pending).ok, true);
  assert.equal(h.ops.length, 1);
  assert.equal(inputs.length, 2);
  assert.equal(
    (inputs[1] as { previousInteractionId: string }).previousInteractionId,
    "call-turn",
  );
  assert.ok(JSON.stringify(inputs[1]).includes('"call_id":"call-1"'));
});
