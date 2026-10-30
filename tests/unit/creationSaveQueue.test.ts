import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import {
  emptySnapshot,
  createProject,
  updateActiveChat,
  snapshotWriteBlockReason,
  type CreationSnapshot,
} from "../../src/features/creation/model.ts";
import {
  decodeSnapshot,
  storageError,
} from "../../src/features/creation/snapshotCodec.ts";
import {
  createProjectCanvas,
  reconcileProjectCanvas,
} from "../../src/domain/projectCanvas.ts";
import {
  createNativeCloseHandler,
  flushCreationBeforeClose,
} from "../../src/features/creation/nativeClose.ts";

type LoadingOptions = {
  initial?: CreationSnapshot;
  readGate?: Promise<void>;
  readError?: Error;
  reconcile?: (snapshot: CreationSnapshot) => Promise<CreationSnapshot>;
  recover?: (snapshot: CreationSnapshot) => CreationSnapshot;
  waitForLoad?: boolean;
};

// Run the actual hook with deterministic React lifecycle/timers and IO boundaries.
// No save-queue, revision, conflict or recovery logic is replaced by this harness.
async function harness(
  native = false,
  registration?: Promise<() => void>,
  options: LoadingOptions = {},
) {
  const slots: unknown[] = [];
  const effects: (() => void | (() => void))[] = [];
  const cleanup = new Map<number, () => void>();
  let cursor = 0;
  let now = 0;
  let timerId = 0;
  const timers = new Map<number, { due: number; run: () => void }>();
  const writes: CreationSnapshot[] = [];
  const syncWrites: CreationSnapshot[] = [];
  let reconciliations = 0;
  const loaded = options.initial ?? { ...emptySnapshot(), revision: 1 };
  let stored = loaded;
  let persist: (snapshot: CreationSnapshot) => Promise<void> = async (
    snapshot,
  ) => {
    stored = snapshot;
  };
  const hooks = {
    useState(initial: unknown) {
      const index = cursor++;
      if (!(index in slots))
        slots[index] = typeof initial === "function" ? initial() : initial;
      return [
        slots[index],
        (value: unknown) => {
          slots[index] =
            typeof value === "function" ? value(slots[index]) : value;
        },
      ];
    },
    useRef(initial: unknown) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useEffect(effect: () => void | (() => void), deps: unknown[]) {
      const index = cursor++;
      const previous = slots[index] as unknown[] | undefined;
      if (
        !previous ||
        deps.some((value, key) => !Object.is(value, previous[key]))
      ) {
        slots[index] = deps;
        effects.push(() => {
          cleanup.get(index)?.();
          const stop = effect();
          if (stop) cleanup.set(index, stop);
          else cleanup.delete(index);
        });
      }
    },
  };
  let load = async () => {
    await options.readGate;
    if (options.readError) throw options.readError;
    return {
      snapshot: stored,
      recovered: false,
      durableRevision: stored.revision,
    };
  };
  const storage = {
    loadCreationSnapshot: () => load(),
    persistCreationSnapshotAsync: async (snapshot: CreationSnapshot) => {
      writes.push(snapshot);
      decodeSnapshot(snapshot);
      await persist(snapshot);
    },
    persistCreationSnapshotSync: (snapshot: CreationSnapshot) => {
      syncWrites.push(snapshot);
    },
    pendingRecoveryDraft: () => null,
  };
  let nativeClose: ReturnType<typeof createNativeCloseHandler> | undefined;
  let destroyed = 0;
  let released = 0;
  const modules: Record<string, unknown> = {
    react: hooks,
    "@tauri-apps/api/core": { isTauri: () => native },
    "@tauri-apps/api/window": {
      getCurrentWindow: () => {
        assert(native, "Web must not register native window events");
        return {
          onCloseRequested: (handler: typeof nativeClose) => {
            nativeClose = handler;
            return (
              registration ??
              Promise.resolve(() => {
                released++;
              })
            );
          },
          destroy: async () => {
            destroyed++;
          },
        };
      },
    },
    "./nativeClose": { createNativeCloseHandler, flushCreationBeforeClose },
    "./model": { emptySnapshot, snapshotWriteBlockReason },
    "./storage": storage,
    "./snapshotCodec": { storageError },
    "../../domain/projectCanvas": {
      reconcileProjectCanvas: (
        ...args: Parameters<typeof reconcileProjectCanvas>
      ) => {
        reconciliations++;
        return reconcileProjectCanvas(...args);
      },
    },
  };
  const exports: {
    useCreationStorage?: typeof import("../../src/features/creation/useCreationStorage.ts").useCreationStorage;
  } = {};
  const source = await readFile(
    new URL(
      "../../src/features/creation/useCreationStorage.ts",
      import.meta.url,
    ),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  runInNewContext(compiled.outputText, {
    exports,
    require: (id: string) => {
      assert(id in modules, `Unexpected hook dependency: ${id}`);
      return modules[id];
    },
    window: {
      setTimeout: (run: () => void, delay: number) => {
        const id = ++timerId;
        timers.set(id, { run, due: now + delay });
        return id;
      },
      clearTimeout: (id: number) => timers.delete(id),
      addEventListener: () => {},
      removeEventListener: () => {},
    },
  });
  const render = () => {
    cursor = 0;
    const result = exports.useCreationStorage!(
      options.recover ?? ((snapshot) => snapshot),
      options.reconcile,
    );
    effects.splice(0).forEach((effect) => effect());
    return result;
  };
  render();
  if (options.waitForLoad !== false) {
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal(render().state, "saved");
  }
  return {
    render,
    writes,
    syncWrites,
    reconciliations: () => reconciliations,
    async advance(milliseconds: number) {
      now += milliseconds;
      for (const [id, timer] of timers) {
        if (timer.due > now) continue;
        timers.delete(id);
        timer.run();
      }
      await new Promise<void>((resolve) => setImmediate(resolve));
    },
    durable: () => stored,
    setPersist: (next: typeof persist) => {
      persist = next;
    },
    setLoad: (next: typeof load) => {
      load = next;
    },
    nativeClose: () => {
      assert(nativeClose);
      return nativeClose;
    },
    destroyed: () => destroyed,
    released: () => released,
    dispose: () => {
      [...cleanup.values()].reverse().forEach((stop) => stop());
      cleanup.clear();
    },
  };
}

function manyProjects(): CreationSnapshot {
  return {
    ...emptySnapshot(),
    revision: 7,
    projects: Array.from({ length: 20 }, (_, index) => {
      const project = createProject({
        prompt: "",
        model: "",
        kind: "image",
        attachments: [],
      });
      const items = [
        {
          id: `image-${index}`,
          kind: "image" as const,
          title: "Image",
          description: "",
        },
      ];
      return {
        ...project,
        id: `project-${index}`,
        items,
        canvas: createProjectCanvas(items),
      };
    }),
  };
}

test("autosave waits 180ms after the latest commit and clears its timer on unmount", async () => {
  const fixture = await harness(false, undefined, { initial: manyProjects() });
  const commit = (prompt: string) => {
    const hook = fixture.render();
    hook.commitCreation({
      ...hook.creation,
      homeDraft: { ...hook.creation.homeDraft, prompt },
    });
    fixture.render();
  };
  commit("first");
  await fixture.advance(179);
  assert.equal(fixture.writes.length, 0);
  commit("latest");
  await fixture.advance(1);
  assert.equal(
    fixture.writes.length,
    0,
    "the previous commit timer was cleared",
  );
  await fixture.advance(179);
  assert.equal(fixture.writes.length, 1);
  assert.equal(fixture.writes[0].homeDraft.prompt, "latest");
  assert.equal(fixture.writes[0].revision, 9);
  commit("unmounted");
  fixture.dispose();
  await fixture.advance(180);
  assert.equal(
    fixture.writes.length,
    1,
    "unmount cancels the pending autosave",
  );
});

test("100 canvas previews reconcile only the changed project and retain every synchronous recovery draft", async () => {
  const initial = manyProjects();
  const fixture = await harness(false, undefined, { initial });
  for (let step = 1; step <= 100; step++) {
    const hook = fixture.render();
    const current = hook.creationRef.current;
    hook.commitCreation({
      ...current,
      projects: current.projects.map((project, index) =>
        index
          ? project
          : {
              ...project,
              canvas: {
                ...project.canvas,
                positions: { "image-0": { x: step, y: 0 } },
              },
            },
      ),
    });
  }
  const final = fixture.render().creation;
  assert.equal(final.revision, 107);
  assert.equal(final.projects[0].canvas.positions["image-0"].x, 100);
  assert.equal(fixture.syncWrites.length, 100);
  assert.equal(
    fixture.syncWrites[49].projects[0].canvas.positions["image-0"].x,
    50,
  );
  assert.equal(fixture.reconciliations(), 100);
  assert.equal(final.projects[19], initial.projects[19]);
  await fixture.render().flush();
  assert.equal(fixture.durable().revision, 107);
  fixture.dispose();
});

test("chat-only commits and project reordering retain existing canvas inputs without reconciling", async () => {
  const initial = manyProjects();
  const fixture = await harness(false, undefined, { initial });
  for (let step = 1; step <= 100; step++) {
    const hook = fixture.render();
    const current = hook.creationRef.current;
    hook.commitCreation({
      ...current,
      projects: [...current.projects].reverse().map((project) =>
        project.id === "project-0"
          ? updateActiveChat(project, (chat) => ({
              ...chat,
              draft: { ...chat.draft, prompt: `Draft ${step}` },
            }))
          : project,
      ),
    });
  }
  const final = fixture.render().creation;
  assert.equal(final.projects[0].canvas, initial.projects[0].canvas);
  assert.equal(final.projects[19], initial.projects[19]);
  assert.equal(fixture.syncWrites.length, 100);
  assert.equal(fixture.reconciliations(), 0);
  fixture.dispose();
});

test("changed item and canvas inputs are reconciled and a newly added project is not skipped", async () => {
  const initial = manyProjects();
  const initialImagePosition = {
    ...initial.projects[0].canvas.positions["image-0"],
  };
  const fixture = await harness(false, undefined, { initial });
  let hook = fixture.render();
  hook.commitCreation({
    ...hook.creation,
    projects: hook.creation.projects.map((project, index) =>
      index ? project : { ...project, items: [] },
    ),
  });
  hook = fixture.render();
  assert.equal(
    Object.keys(hook.creation.projects[0].canvas.positions).length,
    0,
  );
  assert.deepEqual(
    initial.projects[0].canvas.positions["image-0"],
    initialImagePosition,
  );
  assert.equal(fixture.reconciliations(), 1);
  hook.commitCreation({
    ...hook.creation,
    projects: [
      ...hook.creation.projects.map((project, index) =>
        index === 1
          ? {
              ...project,
              canvas: {
                ...project.canvas,
                positions: { "image-1": { x: 9, y: 10 } },
              },
            }
          : project,
      ),
      { ...initial.projects[0], id: "added-project" },
    ],
  });
  hook = fixture.render();
  assert.equal(hook.creation.projects[1].canvas.positions["image-1"].x, 9);
  assert.deepEqual(
    hook.creation.projects[20].canvas.positions["image-0"],
    initialImagePosition,
  );
  assert.equal(fixture.reconciliations(), 3);
  assert.equal(fixture.syncWrites.length, 2);
  fixture.dispose();
});

test("a queued flush rejects when the preceding native conflict pauses saving and keeps the newer draft", async () => {
  const fixture = await harness();
  let fail!: (reason: unknown) => void;
  fixture.setPersist(
    () =>
      new Promise((_resolve, reject) => {
        fail = reject;
      }),
  );
  let hook = fixture.render();
  hook.commitCreation({
    ...hook.creation,
    homeDraft: { ...hook.creation.homeDraft, prompt: "previous edit" },
  });
  const previous = hook.flush();
  const previousRejected = assert.rejects(previous, /conflict:/);
  await new Promise<void>((resolve) => setImmediate(resolve));
  hook = fixture.render();
  hook.commitCreation({
    ...hook.creation,
    homeDraft: { ...hook.creation.homeDraft, prompt: "newer approval draft" },
  });
  const approval = hook.flush();
  const approvalRejected = assert.rejects(approval, /保存.*暂停|尚未.*保存/);
  fail("conflict: native snapshot changed in another window");
  await Promise.all([previousRejected, approvalRejected]);
  hook = fixture.render();
  assert.equal(fixture.writes.length, 1);
  assert.equal(fixture.durable().revision, 1);
  assert.equal(hook.state, "conflict");
  assert.equal(hook.creation.homeDraft.prompt, "newer approval draft");
  assert.equal(hook.creation.revision, 3);
  hook.retryRead();
  await new Promise<void>((resolve) => setImmediate(resolve));
  hook = fixture.render();
  assert.equal(hook.state, "saved");
  assert.equal(hook.creation.revision, 1);
  assert.equal(hook.recoveryDraft?.homeDraft.prompt, "newer approval draft");
});

test("queued flushes for an acknowledged revision resolve without duplicate writes", async () => {
  const fixture = await harness();
  const hook = fixture.render();
  hook.commitCreation({
    ...hook.creation,
    homeDraft: { ...hook.creation.homeDraft, prompt: "one saved revision" },
  });
  await Promise.all([hook.flush(), hook.flush()]);
  assert.equal(fixture.writes.length, 1);
  assert.equal(fixture.durable().revision, 2);
  assert.equal(fixture.render().state, "saved");
});

test("flushing an already durable revision restores saved status without writing again", async () => {
  const fixture = await harness();
  let hook = fixture.render();
  hook.commitCreation({
    ...hook.creation,
    homeDraft: { ...hook.creation.homeDraft, prompt: "durable approval" },
  });
  await hook.flush();
  hook = fixture.render();
  assert.equal(hook.state, "saved");
  await hook.flush();
  assert.equal(fixture.writes.length, 1);
  assert.equal(fixture.render().state, "saved");
});

test("the actual hook drains the latest revision before native destruction", async () => {
  const fixture = await harness(true);
  let finish!: () => void;
  fixture.setPersist((snapshot) =>
    snapshot.revision === 2
      ? new Promise<void>((resolve) => {
          finish = resolve;
        })
      : Promise.resolve(),
  );
  let hook = fixture.render();
  hook.commitCreation({
    ...hook.creation,
    homeDraft: { ...hook.creation.homeDraft, prompt: "first" },
  });
  let prevented = 0;
  const closing = fixture.nativeClose()({
    preventDefault: () => {
      prevented++;
    },
  });
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(prevented, 1);
  assert.equal(fixture.destroyed(), 0);
  hook = fixture.render();
  hook.commitCreation({
    ...hook.creation,
    homeDraft: { ...hook.creation.homeDraft, prompt: "latest" },
  });
  finish();
  await closing;
  assert.deepEqual(
    fixture.writes.map((s) => s.revision),
    [2, 3],
  );
  assert.equal(fixture.render().creation.homeDraft.prompt, "latest");
  assert.equal(fixture.render().state, "saved");
  assert.equal(fixture.destroyed(), 1);
  fixture.dispose();
  assert.equal(fixture.released(), 1);
});

test("native save failure keeps the hook draft and safe error visible until retry", async () => {
  const fixture = await harness(true);
  const hook = fixture.render();
  hook.commitCreation({
    ...hook.creation,
    homeDraft: { ...hook.creation.homeDraft, prompt: "unsaved" },
  });
  fixture.setPersist(async () => {
    throw new Error("private path should not leak");
  });
  await fixture.nativeClose()({ preventDefault() {} });
  assert.equal(fixture.destroyed(), 0);
  assert.equal(fixture.render().state, "write_error");
  assert.equal(fixture.render().creation.homeDraft.prompt, "unsaved");
  assert.match(fixture.render().message, /窗口保持打开/);
  assert(!fixture.render().message.includes("private path"));
  fixture.setPersist(async () => {});
  await fixture.nativeClose()({ preventDefault() {} });
  assert.equal(fixture.destroyed(), 1);
  assert.equal(fixture.render().state, "saved");
  fixture.dispose();
});

test("a native subscription resolving after unmount is released without a stale close", async () => {
  let register!: (stop: () => void) => void;
  let stopped = 0;
  const fixture = await harness(
    true,
    new Promise((resolve) => {
      register = resolve;
    }),
  );
  fixture.dispose();
  register(() => {
    stopped++;
  });
  await new Promise<void>((resolve) => setImmediate(resolve));
  await fixture.nativeClose()({ preventDefault() {} });
  assert.equal(stopped, 1);
  assert.equal(fixture.destroyed(), 0);
  assert.equal(fixture.writes.length, 0);
});

function readGate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

const settle = () => new Promise<void>((resolve) => setImmediate(resolve));
function referenceFixture(id: string, file: string) {
  const bytes = readFileSync(new URL(file, import.meta.url));
  return {
    id,
    name: `${id}.png`,
    mime: "image/png",
    size: bytes.length,
    dataUrl: `data:image/png;base64,${bytes.toString("base64")}`,
    assetId: `asset-${createHash("sha256").update(bytes).digest("hex").slice(0, 24)}`,
  };
}
const oldAttachment = referenceFixture(
  "saved-reference",
  "../../src-tauri/icons/32x32.png",
);
const newAttachment = referenceFixture(
  "new-reference",
  "../../src-tauri/icons/64x64.png",
);
function savedHomeSnapshot(): CreationSnapshot {
  const initial = emptySnapshot();
  return {
    ...initial,
    revision: 8,
    homeDraft: {
      ...initial.homeDraft,
      prompt: "saved prompt",
      outputCount: 4,
      privacyMode: "local_only",
      approvalMode: "ask",
      model: "saved-model",
      providerConnectionId: "saved-provider",
      modelSelection: {
        source: "api",
        kind: "image",
        model: "saved-model",
        connectionId: "saved-provider",
      },
      attachments: [oldAttachment],
      updatedAt: 10,
    },
  };
}

test("loading prompt edits preserve stored settings and unseen attachments through durable flush", async () => {
  const gate = readGate();
  const saved = savedHomeSnapshot();
  const fixture = await harness(false, undefined, {
    initial: saved,
    readGate: gate.promise,
    waitForLoad: false,
  });
  try {
    const hook = fixture.render();
    hook.commitCreation({
      ...hook.creation,
      homeDraft: {
        ...hook.creation.homeDraft,
        prompt: "typed while loading",
        updatedAt: 20,
      },
    });
    assert.equal(fixture.render().state, "loading");
    assert.equal(fixture.writes.length, 0);
    assert.equal(fixture.durable(), saved);
    gate.release();
    await settle();
    const loaded = fixture.render();
    assert.equal(loaded.creation.homeDraft.prompt, "typed while loading");
    for (const key of [
      "outputCount",
      "privacyMode",
      "approvalMode",
      "model",
      "providerConnectionId",
    ] as const)
      assert.equal(loaded.creation.homeDraft[key], saved.homeDraft[key], key);
    assert.deepEqual(
      loaded.creation.homeDraft.attachments,
      saved.homeDraft.attachments,
    );
    assert.deepEqual(
      loaded.creation.homeDraft.modelSelection,
      saved.homeDraft.modelSelection,
    );
    await loaded.flush();
    assert.deepEqual(fixture.durable().homeDraft, loaded.creation.homeDraft);
  } finally {
    fixture.dispose();
  }
});

test("an explicit default approval choice during loading overrides only that stored field", async () => {
  const gate = readGate();
  const fixture = await harness(false, undefined, {
    initial: savedHomeSnapshot(),
    readGate: gate.promise,
    waitForLoad: false,
  });
  try {
    const hook = fixture.render();
    hook.commitCreation(
      {
        ...hook.creation,
        homeDraft: {
          ...hook.creation.homeDraft,
          approvalMode: "auto",
          updatedAt: 20,
        },
      },
      { approvalMode: "auto" },
    );
    gate.release();
    await settle();
    assert.equal(fixture.render().creation.homeDraft.approvalMode, "auto");
    assert.equal(fixture.render().creation.homeDraft.outputCount, 4);
    assert.equal(fixture.render().creation.homeDraft.prompt, "saved prompt");
  } finally {
    fixture.dispose();
  }
});

test("loading model edits keep the selected route together and preserve untouched privacy", async () => {
  const gate = readGate();
  const fixture = await harness(false, undefined, {
    initial: savedHomeSnapshot(),
    readGate: gate.promise,
    waitForLoad: false,
  });
  try {
    const hook = fixture.render();
    const selection = { source: "codex", kind: "image", model: "" } as const;
    const patch = {
      modelSelection: selection,
      model: "",
      providerConnectionId: undefined,
    };
    hook.commitCreation(
      {
        ...hook.creation,
        homeDraft: { ...hook.creation.homeDraft, ...patch, updatedAt: 20 },
      },
      patch,
    );
    gate.release();
    await settle();
    const draft = fixture.render().creation.homeDraft;
    assert.equal(draft.modelSelection?.source, "codex");
    assert.equal(draft.model, "");
    assert.equal(draft.providerConnectionId, undefined);
    assert.equal(draft.privacyMode, "local_only");
    assert.equal(draft.outputCount, 4);
  } finally {
    fixture.dispose();
  }
});

for (const removeNew of [false, true]) {
  test(`loading attachment ${removeNew ? "removal" : "addition"} keeps an unseen saved reference`, async () => {
    const gate = readGate();
    const fixture = await harness(false, undefined, {
      initial: savedHomeSnapshot(),
      readGate: gate.promise,
      waitForLoad: false,
    });
    try {
      let hook = fixture.render();
      hook.commitCreation({
        ...hook.creation,
        homeDraft: {
          ...hook.creation.homeDraft,
          attachments: [newAttachment],
          updatedAt: 20,
        },
      });
      if (removeNew) {
        hook = fixture.render();
        hook.commitCreation({
          ...hook.creation,
          homeDraft: {
            ...hook.creation.homeDraft,
            attachments: [],
            updatedAt: 21,
          },
        });
      }
      gate.release();
      await settle();
      const draft = fixture.render().creation.homeDraft;
      assert.deepEqual(
        [...draft.attachments].map((item) => item.id),
        removeNew ? [oldAttachment.id] : [oldAttachment.id, newAttachment.id],
      );
      assert.equal(draft.outputCount, 4);
    } finally {
      fixture.dispose();
    }
  });
}

test("input during asynchronous reconciliation survives the earlier captured draft", async () => {
  const gate = readGate();
  const fixture = await harness(false, undefined, {
    initial: savedHomeSnapshot(),
    waitForLoad: false,
    reconcile: async (snapshot) => {
      await gate.promise;
      return snapshot;
    },
  });
  try {
    await settle();
    const hook = fixture.render();
    hook.commitCreation({
      ...hook.creation,
      homeDraft: {
        ...hook.creation.homeDraft,
        prompt: "latest during reconcile",
        updatedAt: 20,
      },
    });
    gate.release();
    await settle();
    assert.equal(
      fixture.render().creation.homeDraft.prompt,
      "latest during reconcile",
    );
    assert.equal(fixture.render().creation.homeDraft.outputCount, 4);
  } finally {
    fixture.dispose();
  }
});

test("unmount invalidates a reconciliation that already passed the first read check", async () => {
  const gate = readGate();
  const fixture = await harness(false, undefined, {
    initial: savedHomeSnapshot(),
    waitForLoad: false,
    reconcile: async (snapshot) => {
      await gate.promise;
      return snapshot;
    },
  });
  await settle();
  const before = fixture.render().creationRef.current;
  fixture.dispose();
  gate.release();
  await settle();
  assert.equal(fixture.render().creationRef.current, before);
  assert.equal(fixture.writes.length, 0);
});

test("an explicit loading edit is preserved even if the saved timestamp is ahead", async () => {
  const gate = readGate();
  const saved = savedHomeSnapshot();
  saved.homeDraft.updatedAt = 1000;
  const fixture = await harness(false, undefined, {
    initial: saved,
    readGate: gate.promise,
    waitForLoad: false,
  });
  try {
    const hook = fixture.render();
    hook.commitCreation({
      ...hook.creation,
      homeDraft: {
        ...hook.creation.homeDraft,
        prompt: "current intent",
        updatedAt: 20,
      },
    });
    gate.release();
    await settle();
    assert.equal(fixture.render().creation.homeDraft.prompt, "current intent");
    assert.equal(fixture.render().creation.homeDraft.outputCount, 4);
  } finally {
    fixture.dispose();
  }
});

test("a timestamp-only default seed adopts the durable draft without another write", async () => {
  const gate = readGate();
  const saved = savedHomeSnapshot();
  const fixture = await harness(false, undefined, {
    initial: saved,
    readGate: gate.promise,
    waitForLoad: false,
  });
  try {
    const hook = fixture.render();
    hook.commitCreation({
      ...hook.creation,
      homeDraft: { ...hook.creation.homeDraft, updatedAt: Date.now() },
    });
    gate.release();
    await settle();
    assert.deepEqual(fixture.render().creation.homeDraft, saved.homeDraft);
    await fixture.render().flush();
    assert.equal(fixture.writes.length, 0);
  } finally {
    fixture.dispose();
  }
});

test("an explicit event patch cannot reset earlier input from a stale composer render", async () => {
  const gate = readGate();
  const fixture = await harness(false, undefined, {
    initial: savedHomeSnapshot(),
    readGate: gate.promise,
    waitForLoad: false,
  });
  try {
    const hook = fixture.render();
    hook.commitCreation(
      {
        ...hook.creation,
        homeDraft: { ...hook.creation.homeDraft, prompt: "latest input" },
      },
      { prompt: "latest input" },
    );
    hook.commitCreation(
      {
        ...hook.creation,
        homeDraft: { ...hook.creation.homeDraft, approvalMode: "auto" },
      },
      { approvalMode: "auto" },
    );
    gate.release();
    await settle();
    assert.equal(fixture.render().creation.homeDraft.prompt, "latest input");
    assert.equal(fixture.render().creation.homeDraft.approvalMode, "auto");
    assert.equal(fixture.render().creation.homeDraft.outputCount, 4);
  } finally {
    fixture.dispose();
  }
});

test("an initial read failure freezes writes and retains edits across retry", async () => {
  const first = readGate();
  const retry = readGate();
  const saved = savedHomeSnapshot();
  const fixture = await harness(false, undefined, {
    initial: saved,
    readGate: first.promise,
    readError: new Error("unavailable"),
    waitForLoad: false,
  });
  try {
    let hook = fixture.render();
    hook.commitCreation({
      ...hook.creation,
      homeDraft: { ...hook.creation.homeDraft, prompt: "before failure" },
    });
    first.release();
    await settle();
    assert.equal(fixture.render().state, "read_error");
    await assert.rejects(fixture.render().flush(), /尚未读取成功/);
    assert.equal(fixture.writes.length, 0);
    fixture.setLoad(async () => {
      await retry.promise;
      return { snapshot: saved, recovered: false, durableRevision: 8 };
    });
    fixture.render().retryRead();
    hook = fixture.render();
    hook.commitCreation(
      {
        ...hook.creation,
        homeDraft: { ...hook.creation.homeDraft, approvalMode: "auto" },
      },
      { approvalMode: "auto" },
    );
    retry.release();
    await settle();
    const loaded = fixture.render();
    assert.equal(loaded.creation.homeDraft.prompt, "before failure");
    assert.equal(loaded.creation.homeDraft.approvalMode, "auto");
    assert.equal(loaded.creation.homeDraft.outputCount, 4);
    await loaded.flush();
    assert.equal(fixture.durable().homeDraft.prompt, "before failure");
  } finally {
    fixture.dispose();
  }
});

test("retry merges only edits made during the read and keeps the prior conflict draft separate", async () => {
  const saved = savedHomeSnapshot();
  const fixture = await harness(false, undefined, { initial: saved });
  const retry = readGate();
  try {
    let hook = fixture.render();
    hook.commitCreation({
      ...hook.creation,
      homeDraft: { ...hook.creation.homeDraft, prompt: "old conflict draft" },
    });
    fixture.setPersist(async () => {
      throw new Error("conflict: another window changed the snapshot");
    });
    await assert.rejects(fixture.render().flush(), /conflict:/);
    const external = {
      ...saved,
      revision: 15,
      homeDraft: {
        ...saved.homeDraft,
        prompt: "external prompt",
        outputCount: 3,
      },
    };
    fixture.setLoad(async () => {
      await retry.promise;
      return { snapshot: external, recovered: false, durableRevision: 15 };
    });
    fixture.render().retryRead();
    hook = fixture.render();
    hook.commitCreation({
      ...hook.creation,
      homeDraft: { ...hook.creation.homeDraft, approvalMode: "auto" },
    });
    retry.release();
    await settle();
    hook = fixture.render();
    assert.equal(hook.creation.homeDraft.prompt, "external prompt");
    assert.equal(hook.creation.homeDraft.outputCount, 3);
    assert.equal(hook.creation.homeDraft.approvalMode, "auto");
    assert.equal(hook.recoveryDraft?.homeDraft.prompt, "old conflict draft");
    fixture.setPersist(async () => {});
    await hook.flush();
    assert.equal(fixture.render().state, "saved");
  } finally {
    fixture.dispose();
  }
});

test("rereading a journal recovery does not replace the current conflict recovery draft", async () => {
  const saved = savedHomeSnapshot();
  const fixture = await harness(false, undefined, { initial: saved });
  try {
    const hook = fixture.render();
    hook.commitCreation({
      ...hook.creation,
      homeDraft: {
        ...hook.creation.homeDraft,
        prompt: "current conflict draft",
      },
    });
    fixture.setPersist(async () => {
      throw new Error("conflict: source changed");
    });
    await assert.rejects(fixture.render().flush(), /conflict:/);
    fixture.setLoad(async () => ({
      snapshot: saved,
      recovered: true,
      durableRevision: 8,
      recoveryDraft: {
        ...saved,
        homeDraft: { ...saved.homeDraft, prompt: "older journal draft" },
      },
    }));
    fixture.render().retryRead();
    await settle();
    assert.equal(
      fixture.render().recoveryDraft?.homeDraft.prompt,
      "current conflict draft",
    );
    assert.equal(fixture.render().creation.homeDraft.prompt, "saved prompt");
  } finally {
    fixture.dispose();
  }
});

test("a newer read cancels late reconciliation without losing edits from the pending read", async () => {
  const oldReconcile = readGate();
  let reconciliations = 0;
  const saved = savedHomeSnapshot();
  const fixture = await harness(false, undefined, {
    initial: saved,
    waitForLoad: false,
    reconcile: async (snapshot) => {
      if (++reconciliations === 1) await oldReconcile.promise;
      return snapshot;
    },
  });
  try {
    await settle();
    let hook = fixture.render();
    hook.commitCreation({
      ...hook.creation,
      homeDraft: { ...hook.creation.homeDraft, prompt: "pending input" },
    });
    const newer = {
      ...saved,
      revision: 20,
      homeDraft: { ...saved.homeDraft, outputCount: 2 },
    };
    fixture.setLoad(async () => ({
      snapshot: newer,
      recovered: false,
      durableRevision: 20,
    }));
    fixture.render().retryRead();
    await settle();
    hook = fixture.render();
    assert.equal(hook.creation.homeDraft.prompt, "pending input");
    assert.equal(hook.creation.homeDraft.outputCount, 2);
    const accepted = hook.creation;
    oldReconcile.release();
    await settle();
    assert.equal(fixture.render().creation, accepted);
    await fixture.render().flush();
    assert.equal(fixture.writes.length, 1);
    assert.equal(fixture.durable().revision, 21);
  } finally {
    fixture.dispose();
  }
});

test("overlapping reads serialize storage access before accepting the newer source", async () => {
  const first = readGate();
  const saved = savedHomeSnapshot();
  const fixture = await harness(false, undefined, {
    initial: saved,
    readGate: first.promise,
    waitForLoad: false,
  });
  try {
    await settle();
    let laterRead = false;
    fixture.setLoad(async () => {
      laterRead = true;
      return { snapshot: saved, recovered: false, durableRevision: 8 };
    });
    fixture.render().retryRead();
    await settle();
    assert.equal(laterRead, false);
    first.release();
    await settle();
    assert.equal(laterRead, true);
    assert.equal(fixture.render().state, "saved");
    assert.equal(fixture.render().creation.revision, 8);
  } finally {
    fixture.dispose();
  }
});

test("an earlier save receipt cannot enable project editing during a pending reread", async () => {
  const fixture = await harness();
  const writing = readGate();
  const reading = readGate();
  try {
    const hook = fixture.render();
    hook.commitCreation({
      ...hook.creation,
      homeDraft: { ...hook.creation.homeDraft, prompt: "save before reread" },
    });
    const saved = hook.creationRef.current;
    fixture.setPersist(async () => {
      await writing.promise;
    });
    const flush = fixture.render().flush();
    await settle();
    fixture.setLoad(async () => {
      await reading.promise;
      return {
        snapshot: saved,
        recovered: false,
        durableRevision: saved.revision,
      };
    });
    fixture.render().retryRead();
    writing.release();
    await flush;
    await settle();
    assert.equal(fixture.render().state, "loading");
    await assert.rejects(fixture.render().flush(), /尚未读取成功/);
    reading.release();
    await settle();
    assert.equal(fixture.render().state, "saved");
  } finally {
    fixture.dispose();
  }
});

test("loading the same asset under another attachment ID retains the stored reference identity", async () => {
  const gate = readGate();
  const saved = savedHomeSnapshot();
  const fixture = await harness(false, undefined, {
    initial: saved,
    readGate: gate.promise,
    waitForLoad: false,
  });
  try {
    const hook = fixture.render();
    hook.commitCreation({
      ...hook.creation,
      homeDraft: {
        ...hook.creation.homeDraft,
        attachments: [{ ...oldAttachment, id: "reimported-copy" }],
        updatedAt: 20,
      },
    });
    gate.release();
    await settle();
    assert.deepEqual(fixture.render().creation.homeDraft.attachments, [
      oldAttachment,
    ]);
    await fixture.render().flush();
    assert.deepEqual(fixture.durable().homeDraft.attachments, [oldAttachment]);
  } finally {
    fixture.dispose();
  }
});

test("a pending retry removes a seen attachment while keeping an unseen external asset", async () => {
  const saved = savedHomeSnapshot();
  const fixture = await harness(false, undefined, { initial: saved });
  const gate = readGate();
  try {
    const newer = {
      ...saved,
      revision: 9,
      homeDraft: {
        ...saved.homeDraft,
        attachments: [oldAttachment, newAttachment],
      },
    };
    fixture.setLoad(async () => {
      await gate.promise;
      return { snapshot: newer, recovered: false, durableRevision: 9 };
    });
    fixture.render().retryRead();
    const hook = fixture.render();
    hook.commitCreation({
      ...hook.creation,
      homeDraft: { ...hook.creation.homeDraft, attachments: [] },
    });
    gate.release();
    await settle();
    assert.deepEqual(fixture.render().creation.homeDraft.attachments, [
      newAttachment,
    ]);
  } finally {
    fixture.dispose();
  }
});

test("a pending retry removes only the selected reference when seen references share an asset", async () => {
  const saved = savedHomeSnapshot();
  const first = { ...oldAttachment, id: "reference-a" };
  const second = { ...oldAttachment, id: "reference-b" };
  saved.homeDraft.attachments = [first, second];
  const fixture = await harness(false, undefined, { initial: saved });
  const gate = readGate();
  try {
    fixture.setLoad(async () => {
      await gate.promise;
      return { snapshot: saved, recovered: false, durableRevision: 8 };
    });
    fixture.render().retryRead();
    const hook = fixture.render();
    const attachments = hook.creation.homeDraft.attachments.filter(
      (attachment) => attachment.id !== first.id,
    );
    hook.commitCreation(
      {
        ...hook.creation,
        homeDraft: { ...hook.creation.homeDraft, attachments },
      },
      { attachments },
    );
    gate.release();
    await settle();
    await fixture.render().flush();
    assert.deepEqual(
      {
        memory: fixture
          .render()
          .creation.homeDraft.attachments.map((attachment) => attachment.id),
        durable: fixture
          .durable()
          .homeDraft.attachments.map((attachment) => attachment.id),
        state: fixture.render().state,
      },
      { memory: ["reference-b"], durable: ["reference-b"], state: "saved" },
    );
    assert.deepEqual(saved.homeDraft.attachments, [first, second]);
  } finally {
    fixture.dispose();
  }
});

test("loading retains every reference beyond the import count budget without truncating originals", async () => {
  const gate = readGate();
  const saved = savedHomeSnapshot();
  saved.homeDraft.attachments = Array.from({ length: 6 }, (_, index) => ({
    ...oldAttachment,
    id: `saved-${index}`,
  }));
  const fixture = await harness(false, undefined, {
    initial: saved,
    readGate: gate.promise,
    waitForLoad: false,
  });
  try {
    const hook = fixture.render();
    hook.commitCreation({
      ...hook.creation,
      homeDraft: { ...hook.creation.homeDraft, attachments: [newAttachment] },
    });
    gate.release();
    await settle();
    const loaded = fixture.render();
    assert.equal(loaded.creation.homeDraft.attachments.length, 7);
    assert.equal(
      loaded.creation.homeDraft.attachments[6].assetId,
      newAttachment.assetId,
    );
    assert.equal(saved.homeDraft.attachments.length, 6);
    await loaded.flush();
    assert.equal(fixture.durable().homeDraft.attachments.length, 7);
  } finally {
    fixture.dispose();
  }
});

test("an oversized loading attachment cannot acknowledge a write or erase the durable original", async () => {
  const gate = readGate();
  const saved = savedHomeSnapshot();
  const fixture = await harness(false, undefined, {
    initial: saved,
    readGate: gate.promise,
    waitForLoad: false,
  });
  try {
    const oversized = {
      ...newAttachment,
      dataUrl: "data:image/png;base64," + "A".repeat(16 * 1024 * 1024),
    };
    const hook = fixture.render();
    hook.commitCreation({
      ...hook.creation,
      homeDraft: {
        ...hook.creation.homeDraft,
        attachments: [oversized],
        updatedAt: 20,
      },
    });
    gate.release();
    await settle();
    await assert.rejects(fixture.render().flush(), /原件已保留/);
    assert.equal(fixture.render().state, "read_error");
    assert.equal(fixture.durable(), saved);
    assert.equal(
      fixture.render().creation.homeDraft.attachments[1].dataUrl,
      oversized.dataUrl,
    );
    await assert.rejects(fixture.render().flush(), /尚未读取成功/);
  } finally {
    fixture.dispose();
  }
});

test("unsupported snapshots bypass task recovery and reconciliation and cannot be edited or saved", async () => {
  const original = {
    ...emptySnapshot(),
    version: 99,
    revision: 8,
  } as unknown as CreationSnapshot;
  let recoveries = 0;
  let reconciliations = 0;
  const fixture = await harness(false, undefined, {
    initial: original,
    waitForLoad: false,
    recover: (snapshot) => {
      recoveries++;
      return snapshot;
    },
    reconcile: async (snapshot) => {
      reconciliations++;
      return snapshot;
    },
  });
  try {
    await settle();
    const hook = fixture.render();
    assert.equal(hook.state, "read_only");
    assert.ok(hook.getWriteBlockReason());
    assert.equal(recoveries, 0);
    assert.equal(reconciliations, 0);
    assert.equal(hook.recoveryDraft, original);
    hook.commitCreation({
      ...hook.creation,
      homeDraft: { ...hook.creation.homeDraft, prompt: "must not edit" },
    });
    assert.equal(
      fixture.render().creation.homeDraft.prompt,
      original.homeDraft.prompt,
    );
    await assert.rejects(fixture.render().flush(), /尚未读取成功/);
    assert.deepEqual(fixture.writes, []);
    assert.equal(fixture.durable(), original);
  } finally {
    fixture.dispose();
  }
});
