import assert from "node:assert/strict";
import test from "node:test";
import { MemoryService } from "../../src/features/memory/memoryService.ts";
import type { MemoryStorage } from "../../src/features/memory/storage.ts";
import {
  type MemorySettings,
  type MemoryStoreFile,
  MEMORY_STORE_VERSION,
} from "../../src/features/memory/types.ts";

class FakeSettings {
  enabled = false;
  read(): MemorySettings {
    return { enabled: this.enabled };
  }
  write(settings: MemorySettings): void {
    this.enabled = settings.enabled;
  }
}

class FakeStorage implements MemoryStorage {
  store: MemoryStoreFile = {
    version: MEMORY_STORE_VERSION,
    namespace: "",
    records: [],
  };
  failures: Array<"read" | "write"> = [];
  mode: "shared" | "isolated" = "shared";

  async read(): Promise<MemoryStoreFile> {
    if (this.failures.includes("read")) throw new Error("read failed");
    return structuredClone(this.store);
  }
  async write(store: MemoryStoreFile): Promise<MemoryStoreFile> {
    if (this.failures.includes("write")) throw new Error("write failed");
    this.store = structuredClone(store);
    return structuredClone(store);
  }
  async resetIdentity(): Promise<MemoryStoreFile> {
    this.store = { version: MEMORY_STORE_VERSION, namespace: "", records: [] };
    return structuredClone(this.store);
  }
  async authorizeSharedDirectory(): Promise<boolean> {
    return true;
  }
  async statusText(): Promise<string> {
    return "fake-shared";
  }
}

function createService() {
  const storage = new FakeStorage();
  const settings = new FakeSettings();
  const service = new MemoryService({ storage, settings });
  return { service, storage, settings };
}

test("disabled by default and does not ingest when off", async () => {
  const { service, storage } = createService();
  assert.equal(service.isEnabled(), false);
  await service.ingestMessage("以后请用日系插画风格", "user");
  assert.equal(storage.store.records.length, 0);
});

test("ingestMessage stores record when enabled (shared, no namespace)", async () => {
  const { service, storage } = createService();
  service.setEnabled(true);
  await service.ingestMessage("以后请用日系插画风格", "user");
  assert.equal(storage.store.records.length, 1);
  assert.equal(storage.store.namespace ?? "", "");
  assert.equal(storage.store.records[0].content, "以后请用日系插画风格");
  assert.equal(storage.store.records[0].source, "auto_rule");
});

test("ingestMessage deduplicates identical content by fingerprint", async () => {
  const { service, storage } = createService();
  service.setEnabled(true);
  await service.ingestMessage("以后请用日系插画风格", "user");
  await service.ingestMessage("以后请用日系插画风格！", "user");
  assert.equal(storage.store.records.length, 1);
});

test("ingestMessage failure is silent", async () => {
  const { service, storage } = createService();
  service.setEnabled(true);
  storage.failures.push("read");
  await service.ingestMessage("以后请用日系插画风格", "user");
  assert.equal(storage.store.records.length, 0);
});

test("buildInjection returns empty when disabled", async () => {
  const { service } = createService();
  const block = await service.buildInjection("生成日系海报");
  assert.equal(block, "");
});

test("buildInjection returns memory block when enabled and matched", async () => {
  const { service } = createService();
  service.setEnabled(true);
  await service.ingestMessage("以后请用日系插画风格", "user");
  const block = await service.buildInjection("帮我生成日系插画风格的海报");
  assert.ok(block.includes("[长期记忆]"));
  assert.ok(block.includes("日系插画风格"));
});

test("buildInjection returns empty when no match", async () => {
  const { service } = createService();
  service.setEnabled(true);
  await service.ingestMessage("以后请用日系插画风格", "user");
  const block = await service.buildInjection("量子计算相关");
  assert.equal(block, "");
});

test("saveCodexExtraction parses 记忆： lines and deduplicates", async () => {
  const { service, storage } = createService();
  service.setEnabled(true);
  const added = await service.saveCodexExtraction(
    "记忆：用户偏好日系插画风格\n记忆：用户常用 4:5 竖版\n其他文字",
  );
  assert.equal(added, 2);
  assert.equal(storage.store.records.length, 2);
  assert.ok(storage.store.records.every((r) => r.source === "manual_codex"));
  const again = await service.saveCodexExtraction("记忆：用户偏好日系插画风格");
  assert.equal(again, 0);
});

test("saveCodexExtraction ignores malformed lines", async () => {
  const { service } = createService();
  service.setEnabled(true);
  const added = await service.saveCodexExtraction("没有标记的行\n记忆：好的");
  assert.equal(added, 0);
});

test("deleteRecord removes one record", async () => {
  const { service, storage } = createService();
  service.setEnabled(true);
  await service.ingestMessage("以后请用日系插画风格", "user");
  const id = storage.store.records[0].id;
  const store = await service.deleteRecord(id);
  assert.equal(store.records.length, 0);
});

test("clearAll empties records and keeps store shape", async () => {
  const { service, storage } = createService();
  service.setEnabled(true);
  await service.ingestMessage("以后请用日系插画风格", "user");
  const store = await service.clearAll();
  assert.equal(store.records.length, 0);
  assert.equal(storage.store.records.length, 0);
});

test("storageMode and storageStatus expose sharing state", async () => {
  const { service } = createService();
  assert.equal(await service.storageMode(), "shared");
  assert.equal(await service.storageStatus(), "fake-shared");
  assert.equal(await service.authorizeSharedDirectory(), true);
});

test("resetIdentity returns empty store", async () => {
  const { service, storage } = createService();
  service.setEnabled(true);
  await service.ingestMessage("以后请用日系插画风格", "user");
  assert.equal(storage.store.records.length, 1);
  const store = await service.resetIdentity();
  assert.equal(store.records.length, 0);
  assert.equal(store.namespace, "");
});
