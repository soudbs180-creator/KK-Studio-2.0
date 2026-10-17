import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { MobileRepository } from "../src/storage/repository.ts";
import { createSessionVault } from "../src/storage/sessionVault.ts";
import { createMobileApplication } from "../src/application/application.ts";
import { ServiceError } from "../src/services/httpClient.ts";
import type {
  GenerationInput,
  TextReceipt,
  ImageReceipt,
} from "../src/services/providerTypes.ts";
import type { createGatewayImageClient } from "../src/services/gatewayImageClient.ts";
import { MAX_MOBILE_TEXT_RESULT_CHARS } from "../src/core/resultLimits.ts";
import type { AuthSession, MeResponse } from "../src/services/authTypes.ts";

const png = new Uint8Array(
  readFileSync(new URL("../assets/favicon.png", import.meta.url)),
);
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
function fixture() {
  const snapshots = new Map<string, string>(),
    originals = new Map<string, Uint8Array>();
  let sequence = 0,
    now = 10_000,
    failCas = false,
    failOriginal = false,
    failRead = false,
    requests = 0;
  let text = (
    input: GenerationInput,
    _signal?: AbortSignal,
  ): Promise<TextReceipt> =>
    Promise.resolve({
      identity: {
        submissionId: input.submissionId,
        projectId: input.projectId,
        connectionId: input.connection.id,
        model: input.model,
        prompt: input.prompt,
        capturedAt: now,
      },
      submissionState: "terminal",
      text: "A real stored answer",
      finishReason: "stop",
    });
  let image = (input: GenerationInput): Promise<ImageReceipt> =>
    Promise.resolve({
      identity: {
        submissionId: input.submissionId,
        projectId: input.projectId,
        connectionId: input.connection.id,
        model: input.model,
        prompt: input.prompt,
        capturedAt: now,
      },
      submissionState: "terminal",
      originals: [
        { index: 0, bytes: png, mime: "image/png", signatureVerified: true },
      ],
      archivalState: "pending",
    });
  const backend = {
    async read(a: string) {
      if (failRead) throw new Error("Storage read failed");
      return snapshots.get(a) ?? null;
    },
    async compareAndSwap(a: string, r: number | null, p: string) {
      if (failCas) return false;
      const previous = snapshots.get(a);
      if ((previous ? JSON.parse(previous).revision : null) !== r) return false;
      snapshots.set(a, p);
      return true;
    },
  };
  const factory = async (a: string) =>
    new MobileRepository({
      accountId: a,
      backend,
      originalStore: {
        async read(a, id) {
          const bytes = originals.get(`${a}:${id}`);
          if (!bytes) throw new Error("missing");
          return bytes.slice();
        },
        async write(a, id, b) {
          if (failOriginal) throw new Error("Disk full");
          originals.set(`${a}:${id}`, b.slice());
        },
        async remove(a, id) {
          originals.delete(`${a}:${id}`);
        },
      },
      hash: async (b) => createHash("sha256").update(b).digest("hex"),
      now: () => ++now,
      id: () => `id-${++sequence}`,
    });
  const vaultScope = `workflow-${Math.random()}`;
  const app = createMobileApplication({
    identityDigest: async (value: string) =>
      createHash("sha256").update(value).digest("hex"),
    id: () => `id-${++sequence}`,
    now: () => ++now,
    repository: factory,
    vault: (a) => createSessionVault(`${vaultScope}:${a}`),
    identity: () => ({
      async login(input) {
        return {
          user: { id: input.email, email: input.email, displayName: "Person" },
          deviceId: input.deviceId,
          accessToken: "a".repeat(40),
          refreshToken: "r".repeat(40),
          accessExpiresAt: now + 100,
          refreshExpiresAt: now + 10000,
        };
      },
      async refresh(input) {
        if (input.refreshToken === "expired")
          throw new ServiceError("AUTH_REQUIRED");
        return {
          user: { id: "alice", email: "alice", displayName: "Person" },
          deviceId: input.deviceId,
          accessToken: "b".repeat(40),
          refreshToken: "r".repeat(40),
          accessExpiresAt: now + 1000,
          refreshExpiresAt: now + 10000,
        };
      },
      async me() {
        return {
          user: { id: "alice", email: "alice", displayName: "Person" },
          deviceId: app.getState().deviceId!,
        };
      },
      async logout() {
        return { revoked: true as const };
      },
    }),
    provider: () => ({
      async probeModels(c) {
        return {
          connectionId: c.id,
          models: [
            {
              id: "test-model",
              text: "unknown" as const,
              image: "unknown" as const,
            },
          ],
          health: "reachable" as const,
          generationVerified: false as const,
        };
      },
      async generateText(input, onDelta, signal) {
        requests++;
        return text(input, signal);
      },
      async generateImages(input) {
        requests++;
        return image(input);
      },
    }),
  });
  return {
    app,
    factory,
    snapshots,
    originals,
    setText(fn: typeof text) {
      text = fn;
    },
    setImage(fn: typeof image) {
      image = fn;
    },
    failCas(value: boolean) {
      failCas = value;
    },
    failOriginal(value: boolean) {
      failOriginal = value;
    },
    failRead(value: boolean) {
      failRead = value;
    },
    get requests() {
      return requests;
    },
    advance() {
      now += 1000;
    },
  };
}
async function ready(
  f: ReturnType<typeof fixture>,
  kind: "text" | "image" = "text",
) {
  await f.app.start();
  await f.app.login("alice", "password", "https://identity.example");
  await f.app.createProject("First");
  await f.app.saveConnection(
    {
      name: "Mine",
      baseUrl: "https://provider.example/v1",
      protocol: "openai-compatible",
      capabilities: { text: true, image: true, maxOutputs: 1 },
    },
    "secret",
  );
  const state = f.app.getState(),
    project = state.snapshot!.projects[0];
  await f.app.saveDraft(project.id, {
    ...project.composerDraft,
    prompt: "Please create",
    model: "test-model",
    kind,
    providerConnectionId: state.snapshot!.connections[0].id,
  });
  return project.id;
}

test("R1 separate identity realms with colliding user ids isolate data and keys", async () => {
  const f = fixture();
  await ready(f);
  const oldConnection = f.app.getState().snapshot!.connections[0];
  await f.app.logout();
  await f.app.login(
    "alice",
    "another-password",
    "https://different-realm.example",
  );
  assert.equal(
    f.app.getState().snapshot!.projects.length,
    0,
    "same server-local user id in another identity origin must not open original projects",
  );
  assert.equal(
    await f.app.context().vault.get(oldConnection.credentialRef!),
    null,
    "other realm must not read provider key",
  );
});

test("R2 attaching a material preserves the memory draft after failed save", async () => {
  const f = fixture(),
    id = await ready(f),
    ctx = f.app.context();
  const asset = await ctx.repo.storeOriginal({
    bytes: png,
    mime: "image/png",
    name: "reference.png",
    provenance: { source: "import", projectId: id },
  });
  await f.app.reloadStorage();
  f.failCas(true);
  await assert.rejects(
    f.app.saveDraft(id, {
      ...ctx.snapshot.projects[0].composerDraft,
      prompt: "Retained unsaved private input",
    }),
    /conflict/,
  );
  f.failCas(false);
  await f.app.reloadStorage();
  assert.equal(f.app.getDraft(id).prompt, "Retained unsaved private input");
  // MaterialDetailScreen.attach: read, attachMaterial, then copy durable current.composerDraft.
  await ctx.repo.readOriginal(asset.id);
  await f.app.mutate(ctx, (repo, s) =>
    repo.attachMaterial(id, asset.id, s.projects[0].revision),
  );
  const current = ctx.snapshot.projects[0];
  await assert.rejects(
    f.app.saveDraft(
      id,
      {
        ...current.composerDraft,
        attachments: [
          {
            id: f.app.deps.id(),
            assetId: asset.id,
            name: asset.name,
            mime: asset.mime,
            size: asset.size,
          },
        ],
      },
      false,
      ctx.accountId,
    ),
    /保留草稿/,
  );
  assert.equal(
    f.app.getDraft(id).prompt,
    "Retained unsaved private input",
    "blocked attachment must not replace the retained newer input with durable older prompt",
  );
});

test("R3 startup refresh cannot undo logout while identity request is pending", async () => {
  const f = fixture();
  await ready(f);
  const refresh = deferred<AuthSession>(),
    original = f.app.deps.identity;
  f.app.deps.identity = (origin) => ({
    ...original(origin),
    refresh: () => refresh.promise,
  });
  const restart = createMobileApplication(f.app.deps);
  const pending = restart.start();
  await new Promise((r) => setTimeout(r, 0));
  await restart.logout();
  refresh.resolve({
    user: { id: "alice", email: "alice", displayName: "Person" },
    deviceId: restart.getState().deviceId!,
    accessToken: "a".repeat(40),
    refreshToken: "r".repeat(40),
    accessExpiresAt: 100000,
    refreshExpiresAt: 200000,
  });
  await pending;
  assert.equal(
    restart.getState().auth,
    "signedOut",
    "startup epoch must be captured before awaited refresh and me calls",
  );
  assert.equal(await restart.deps.vault("_identity").get("session"), null);
});
test("R1b colliding identity realms cannot read captured provider credentials", async () => {
  const f = fixture();
  await ready(f);
  const ref = f.app.getState().snapshot!.connections[0].credentialRef!;
  await f.app.logout();
  await f.app.login("alice", "pw", "https://other-realm.example");
  assert.equal(await f.app.context().vault.get(ref), null);
});

test("R4 protocol-valid large text remains archivable and recoverable", async () => {
  const f = fixture();
  await ready(f);
  const { createProviderClient } =
    await import("../src/services/providerClient.ts");
  const response =
    Array.from(
      { length: 4 },
      () =>
        `data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: "a".repeat(50000) }, finish_reason: null }] })}\n\n`,
    ).join("") +
    `data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: "a" }, finish_reason: null }] })}\n\n` +
    `data: ${JSON.stringify({ choices: [{ index: 0, delta: {}, finish_reason: "stop" }] })}\n\ndata: [DONE]\n\n`;
  const client = createProviderClient({
    credentials: { read: async () => "fixture-secret" },
    fetch: async () =>
      new Response(response, {
        headers: { "content-type": "text/event-stream" },
      }),
  });
  f.setText((input, signal) => client.generateText(input, () => {}, signal));
  await f.app.submit();
  const task = f.app.getState().snapshot!.projects[0].tasks[0];
  assert.equal(task.status, "succeeded");
  assert.equal(task.outputs?.[0].text, "a".repeat(200001));
  await f.app.reloadStorage();
  assert.equal(
    f.app
      .getState()
      .snapshot!.projects[0].messages.find((m) => m.role === "assistant")!.text,
    "a".repeat(200001),
  );
  assert.equal(f.requests, 1);
});

test("R5 valid identity plus corrupt local snapshot exposes a storage recovery action", async () => {
  const f = fixture();
  await ready(f);
  const scope = f.app.context().accountId;
  await f.app.logout();
  const before = f.snapshots.get(scope)!;
  f.snapshots.set(scope, "{corrupt");
  await assert.rejects(f.app.login("alice", "pw", "https://identity.example"));
  assert.equal(
    f.snapshots.get(scope),
    "{corrupt",
    "corrupt snapshot was correctly left untouched",
  );
  // Repair the backend fixture, then recover through the authenticated read action.
  f.snapshots.set(scope, before);
  assert.equal(f.app.getState().auth, "storageRecovery");
  assert.ok(f.app.getState().storageError);
  await f.app.reloadStorage();
  assert.equal(f.app.getState().auth, "ready");
  assert.equal(f.app.getState().snapshot!.projects.length, 1);
  assert.equal(f.app.getState().storageError, undefined);
});

test("R1 canonical identity origin retains original bytes, credentials and public user id", async () => {
  const f = fixture(),
    id = await ready(f),
    ctx = f.app.context();
  const asset = await ctx.repo.storeOriginal({
    bytes: png,
    mime: "image/png",
    name: "original.png",
    provenance: { source: "import", projectId: id },
  });
  const ref = ctx.snapshot.connections[0].credentialRef!,
    scope = ctx.accountId;
  await f.app.logout();
  await f.app.login("alice", "pw", "HTTPS://IDENTITY.EXAMPLE:443/");
  assert.equal(f.app.context().accountId, scope);
  assert.equal(f.app.getState().user!.id, "alice");
  assert.equal(await f.app.context().vault.get(ref), "secret");
  assert.deepEqual(await f.app.context().repo.readOriginal(asset.id), png);
  await f.app.logout();
  await f.app.login("alice", "pw", "https://other.example");
  await assert.rejects(f.app.context().repo.readOriginal(asset.id));
  assert.equal(f.app.getState().unsavedDraftProjectIds.length, 0);
});

test("R1 legacy user-id namespaces require explicit new isolation and remain unchanged", async () => {
  const f = fixture();
  await ready(f);
  const legacy = await f.factory("alice");
  await legacy.initialize();
  await legacy.create("Preserved legacy data");
  await f.app.deps.vault("alice").set("legacy-key", "legacy-secret");
  const before = f.snapshots.get("alice");
  await f.app.deps.vault("_identity").remove("namespace-version");
  const restart = createMobileApplication(f.app.deps);
  await restart.start();
  assert.equal(restart.getState().auth, "storageRecovery");
  assert.equal(restart.getState().legacyStorageGate, true);
  await assert.rejects(restart.createProject("must not create"));
  await assert.rejects(restart.reloadStorage(), /隔离存储/);
  assert.equal(f.snapshots.get("alice"), before);
  await restart.enableIsolatedStorage();
  assert.equal(restart.getState().auth, "ready");
  assert.equal(restart.getState().snapshot!.projects[0].name, "First");
  assert.equal(await restart.context().vault.get("legacy-key"), null);
  assert.equal(
    await f.app.deps.vault("alice").get("legacy-key"),
    "legacy-secret",
  );
  assert.equal(f.snapshots.get("alice"), before);
});

test("R2 material action guards recovery before attaching and preserves newer editor input", async () => {
  const f = fixture(),
    id = await ready(f),
    ctx = f.app.context();
  const asset = await ctx.repo.storeOriginal({
    bytes: png,
    mime: "image/png",
    name: "reference.png",
    provenance: { source: "import", projectId: id },
  });
  await f.app.reloadStorage();
  f.failCas(true);
  await assert.rejects(
    f.app.saveDraft(id, {
      ...f.app.getDraft(id),
      prompt: "Retained newer",
      model: "chosen-new-model",
    }),
  );
  f.failCas(false);
  await f.app.reloadStorage();
  const revision = f.app.getState().snapshot!.revision;
  await assert.rejects(f.app.attachMaterialToDraft(asset.id), /保留草稿/);
  assert.equal(f.app.getState().snapshot!.revision, revision);
  assert.deepEqual(f.app.getDraft(id).attachments, []);
  assert.equal(f.app.getDraft(id).model, "chosen-new-model");
  await assert.rejects(
    f.app.saveDraft(
      id,
      { ...f.app.getDraft(id), prompt: "Editor keeps improving" },
      false,
      ctx.accountId,
      true,
    ),
    /保留草稿/,
  );
  assert.equal(f.app.getDraft(id).prompt, "Editor keeps improving");
  await f.app.saveDraft(id, f.app.getDraft(id), true, ctx.accountId);
  assert.equal(
    f.app.getState().snapshot!.projects[0].composerDraft.prompt,
    "Editor keeps improving",
  );
});

test("R3 stale startup failure cannot clear a replacement realm login", async () => {
  const f = fixture();
  await ready(f);
  let reject!: (reason: unknown) => void;
  const stalled = new Promise<AuthSession>((_resolve, failure) => {
    reject = failure;
  });
  const original = f.app.deps.identity;
  f.app.deps.identity = (origin) => ({
    ...original(origin),
    refresh: () => stalled,
  });
  const restart = createMobileApplication(f.app.deps);
  const pending = restart.start();
  await new Promise((r) => setTimeout(r, 0));
  await restart.logout();
  await restart.login("alice", "pw", "https://replacement.example");
  const replacement = restart.getState().accountId;
  reject(new Error("old startup failed"));
  await pending;
  assert.equal(restart.getState().auth, "ready");
  assert.equal(restart.getState().accountId, replacement);
  assert.equal(
    await restart.deps.vault("_identity").get("identity-origin"),
    "https://replacement.example",
  );
});

function protocolTextClient(text: string) {
  const events: string[] = [];
  for (let offset = 0; offset < text.length; offset += 10000)
    events.push(
      `data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: text.slice(offset, offset + 10000) }, finish_reason: null }] })}\n\n`,
    );
  events.push(
    `data: ${JSON.stringify({ choices: [{ index: 0, delta: {}, finish_reason: "stop" }] })}\n\ndata: [DONE]\n\n`,
  );
  return events.join("").replaceAll("\\n", "\n");
}

test("R4 complete accepted boundary and Unicode text survive archive failure recovery and reload once", async () => {
  const { createProviderClient } =
    await import("../src/services/providerClient.ts");
  for (const text of [
    "a".repeat(200000),
    "a".repeat(200001),
    "a".repeat(MAX_MOBILE_TEXT_RESULT_CHARS),
    "中".repeat(200001),
  ]) {
    const f = fixture();
    await ready(f);
    const client = createProviderClient({
      credentials: { read: async () => "fixture-secret" },
      fetch: async () =>
        new Response(protocolTextClient(text), {
          headers: { "content-type": "text/event-stream" },
        }),
    });
    f.setText(async (input, signal) => {
      const receipt = await client.generateText(input, () => {}, signal);
      f.failCas(true);
      return receipt;
    });
    await f.app.submit();
    const task = f.app.getState().snapshot!.projects[0].tasks[0];
    assert.ok(f.app.getState().recoverableTaskIds.includes(task.id));
    f.failCas(false);
    await f.app.reloadStorage();
    await f.app.recoverTask(task.id);
    await f.app.reloadStorage();
    const project = f.app.getState().snapshot!.projects[0];
    assert.equal(project.tasks[0].status, "succeeded");
    assert.equal(project.tasks[0].outputs![0].text, text);
    assert.equal(
      project.messages.find((m) => m.role === "assistant")!.text,
      text,
    );
    assert.equal(f.requests, 1);
  }
});

test("R5 read failure and first-use CAS failure preserve valid identity and retry without login", async () => {
  for (const failure of ["read", "cas"] as const) {
    const f = fixture();
    await f.app.start();
    if (failure === "read") f.failRead(true);
    else f.failCas(true);
    await assert.rejects(
      f.app.login("alice", "pw", "https://identity.example"),
    );
    assert.equal(f.app.getState().auth, "storageRecovery");
    assert.equal(f.app.getState().user!.id, "alice");
    assert.ok(await f.app.deps.vault("_identity").get("session"));
    await assert.rejects(f.app.createProject("blocked"));
    assert.equal(f.requests, 0);
    f.failRead(false);
    f.failCas(false);
    await f.app.reloadStorage();
    assert.equal(f.app.getState().auth, "ready");
    assert.equal(f.app.getState().snapshot!.projects.length, 0);
  }
});

test("R1 late image receipt and retained draft stay bound to the captured identity realm", async () => {
  const f = fixture(),
    projectId = await ready(f, "image"),
    oldScope = f.app.context().accountId;
  const delivered = deferred<ImageReceipt>();
  f.setImage(() => delivered.promise);
  const pending = f.app.submit();
  await new Promise((r) => setTimeout(r, 0));
  const task = f.app.getState().snapshot!.projects[0].tasks[0];
  f.failCas(true);
  await assert.rejects(
    f.app.saveDraft(projectId, {
      ...f.app.getDraft(projectId),
      prompt: "Only original realm may recover this input",
    }),
  );
  f.failCas(false);
  await f.app.logout();
  await f.app.login("alice", "pw", "https://other.example");
  delivered.resolve({
    identity: {
      submissionId: task.idempotencyKey,
      projectId,
      connectionId: task.providerConnectionId!,
      model: task.model,
      prompt: task.prompt,
      capturedAt: 1,
    },
    submissionState: "terminal",
    originals: [
      { index: 0, bytes: png, mime: "image/png", signatureVerified: true },
    ],
    archivalState: "pending",
  });
  await pending;
  assert.notEqual(f.app.context().accountId, oldScope);
  assert.equal(f.app.getState().snapshot!.assets.length, 0);
  assert.equal(f.app.getState().recoverableTaskIds.length, 0);
  assert.equal(f.app.getState().unsavedDraftProjectIds.length, 0);
  await assert.rejects(f.app.recoverTask(task.id), /账号|会话|没有可恢复/);
  await f.app.logout();
  await f.app.login("alice", "pw", "https://identity.example/");
  assert.equal(
    f.app.getDraft(projectId).prompt,
    "Only original realm may recover this input",
  );
  await f.app.recoverTask(task.id);
  const stored = f.app.getState().snapshot!.projects[0].tasks[0];
  assert.equal(stored.status, "succeeded");
  assert.deepEqual(
    await f.app.context().repo.readOriginal(stored.outputs![0].assetId!),
    png,
  );
  assert.equal(f.requests, 1);
});

test("R3 startup me and repository initialization cannot publish or persist after logout", async () => {
  for (const phase of ["me", "initialize"] as const) {
    const f = fixture();
    await ready(f);
    const entered = deferred<void>(),
      release = deferred<void>();
    const originalIdentity = f.app.deps.identity,
      originalRepository = f.app.deps.repository;
    if (phase === "me")
      f.app.deps.identity = (origin) => ({
        ...originalIdentity(origin),
        me: async () => {
          entered.resolve();
          await release.promise;
          return {
            user: { id: "alice", email: "alice", displayName: "Person" },
            deviceId: f.app.getState().deviceId!,
          };
        },
      });
    else
      f.app.deps.repository = async (scope) => {
        const repo = await originalRepository(scope),
          initialize = repo.initialize.bind(repo);
        repo.initialize = async () => {
          entered.resolve();
          await release.promise;
          return initialize();
        };
        return repo;
      };
    const restart = createMobileApplication(f.app.deps),
      pending = restart.start();
    await entered.promise;
    await restart.logout();
    release.resolve();
    await pending;
    assert.equal(restart.getState().auth, "signedOut");
    assert.equal(restart.getState().snapshot, null);
    assert.equal(restart.getState().accountId, undefined);
    assert.equal(await restart.deps.vault("_identity").get("session"), null);
  }
});

test("R3 stale initialization failure leaves the replacement identity and its vault session intact", async () => {
  const f = fixture();
  await ready(f);
  const oldScope = f.app.context().accountId,
    entered = deferred<void>(),
    release = deferred<void>(),
    original = f.app.deps.repository;
  f.app.deps.repository = async (scope) => {
    const repo = await original(scope);
    if (scope === oldScope)
      repo.initialize = async () => {
        entered.resolve();
        await release.promise;
        throw new Error("old namespace disk error");
      };
    return repo;
  };
  const restart = createMobileApplication(f.app.deps),
    pending = restart.start();
  await entered.promise;
  await restart.logout();
  await restart.login("alice", "pw", "https://new.example");
  const scope = restart.getState().accountId;
  release.resolve();
  await pending;
  assert.equal(restart.getState().auth, "ready");
  assert.equal(restart.getState().accountId, scope);
  assert.equal(restart.getState().storageError, undefined);
  assert.equal(
    await restart.deps.vault("_identity").get("identity-origin"),
    "https://new.example",
  );
  assert.ok(await restart.deps.vault("_identity").get("session"));
});
