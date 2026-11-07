import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import {
  createProject,
  createDefaultChat,
  emptyDraft,
  projectChatView,
} from "../../src/features/creation/index.ts";
import {
  clearSentPendingDraft,
  updateProjectChatView,
} from "../../src/features/agent/index.ts";
const source = await readFile(
  new URL("../../src/App.tsx", import.meta.url),
  "utf8",
);
const ast = ts.createSourceFile(
  "App.tsx",
  source,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
let callback = "";
function visit(node: ts.Node) {
  if (
    ts.isPropertyAssignment(node) &&
    node.name.getText(ast) === "onSend" &&
    ts.isArrowFunction(node.initializer) &&
    node.initializer.getText(ast).includes("sendProjectAgentMessage")
  )
    callback = node.initializer.getText(ast);
  ts.forEachChild(node, visit);
}
visit(ast);
assert.ok(callback, "real App Agent onSend callback exists");
function harness() {
  const created = createProject({
    prompt: "",
    model: "",
    kind: "text",
    attachments: [],
  });
  const chat = (id: string) => ({
    ...createDefaultChat(id, id),
    mainAgent: "codex" as const,
    draft: { ...emptyDraft(), prompt: `${id} pending`, pendingAgent: true },
  });
  const project = projectChatView({
    ...created,
    activeChatId: "A",
    chats: { A: chat("A"), B: chat("B") },
  });
  const creationRef = {
    current: {
      activeProjectId: project.id as string | null,
      projects: [project],
    },
  };
  const calls: string[] = [];
  let finish!: (value: { ok: boolean }) => void;
  const accepted = new Promise<{ ok: boolean }>((resolve) => {
    finish = resolve;
  });
  const exports: { send?: () => Promise<{ ok: boolean }> } = {};
  const code = ts.transpileModule(`exports.send = ${callback};`, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    },
  }).outputText;
  runInNewContext(code, {
    exports,
    activeProject: project,
    creationRef,
    agentConnection: {},
    clearSentPendingDraft,
    sendProjectAgentMessage: async (
      _connection: unknown,
      current: typeof project,
    ) => {
      calls.push(current.activeChatId!);
      return accepted;
    },
    updateProject: (
      id: string,
      update: (p: typeof project) => typeof project,
    ) => {
      creationRef.current.projects = creationRef.current.projects.map((p) =>
        p.id === id ? updateProjectChatView(p, update) : p,
      );
    },
  });
  return {
    creationRef,
    calls,
    finish,
    send: exports.send!,
    switchChat() {
      creationRef.current.projects[0] = projectChatView({
        ...creationRef.current.projects[0],
        activeChatId: "B",
      });
    },
  };
}
for (const scope of ["chat", "project"] as const)
  test(`captured Agent callback refuses changed ${scope} before submission`, async () => {
    const h = harness();
    if (scope === "chat") h.switchChat();
    else h.creationRef.current.activeProjectId = "other";
    h.finish({ ok: true });
    assert.equal((await h.send()).ok, false);
    assert.deepEqual(h.calls, []);
  });
test("late Agent success retires original chat A without clearing B", async () => {
  const h = harness(),
    pending = h.send();
  assert.deepEqual(h.calls, ["A"]);
  h.switchChat();
  h.finish({ ok: true });
  assert.equal((await pending).ok, true);
  const p = h.creationRef.current.projects[0];
  assert.equal(p.activeChatId, "B");
  assert.equal(p.chats!.B.draft.prompt, "B pending");
  assert.equal(p.chats!.B.draft.pendingAgent, true);
  assert.equal(p.chats!.A.draft.prompt, "");
});
