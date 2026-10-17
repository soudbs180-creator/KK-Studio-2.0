import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import {
  createProject,
  emptyDraft,
  emptySnapshot,
  projectChatView,
  serializeCreationSnapshot,
  snapshotWriteBlockReason,
  type CreationDraft,
  type CreationProject,
  type CreationSnapshot,
} from "../../src/features/creation/model.ts";
import { decodeSnapshot } from "../../src/features/creation/snapshotCodec.ts";
import { sameJson } from "../../src/features/creation/chatMigration.ts";
import { updateProjectChatView } from "../../src/features/agent/chatProjectUpdate.ts";
import {
  appendImageTask,
  ImageTaskCommandError,
} from "../../src/features/creation/imageTaskCommand.ts";
import type useConversationSubmit from "../../src/components/useConversationSubmit.ts";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

const appSource = await readFile(
  new URL("../../src/App.tsx", import.meta.url),
  "utf8",
);
const appAst = ts.createSourceFile(
  "App.tsx",
  appSource,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
function appFunction(name: string): string {
  let result: string | undefined;
  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name)
      result = node.getText(appAst);
    ts.forEachChild(node, visit);
  }
  visit(appAst);
  assert.ok(result, `Missing production App function ${name}`);
  return result;
}

function appInitializer(name: string): string {
  let result: string | undefined;
  function visit(node: ts.Node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === name
    )
      result = node.initializer?.getText(appAst);
    ts.forEachChild(node, visit);
  }
  visit(appAst);
  assert.ok(result, `Missing production App initializer ${name}`);
  return result;
}

function evaluate(source: string, context: Record<string, unknown>) {
  const exports: Record<string, unknown> = {};
  runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    { exports, ...context },
  );
  return exports;
}

function projectFixture(): CreationProject {
  const created = createProject({
    kind: "image",
    prompt: "initial",
    model: "fixture",
    attachments: [],
  });
  const chat = created.chats![created.activeChatId!];
  const draft = (prompt: string): CreationDraft => ({
    ...emptyDraft(),
    prompt,
    model: "fixture",
    conversationChannel: "direct",
    providerConnectionId: "fixture-connection",
    updatedAt: 100,
    attachments: [
      {
        id: `${prompt}-reference`,
        name: `${prompt}.png`,
        mime: "image/png",
        size: 1,
      },
    ],
  });
  return projectChatView({
    ...created,
    activeChatId: "A",
    chats: {
      A: { ...chat, id: "A", draft: draft("A draft") },
      B: { ...chat, id: "B", draft: draft("B draft") },
    },
  });
}

function appDraftHarness(project = projectFixture(), version: 2 | 3 = 3) {
  const creationRef = {
    current: {
      ...emptySnapshot(),
      version,
      projects: [project],
      activeProjectId: project.id,
    },
  };
  const context = {
    sameJson,
    creationRef,
    projectChatView,
    updateProjectChatView,
    commitCreation(next: typeof creationRef.current) {
      creationRef.current = next;
    },
  };
  const loaded = evaluate(
    `
    ${appFunction("updateProject")}
    export function callback(activeProject: any) {
      ${appFunction("handleProjectDraftChange")}
      return handleProjectDraftChange;
    }
  `,
    context,
  );
  return {
    creationRef,
    callback: loaded.callback as (
      project: CreationProject,
    ) => (draft: CreationDraft, expected?: CreationDraft) => void,
    current: () => creationRef.current.projects[0],
    switchChat() {
      creationRef.current.projects[0] = projectChatView({
        ...creationRef.current.projects[0],
        activeChatId: "B",
      });
    },
  };
}

async function hookHarness() {
  const app = appDraftHarness();
  const slots: unknown[] = [];
  const cleanups: (() => void)[] = [];
  let cursor = 0;
  const hookSource = await readFile(
    new URL("../../src/components/useConversationSubmit.ts", import.meta.url),
    "utf8",
  );
  const loaded = evaluate(hookSource, {
    require(name: string) {
      assert.equal(name, "react");
      return {
        useRef(initial: unknown) {
          const index = cursor++;
          if (!(index in slots)) slots[index] = { current: initial };
          return slots[index];
        },
        useEffect(effect: () => () => void) {
          const index = cursor++;
          if (!(index in slots)) {
            slots[index] = true;
            cleanups.push(effect());
          }
        },
      };
    },
  });
  const useSubmit = loaded.default as typeof useConversationSubmit;
  const ui = {
    input: "A draft",
    status: "",
    submitting: false,
    pendingApproval: null as string | null,
  };
  let key = `${app.current().id}/A`;
  let draftRevision = 0;
  let approvalMode: "auto" | "ask" = "auto";
  let response = deferred<boolean | string>();
  let requests = 0;
  let submit!: (message: string) => Promise<void>;
  function render() {
    const project = app.current();
    cursor = 0;
    submit = useSubmit({
      draftKey: key,
      input: ui.input,
      getDraftRevision: () => draftRevision,
      submitting: ui.submitting,
      setSubmitting: (value: boolean) => {
        ui.submitting = value;
      },
      agentActive: false,
      approvalMode,
      pendingApproval: ui.pendingApproval,
      setPendingApproval: (value: string | null) => {
        ui.pendingApproval = value;
      },
      setStatus: (value: string) => {
        ui.status = value;
      },
      setInput: (value: string) => {
        ui.input = value;
      },
      setMessages: () =>
        assert.fail("A provider submission cannot create local-only messages"),
      composerDraft: project.composerDraft,
      onDraftChange: app.callback(project),
      onSend: () => {
        requests++;
        return response.promise;
      },
    } as Parameters<typeof useSubmit>[0] & { draftKey: string; input: string });
    return submit;
  }
  render();
  return {
    app,
    ui,
    render,
    submit: (message = ui.input) => submit(message),
    resolve: (result: boolean | string) => response.resolve(result),
    reject: () => response.reject(new Error("synthetic send failure")),
    requests: () => requests,
    askApproval() {
      approvalMode = "ask";
      render();
    },
    unmount: () => cleanups.forEach((cleanup) => cleanup()),
    switchScope(kind: "chat" | "project") {
      app.switchChat();
      if (kind === "project") app.current().id = "other-project";
      key = `${app.current().id}/B`;
      Object.assign(ui, {
        input: "B draft",
        status: "B status",
        submitting: false,
        pendingApproval: "B approval",
      });
      render();
    },
    editDraft(rerender = true) {
      draftRevision++;
      const project = app.current();
      app.callback(project)({
        ...project.composerDraft,
        prompt: "new unsent draft",
        updatedAt: 101,
        attachments: [
          { id: "new-reference", name: "new.png", mime: "image/png", size: 2 },
        ],
      });
      ui.input = "new unsent draft";
      if (rerender) render();
    },
    nextResponse() {
      const resolvePrevious = response.resolve;
      response = deferred<boolean | string>();
      render();
      return resolvePrevious;
    },
  };
}

for (const scope of ["chat", "project"] as const) {
  for (const result of ["success", "failure", "throw"] as const) {
    test(`direct send ${result} after switching ${scope} cannot alter the visible draft or UI`, async () => {
      const h = await hookHarness();
      const pending = h.submit();
      assert.equal(h.requests(), 1);
      h.switchScope(scope);
      const beforeUi = { ...h.ui };
      const beforeDraft = structuredClone(h.app.current().chats!.B.draft);
      if (result === "throw") h.reject();
      else h.resolve(result === "success" ? true : "synthetic rejected");
      await pending;
      assert.deepEqual(h.ui, beforeUi);
      assert.deepEqual(h.app.current().chats!.B.draft, beforeDraft);
      if (result !== "success")
        assert.equal(h.app.current().chats!.A.draft.prompt, "A draft");
    });
  }
}

test("direct success clears the unchanged original draft even after switching chats", async () => {
  const h = await hookHarness();
  const pending = h.submit();
  h.switchScope("chat");
  h.resolve(true);
  await pending;
  assert.equal(h.app.current().chats!.A.draft.prompt, "");
  assert.equal(h.app.current().chats!.B.draft.prompt, "B draft");
});

for (const rerender of [true, false]) {
  for (const result of ["success", "failure"] as const) {
    test(`direct ${result} preserves edits in the sending chat ${rerender ? "after" : "before"} React renders`, async () => {
      const h = await hookHarness();
      const pending = h.submit();
      h.editDraft(rerender);
      const before = structuredClone(h.app.current().chats!.A.draft);
      h.resolve(result === "success" ? true : false);
      await pending;
      assert.equal(h.ui.input, "new unsent draft");
      assert.deepEqual(structuredClone(h.app.current().chats!.A.draft), before);
      assert.equal(h.ui.submitting, false);
    });
  }
}

test("direct success still clears an unchanged draft in the current chat", async () => {
  const h = await hookHarness();
  const pending = h.submit();
  h.resolve(true);
  await pending;
  assert.equal(h.ui.input, "");
  assert.equal(h.ui.pendingApproval, null);
  assert.equal(h.ui.submitting, false);
  assert.equal(h.app.current().chats!.A.draft.prompt, "");
  assert.match(h.ui.status, /任务已提交/);
});

test("an old receipt cannot release a different chat's pending submission", async () => {
  const h = await hookHarness();
  const pendingA = h.submit();
  h.switchScope("chat");
  const resolveA = h.nextResponse();
  const pendingB = h.submit();
  assert.equal(h.requests(), 2);
  resolveA(true);
  await pendingA;
  assert.equal(h.ui.submitting, true);
  h.resolve(false);
  await pendingB;
  assert.equal(h.ui.submitting, false);
});

test("an unmounted direct composer ignores a late receipt in its UI", async () => {
  const h = await hookHarness();
  const pending = h.submit();
  h.unmount();
  const before = { ...h.ui };
  h.resolve(true);
  await pending;
  assert.deepEqual(h.ui, before);
  assert.equal(h.app.current().chats!.A.draft.prompt, "");
});

test("direct approval still requires confirmation and rejects a captured callback after switching chats", async () => {
  const h = await hookHarness();
  h.askApproval();
  await h.submit();
  assert.equal(h.requests(), 0);
  assert.equal(h.ui.pendingApproval, "A draft");
  const captured = h.render();
  h.switchScope("chat");
  const before = { ...h.ui };
  await captured("A draft");
  assert.equal(h.requests(), 0);
  assert.deepEqual(h.ui, before);
  await h.submit();
  assert.equal(h.requests(), 0);
  h.render();
  const pending = h.submit();
  assert.equal(h.requests(), 1);
  h.resolve(true);
  await pending;
});

test("direct hook rejects a duplicate before React renders its submitting flag", async () => {
  const h = await hookHarness();
  const pending = h.submit();
  await h.submit();
  assert.equal(h.requests(), 1);
  h.resolve(true);
  await pending;
});

test("a captured App draft callback updates its original chat, not a later active chat", () => {
  const h = appDraftHarness();
  const original = h.current();
  const callback = h.callback(original);
  h.switchChat();
  callback({ ...original.composerDraft, prompt: "A edited" });
  assert.equal(h.current().chats!.A.draft.prompt, "A edited");
  assert.equal(h.current().chats!.B.draft.prompt, "B draft");
  assert.equal(h.current().activeChatId, "B");
});

for (const alias of ["missing", "undefined"] as const) {
  test(`App clears its original rendered draft after canonical acceptance adds a ${alias} text alias and another chat edit`, () => {
    const fixture = projectFixture();
    if (alias === "undefined") fixture.chats!.A.draft.text = undefined;
    const loadedSnapshot = decodeSnapshot(
      serializeCreationSnapshot({
        ...emptySnapshot(),
        version: 3,
        projects: [fixture],
        activeProjectId: fixture.id,
      }),
    );
    const h = appDraftHarness(loadedSnapshot.projects[0]);
    const original = projectChatView(h.current());
    const rendered = evaluate(
      `export const draft = ${appInitializer("conversationDraft")};`,
      {
        activeProject: original,
        selectedChat: original.chats!.A,
      },
    ).draft as CreationDraft;
    const callback = h.callback(original);
    const appended = appendImageTask(
      h.current(),
      { ...rendered, prompt: "A draft" },
      {
        id: "fixture-connection",
        provider: "Fixture",
        kind: "user_byok",
        displayName: "Fixture",
        baseUrl: "https://fixture.invalid/v1",
        credentialRef: "fixture-ref",
        capabilities: {
          modalities: ["image"],
          operations: ["generate"],
          async: false,
        },
        state: "active",
        concurrencyLimit: 1,
      },
      original.items[0].id,
    );
    const queued = updateProjectChatView(appended.project, () => ({
      ...appended.project,
      messages: [
        ...original.messages,
        {
          id: "accepted-user",
          taskId: appended.task.id,
          role: "user",
          content: rendered.prompt,
          createdAt: Date.now(),
        },
      ],
    }));
    h.creationRef.current.projects[0] = queued;
    h.switchChat();
    h.callback(h.current())({
      ...h.current().composerDraft,
      prompt: "B edited",
    });
    assert.equal(h.current().chats!.A.draft.text, rendered.prompt);
    callback({ ...rendered, prompt: "" }, rendered);
    assert.equal(h.current().chats!.A.draft.prompt, "");
    assert.equal(h.current().chats!.B.draft.prompt, "B edited");
    assert.equal(h.current().activeChatId, "B");
  });
}

test("App cleanup preserves a distinct text edit even when the prompt has not changed", () => {
  const h = appDraftHarness();
  const original = h.current();
  const callback = h.callback(original);
  h.current().chats!.A.draft = {
    ...h.current().chats!.A.draft,
    text: "Independent retained text",
  };
  callback({ ...original.composerDraft, prompt: "" }, original.composerDraft);
  assert.equal(h.current().chats!.A.draft.prompt, "A draft");
  assert.equal(h.current().chats!.A.draft.text, "Independent retained text");
});

test("App cleanup accepts an unchanged mirrored text alias before the other draft fields", () => {
  const h = appDraftHarness();
  const original = h.current();
  const callback = h.callback(original);
  h.current().chats!.A.draft = {
    text: original.composerDraft.prompt,
    ...h.current().chats!.A.draft,
  };
  callback({ ...original.composerDraft, prompt: "" }, original.composerDraft);
  assert.equal(h.current().chats!.A.draft.prompt, "");
});

test("App successful-send cleanup preserves an attachment edit even when prompt and timestamp match", () => {
  const h = appDraftHarness();
  const original = h.current();
  const callback = h.callback(original);
  const chat = h.current().chats!.A;
  chat.draft = { ...chat.draft, attachments: [] };
  callback({ ...original.composerDraft, prompt: "" }, original.composerDraft);
  assert.equal(h.current().chats!.A.draft.prompt, "A draft");
  assert.deepEqual(h.current().chats!.A.draft.attachments, []);
});

function legacyProjectFixture() {
  const legacy = { ...projectFixture() };
  delete legacy.chats;
  delete legacy.activeChatId;
  return legacy;
}

for (const action of ["edit", "successful send"] as const) {
  test(`App ${action} preserves valid companion v2 root-draft persistence`, () => {
    const raw: CreationSnapshot = {
      ...emptySnapshot(),
      version: 2,
      projects: [legacyProjectFixture()],
    };
    const decoded = decodeSnapshot(raw);
    assert.equal(snapshotWriteBlockReason(decoded), undefined);
    assert.equal(decoded.projects[0].chats, undefined);
    assert.equal(decoded.projects[0].activeChatId, undefined);
    const h = appDraftHarness(decoded.projects[0], 2);
    const original = h.current();
    const nextDraft = {
      ...original.composerDraft,
      prompt: action === "edit" ? "Legacy edit" : "",
    };
    h.callback(original)(
      nextDraft,
      action === "successful send" ? original.composerDraft : undefined,
    );
    const durable = decodeSnapshot(
      serializeCreationSnapshot(h.creationRef.current),
    );
    assert.equal(durable.version, 2);
    assert.equal(durable.projects[0].composerDraft.prompt, nextDraft.prompt);
    assert.deepEqual(
      durable.projects[0].composerDraft.attachments,
      original.composerDraft.attachments,
    );
    assert.equal(durable.projects[0].chats, undefined);
    assert.equal(durable.projects[0].activeChatId, undefined);
  });
}

test("App legacy draft callback retains its original project after another project becomes active", () => {
  const h = appDraftHarness(legacyProjectFixture(), 2);
  const original = h.current();
  const callback = h.callback(original);
  const other = {
    ...legacyProjectFixture(),
    id: "other-legacy-project",
    composerDraft: { ...emptyDraft(), prompt: "Other unsent draft" },
  };
  h.creationRef.current.projects.push(other);
  h.creationRef.current.activeProjectId = other.id;
  callback({ ...original.composerDraft, prompt: "Original legacy edit" });
  const saved = decodeSnapshot(
    serializeCreationSnapshot(h.creationRef.current),
  );
  assert.equal(saved.projects[0].composerDraft.prompt, "Original legacy edit");
  assert.equal(saved.projects[1].composerDraft.prompt, "Other unsent draft");
  assert.equal(saved.activeProjectId, other.id);
});

test("App legacy cleanup preserves a changed root draft even when its prompt is unchanged", () => {
  const h = appDraftHarness(legacyProjectFixture(), 2);
  const original = h.current();
  const callback = h.callback(original);
  h.creationRef.current.projects[0] = {
    ...original,
    composerDraft: { ...original.composerDraft, attachments: [] },
  };
  callback({ ...original.composerDraft, prompt: "" }, original.composerDraft);
  assert.equal(h.current().composerDraft.prompt, "A draft");
  assert.deepEqual(h.current().composerDraft.attachments, []);
});

test("App legacy edit rejects a stale captured root draft without an explicit expected value", () => {
  const h = appDraftHarness(legacyProjectFixture(), 2);
  const original = h.current();
  const callback = h.callback(original);
  callback({ ...original.composerDraft, prompt: "New legacy draft" });
  callback({ ...original.composerDraft, prompt: "Stale legacy draft" });
  assert.equal(h.current().composerDraft.prompt, "New legacy draft");
});

test("App cannot treat a v3 project missing chat identity as a writable legacy root", () => {
  const h = appDraftHarness(legacyProjectFixture(), 3);
  assert.ok(snapshotWriteBlockReason(h.creationRef.current));
  const original = h.current();
  h.callback(original)({ ...original.composerDraft, prompt: "Must not write" });
  assert.equal(h.current().composerDraft.prompt, "A draft");
});

for (const transition of [
  "legacy to canonical",
  "canonical to legacy",
  "missing active identity",
  "malformed chats",
] as const) {
  test(`App draft callback rejects an ambiguous ${transition} transition`, () => {
    const legacy = transition !== "canonical to legacy";
    const h = appDraftHarness(
      legacy ? legacyProjectFixture() : projectFixture(),
      legacy ? 2 : 3,
    );
    const original = h.current();
    const callback = h.callback(original);
    if (transition === "legacy to canonical")
      h.creationRef.current.projects[0] = {
        ...projectFixture(),
        id: original.id,
      };
    else if (transition === "canonical to legacy")
      h.creationRef.current.projects[0] = {
        ...legacyProjectFixture(),
        id: original.id,
      };
    else if (transition === "missing active identity")
      h.current().activeChatId = "missing";
    else h.current().chats = null as unknown as CreationProject["chats"];
    const before = structuredClone(h.current());
    callback(
      { ...original.composerDraft, prompt: "Must not write" },
      original.composerDraft,
    );
    assert.deepEqual(structuredClone(h.current()), before);
  });
}

function appSubmissionHarness(prepareGate?: Promise<void>) {
  const initial = projectFixture();
  const creationRef = {
    current: {
      ...emptySnapshot(),
      projects: [initial],
      activeProjectId: initial.id,
    },
  };
  const activeProjectIdRef = { current: initial.id };
  const flush = deferred<void>();
  const flushing = deferred<void>();
  const executed: CreationProject[] = [];
  const cancelled: string[] = [];
  const connection = {
    id: "fixture-connection",
    baseUrl: "https://fixture.invalid/v1",
    provider: "Fixture",
    credentialRef: "fixture-ref",
    protocol: "openai-chat",
    authMode: "api-key",
  };
  const loaded = evaluate(`export ${appFunction("submitImageCommand")}`, {
    creationRef,
    activeProjectIdRef,
    submitLock: { current: false },
    persistence: {
      state: "saved",
      flush: () => {
        flushing.resolve();
        return flush.promise;
      },
    },
    projectChatView,
    updateProjectChatView,
    appendImageTask,
    emptyDraft,
    createProject,
    prepareImageTask: async () => {
      await prepareGate;
      return connection;
    },
    getGenerationUiState: () => "ready",
    homeModelConfig: { configured: true },
    navigator: { onLine: true },
    structuredClone,
    ImageTaskCommandError,
    Error,
    rootItemId: (project: CreationProject) => project.items[0].id,
    commitCreation(next: typeof creationRef.current) {
      creationRef.current = next;
    },
    replaceCanvasItems() {},
    executeTask: async (
      _projectId: string,
      _taskId: string,
      project: CreationProject,
    ) => {
      executed.push(project);
    },
    cancelTask: (id: string) => cancelled.push(id),
  });
  const submit = loaded.submitImageCommand as (
    request: unknown,
  ) => Promise<string | undefined>;
  return {
    creationRef,
    activeProjectIdRef,
    flush,
    flushing,
    executed,
    cancelled,
    submit: () =>
      submit({
        origin: "chat",
        input: { ...initial.composerDraft, prompt: "A draft" },
      }),
  };
}

for (const outcome of [
  "chat switch",
  "project switch",
  "save failure",
] as const) {
  test(`App direct acceptance retains the draft until save and preserves task origin after ${outcome}`, async () => {
    const {
      creationRef,
      activeProjectIdRef,
      flush,
      flushing,
      executed,
      cancelled,
      submit,
    } = appSubmissionHarness();
    const pending = submit();
    await Promise.race([
      flushing.promise,
      pending.then((result) =>
        assert.fail(`submission returned before durable save: ${result}`),
      ),
    ]);
    const beforeSave = creationRef.current.projects[0];
    assert.equal(beforeSave.tasks.length, 1);
    assert.equal(beforeSave.tasks[0].originChatId, "A");
    const retainedPrompt = beforeSave.chats!.A.draft.prompt;
    if (outcome === "save failure")
      flush.reject(new Error("synthetic save failure"));
    else {
      creationRef.current.projects[0] = projectChatView({
        ...beforeSave,
        activeChatId: "B",
      });
      if (outcome === "project switch")
        activeProjectIdRef.current = "other-project";
      flush.resolve();
    }
    const result = await pending;
    assert.equal(
      retainedPrompt,
      "A draft",
      "acceptance cannot erase a draft before durable save succeeds",
    );
    assert.equal(
      creationRef.current.projects[0].chats!.B.draft.prompt,
      "B draft",
    );
    assert.equal(cancelled.length, 0);
    if (outcome === "save failure") {
      assert.equal(result, "synthetic save failure");
      assert.equal(executed.length, 0);
    } else {
      assert.equal(result, undefined);
      assert.equal(executed.length, 1);
      assert.equal(executed[0].tasks[0].originChatId, "A");
    }
  });
}

for (const scope of ["chat", "project"] as const) {
  test(`App preflight ${scope} switch still rejects an unaccepted submission without clearing its draft`, async () => {
    const gate = deferred<void>();
    const h = appSubmissionHarness(gate.promise);
    const pending = h.submit();
    const project = h.creationRef.current.projects[0];
    if (scope === "chat")
      h.creationRef.current.projects[0] = projectChatView({
        ...project,
        activeChatId: "B",
      });
    else h.activeProjectIdRef.current = "other-project";
    gate.resolve();
    assert.match((await pending)!, /已切换/);
    assert.equal(h.creationRef.current.projects[0].tasks.length, 0);
    assert.equal(
      h.creationRef.current.projects[0].chats!.A.draft.prompt,
      "A draft",
    );
    assert.equal(h.executed.length, 0);
    assert.equal(h.cancelled.length, 0);
  });
}

test("App duplicate submission remains blocked while an accepted task is saving", async () => {
  const h = appSubmissionHarness();
  const pending = h.submit();
  await Promise.race([
    h.flushing.promise,
    pending.then((result) => assert.fail(`unexpected early return: ${result}`)),
  ]);
  assert.match((await h.submit())!, /正在提交/);
  h.flush.resolve();
  assert.equal(await pending, undefined);
  assert.equal(h.executed.length, 1);
  assert.equal(h.creationRef.current.projects[0].tasks.length, 1);
});
