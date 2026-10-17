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
    identityDigest: async (value) =>
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

test("duplicate taps create one durable intent and one answer", async () => {
  const f = fixture(),
    id = await ready(f),
    wait = deferred<TextReceipt>();
  f.setText((input) => wait.promise);
  const first = f.app.submit();
  await assert.rejects(f.app.submit(), /already|进行中/i);
  await new Promise((r) => setTimeout(r, 0));
  const task = f.app.getState().snapshot!.projects[0].tasks[0];
  wait.resolve({
    identity: {
      submissionId: task.idempotencyKey,
      projectId: id,
      connectionId: task.providerConnectionId!,
      model: task.model,
      prompt: task.prompt,
      capturedAt: 1,
    },
    submissionState: "terminal",
    text: "kept once",
    finishReason: "stop",
  });
  await first;
  const stored = await (
    await f.factory(
      `realm-v1-${createHash("sha256")
        .update(JSON.stringify(["https://identity.example", "alice"]))
        .digest("hex")}`,
    )
  ).load();
  assert.equal(stored.projects[0].tasks.length, 1);
  assert.equal(stored.projects[0].tasks[0].status, "succeeded");
  assert.equal(
    stored.projects[0].messages.filter((m) => m.role === "assistant").length,
    1,
  );
  assert.equal(f.requests, 1);
});
test("late completion archives into captured project after navigation", async () => {
  const f = fixture(),
    firstId = await ready(f),
    wait = deferred<TextReceipt>();
  f.setText(() => wait.promise);
  const pending = f.app.submit();
  await new Promise((r) => setTimeout(r, 0));
  const task = f.app.getState().snapshot!.projects[0].tasks[0];
  await f.app.createProject("Second");
  wait.resolve({
    identity: {
      submissionId: task.idempotencyKey,
      projectId: firstId,
      connectionId: task.providerConnectionId!,
      model: task.model,
      prompt: task.prompt,
      capturedAt: 1,
    },
    submissionState: "terminal",
    text: "belongs to first",
    finishReason: "stop",
  });
  await pending;
  const s = f.app.getState().snapshot!;
  assert.equal(s.activeProjectId, s.projects[1].id);
  assert.equal(s.projects[1].messages.length, 0);
  assert.equal(s.projects[0].tasks[0].outputs![0].text, "belongs to first");
});
test("timeout after acceptance remains unknown and cannot retry", async () => {
  const f = fixture();
  await ready(f);
  f.setText(async () => {
    throw new ServiceError("REQUEST_TIMEOUT", "unknown");
  });
  await f.app.submit();
  const t = f.app.getState().snapshot!.projects[0].tasks[0];
  assert.equal(t.status, "unknown");
  assert.equal(t.submissionState, "unknown");
  await assert.rejects(f.app.retryTask(t.id), /retry|重试|核对/i);
  assert.equal(f.requests, 1);
});
test("cancelling an accepted stream never claims confirmed cancellation", async () => {
  const f = fixture();
  await ready(f);
  f.setText(async () => {
    throw new ServiceError("REQUEST_ABORTED", "unknown");
  });
  await f.app.submit();
  const t = f.app.getState().snapshot!.projects[0].tasks[0];
  assert.equal(t.status, "unknown");
  assert.notEqual(t.status, "cancelled");
});
test("archive failure keeps original bytes for recovery without another paid request", async () => {
  const f = fixture();
  await ready(f, "image");
  f.failOriginal(true);
  await f.app.submit();
  const task = f.app.getState().snapshot!.projects[0].tasks[0];
  assert.notEqual(task.status, "succeeded");
  assert.ok(f.app.getState().recoverableTaskIds.includes(task.id));
  assert.equal(f.requests, 1);
  f.failOriginal(false);
  await f.app.recoverTask(task.id);
  const stored = await (
    await f.factory(
      `realm-v1-${createHash("sha256")
        .update(JSON.stringify(["https://identity.example", "alice"]))
        .digest("hex")}`,
    )
  ).load();
  const t = stored.projects[0].tasks[0];
  assert.equal(t.status, "succeeded");
  assert.equal(t.completedOutputs, 1);
  assert.deepEqual(
    await (
      await f.factory(
        `realm-v1-${createHash("sha256")
          .update(JSON.stringify(["https://identity.example", "alice"]))
          .digest("hex")}`,
      )
    )
      .initialize()
      .then(async () => {
        const r = await f.factory(
          `realm-v1-${createHash("sha256")
            .update(JSON.stringify(["https://identity.example", "alice"]))
            .digest("hex")}`,
        );
        await r.load();
        return r.readOriginal(t.outputs![0].assetId!);
      }),
    png,
  );
  assert.equal(f.requests, 1);
});
test("storage CAS rejection stops provider submission and preserves prompt", async () => {
  const f = fixture();
  await ready(f);
  f.failCas(true);
  await assert.rejects(f.app.submit(), /conflict/i);
  assert.equal(f.requests, 0);
  f.failCas(false);
  const durable = await (
    await f.factory(
      `realm-v1-${createHash("sha256")
        .update(JSON.stringify(["https://identity.example", "alice"]))
        .digest("hex")}`,
    )
  ).load();
  assert.equal(durable.projects[0].composerDraft.prompt, "Please create");
});
test("logout freezes late response and a different account cannot see original project", async () => {
  const f = fixture(),
    id = await ready(f),
    wait = deferred<TextReceipt>();
  f.setText(() => wait.promise);
  const pending = f.app.submit();
  await new Promise((r) => setTimeout(r, 0));
  const task = f.app.getState().snapshot!.projects[0].tasks[0];
  await f.app.logout();
  await f.app.login("bob", "pw", "https://identity.example");
  wait.resolve({
    identity: {
      submissionId: task.idempotencyKey,
      projectId: id,
      connectionId: task.providerConnectionId!,
      model: task.model,
      prompt: task.prompt,
      capturedAt: 1,
    },
    submissionState: "terminal",
    text: "private Alice result",
    finishReason: "stop",
  });
  await pending;
  assert.equal(f.app.getState().user!.id, "bob");
  assert.equal(f.app.getState().snapshot!.projects.length, 0);
  assert.notEqual(
    (
      await (
        await f.factory(
          `realm-v1-${createHash("sha256")
            .update(JSON.stringify(["https://identity.example", "alice"]))
            .digest("hex")}`,
        )
      ).load()
    ).projects[0].tasks[0].status,
    "succeeded",
  );
});
test("refresh with changed account is rejected and draft remains durable", async () => {
  const f = fixture();
  await ready(f);
  await f.app.logout();
  await f.app.login("bob", "pw", "https://identity.example");
  await f.app.createProject("Bob");
  const p = f.app.getState().snapshot!.projects[0];
  await f.app.saveDraft(p.id, { ...p.composerDraft, prompt: "Keep Bob draft" });
  f.advance();
  await assert.rejects(f.app.refreshSession(), /identity|账号|会话/i);
  assert.equal(f.app.getState().auth, "expired");
  assert.equal(
    (
      await (
        await f.factory(
          `realm-v1-${createHash("sha256")
            .update(JSON.stringify(["https://identity.example", "bob"]))
            .digest("hex")}`,
        )
      ).load()
    ).projects[0].composerDraft.prompt,
    "Keep Bob draft",
  );
});
test("accepted queued Gateway receipt survives reload and reconciliation never resubmits", async () => {
  const f = fixture(),
    id = await ready(f, "image");
  let submits = 0;
  const connection = f.app.getState().snapshot!.connections[0];
  await f.app.saveConnection(
    {
      id: connection.id,
      name: "Gateway",
      baseUrl: connection.baseUrl,
      protocol: "kk-image-jobs",
      capabilities: { text: false, image: true, maxOutputs: 1 },
    },
    "gateway-key",
  );
  const job = {
    id: "job-aaaa-bbbb",
    status: "queued",
    requestedOutputs: 1,
    completedOutputs: 0,
    outputs: [{ index: 0, status: "queued" }],
  };
  const gateway: ReturnType<typeof createGatewayImageClient> = {
    async submitImageJob(input) {
      submits++;
      return {
        identity: {
          submissionId: input.submissionId,
          projectId: input.projectId,
          connectionId: input.connection.id,
          model: input.model,
          prompt: input.prompt,
          capturedAt: 1,
        },
        job,
        submissionState: "submitted",
      };
    },
    async getImageJob() {
      return {
        ...job,
        status: "succeeded",
        completedOutputs: 1,
        outputs: [
          {
            index: 0,
            status: "succeeded",
            assetId: `asset-${"a".repeat(64)}`,
            assetRoute: `/v1/assets/asset-${"a".repeat(64)}`,
          },
        ],
      };
    },
    async cancelImageJob() {
      return {
        job,
        cancelRequested: true,
        providerCancellationConfirmed: false,
      };
    },
    async downloadOriginal(c, o) {
      return {
        index: o.index,
        bytes: png,
        mime: "image/png",
        signatureVerified: true,
      };
    },
  };
  f.app.deps.gateway = () => gateway;
  await f.app.submit();
  let s = await (
    await f.factory(
      `realm-v1-${createHash("sha256")
        .update(JSON.stringify(["https://identity.example", "alice"]))
        .digest("hex")}`,
    )
  ).load();
  const t = s.projects[0].tasks[0];
  assert.equal(
    s.projects[0].executionReceipts![0].gatewayJobId,
    "job-aaaa-bbbb",
  );
  assert.notEqual(t.status, "succeeded");
  await f.app.reconcileTask(t.id);
  s = await (
    await f.factory(
      `realm-v1-${createHash("sha256")
        .update(JSON.stringify(["https://identity.example", "alice"]))
        .digest("hex")}`,
    )
  ).load();
  assert.equal(s.projects[0].id, id);
  assert.equal(s.projects[0].tasks[0].status, "succeeded");
  assert.equal(submits, 1);
});
test("unknown draft cannot bypass retry safety by pressing generate again", async () => {
  const f = fixture();
  await ready(f);
  f.setText(async () => {
    throw new ServiceError("REQUEST_TIMEOUT", "unknown");
  });
  await f.app.submit();
  await assert.rejects(f.app.submit(), /核对|受理/);
  assert.equal(f.requests, 1);
});
test("submission freezes input before refresh and preserves newer edits", async () => {
  const f = fixture(),
    id = await ready(f),
    refresh = deferred<AuthSession>(),
    original = f.app.deps.identity;
  f.app.deps.identity = (origin) => ({
    ...original(origin),
    refresh: () => refresh.promise,
  });
  const pending = f.app.submit();
  const p = f.app.getState().snapshot!.projects[0];
  await f.app.saveDraft(id, {
    ...p.composerDraft,
    prompt: "Newer unsent input",
    model: "other-model",
  });
  refresh.resolve({
    user: { id: "alice", email: "alice", displayName: "Person" },
    deviceId: f.app.getState().deviceId!,
    accessToken: "a".repeat(40),
    refreshToken: "r".repeat(40),
    accessExpiresAt: 100000,
    refreshExpiresAt: 200000,
  });
  await pending;
  const stored = f.app.getState().snapshot!.projects[0];
  assert.equal(stored.tasks[0].prompt, "Please create");
  assert.equal(stored.tasks[0].model, "test-model");
  assert.equal(stored.composerDraft.prompt, "Newer unsent input");
});
test("logout while session verification is pending cannot re-persist a token", async () => {
  const f = fixture();
  await ready(f);
  const me = deferred<MeResponse>(),
    original = f.app.deps.identity;
  f.app.deps.identity = (origin) => ({
    ...original(origin),
    me: () => me.promise,
  });
  const pending = f.app.refreshSession();
  await new Promise((r) => setTimeout(r, 0));
  await f.app.logout();
  me.resolve({
    user: { id: "alice", email: "alice", displayName: "Person" },
    deviceId: f.app.getState().deviceId!,
  });
  await assert.rejects(pending, /会话|identity/);
  assert.equal(f.app.getState().auth, "signedOut");
  assert.equal(await f.app.deps.vault("_identity").get("session"), null);
});
test("failed draft write retains user input after leaving and reopening the project", async () => {
  const f = fixture(),
    id = await ready(f),
    p = f.app.getState().snapshot!.projects[0];
  f.failCas(true);
  await assert.rejects(
    f.app.saveDraft(id, {
      ...p.composerDraft,
      prompt: "Recover this unsaved input",
    }),
    /conflict/,
  );
  f.failCas(false);
  await f.app.reloadStorage();
  await f.app.createProject("Other");
  await f.app.openProject(id);
  assert.equal(f.app.getDraft(id).prompt, "Recover this unsaved input");
  assert.equal(
    f.app.getState().snapshot!.projects[0].composerDraft.prompt,
    "Please create",
  );
});
test("safe output retry preserves the successful slot and resolves the original partial task", async () => {
  const f = fixture(),
    id = await ready(f, "image"),
    ctx = f.app.context(),
    connection = ctx.snapshot.connections[0];
  const asset = await ctx.repo.storeOriginal({
    bytes: png,
    mime: "image/png",
    name: "accepted.png",
    provenance: { source: "provider", projectId: id, taskId: "parent" },
  });
  await f.app.reloadStorage();
  const successful = {
    index: 0,
    status: "succeeded" as const,
    assetId: asset.id,
    model: "test-model",
    createdAt: 1,
  };
  await f.app.mutate(ctx, (r, s) =>
    r.appendTask(
      id,
      {
        id: "parent",
        idempotencyKey: "parent-key",
        prompt: "original request",
        model: "test-model",
        kind: "image",
        status: "partial",
        submissionState: "terminal",
        requestedOutputs: 2,
        completedOutputs: 1,
        createdAt: 1,
        updatedAt: 1,
        attempt: 1,
        privacyMode: "byok_local",
        attachments: [],
        providerConnectionId: connection.id,
        providerCredentialRef: connection.credentialRef,
        providerBaseUrl: connection.baseUrl,
        outputs: [
          successful,
          { index: 1, status: "failed", model: "test-model", createdAt: 1 },
        ],
      },
      s.projects.find((p) => p.id === id)!.revision,
    ),
  );
  await f.app.retryTask("parent");
  const tasks = f.app.getState().snapshot!.projects[0].tasks;
  assert.deepEqual(tasks[0].outputs![0], successful);
  assert.equal(tasks[0].status, "succeeded");
  assert.equal(tasks[0].completedOutputs, 2);
  assert.deepEqual(tasks[1].retryOutputIndices, [1]);
  assert.equal(tasks[1].requestedOutputs, 1);
  assert.equal(f.requests, 1);
  await f.app.deleteProject(id);
  assert.equal(f.app.getState().snapshot!.projects.length, 0);
});
test("stop sends the actual abort signal while leaving acceptance unknown", async () => {
  const f = fixture();
  await ready(f);
  f.setText(
    (_input, signal) =>
      new Promise((_resolve, reject) =>
        signal!.addEventListener(
          "abort",
          () => reject(new ServiceError("REQUEST_ABORTED", "unknown")),
          { once: true },
        ),
      ),
  );
  const pending = f.app.submit();
  await new Promise((r) => setTimeout(r, 0));
  const id = f.app.getState().busyTaskIds[0];
  assert.ok(id);
  f.app.cancelTask(id);
  await pending;
  const task = f.app.getState().snapshot!.projects[0].tasks[0];
  assert.equal(task.status, "unknown");
  assert.equal(task.outputs![0].status, "unknown");
  assert.equal(f.requests, 1);
});
test("rotating a connection key keeps the captured credential reference of a running task", async () => {
  const f = fixture();
  await ready(f);
  const wait = deferred<void>();
  f.setText(async (input) => {
    await wait.promise;
    const secret = await f.app
      .context()
      .vault.get(input.connection.credentialRef);
    return {
      identity: {
        submissionId: input.submissionId,
        projectId: input.projectId,
        connectionId: input.connection.id,
        model: input.model,
        prompt: input.prompt,
        capturedAt: 1,
      },
      submissionState: "terminal",
      text:
        secret === "secret"
          ? "Captured credential retained"
          : "Wrong credential",
      finishReason: "stop",
    };
  });
  const pending = f.app.submit();
  await new Promise((r) => setTimeout(r, 0));
  const c = f.app.getState().snapshot!.connections[0],
    oldRef = c.credentialRef;
  await f.app.saveConnection(
    {
      id: c.id,
      name: c.name,
      baseUrl: c.baseUrl,
      protocol: "openai-compatible",
      capabilities: { text: true, image: true, maxOutputs: 1 },
    },
    "rotated-key",
  );
  wait.resolve();
  await pending;
  assert.equal(
    f.app.getState().snapshot!.projects[0].tasks[0].outputs![0].text,
    "Captured credential retained",
  );
  assert.notEqual(
    f.app.getState().snapshot!.connections[0].credentialRef,
    oldRef,
  );
});
test("production connection setup rejects loopback HTTP and development still rejects external HTTP", async () => {
  const f = fixture();
  await ready(f);
  const count = f.app.getState().snapshot!.connections.length;
  await assert.rejects(
    f.app.saveConnection(
      {
        name: "Unsafe",
        baseUrl: "http://127.0.0.1:47830/v1",
        protocol: "openai-compatible",
        capabilities: { text: true, image: false },
      },
      "test-key",
    ),
    /HTTPS_REQUIRED/,
  );
  f.app.deps.allowLoopbackHttp = true;
  await assert.rejects(
    f.app.saveConnection(
      {
        name: "Unsafe",
        baseUrl: "http://provider.example/v1",
        protocol: "openai-compatible",
        capabilities: { text: true, image: false },
      },
      "test-key",
    ),
    /HTTPS_REQUIRED/,
  );
  assert.equal(f.app.getState().snapshot!.connections.length, count);
  assert.equal(f.requests, 0);
});
