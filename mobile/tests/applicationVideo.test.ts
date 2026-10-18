import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { MobileRepository } from "../src/storage/repository.ts";
import { createMobileApplication } from "../src/application/application.ts";
import { createTwelveAiVideoClient } from "../src/services/twelveAiVideoClient.ts";
import { validateSnapshot } from "../src/storage/validation.ts";
import { videoBytes, videoJson } from "./videoFixture.ts";

function fixture(timeoutMs = 500) {
  const snapshots = new Map<string, string>(),
    originals = new Map<string, Uint8Array>();
  const keys = new Map<string, string>();
  let sequence = 0,
    clock = 1000,
    posts = 0,
    gets = 0,
    failReceipt = false,
    failOriginal = false,
    failReceiptReadback = false,
    readbackArmed = false,
    submitNetwork = false;
  let holdPost = false,
    postResponse!: (response: Response) => void;
  let queried!: () => void;
  const firstQuery = new Promise<void>((resolve) => {
    queried = resolve;
  });
  const authorization: (string | null)[] = [];
  let result: "queued" | "completed" | "failed" | "network" = "completed";
  const vault = {
    async get(ref: string) {
      return keys.get(ref) ?? null;
    },
    async set(ref: string, key: string) {
      keys.set(ref, key);
    },
    async remove(ref: string) {
      keys.delete(ref);
    },
  };
  const factory = async (accountId: string) =>
    new MobileRepository({
      accountId,
      id: () => `id-${++sequence}`,
      now: () => ++clock,
      hash: async (bytes) => createHash("sha256").update(bytes).digest("hex"),
      backend: {
        async read(id) {
          if (readbackArmed) {
            readbackArmed = false;
            throw new Error("Durable readback failed");
          }
          return snapshots.get(id) ?? null;
        },
        async compareAndSwap(id, revision, payload) {
          if (
            failReceipt &&
            payload.includes('"providerRequestId":"upstream-video"')
          ) {
            failReceipt = false;
            throw new Error("Disk full receipt");
          }
          const previous = snapshots.get(id);
          if ((previous ? JSON.parse(previous).revision : null) !== revision)
            return false;
          snapshots.set(id, payload);
          if (
            failReceiptReadback &&
            payload.includes('"providerRequestId":"upstream-video"')
          ) {
            failReceiptReadback = false;
            readbackArmed = true;
          }
          return true;
        },
      },
      originalStore: {
        async read(a, id) {
          const bytes = originals.get(`${a}:${id}`);
          if (!bytes) throw new Error("missing");
          return bytes.slice();
        },
        async write(a, id, bytes) {
          if (failOriginal) throw new Error("Disk full original");
          originals.set(`${a}:${id}`, bytes.slice());
        },
        async remove(a, id) {
          originals.delete(`${a}:${id}`);
        },
      },
    });
  const fetcher: typeof fetch = async (url, init) => {
    const route = String(url);
    if (init?.method === "POST") {
      posts++;
      if (submitNetwork) throw new TypeError("synthetic lost POST response");
      if (holdPost)
        return new Promise<Response>((resolve) => {
          postResponse = resolve;
        });
      return videoJson({ id: "upstream-video", status: "queued" });
    }
    if (route.includes("/task/upstream-video")) {
      gets++;
      authorization.push(new Headers(init?.headers).get("authorization"));
      queried();
      if (result === "network") throw new TypeError("synthetic network");
      return videoJson({
        id: "upstream-video",
        status: result,
        ...(result === "completed"
          ? {
              outputs: [
                "https://img.12ai.org/result.mp4?signature=secret-query",
              ],
            }
          : {}),
        ...(result === "failed" ? { error: { message: "Failed" } } : {}),
      });
    }
    assert.equal(
      route,
      "https://img.12ai.org/result.mp4?signature=secret-query",
    );
    assert.equal(new Headers(init?.headers).has("authorization"), false);
    return new Response(videoBytes, {
      headers: { "content-type": "video/mp4" },
    });
  };
  const make = () =>
    createMobileApplication({
      initialMode: "local",
      id: () => `id-${++sequence}`,
      now: () => ++clock,
      identityDigest: async (value) =>
        createHash("sha256").update(value).digest("hex"),
      repository: factory,
      vault: () => vault,
      identity: () => {
        throw new Error("unused identity");
      },
      provider: () => {
        throw new Error("video must not use text/image provider");
      },
      video: () =>
        createTwelveAiVideoClient({
          timeoutMs,
          fetch: fetcher,
          credentials: { read: (ref) => vault.get(ref) },
        }),
    });
  const app = make();
  return {
    app,
    make,
    keys,
    snapshots,
    firstQuery,
    authorization,
    get posts() {
      return posts;
    },
    get gets() {
      return gets;
    },
    set result(value: typeof result) {
      result = value;
    },
    set failReceipt(value: boolean) {
      failReceipt = value;
    },
    set failOriginal(value: boolean) {
      failOriginal = value;
    },
    set failReceiptReadback(value: boolean) {
      failReceiptReadback = value;
    },
    set submitNetwork(value: boolean) {
      submitNetwork = value;
    },
    set holdPost(value: boolean) {
      holdPost = value;
    },
    releasePost() {
      postResponse(videoJson({ id: "upstream-video", status: "queued" }));
    },
    async prepare() {
      await app.start();
      await app.createProject("Video project");
      const connectionId = await app.saveConnection(
        {
          name: "12ai",
          baseUrl: "https://cdn.12ai.org/v1",
          protocol: "openai-compatible",
          capabilities: { text: true, image: true },
        },
        "synthetic-key",
      );
      const projectId = app.getState().snapshot!.activeProjectId!;
      await app.saveDraft(projectId, {
        ...app.getDraft(projectId),
        kind: "video",
        model: "seedance-2.0-fast",
        prompt: "A paper boat crosses a calm lake",
        providerConnectionId: connectionId,
        outputCount: 1,
      });
      return { projectId, connectionId };
    },
  };
}
test("video intent and upstream ID persist before querying and original success survives restart", async () => {
  const f = fixture();
  await f.prepare();
  await f.app.submit();
  const snapshot = f.app.getState().snapshot!,
    project = snapshot.projects[0],
    task = project.tasks[0];
  assert.equal(f.posts, 1);
  assert.equal(f.gets, 1);
  assert.equal(task.status, "succeeded");
  assert.equal(task.completedOutputs, 1);
  assert.equal(snapshot.assets[0].mime, "video/mp4");
  assert.equal(
    project.executionReceipts![0].providerRequestId,
    "upstream-video",
  );
  assert.deepEqual(
    await f.app.context().repo.readOriginal(task.outputs![0].assetId!),
    videoBytes,
  );
  validateSnapshot(snapshot);
  const serialized = JSON.stringify(snapshot);
  assert.equal(serialized.includes("secret-query"), false);
  assert.equal(serialized.includes("synthetic-key"), false);
  const restarted = f.make();
  await restarted.start();
  assert.equal(
    restarted.getState().snapshot!.projects[0].tasks[0].status,
    "succeeded",
  );
  assert.equal(f.posts, 1);
});
test("late accepted ID is persisted after timeout without any automatic GET or another POST", async () => {
  const f = fixture(10);
  await f.prepare();
  f.holdPost = true;
  await f.app.submit();
  const task = f.app.getState().snapshot!.projects[0].tasks[0];
  assert.equal(task.status, "unknown");
  assert.equal(f.gets, 0);
  f.releasePost();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(
    f.app.getState().snapshot!.projects[0].executionReceipts![0]
      .providerRequestId,
    "upstream-video",
  );
  assert.equal(f.gets, 0);
  const restarted = f.make();
  await restarted.start();
  await restarted.recoverTask(task.id);
  assert.equal(
    restarted.getState().snapshot!.projects[0].tasks[0].status,
    "succeeded",
  );
  assert.equal(f.posts, 1);
});
test("two simultaneous recovery actions share one active GET and the second is rejected", async () => {
  const f = fixture();
  await f.prepare();
  f.result = "network";
  await f.app.submit();
  const id = f.app.getState().snapshot!.projects[0].tasks[0].id,
    before = f.gets;
  f.result = "completed";
  const results = await Promise.allSettled([
    f.app.recoverTask(id),
    f.app.recoverTask(id),
  ]);
  assert.equal(f.gets, before + 1);
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  );
  assert.equal(f.app.getState().busyTaskIds.includes(id), false);
});
test("written-but-unread receipt never starts GET and survives a new application instance", async () => {
  const f = fixture();
  await f.prepare();
  f.failReceiptReadback = true;
  await f.app.submit();
  const id = f.app.getState().snapshot!.projects[0].tasks[0].id;
  assert.equal(f.posts, 1);
  assert.equal(f.gets, 0);
  const restarted = f.make();
  await restarted.start();
  await restarted.recoverTask(id);
  assert.equal(f.posts, 1);
  assert.equal(f.gets, 1);
  assert.equal(
    restarted.getState().snapshot!.projects[0].tasks[0].status,
    "succeeded",
  );
});
test("stopping queued video retains queryable upstream ID and never claims cancellation", async () => {
  const f = fixture();
  await f.prepare();
  f.result = "queued";
  const request = f.app.submit();
  await f.firstQuery;
  const id = f.app.getState().snapshot!.projects[0].tasks[0].id;
  f.app.cancelTask(id);
  await request;
  const stopped = f.app.getState().snapshot!.projects[0];
  assert.equal(stopped.tasks[0].status, "unknown");
  assert.equal(
    stopped.executionReceipts![0].providerRequestId,
    "upstream-video",
  );
  f.result = "completed";
  await f.app.recoverTask(id);
  assert.equal(f.posts, 1);
});
test("a lost POST response has no query ID and cannot be retried or submitted again", async () => {
  const f = fixture();
  await f.prepare();
  f.submitNetwork = true;
  await f.app.submit();
  const task = f.app.getState().snapshot!.projects[0].tasks[0];
  assert.equal(task.status, "unknown");
  assert.equal(f.posts, 1);
  await assert.rejects(f.app.recoverTask(task.id));
  await assert.rejects(f.app.retryTask(task.id));
  await assert.rejects(f.app.submit());
  assert.equal(f.posts, 1);
  assert.equal(f.gets, 0);
});
test("query rejects changed current origin, path or protocol even when a replacement key exists", async () => {
  for (const change of [
    { baseUrl: "https://new.12ai.org/v1" },
    { baseUrl: "https://cdn.12ai.org/v1/other" },
    { protocol: "kk-image-jobs" },
  ]) {
    const f = fixture();
    await f.prepare();
    f.result = "network";
    await f.app.submit();
    const old = JSON.parse(f.snapshots.get("local-browser-v1")!);
    Object.assign(old.connections[0], change, {
      credentialRef: "replacement-ref",
    });
    f.keys.set("replacement-ref", "replacement-key");
    f.snapshots.set("local-browser-v1", JSON.stringify(old));
    const restarted = f.make();
    await restarted.start();
    const before = f.gets;
    await assert.rejects(restarted.recoverTask(old.projects[0].tasks[0].id));
    assert.equal(f.gets, before);
    assert.equal(f.posts, 1);
  }
});
test("existing captured key wins over replacement key and unresolved connection cannot be deleted", async () => {
  const f = fixture();
  const { connectionId } = await f.prepare();
  f.result = "network";
  await f.app.submit();
  const task = f.app.getState().snapshot!.projects[0].tasks[0];
  await assert.rejects(f.app.removeConnection(connectionId));
  await f.app.saveConnection(
    {
      id: connectionId,
      name: "12ai",
      baseUrl: "https://cdn.12ai.org/v1",
      protocol: "openai-compatible",
      capabilities: { text: true, image: true },
    },
    "replacement-key",
  );
  f.result = "completed";
  await f.app.recoverTask(task.id);
  assert.equal(f.authorization.at(-1), "Bearer synthetic-key");
  assert.equal(f.posts, 1);
});
test("portable restored video receipt remains read-only and never queries the original job", async () => {
  const f = fixture();
  const { projectId } = await f.prepare();
  f.result = "network";
  await f.app.submit();
  const plan = await f.app.projects.preflight(
    await f.app.projects.backup(projectId),
  );
  await f.app.projects.restore(plan);
  const restored = f.app.getState().snapshot!.projects.at(-1)!;
  assert.equal(restored.executionReceipts![0].readOnly, true);
  const before = f.gets;
  await assert.rejects(f.app.recoverTask(restored.tasks[0].id));
  assert.equal(f.gets, before);
  assert.equal(f.posts, 1);
});
test("receipt save failure retains accepted ID, performs zero GET until readback, and recovers without POST", async () => {
  const f = fixture();
  await f.prepare();
  f.failReceipt = true;
  await f.app.submit();
  const id = f.app.getState().snapshot!.projects[0].tasks[0].id;
  assert.equal(f.posts, 1);
  assert.equal(f.gets, 0);
  assert.equal(f.app.getState().recoverableTaskIds.includes(id), true);
  await f.app.recoverTask(id);
  assert.equal(f.posts, 1);
  assert.equal(f.gets, 1);
  assert.equal(
    f.app.getState().snapshot!.projects[0].tasks[0].status,
    "succeeded",
  );
});
test("refresh after retrieval failure resolves original through captured GET with re-entered same-route key", async () => {
  const f = fixture();
  const { connectionId } = await f.prepare();
  f.result = "network";
  await f.app.submit();
  const task = f.app.getState().snapshot!.projects[0].tasks[0];
  assert.equal(task.status, "unknown");
  assert.equal(f.posts, 1);
  f.keys.clear();
  const restarted = f.make();
  await restarted.start();
  await restarted.saveConnection(
    {
      id: connectionId,
      name: "12ai",
      baseUrl: "https://cdn.12ai.org/v1",
      protocol: "openai-compatible",
      capabilities: { text: true, image: true },
    },
    "reentered-key",
  );
  f.result = "completed";
  await restarted.recoverTask(task.id);
  const recovered = restarted.getState().snapshot!.projects[0].tasks[0];
  assert.equal(recovered.status, "succeeded");
  assert.equal(f.posts, 1);
  assert.equal(recovered.providerCredentialRef, task.providerCredentialRef);
});
test("original archive failure can be recovered after refresh solely by querying the durable job", async () => {
  const f = fixture();
  await f.prepare();
  f.failOriginal = true;
  await f.app.submit();
  const task = f.app.getState().snapshot!.projects[0].tasks[0];
  assert.equal(task.status, "unknown");
  assert.equal(task.completedOutputs, 0);
  f.failOriginal = false;
  const restarted = f.make();
  await restarted.start();
  await restarted.recoverTask(task.id);
  assert.equal(
    restarted.getState().snapshot!.projects[0].tasks[0].status,
    "succeeded",
  );
  assert.equal(f.posts, 1);
});
test("legacy video draft with multiple outputs fails before POST and unknown task cannot be resubmitted", async () => {
  const f = fixture();
  const { projectId } = await f.prepare();
  await f.app.saveDraft(projectId, {
    ...f.app.getDraft(projectId),
    outputCount: 4,
  });
  await assert.rejects(f.app.submit());
  assert.equal(f.posts, 0);
  await f.app.saveDraft(projectId, {
    ...f.app.getDraft(projectId),
    outputCount: 1,
  });
  f.result = "network";
  await f.app.submit();
  const id = f.app.getState().snapshot!.projects[0].tasks[0].id;
  await assert.rejects(f.app.retryTask(id));
  assert.equal(f.posts, 1);
});
