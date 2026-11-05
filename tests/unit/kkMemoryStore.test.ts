import assert from "node:assert/strict";
import test from "node:test";
import {
  CURRENT_MEMORY_STORE_VERSION,
  formatNamespaceKey,
  InMemoryMemoryDriver,
  KkMemoryStore,
  normalizeStoreV2,
  parseNamespaceKey,
} from "../../src/features/memory/kkMemoryStore.ts";
import { MemoryConflictError } from "../../src/features/memory/storage.ts";
import { MemoryService } from "../../src/features/memory/memoryService.ts";

test("formatNamespaceKey & parseNamespaceKey roundtrip", () => {
  assert.equal(formatNamespaceKey("global"), "global");
  assert.equal(formatNamespaceKey("project", "p1"), "project:p1");
  assert.equal(formatNamespaceKey("session", "s1"), "session:s1");

  assert.deepEqual(parseNamespaceKey("global"), { scope: "global" });
  assert.deepEqual(parseNamespaceKey("project:p1"), {
    scope: "project",
    id: "p1",
  });
  assert.deepEqual(parseNamespaceKey("session:s1"), {
    scope: "session",
    id: "s1",
  });
  assert.deepEqual(parseNamespaceKey(""), { scope: "global" });
});

test("normalizeStoreV2 migrates V1 store to V2 format", () => {
  const v1 = {
    version: 1,
    namespace: "legacy-ns",
    records: [
      {
        id: "r1",
        content: "用户偏好二次元画风",
        memoryType: "user_preference",
        confidence: 0.9,
        fingerprint: "fp1",
        source: "auto_rule",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
        active: true,
      },
    ],
  };

  const v2 = normalizeStoreV2(v1 as never, "global");
  assert.equal(v2.version, CURRENT_MEMORY_STORE_VERSION);
  assert.equal(v2.namespace, "global");
  assert.equal(v2.records.length, 1);
  assert.equal(v2.metadata.recordCount, 1);
  assert.ok(v2.updatedAt);
});

test("normalizeStoreV2 rejects future versions without altering data", () => {
  assert.throws(
    () => normalizeStoreV2({ version: 99 as never, records: [] }),
    /本地记忆版本不支持/,
  );
});

test("KkMemoryStore CRUD operations using InMemoryMemoryDriver", async () => {
  const driver = new InMemoryMemoryDriver();
  const store = new KkMemoryStore({
    driver,
    defaultNamespace: "project:proj_1",
  });

  const record = await store.addRecord({
    content: "主角穿着带有荧光条纹的深黑风衣",
    memoryType: "user_preference",
    confidence: 0.95,
    fingerprint: "fp_coat",
    source: "manual_user",
    active: true,
  });

  assert.ok(record.id.startsWith("rec_"));
  assert.equal(record.content, "主角穿着带有荧光条纹的深黑风衣");

  // Get
  const fetched = await store.getRecord(record.id);
  assert.ok(fetched);
  assert.equal(fetched.content, record.content);

  // Update
  const updated = await store.updateRecord(record.id, {
    confidence: 0.99,
  });
  assert.ok(updated);
  assert.equal(updated.confidence, 0.99);

  // List namespaces
  const nsList = await store.listNamespaces();
  assert.ok(nsList.includes("project:proj_1"));

  // Delete
  const deleted = await store.deleteRecord(record.id);
  assert.equal(deleted, true);
  assert.equal(await store.getRecord(record.id), null);
});

test("KkMemoryStore optimistic locking detects conflict", async () => {
  const driver = new InMemoryMemoryDriver();
  const store1 = new KkMemoryStore({ driver, defaultNamespace: "global" });
  const store2 = new KkMemoryStore({ driver, defaultNamespace: "global" });

  const s2 = await store2.loadStore();

  await store1.addRecord({
    content: "记忆 1",
    memoryType: "user_preference",
    confidence: 0.8,
    fingerprint: "fp1",
    source: "auto_rule",
    active: true,
  });

  // store2 writes with stale expected
  await assert.rejects(
    () =>
      store2.saveStore(
        { ...s2, records: [] },
        s2, // stale!
        "global",
      ),
    MemoryConflictError,
  );
});

test("KkMemoryStore cascading queries across session, project, and global", async () => {
  const driver = new InMemoryMemoryDriver();
  const store = new KkMemoryStore({ driver });

  // Global
  await store.addRecord(
    {
      content: "全局偏好日系插画",
      memoryType: "user_preference",
      confidence: 0.8,
      fingerprint: "fp_global",
      source: "auto_rule",
      active: true,
    },
    "global",
  );

  // Project
  await store.addRecord(
    {
      content: "项目特定设定日系插画主角",
      memoryType: "user_preference",
      confidence: 0.8,
      fingerprint: "fp_proj",
      source: "manual_user",
      active: true,
    },
    "project:p1",
  );

  // Session
  await store.addRecord(
    {
      content: "本次会话严格要求日系插画黑白线稿",
      memoryType: "user_constraint",
      confidence: 0.9,
      fingerprint: "fp_sess",
      source: "manual_user",
      active: true,
    },
    "session:s1",
  );

  const results = await store.queryCascading({
    query: "日系插画",
    projectId: "p1",
    sessionId: "s1",
  });

  assert.equal(results.length, 3);
  // Relevance is multiplied by the scope weight, so a weak session match cannot outrank a strong global match.
  assert.equal(results[0].fingerprint, "fp_global");
});

test("KkMemoryStore asMemoryStorage seamlessly integrates with MemoryService", async () => {
  const driver = new InMemoryMemoryDriver();
  const store = new KkMemoryStore({ driver });

  const storage = store.asMemoryStorage("global");
  const service = new MemoryService({
    storage,
    settings: { read: () => ({ enabled: true }), write: () => {} },
  });

  assert.equal(service.isEnabled(), true);
  await service.ingestMessage("以后请用赛博朋克风格出图", "user");

  const loaded = await service.load();
  assert.equal(loaded.records.length, 1);
  assert.ok(loaded.records[0].content.includes("赛博朋克"));
});

test("equal relevance uses session/project/global multipliers without leaking other scopes", async () => {
  const store = new KkMemoryStore({ driver: new InMemoryMemoryDriver() });
  for (const namespace of [
    "global",
    "project:p1",
    "session:s1",
    "project:p2",
    "session:s2",
  ]) {
    await store.addRecord(
      {
        content: "用户偏好日系插画",
        memoryType: "user_preference",
        confidence: 0.9,
        fingerprint: namespace,
        source: "manual_user",
        active: true,
      },
      namespace,
    );
  }
  const result = await store.queryCascading({
    query: "日系插画",
    projectId: "p1",
    sessionId: "s1",
  });
  assert.deepEqual(
    result.map((record) => record.fingerprint),
    ["session:s1", "project:p1", "global"],
  );
});

test("raw V1 bytes survive reads and migrate with exact CAS despite formatting", async () => {
  const driver = new InMemoryMemoryDriver();
  const raw = '{ "records": [], "namespace": "old-identity", "version": 1 }\n';
  await driver.write("global", raw, null);
  const store = new KkMemoryStore({ driver });
  const first = await store.loadStore();
  const stale = await store.loadStore();
  assert.equal(await driver.read("global"), raw);
  await store.saveStore(first, first);
  assert.equal(JSON.parse((await driver.read("global"))!).version, 2);
  await assert.rejects(
    () => store.saveStore(stale, stale),
    MemoryConflictError,
  );
});

test("concurrent first writes and stale empty snapshots cannot overwrite the winner", async () => {
  const driver = new InMemoryMemoryDriver();
  const store = new KkMemoryStore({ driver });
  const first = await store.loadStore();
  const second = await store.loadStore();
  const result = await Promise.allSettled([
    store.saveStore(first, first),
    store.saveStore(second, second),
  ]);
  assert.equal(result.filter((item) => item.status === "fulfilled").length, 1);
  assert.equal(result.filter((item) => item.status === "rejected").length, 1);
});

test("malformed and unsupported files remain untouched; invalid namespace does not become global", async () => {
  const driver = new InMemoryMemoryDriver();
  const store = new KkMemoryStore({ driver });
  for (const raw of [
    "{}",
    '{"version":1,"records":"broken"}',
    '{"version":99,"records":[]}',
    "",
  ]) {
    const old = await driver.read("global");
    await driver.write("global", raw, old);
    await assert.rejects(() => store.loadStore());
    await assert.rejects(() => store.resetStore());
    assert.equal(await driver.read("global"), raw);
  }
  assert.throws(() => formatNamespaceKey("project"));
  assert.throws(() => parseNamespaceKey("global:other"));
});

test("legacy storage facade rejects stale reads without losing concurrent records", async () => {
  const store = new KkMemoryStore({ driver: new InMemoryMemoryDriver() });
  const storage = store.asMemoryStorage();
  const first = await storage.read();
  const stale = await storage.read();
  const next = {
    ...first,
    records: [
      {
        id: "r1",
        content: "用户偏好日系插画",
        memoryType: "user_preference" as const,
        confidence: 0.9,
        fingerprint: "f1",
        source: "manual_user" as const,
        active: true,
        createdAt: "2026-11-04T00:00:00Z",
        updatedAt: "2026-11-04T00:00:00Z",
      },
    ],
  };
  await storage.write(next, first);
  await assert.rejects(() => storage.write(stale, stale), MemoryConflictError);
  assert.equal((await storage.read()).records.length, 1);
});
