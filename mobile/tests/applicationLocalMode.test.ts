import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createMobileApplication } from "../src/application/application.ts";
import { MobileRepository } from "../src/storage/repository.ts";
import { createSessionVault } from "../src/storage/sessionVault.ts";
import { getComfyWorkflows } from "../src/application/comfyWorkflows.ts";
import { createGatewayImageClient } from "../src/services/gatewayImageClient.ts";
import type { ApplicationDependencies } from "../src/application/types.ts";

const png = new Uint8Array(
  readFileSync(new URL("../assets/favicon.png", import.meta.url)),
);

function fixture() {
  const snapshots = new Map<string, string>();
  const originals = new Map<string, Uint8Array>();
  const calls: string[] = [];
  const scope = `local-mode-${Math.random()}`;
  let sequence = 0,
    now = 10_000,
    readFailure = false;
  const deps: ApplicationDependencies = {
    initialMode: "local",
    identityDigest: async (value) =>
      createHash("sha256").update(value).digest("hex"),
    id: () => `id-${++sequence}`,
    now: () => ++now,
    vault: (account) => createSessionVault(`${scope}:${account}`),
    repository: async (accountId) =>
      new MobileRepository({
        accountId,
        backend: {
          async read(account) {
            if (readFailure) throw new Error("storage read unavailable");
            return snapshots.get(account) ?? null;
          },
          async compareAndSwap(account, revision, payload) {
            const old = snapshots.get(account);
            if ((old ? JSON.parse(old).revision : null) !== revision)
              return false;
            snapshots.set(account, payload);
            return true;
          },
        },
        originalStore: {
          async read(account, id) {
            const value = originals.get(`${account}:${id}`);
            if (!value) throw new Error("original missing");
            return value.slice();
          },
          async write(account, id, bytes) {
            originals.set(`${account}:${id}`, bytes.slice());
          },
          async remove(account, id) {
            originals.delete(`${account}:${id}`);
          },
        },
        hash: async (bytes) => createHash("sha256").update(bytes).digest("hex"),
        now: () => ++now,
        id: () => `id-${++sequence}`,
      }),
    identity: () => ({
      async login(input) {
        calls.push("login");
        if (input.password === "wrong") throw new Error("invalid login");
        return {
          user: {
            id: input.email,
            email: input.email,
            displayName: "Real account fixture",
          },
          deviceId: input.deviceId,
          accessToken: "a".repeat(40),
          refreshToken: "r".repeat(40),
          accessExpiresAt: now + 100_000,
          refreshExpiresAt: now + 200_000,
        };
      },
      async refresh() {
        calls.push("refresh");
        throw new Error("unexpected refresh");
      },
      async me() {
        calls.push("me");
        throw new Error("unexpected me");
      },
      async logout() {
        calls.push("logout");
        return { revoked: true as const };
      },
    }),
    provider: () => ({
      async probeModels(connection) {
        calls.push("models");
        return {
          connectionId: connection.id,
          models: [],
          health: "reachable" as const,
          generationVerified: false as const,
        };
      },
      async generateText(input) {
        calls.push("text");
        return {
          identity: {
            submissionId: input.submissionId,
            projectId: input.projectId,
            connectionId: input.connection.id,
            model: input.model,
            prompt: input.prompt,
            capturedAt: now,
          },
          submissionState: "terminal" as const,
          text: "local BYOK answer",
          finishReason: "stop",
        };
      },
      async generateImages(input) {
        calls.push("image");
        return {
          identity: {
            submissionId: input.submissionId,
            projectId: input.projectId,
            connectionId: input.connection.id,
            model: input.model,
            prompt: input.prompt,
            capturedAt: now,
          },
          submissionState: "terminal" as const,
          originals: [
            {
              index: 0,
              bytes: png,
              mime: "image/png" as const,
              signatureVerified: true as const,
            },
          ],
          archivalState: "pending" as const,
        };
      },
    }),
    gateway: () => {
      calls.push("gateway");
      throw new Error("guest must never construct gateway");
    },
    comfy: () => {
      calls.push("comfy");
      throw new Error("guest must never construct companion client");
    },
  };
  return {
    deps,
    snapshots,
    calls,
    app: () => createMobileApplication(deps),
    failRead(value: boolean) {
      readFailure = value;
    },
  };
}

test("Web local startup restores its own namespace without inventing a session or contacting identity", async () => {
  const f = fixture(),
    app = f.app();
  await app.start();
  assert.equal(app.getState().auth, "local");
  assert.equal(app.context().mode, "local");
  assert.equal("session" in app.context(), false);
  assert.equal("identityOrigin" in app.context(), false);
  assert.equal(app.getState().user, undefined);
  const account = app.getState().accountId;
  await app.createProject("Phone project");
  const project = app.getState().snapshot!.projects[0];
  await app.saveDraft(project.id, {
    ...project.composerDraft,
    prompt: "retained local draft",
  });
  await app.saveTheme("dark");
  const reload = f.app();
  await reload.start();
  assert.equal(reload.getState().accountId, account);
  assert.equal(
    reload.getState().snapshot!.projects[0].composerDraft.prompt,
    "retained local draft",
  );
  assert.equal(reload.getState().snapshot!.preferences.theme, "dark");
  await reload.ensureSession();
  await reload.reconcileOutstanding(true);
  await reload.logout();
  assert.equal(reload.getState().auth, "local");
  assert.deepEqual(f.calls, []);
});

test("Native default still requires a real account and cannot activate browser-local mode", async () => {
  const f = fixture();
  delete f.deps.initialMode;
  const app = f.app();
  await app.start();
  assert.equal(app.getState().auth, "signedOut");
  assert.throws(() => app.context(), /登录/);
  await assert.rejects(app.enterLocalMode(), /浏览器/);
  assert.deepEqual(f.calls, []);
});

test("opening optional account login never contacts a server or deletes local data and can return without logging in", async () => {
  const f = fixture(),
    app = f.app();
  await app.start();
  await app.createProject("before optional login");
  const before = new Map(f.snapshots);
  await app.enterAccountMode();
  assert.equal(app.getState().auth, "signedOut");
  assert.equal(app.getState().snapshot, null);
  assert.equal(app.getState().user, undefined);
  assert.throws(() => app.context(), /登录/);
  assert.deepEqual(f.calls, []);
  assert.deepEqual(f.snapshots, before);
  await app.enterLocalMode();
  assert.equal(app.getState().auth, "local");
  assert.equal(
    app.getState().snapshot!.projects[0].name,
    "before optional login",
  );
  assert.deepEqual(f.calls, []);
  assert.deepEqual(f.snapshots, before);
});

test("local BYOK provider submits and archives while gateway and companion paths fail before networking", async () => {
  const f = fixture(),
    app = f.app();
  await app.start();
  await app.createProject("BYOK");
  const connection = await app.saveConnection(
    {
      name: "My provider",
      baseUrl: "https://provider.example/v1",
      protocol: "openai-compatible",
      capabilities: { text: true, image: true },
    },
    "request-memory-only-key",
  );
  await app.probeConnection(connection);
  let project = app.getState().snapshot!.projects[0];
  await app.saveDraft(project.id, {
    ...project.composerDraft,
    prompt: "a public prompt",
    model: "fixture-model",
    providerConnectionId: connection,
  });
  await app.submit();
  project = app.getState().snapshot!.projects[0];
  assert.equal(project.tasks[0].status, "succeeded");
  assert.equal(project.messages.at(-1)!.text, "local BYOK answer");
  await app.saveDraft(project.id, {
    ...project.composerDraft,
    prompt: "image BYOK",
    kind: "image",
    model: "fixture-image",
    providerConnectionId: connection,
  });
  await app.submit();
  const asset = app.getState().snapshot!.assets[0];
  assert.equal(asset.sha256, createHash("sha256").update(png).digest("hex"));
  assert.deepEqual(await app.context().repo.readOriginal(asset.id), png);
  await assert.rejects(app.refreshSession(), /真实账号/);
  await assert.rejects(app.reconcileTask("no-gateway"), /真实账号/);
  await assert.rejects(app.requestGatewayCancel("no-gateway"), /真实账号/);
  const gateway = await app.saveConnection(
    {
      name: "Account gateway",
      baseUrl: "https://gateway.example",
      protocol: "kk-image-jobs",
      capabilities: { text: false, image: true },
    },
    "gateway-key",
  );
  project = app.getState().snapshot!.projects[0];
  await app.saveDraft(project.id, {
    ...project.composerDraft,
    prompt: "image",
    model: "fixture-image",
    kind: "image",
    providerConnectionId: gateway,
  });
  await assert.rejects(app.submit(), /真实账号/);
  assert.equal(app.getState().snapshot!.projects[0].tasks.length, 2);
  await assert.rejects(
    getComfyWorkflows(app).health("no-companion"),
    /真实账号/,
  );
  assert.deepEqual(f.calls, ["models", "text", "image"]);
  assert.doesNotMatch(
    JSON.stringify([...f.snapshots.values()]),
    /request-memory-only-key|gateway-key/,
  );
});

test("a real account whose user id equals the guest label still opens a separate identity realm", async () => {
  const f = fixture(),
    identity = f.deps.identity;
  f.deps.identity = (origin) => ({
    ...identity(origin),
    async login(input) {
      const session = await identity(origin).login(input);
      return { ...session, user: { ...session.user, id: "local-browser-v1" } };
    },
  });
  const app = f.app();
  await app.start();
  await app.createProject("local private");
  await app.login("person@example.test", "valid-secret");
  assert.match(app.context().accountId, /^realm-v1-[a-f0-9]{64}$/);
  assert.deepEqual(app.getState().snapshot!.projects, []);
  await app.logout();
  assert.equal(app.getState().snapshot!.projects[0].name, "local private");
});

test("account login, failed login and logout cannot claim or overwrite the local realm", async () => {
  const f = fixture(),
    app = f.app();
  await app.start();
  const localId = app.context().accountId;
  await app.createProject("local only");
  const before = f.snapshots.get(localId);
  await app.login("person@example.test", "valid-secret");
  assert.equal(app.getState().auth, "ready");
  assert.equal(app.context().mode, "account");
  assert.notEqual(app.context().accountId, localId);
  assert.deepEqual(app.getState().snapshot!.projects, []);
  await app.createProject("account only");
  await app.logout();
  assert.equal(app.getState().auth, "local");
  assert.equal(app.context().accountId, localId);
  assert.equal(app.getState().snapshot!.projects[0].name, "local only");
  assert.equal(f.snapshots.get(localId), before);
  await assert.rejects(
    app.login("person@example.test", "wrong"),
    /invalid login/,
  );
  await app.enterLocalMode();
  assert.equal(app.getState().snapshot!.projects[0].name, "local only");
  assert.equal(f.snapshots.size, 2);
});

test("local storage read failures preserve the row and only explicit reload retries", async () => {
  const f = fixture(),
    first = f.app();
  await first.start();
  await first.createProject("never reset");
  const before = new Map(f.snapshots);
  f.failRead(true);
  const app = f.app();
  await app.start();
  assert.equal(app.getState().auth, "localStorageRecovery");
  assert.match(app.getState().storageError!, /现有内容保留/);
  assert.deepEqual(f.snapshots, before);
  assert.throws(() => app.context(), /存储/);
  f.failRead(false);
  await app.reloadStorage();
  assert.equal(app.getState().auth, "local");
  assert.equal(app.getState().snapshot!.projects[0].name, "never reset");
  assert.deepEqual(f.calls, []);
});

test("a delayed local bootstrap cannot replace a newer authenticated account", async () => {
  const f = fixture(),
    original = f.deps.repository;
  let release!: () => void,
    disposed = 0;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  f.deps.repository = async (account) => {
    const repo = await original(account);
    if (account === "local-browser-v1") {
      const dispose = repo.dispose.bind(repo);
      repo.dispose = async () => {
        disposed++;
        await dispose();
      };
      await gate;
    }
    return repo;
  };
  const app = f.app(),
    starting = app.start();
  await app.login("person@example.test", "valid-secret");
  const account = app.context().accountId;
  release();
  await starting;
  assert.equal(app.getState().auth, "ready");
  assert.equal(app.context().accountId, account);
  assert.equal(disposed, 1);
  assert.equal(f.snapshots.has("local-browser-v1"), false);
});

test("returning to local mode invalidates a delayed login without claiming either realm", async () => {
  const f = fixture(),
    original = f.deps.identity;
  let release!: () => void, entered!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const called = new Promise<void>((resolve) => {
    entered = resolve;
  });
  f.deps.identity = (origin) => ({
    ...original(origin),
    async login(input) {
      entered();
      await gate;
      return original(origin).login(input);
    },
  });
  const app = f.app();
  await app.start();
  await app.createProject("local draft retained");
  const login = app.login("person@example.test", "valid-secret");
  await called;
  await app.enterLocalMode();
  release();
  await assert.rejects(login, /替代/);
  assert.equal(app.getState().auth, "local");
  assert.equal(
    app.getState().snapshot!.projects[0].name,
    "local draft retained",
  );
  assert.equal(f.snapshots.size, 1);
  assert.equal(await f.deps.vault("_identity").get("session"), null);
});

test("an accepted local provider result stays in its original realm across account switching and can recover there", async () => {
  const f = fixture(),
    original = f.deps.provider;
  let release!: () => void, entered!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const called = new Promise<void>((resolve) => {
    entered = resolve;
  });
  f.deps.provider = (vault) => ({
    ...original(vault),
    async generateText(input, delta, signal) {
      entered();
      await gate;
      return original(vault).generateText(input, delta, signal);
    },
  });
  const app = f.app();
  await app.start();
  await app.createProject("local paid request");
  const id = await app.saveConnection(
    {
      name: "BYOK",
      baseUrl: "https://provider.example/v1",
      protocol: "openai-compatible",
      capabilities: { text: true, image: false },
    },
    "memory-key",
  );
  const project = app.getState().snapshot!.projects[0];
  await app.saveDraft(project.id, {
    ...project.composerDraft,
    prompt: "captured local prompt",
    model: "fixture",
    providerConnectionId: id,
  });
  const submission = app.submit();
  await called;
  await app.login("person@example.test", "valid-secret");
  await app.createProject("account project");
  release();
  await submission;
  assert.equal(app.getState().snapshot!.projects[0].name, "account project");
  assert.deepEqual(app.getState().snapshot!.projects[0].tasks, []);
  await app.logout();
  assert.equal(app.getState().snapshot!.projects[0].name, "local paid request");
  const task = app.getState().snapshot!.projects[0].tasks[0];
  assert.equal(task.status, "unknown");
  await app.recoverTask(task.id);
  assert.equal(
    app.getState().snapshot!.projects[0].tasks[0].status,
    "succeeded",
  );
  assert.equal(f.calls.filter((call) => call === "text").length, 1);
});

test("a context switch while persisting submission metadata cannot start a later provider request", async () => {
  const f = fixture(),
    repository = f.deps.repository;
  let release!: () => void, entered!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const called = new Promise<void>((resolve) => {
    entered = resolve;
  });
  f.deps.repository = async (account) => {
    const repo = await repository(account);
    if (account === "local-browser-v1") {
      const persist = repo.saveExecutionReceipt.bind(repo);
      repo.saveExecutionReceipt = async (...args) => {
        entered();
        await gate;
        return persist(...args);
      };
    }
    return repo;
  };
  const app = f.app();
  await app.start();
  await app.createProject("not submitted yet");
  const id = await app.saveConnection(
    {
      name: "BYOK",
      baseUrl: "https://provider.example/v1",
      protocol: "openai-compatible",
      capabilities: { text: true, image: false },
    },
    "memory-key",
  );
  const project = app.getState().snapshot!.projects[0];
  await app.saveDraft(project.id, {
    ...project.composerDraft,
    prompt: "not sent",
    model: "fixture",
    providerConnectionId: id,
  });
  const submission = app.submit();
  await called;
  await app.login("person@example.test", "valid-secret");
  release();
  await submission;
  assert.equal(app.getState().auth, "ready");
  assert.equal(f.calls.includes("text"), false);
});

test("switching from an account to local mode blocks a pending gateway cancel before constructing a network client", async () => {
  const f = fixture(),
    app = f.app();
  await app.start();
  await app.login("person@example.test", "valid-secret");
  await app.createProject("real account job");
  const connection = await app.saveConnection(
    {
      name: "Gateway",
      baseUrl: "https://gateway.example",
      protocol: "kk-image-jobs",
      capabilities: { text: false, image: true },
    },
    "account-key",
  );
  const ctx = app.context(),
    project = ctx.snapshot.projects[0],
    now = f.deps.now();
  await app.mutate(ctx, (repo) =>
    repo.appendTask(
      project.id,
      {
        id: "gateway-task",
        idempotencyKey: "gateway-task",
        kind: "image",
        prompt: "already submitted",
        model: "fixture",
        status: "unknown",
        submissionState: "submitted",
        createdAt: now,
        updatedAt: now,
        attachments: [],
        attempt: 1,
        requestedOutputs: 1,
        completedOutputs: 0,
        privacyMode: "byok_local",
        providerConnectionId: connection,
        providerBaseUrl: "https://gateway.example",
        providerCredentialRef: ctx.snapshot.connections[0].credentialRef,
        outputs: [
          { index: 0, status: "unknown", model: "fixture", createdAt: now },
        ],
      },
      project.revision,
    ),
  );
  await app.mutate(ctx, (repo, snapshot) =>
    repo.saveExecutionReceipt(
      project.id,
      {
        taskId: "gateway-task",
        connectionId: connection,
        protocol: "kk-image-jobs",
        gatewayJobId: "existing-job",
      },
      snapshot.projects[0].revision,
    ),
  );
  const cancellation = app.requestGatewayCancel("gateway-task");
  const leave = app.enterLocalMode();
  await assert.rejects(cancellation, /会话|真实账号/);
  await leave;
  assert.equal(app.getState().auth, "local");
  assert.equal(f.calls.includes("gateway"), false);
});

test(
  "returning to local mode aborts Gateway cancellation while its real adapter awaits credentials",
  { timeout: 5000 },
  async () => {
    const f = fixture(),
      app = f.app(),
      entered = Promise.withResolvers<void>(),
      release = Promise.withResolvers<void>();
    let requests = 0;
    f.deps.gateway = (vault) =>
      createGatewayImageClient({
        credentials: {
          async read(ref) {
            entered.resolve();
            await release.promise;
            return vault.get(ref);
          },
        },
        fetch: async () => {
          requests++;
          throw new Error("Cancellation must stop before HTTP");
        },
      });
    await app.start();
    await app.login("person@example.test", "valid-secret");
    await app.createProject("account Gateway job");
    const connection = await app.saveConnection(
      {
        name: "Gateway",
        baseUrl: "https://gateway.example",
        protocol: "kk-image-jobs",
        capabilities: { text: false, image: true },
      },
      "account-key",
    );
    const ctx = app.context(),
      project = ctx.snapshot.projects[0],
      now = f.deps.now();
    await app.mutate(ctx, (repo) =>
      repo.appendTask(
        project.id,
        {
          id: "gateway-task",
          idempotencyKey: "gateway-task",
          kind: "image",
          prompt: "already submitted",
          model: "fixture",
          status: "unknown",
          submissionState: "submitted",
          createdAt: now,
          updatedAt: now,
          attachments: [],
          attempt: 1,
          requestedOutputs: 1,
          completedOutputs: 0,
          privacyMode: "byok_local",
          providerConnectionId: connection,
          providerBaseUrl: "https://gateway.example",
          providerCredentialRef: ctx.snapshot.connections[0].credentialRef,
          outputs: [
            { index: 0, status: "unknown", model: "fixture", createdAt: now },
          ],
        },
        project.revision,
      ),
    );
    await app.mutate(ctx, (repo, snapshot) =>
      repo.saveExecutionReceipt(
        project.id,
        {
          taskId: "gateway-task",
          connectionId: connection,
          protocol: "kk-image-jobs",
          gatewayJobId: "job-abcd",
        },
        snapshot.projects[0].revision,
      ),
    );
    const cancellation = app.requestGatewayCancel("gateway-task").then(
      () => undefined,
      (error: unknown) => error,
    );
    await entered.promise;
    await app.enterLocalMode();
    release.resolve();
    const error = await cancellation;
    assert.equal(requests, 0);
    assert.ok(error instanceof Error);
    assert.match(error.message, /REQUEST_ABORTED/);
    assert.equal(app.active.has("gateway-task"), false);
    assert.equal(app.getState().auth, "local");
    assert.deepEqual(app.getState().busyTaskIds, []);
    assert.deepEqual(app.getState().snapshot!.projects, []);
  },
);

test("a corrupt local row is never replaced with an empty project snapshot", async () => {
  const f = fixture();
  f.snapshots.set("local-browser-v1", "corrupt existing snapshot");
  const app = f.app();
  await app.start();
  assert.equal(app.getState().auth, "localStorageRecovery");
  assert.equal(
    f.snapshots.get("local-browser-v1"),
    "corrupt existing snapshot",
  );
  await app.reloadStorage();
  assert.equal(app.getState().auth, "localStorageRecovery");
  assert.equal(
    f.snapshots.get("local-browser-v1"),
    "corrupt existing snapshot",
  );
});

test(
  "reconciliation cannot replace a pending cancel controller across a switch to local mode",
  { timeout: 5000 },
  async () => {
    const f = fixture(),
      repository = f.deps.repository;
    const loadEntered = Promise.withResolvers<void>(),
      loadRelease = Promise.withResolvers<void>();
    const cancelEntered = Promise.withResolvers<void>(),
      cancelRelease = Promise.withResolvers<void>();
    let holdLoad = false,
      credentialReads = 0,
      requests = 0;
    f.deps.repository = async (account) => {
      const repo = await repository(account),
        load = repo.load.bind(repo);
      repo.load = async () => {
        if (holdLoad) {
          loadEntered.resolve();
          await loadRelease.promise;
        }
        return load();
      };
      return repo;
    };
    f.deps.gateway = (vault) =>
      createGatewayImageClient({
        credentials: {
          async read(ref) {
            credentialReads++;
            if (credentialReads !== 1)
              throw new Error(
                "Concurrent reconciliation replaced the cancel owner",
              );
            cancelEntered.resolve();
            await cancelRelease.promise;
            return vault.get(ref);
          },
        },
        fetch: async () => {
          requests++;
          throw new Error("Old account operation must not reach HTTP");
        },
      });
    const app = f.app();
    await app.start();
    await app.login("person@example.test", "valid-secret");
    await app.createProject("Account Gateway job");
    const connection = await app.saveConnection(
      {
        name: "Gateway",
        baseUrl: "https://gateway.example",
        protocol: "kk-image-jobs",
        capabilities: { text: false, image: true },
      },
      "account-key",
    );
    const ctx = app.context(),
      project = ctx.snapshot.projects[0],
      now = f.deps.now();
    await app.mutate(ctx, (repo) =>
      repo.appendTask(
        project.id,
        {
          id: "gateway-task",
          idempotencyKey: "gateway-task",
          kind: "image",
          prompt: "already submitted",
          model: "fixture",
          status: "unknown",
          submissionState: "submitted",
          createdAt: now,
          updatedAt: now,
          attachments: [],
          attempt: 1,
          requestedOutputs: 1,
          completedOutputs: 0,
          privacyMode: "byok_local",
          providerConnectionId: connection,
          providerBaseUrl: "https://gateway.example",
          providerCredentialRef: ctx.snapshot.connections[0].credentialRef,
          outputs: [
            { index: 0, status: "unknown", model: "fixture", createdAt: now },
          ],
        },
        project.revision,
      ),
    );
    await app.mutate(ctx, (repo, snapshot) =>
      repo.saveExecutionReceipt(
        project.id,
        {
          taskId: "gateway-task",
          connectionId: connection,
          protocol: "kk-image-jobs",
          gatewayJobId: "job-abcd",
        },
        snapshot.projects[0].revision,
      ),
    );
    holdLoad = true;
    const reconcile = app
      .reconcileTask("gateway-task")
      .catch((error: unknown) => error);
    await loadEntered.promise;
    const cancellation = app
      .requestGatewayCancel("gateway-task")
      .catch((error: unknown) => error);
    await cancelEntered.promise;
    const owner = app.active.get("gateway-task")!.controller;
    try {
      holdLoad = false;
      loadRelease.resolve();
      const error = await reconcile;
      assert.ok(error instanceof Error);
      assert.match(error.message, /任务已在执行或核对/);
      assert.equal(app.active.get("gateway-task")!.controller, owner);
      await app.enterLocalMode();
      assert.equal(owner.signal.aborted, true);
    } finally {
      cancelRelease.resolve();
      await cancellation;
    }
    assert.equal(requests, 0);
    assert.equal(credentialReads, 1);
    assert.equal(app.getState().auth, "local");
    assert.equal(app.active.has("gateway-task"), false);
  },
);
