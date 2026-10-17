import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { MobileRepository } from "../src/storage/repository.ts";
import { SqliteSnapshotBackend } from "../src/storage/sqliteBackend.ts";
import { createMobileApplication } from "../src/application/application.ts";
import { createIdentityClient } from "../src/services/identityClient.ts";
import { createProviderClient } from "../src/services/providerClient.ts";
import type {
  GenerationInput,
  TextReceipt,
} from "../src/services/providerTypes.ts";

function fixture(t: test.TestContext) {
  const directory = mkdtempSync(join(tmpdir(), "kk-account-lifetime-"));
  const path = join(directory, "creation.db");
  const records: { account: string; closed: number; db: DatabaseSync }[] = [];
  t.after(() => {
    records.forEach((record) => {
      if (!record.closed) record.db.close();
    });
    rmSync(directory, { recursive: true, force: true });
  });
  const secrets = new Map<string, string>();
  let failNextRead = false;
  let failForget = false;
  let heldFactory:
    | {
        entered: ReturnType<typeof Promise.withResolvers<void>>;
        release: ReturnType<typeof Promise.withResolvers<void>>;
      }
    | undefined;
  const providerEntered = Promise.withResolvers<GenerationInput>();
  const providerResult = Promise.withResolvers<TextReceipt>();
  const app = createMobileApplication({
    identityDigest: async (value) =>
      createHash("sha256").update(value).digest("hex"),
    id: randomUUID,
    now: Date.now,
    vault: (account) => ({
      async get(key) {
        return secrets.get(`${account}/${key}`) ?? null;
      },
      async set(key, value) {
        secrets.set(`${account}/${key}`, value);
      },
      async remove(key) {
        if (failForget && account === "_identity" && key === "session")
          throw new Error("Credential session removal failure");
        secrets.delete(`${account}/${key}`);
      },
    }),
    identity: (baseUrl) => ({
      ...createIdentityClient({ baseUrl }),
      async login(input) {
        return {
          user: { id: input.email, email: input.email, displayName: "Fixture" },
          deviceId: input.deviceId,
          accessToken: `${input.email}-access`,
          refreshToken: `${input.email}-refresh`,
          accessExpiresAt: Date.now() + 100000,
          refreshExpiresAt: Date.now() + 1000000,
        };
      },
      async logout() {
        return { revoked: true as const };
      },
    }),
    provider: (vault) => ({
      ...createProviderClient({
        credentials: { read: (key) => vault.get(key) },
      }),
      async generateText(input) {
        providerEntered.resolve(input);
        return providerResult.promise;
      },
    }),
    repository: async (account) => {
      const db = new DatabaseSync(path);
      const record = { account, closed: 0, db };
      records.push(record);
      const failRead = failNextRead;
      failNextRead = false;
      const backend = new SqliteSnapshotBackend({
        async execAsync(sql) {
          db.exec(sql);
        },
        async getFirstAsync<T>(sql: string, ...args: (string | number)[]) {
          if (failRead) throw new Error("Snapshot read failure");
          return (db.prepare(sql).get(...args) ?? null) as T | null;
        },
        async runAsync(sql, ...args) {
          return { changes: Number(db.prepare(sql).run(...args).changes) };
        },
      });
      await backend.initialize();
      const repo = new MobileRepository({
        accountId: account,
        backend,
        originalStore: {
          async read() {
            throw new Error("Unused original");
          },
          async write() {},
          async remove() {},
        },
        hash: async (bytes) => createHash("sha256").update(bytes).digest("hex"),
        id: randomUUID,
        now: Date.now,
        close: async () => {
          record.closed++;
          db.close();
        },
      });
      const hold = heldFactory;
      heldFactory = undefined;
      if (hold) {
        hold.entered.resolve();
        await hold.release.promise;
      }
      return repo;
    },
  });
  return {
    app,
    records,
    providerEntered,
    providerResult,
    failRead() {
      failNextRead = true;
    },
    failForget() {
      failForget = true;
    },
    holdFactory() {
      heldFactory = {
        entered: Promise.withResolvers<void>(),
        release: Promise.withResolvers<void>(),
      };
      return heldFactory;
    },
    durable(account: string) {
      const read = new DatabaseSync(path);
      try {
        return JSON.parse(
          (
            read
              .prepare("SELECT payload FROM mobile_snapshots WHERE account=?")
              .get(account) as { payload: string }
          ).payload,
        );
      } finally {
        read.close();
      }
    },
  };
}
const origin = "https://identity.example";

test("credential removal failure still retires the owned database and preserves the original logout error", async (t) => {
  const f = fixture(t);
  await f.app.start();
  await f.app.login("alice", "fixture-password", origin);
  await f.app.createProject("Retained despite vault failure");
  f.failForget();
  await assert.rejects(f.app.logout(), /Credential session removal failure/);
  assert.equal(f.records[0].closed, 1);
  assert.equal(
    f.durable(f.records[0].account).projects[0].name,
    "Retained despite vault failure",
  );
});

test("failed recovery candidate closes before retry and idle logout releases only the current owner", async (t) => {
  const f = fixture(t);
  await f.app.start();
  f.failRead();
  await assert.rejects(
    f.app.login("alice", "fixture-password", origin),
    /Snapshot read failure/,
  );
  assert.equal(f.app.getState().auth, "storageRecovery");
  assert.equal(f.records[0].closed, 1);
  await f.app.reloadStorage();
  await f.app.createProject("Keep this project");
  assert.equal(f.records[1].closed, 0);
  await f.app.logout();
  assert.equal(f.records[1].closed, 1);
  assert.equal(
    f.durable(f.records[1].account).projects[0].name,
    "Keep this project",
  );
  await f.app.logout();
  assert.equal(f.records[1].closed, 1);
});

test("late repository from an invalid realm is disposed without replacing or closing the newer realm", async (t) => {
  const f = fixture(t);
  await f.app.start();
  const held = f.holdFactory();
  const oldLogin = f.app.login("alice", "fixture-password", origin);
  await held.entered.promise;
  await f.app.logout();
  await f.app.login("bob", "fixture-password", origin);
  await f.app.createProject("Bob retained");
  held.release.resolve();
  await assert.rejects(oldLogin, /替代|会话/);
  assert.equal(f.records[0].closed, 1);
  assert.equal(f.records[1].closed, 0);
  assert.equal(f.app.getState().user!.id, "bob");
  assert.equal(f.app.getState().snapshot!.projects[0].name, "Bob retained");
  await f.app.logout();
});

test("newer same-epoch recovery supersedes and closes its older candidate", async (t) => {
  const f = fixture(t);
  await f.app.start();
  f.failRead();
  await assert.rejects(f.app.login("alice", "fixture-password", origin));
  const held = f.holdFactory();
  const oldRecovery = f.app.reloadStorage();
  await held.entered.promise;
  await f.app.reloadStorage();
  await f.app.createProject("Newest candidate");
  held.release.resolve();
  await assert.rejects(oldRecovery, /替代|会话/);
  assert.equal(f.records[1].closed, 1);
  assert.equal(f.records[2].closed, 0);
  assert.equal(f.app.getState().snapshot!.projects[0].name, "Newest candidate");
  await f.app.logout();
});

test("logout keeps an already submitted old-context receipt operation alive then closes it without affecting a new account", async (t) => {
  const f = fixture(t);
  await f.app.start();
  await f.app.login("alice", "fixture-password", origin);
  await f.app.createProject("Alice task");
  const connectionId = await f.app.saveConnection(
    {
      name: "Fixture provider",
      baseUrl: "https://provider.example",
      protocol: "openai-compatible",
      capabilities: { text: true, image: false },
    },
    "fixture-key",
  );
  const ctx = f.app.context(),
    project = ctx.snapshot.projects[0];
  await f.app.saveDraft(project.id, {
    ...project.composerDraft,
    prompt: "Keep late receipt",
    model: "fixture-model",
    providerConnectionId: connectionId,
  });
  const submission = f.app.submit();
  const input = await f.providerEntered.promise;
  await f.app.logout();
  assert.equal(f.app.getState().auth, "signedOut");
  assert.equal(f.records[0].closed, 0);
  await f.app.login("bob", "fixture-password", origin);
  await f.app.createProject("Bob current");
  f.providerResult.resolve({
    identity: {
      submissionId: input.submissionId,
      projectId: input.projectId,
      connectionId: input.connection.id,
      model: input.model,
      prompt: input.prompt,
      capturedAt: Date.now(),
    },
    submissionState: "terminal",
    text: "Accepted late text",
    finishReason: "stop",
  });
  await submission;
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(f.records[0].closed, 1);
  assert.equal(f.records[1].closed, 0);
  assert.equal(f.app.getState().user!.id, "bob");
  assert.equal(f.app.getState().snapshot!.projects[0].name, "Bob current");
  const task = f.durable(ctx.accountId).projects[0].tasks[0];
  assert.equal(task.status, "unknown");
  assert.equal(task.submissionState, "unknown");
  assert.equal(
    f.app.recoveries.get(task.id)!.receipt.identity.submissionId,
    input.submissionId,
  );
  await f.app.logout();
});
