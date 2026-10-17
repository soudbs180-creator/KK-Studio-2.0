import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { createHash, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createMobileApplication } from "../src/application/application.ts";
import { getComfyWorkflows } from "../src/application/comfyWorkflows.ts";
import { MobileRepository } from "../src/storage/repository.ts";
import { SqliteSnapshotBackend } from "../src/storage/sqliteBackend.ts";
import {
  applicationComfyFixture,
  comfyGraph,
} from "./applicationComfyFixture.ts";

async function fixture(t: test.TestContext, hold: "receipt" | "original") {
  const transport = await applicationComfyFixture();
  const directory = mkdtempSync(join(tmpdir(), "kk-comfy-lifetime-"));
  const path = join(directory, "creation.db");
  const records: { account: string; db: DatabaseSync; closed: number }[] = [];
  const entered = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  let held = false;
  const app = createMobileApplication({
    ...transport.deps,
    repository: async (account) => {
      const db = new DatabaseSync(path);
      const record = { account, db, closed: 0 };
      records.push(record);
      const backend = new SqliteSnapshotBackend(
        {
          async execAsync(sql) {
            db.exec(sql);
          },
          async getFirstAsync<T>(sql: string, ...args: (string | number)[]) {
            return (db.prepare(sql).get(...args) ?? null) as T | null;
          },
          async runAsync(sql, ...args) {
            return { changes: Number(db.prepare(sql).run(...args).changes) };
          },
        },
        { allowLoopbackHttp: true },
      );
      await backend.initialize();
      return new MobileRepository({
        accountId: account,
        allowLoopbackHttp: true,
        backend,
        hash: async (bytes) => createHash("sha256").update(bytes).digest("hex"),
        id: randomUUID,
        now: Date.now,
        close: async () => {
          record.closed++;
          db.close();
        },
        originalStore: {
          async read(scope, id) {
            const original = transport.originals.get(`${scope}:${id}`);
            assert.ok(original);
            return original.slice();
          },
          async write(scope, id, bytes) {
            const key = `${scope}:${id}`;
            assert.equal(transport.originals.has(key), false);
            transport.originals.set(key, bytes.slice());
          },
          async remove(scope, id) {
            transport.originals.delete(`${scope}:${id}`);
          },
        },
      });
    },
    comfy: (vault) => {
      const client = transport.deps.comfy(vault);
      async function delay<T>(kind: typeof hold, value: T): Promise<T> {
        if (kind === hold && !held) {
          held = true;
          entered.resolve();
          await release.promise;
        }
        return value;
      }
      return {
        ...client,
        async submitWorkflow(
          ...args: Parameters<typeof client.submitWorkflow>
        ) {
          return delay("receipt", await client.submitWorkflow(...args));
        },
        async downloadOriginal(
          ...args: Parameters<typeof client.downloadOriginal>
        ) {
          return delay("original", await client.downloadOriginal(...args));
        },
      };
    },
  });
  t.after(async () => {
    release.resolve();
    await app.logout();
    records.forEach((record) => {
      if (!record.closed) record.db.close();
    });
    await transport.close();
    rmSync(directory, { recursive: true, force: true });
  });
  await app.start();
  await app.createProject("Retain Comfy work");
  const ctx = app.context(),
    flow = getComfyWorkflows(app);
  const connection = await flow.saveConnection(
    {
      name: "Fixture Comfy",
      baseUrl: transport.baseUrl,
    },
    "PUBLIC-TEST-ONLY",
    ctx.accountId,
  );
  const plan = await flow.prepare(
    ctx.snapshot.projects[0].id,
    connection,
    comfyGraph(),
    1,
    1,
    ctx.accountId,
  );
  return { app, ctx, flow, plan, transport, records, entered, release };
}

test("late accepted Comfy receipt keeps its old private database alive and is recovered without another POST", async (t) => {
  const f = await fixture(t, "receipt");
  const submitted = f.flow.submit(f.plan);
  const rejected = assert.rejects(submitted, /会话|取消/);
  await f.entered.promise;
  await f.app.logout();
  assert.equal(f.records[0].closed, 0);
  await f.app.login("bob", "fixture", "https://identity.example");
  await f.app.createProject("Bob current");
  f.release.resolve();
  await rejected;
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(f.records[0].closed, 1);
  assert.equal(f.records[1].closed, 0);
  assert.equal(f.app.getState().user!.id, "bob");
  assert.equal(f.app.getState().snapshot!.projects[0].name, "Bob current");
  await f.app.logout();
  await f.app.login("alice", "fixture", "https://identity.example");
  const taskId = f.app.context().snapshot.projects[0].tasks[0].id;
  await f.flow.recover(taskId, f.ctx.accountId);
  const project = f.app.context().snapshot.projects[0];
  assert.equal(
    project.executionReceipts![0].providerRequestId,
    f.transport.actualId,
  );
  assert.equal(project.tasks[0].status, "succeeded");
  assert.equal(
    f.transport.calls.filter((call) => call === "POST /prompt").length,
    1,
  );
});

test("logout during Comfy original download preserves fixed output mapping and bytes until explicit account recovery", async (t) => {
  const f = await fixture(t, "original");
  const taskId = await f.flow.submit(f.plan);
  const polling = f.flow.poll(taskId, f.ctx.accountId);
  const rejected = assert.rejects(polling, /会话|取消/);
  await f.entered.promise;
  const mapping =
    f.ctx.snapshot.projects[0].executionReceipts![0].comfy!.outputs;
  assert.equal(mapping!.length, 1);
  await f.app.logout();
  assert.equal(f.records[0].closed, 0);
  f.release.resolve();
  await rejected;
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(f.records[0].closed, 1);
  await f.app.login("alice", "fixture", "https://identity.example");
  await f.flow.recover(taskId, f.ctx.accountId);
  const ctx = f.app.context(),
    project = ctx.snapshot.projects[0];
  assert.equal(project.tasks[0].status, "succeeded");
  const archivedMapping = project.executionReceipts![0].comfy!.outputs!;
  assert.deepEqual(
    archivedMapping.map(({ sha256, ...identity }) => identity),
    mapping,
  );
  const asset = ctx.snapshot.assets[0];
  assert.equal(archivedMapping[0].sha256, asset.sha256);
  assert.equal(
    createHash("sha256")
      .update(await ctx.repo.readOriginal(asset.id))
      .digest("hex"),
    asset.sha256,
  );
  assert.equal(
    f.transport.calls.filter((call) => call.startsWith("GET /view?")).length,
    1,
  );
  assert.equal(
    f.transport.calls.filter((call) => call === "POST /prompt").length,
    1,
  );
});
