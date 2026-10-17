import assert from "node:assert/strict";
import test from "node:test";
import { createGoogleAgentConnection } from "../../src/features/agent/googleAgentConnection.ts";
import { createAgentHost } from "../../src/features/agent/agentHost.ts";
import {
  createProject,
  type CreationProject,
} from "../../src/features/creation/model.ts";
import type { GoogleResult } from "../../src/features/agent/googleInteractions.ts";

const completed = (): GoogleResult => ({
  id: "response",
  status: "completed",
  text: "reply",
  images: [],
  calls: [],
});

function fixture(
  options: {
    credential?: () => Promise<{ apiKey: string; identity: string }>;
    prepare?: () => Promise<[]>;
    create?: () => Promise<GoogleResult>;
  } = {},
) {
  let project = createProject({
    prompt: "fixture",
    kind: "image",
    model: "image-model",
    attachments: [],
  });
  const external = { credentials: 0, models: 0, turns: 0 };
  const host = createAgentHost({
    getProject: () => project,
    commit: (next) => {
      project = next;
    },
    generate: async () => ({ error: "not part of this test" }),
  });
  const connection = createGoogleAgentConnection({
    getCredential: async () => {
      external.credentials++;
      return options.credential
        ? options.credential()
        : { apiKey: "synthetic", identity: "fixture-identity" };
    },
    prepareAttachments: options.prepare ?? (async () => []),
    clientFactory: () => ({
      models: async () => {
        external.models++;
        return ["fixture-model"];
      },
      create: async () => {
        external.turns++;
        return options.create ? options.create() : completed();
      },
    }),
  });
  connection.setBridge(host);
  return {
    connection,
    external,
    project: () => project,
    update: (next: CreationProject) => {
      project = next;
    },
    changeChat() {
      project = {
        ...project,
        activeChatId: "other",
        chats: {
          other: { ...project.chats![project.activeChatId!], id: "other" },
        },
      };
    },
  };
}

for (const kind of ["multiple", "temporary", "thread-conflict"] as const) {
  test(`Google ${kind} connection never reads credentials or contacts the model service`, async () => {
    const h = fixture();
    const project = h.project();
    if (kind === "multiple")
      project.chats!.other = {
        ...project.chats![project.activeChatId!],
        id: "other",
      };
    else if (kind === "temporary")
      project.chats![project.activeChatId!].isTemporary = true;
    else {
      project.agentThreadId = "root-thread";
      project.chats![project.activeChatId!].agentThreadId = "different-thread";
    }
    const before = structuredClone(project);
    await h.connection.connect();
    assert.equal(h.connection.getState().status, "disconnected");
    assert.deepEqual(h.external, { credentials: 0, models: 0, turns: 0 });
    assert.deepEqual(h.project(), before);
  });
}

test("Google connection cannot contact models after the chat changes while credentials load", async () => {
  let release!: (credential: { apiKey: string; identity: string }) => void;
  const h = fixture({
    credential: () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  });
  const pending = h.connection.connect();
  h.changeChat();
  release({ apiKey: "synthetic", identity: "fixture-identity" });
  await pending;
  assert.equal(h.external.models, 0);
  assert.equal(h.project().googleConversation, undefined);
});

test("Google send cannot submit after the chat changes during attachment preparation", async () => {
  let release!: () => void;
  let entered!: () => void;
  const preparing = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const h = fixture({
    prepare: async () => {
      entered();
      await pending;
      return [];
    },
  });
  await h.connection.connect();
  const original = structuredClone(h.project().googleConversation);
  const sending = h.connection.sendMessage("must stay in original chat");
  await preparing;
  h.changeChat();
  release();
  assert.equal((await sending).ok, false);
  assert.equal(h.external.turns, 0);
  assert.deepEqual(h.project().googleConversation, original);
});

test("Google tool approval cannot apply the old chat's operation to a later chat", async () => {
  let round = 0;
  const h = fixture({
    create: async () =>
      ++round === 1
        ? {
            id: "tool-turn",
            status: "requires_action",
            text: "",
            images: [],
            calls: [
              {
                id: "old-chat-write",
                name: "canvas_apply_ops",
                arguments: {
                  ops: [
                    {
                      type: "add_node",
                      id: "late-write",
                      nodeType: "text",
                      metadata: { text: "wrong chat" },
                    },
                  ],
                },
              },
            ],
          }
        : completed(),
  });
  await h.connection.connect();
  let ready!: () => void;
  const pendingApproval = new Promise<void>((resolve) => {
    ready = resolve;
  });
  const unsubscribe = h.connection.subscribe(() => {
    if (h.connection.getState().pendingApproval) ready();
  });
  const sending = h.connection.sendMessage("ask before canvas changes");
  await pendingApproval;
  h.changeChat();
  await h.connection.resolveApproval("accept");
  const result = await sending;
  unsubscribe();
  assert.equal(result.ok, false);
  assert.equal(h.external.turns, 1);
  assert.equal(
    h.project().items.some((item) => item.id === "late-write"),
    false,
  );
});
