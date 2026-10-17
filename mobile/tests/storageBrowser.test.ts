import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";
import { chromium } from "@playwright/test";
import type { IndexedDbBackend } from "../src/storage/indexedDbBackend.ts";
import type { MobileRepository } from "../src/storage/repository.ts";
import type { createSessionVault } from "../src/storage/sessionVault.ts";
import type { CreationTask } from "@kk-studio/creation-contracts";

type BrowserFixtures = {
  IndexedDbBackend: typeof IndexedDbBackend;
  MobileRepository: typeof MobileRepository;
  createSessionVault: typeof createSessionVault;
};

test("real browser IndexedDB persists account drafts, rejects stale CAS and preserves immutable originals", async () => {
  const bundle = buildSync({
    stdin: {
      contents:
        "import {IndexedDbBackend} from './indexedDbBackend.ts'; import {MobileRepository} from './repository.ts'; import {createSessionVault} from './sessionVault.ts'; globalThis.e3={IndexedDbBackend,MobileRepository,createSessionVault};",
      resolveDir: fileURLToPath(new URL("../src/storage/", import.meta.url)),
    },
    bundle: true,
    format: "iife",
    platform: "browser",
    write: false,
  }).outputFiles[0].text;
  const server = createServer((request, response) => {
    response.setHeader(
      "Content-Type",
      request.url === "/bundle.js" ? "text/javascript" : "text/html",
    );
    response.end(
      request.url === "/bundle.js"
        ? bundle
        : '<!doctype html><script src="/bundle.js"></script>',
    );
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${address.port}`);
    const first = await page.evaluate(async () => {
      const { IndexedDbBackend, MobileRepository, createSessionVault } = (
        globalThis as unknown as { e3: BrowserFixtures }
      ).e3;
      const storage = new IndexedDbBackend();
      const make = (accountId: string) =>
        new MobileRepository({
          accountId,
          backend: storage,
          originalStore: storage,
          hash: async (bytes) => {
            const hash = await crypto.subtle.digest(
              "SHA-256",
              new Uint8Array(bytes),
            );
            return Array.from(new Uint8Array(hash), (b) =>
              b.toString(16).padStart(2, "0"),
            ).join("");
          },
          id: () => crypto.randomUUID(),
          now: Date.now,
        });
      const a = make("alice"),
        stale = make("alice"),
        b = make("bob");
      await Promise.all([a.initialize(), b.initialize()]);
      let s = await a.create("Alice");
      await stale.load();
      s = await a.saveDraft(
        s.projects[0].id,
        { ...s.projects[0].composerDraft, prompt: "durable browser draft" },
        0,
      );
      let conflict = false;
      try {
        await stale.rename(s.projects[0].id, "stale", 0);
      } catch (error) {
        conflict = String(error).includes("conflict");
      }
      const asset = await a.storeOriginal({
        bytes: new Uint8Array([1, 2, 3]),
        name: "original",
        mime: "application/octet-stream",
        provenance: { source: "import" },
      });
      let immutable = false;
      try {
        await storage.write("alice", asset.id, new Uint8Array([9]));
      } catch {
        immutable = true;
      }
      const actual = await a.readOriginal(asset.id);
      s = await a.load();
      const parent: CreationTask = {
        id: "parent",
        idempotencyKey: "parent-key",
        prompt: "p",
        model: "m",
        kind: "text",
        status: "partial",
        submissionState: "terminal",
        createdAt: 1,
        updatedAt: 1,
        attachments: [],
        attempt: 1,
        requestedOutputs: 2,
        completedOutputs: 1,
        privacyMode: "byok_local",
        providerConnectionId: "connection-A",
        providerCredentialRef: "vault-A",
        providerBaseUrl: "https://provider-a.example/v1",
        providerName: "Provider A",
        imageSize: "1024x1024",
        outputs: [
          {
            index: 0,
            status: "succeeded",
            text: "keep successful output",
            model: "m",
            createdAt: 1,
          },
          {
            index: 1,
            status: "failed",
            error: "safe failure",
            model: "m",
            createdAt: 1,
          },
        ],
      };
      s = await a.appendTask(s.projects[0].id, parent, s.projects[0].revision);
      const child: CreationTask = {
        ...parent,
        id: "child",
        idempotencyKey: "child-key",
        status: "queued",
        submissionState: "intent",
        requestedOutputs: 1,
        completedOutputs: 0,
        retryOfTaskId: parent.id,
        retryOutputIndices: [1],
        outputs: [{ index: 0, status: "waiting", model: "m", createdAt: 1 }],
      };
      s = await a.appendTask(s.projects[0].id, child, s.projects[0].revision);
      const differences: Partial<CreationTask>[] = [
        { providerConnectionId: "connection-B" },
        { providerCredentialRef: "vault-B" },
        { providerBaseUrl: "https://provider-b.example/v1" },
        { providerName: "Provider B" },
        { privacyMode: "platform_backed" },
        { model: "other-model" },
        { prompt: "different input" },
        { imageSize: "2048x2048" },
        { sourceItemId: "new-source" },
        {
          attachments: [
            {
              id: "extra-ref",
              assetId: asset.id,
              name: "extra",
              mime: "application/octet-stream",
              size: 3,
            },
          ],
        },
        {
          imageEditContext: {
            originalPrompt: "changed",
            referenceAssetIds: [],
          },
        },
        {
          imageEdit: {
            sourceAssetId: asset.id,
            groupId: "edit-group",
            document: { width: 1, height: 1, regions: [] },
            crop: { x: 0, y: 0, width: 1, height: 1, regionIds: [] },
            nativeMask: false,
          },
        },
      ];
      const routeRejected: boolean[] = [];
      for (const [index, difference] of differences.entries()) {
        try {
          await a.appendTask(
            s.projects[0].id,
            {
              ...child,
              ...difference,
              id: `route-${index}`,
              idempotencyKey: `route-key-${index}`,
            },
            s.projects[0].revision,
          );
          routeRejected.push(false);
        } catch (error) {
          routeRejected.push(String(error).includes("Captured retry"));
        }
      }
      const associationRejected: boolean[] = [];
      for (const difference of [
        { retryOfTaskId: undefined, retryOutputIndices: undefined },
        { retryOutputIndices: [0] },
      ]) {
        try {
          await a.updateTask(
            s.projects[0].id,
            { ...child, ...difference },
            s.projects[0].revision,
          );
          associationRejected.push(false);
        } catch (error) {
          associationRejected.push(String(error).includes("Captured task"));
        }
      }
      s = await a.appendTask(
        s.projects[0].id,
        { ...parent, id: "other-parent", idempotencyKey: "other-parent-key" },
        s.projects[0].revision,
      );
      let parentChangedRejected = false;
      try {
        await a.updateTask(
          s.projects[0].id,
          { ...child, retryOfTaskId: "other-parent" },
          s.projects[0].revision,
        );
      } catch (error) {
        parentChangedRejected = String(error).includes("Captured task");
      }
      const ordinary: CreationTask = {
        ...child,
        id: "ordinary",
        idempotencyKey: "ordinary-key",
        retryOfTaskId: undefined,
        retryOutputIndices: undefined,
      };
      s = await a.appendTask(
        s.projects[0].id,
        ordinary,
        s.projects[0].revision,
      );
      let addedAssociationRejected = false;
      try {
        await a.updateTask(
          s.projects[0].id,
          { ...ordinary, retryOfTaskId: parent.id, retryOutputIndices: [1] },
          s.projects[0].revision,
        );
      } catch (error) {
        addedAssociationRejected = String(error).includes("Captured task");
      }
      let unsafeRetryRejected = false;
      try {
        await a.appendTask(
          s.projects[0].id,
          {
            ...child,
            id: "unsafe-child",
            idempotencyKey: "unsafe-key",
            retryOutputIndices: [0],
          },
          s.projects[0].revision,
        );
      } catch {
        unsafeRetryRejected = true;
      }
      const vault = createSessionVault("alice");
      const running: CreationTask = {
        ...child,
        status: "running",
        submissionState: "submitted",
      };
      s = await a.updateTask(s.projects[0].id, running, s.projects[0].revision);
      const finished: CreationTask = {
        ...running,
        status: "succeeded",
        submissionState: "terminal",
        completedOutputs: 1,
        outputs: [
          {
            index: 0,
            status: "succeeded",
            text: "retried answer",
            model: "m",
            createdAt: 1,
          },
        ],
      };
      s = await a.updateTask(
        s.projects[0].id,
        finished,
        s.projects[0].revision,
      );
      s = await a.updateTask(
        s.projects[0].id,
        {
          ...parent,
          status: "succeeded",
          completedOutputs: 2,
          outputs: [parent.outputs![0], { ...finished.outputs![0], index: 1 }],
        },
        s.projects[0].revision,
      );
      const historical = await a.backup(s.projects[0].id),
        bad = JSON.parse(historical);
      bad.project.tasks[1].providerBaseUrl = "https://provider-b.example/v1";
      let snapshotMismatchRejected = false;
      try {
        await a.preflightRestore(JSON.stringify(bad));
      } catch (error) {
        snapshotMismatchRejected = String(error).includes("Captured retry");
      }
      s = await a.restore(historical);
      const restored = s.projects[1],
        restoredChild = restored.tasks[1];
      const historyRestored =
        restored.tasks[0].status === "succeeded" &&
        restoredChild.retryOfTaskId === restored.tasks[0].id &&
        restoredChild.retryOutputIndices![0] === 1;
      await vault.set("key", "session-only");
      return {
        conflict,
        immutable,
        actual: [...actual],
        bobProjects: (await b.load()).projects.length,
        vaultIsolated: (await createSessionVault("bob").get("key")) === null,
        retryIndices: s.projects[0].tasks[1].retryOutputIndices,
        unsafeRetryRejected,
        routeRejected,
        associationRejected,
        parentChangedRejected,
        addedAssociationRejected,
        snapshotMismatchRejected,
        historyRestored,
      };
    });
    assert.deepEqual(first, {
      conflict: true,
      immutable: true,
      actual: [1, 2, 3],
      bobProjects: 0,
      vaultIsolated: true,
      retryIndices: [1],
      unsafeRetryRejected: true,
      routeRejected: Array(12).fill(true),
      associationRejected: [true, true],
      parentChangedRejected: true,
      addedAssociationRejected: true,
      snapshotMismatchRejected: true,
      historyRestored: true,
    });
    await page.reload();
    const reload = await page.evaluate(async () => {
      const { IndexedDbBackend, MobileRepository, createSessionVault } = (
        globalThis as unknown as { e3: BrowserFixtures }
      ).e3;
      const storage = new IndexedDbBackend();
      const repository = new MobileRepository({
        accountId: "alice",
        backend: storage,
        originalStore: storage,
        hash: async () => "",
        id: () => crypto.randomUUID(),
        now: Date.now,
      });
      const snapshot = await repository.load();
      return {
        prompt: snapshot.projects[0].composerDraft.prompt,
        assets: snapshot.assets.length,
        vault: await createSessionVault("alice").get("key"),
      };
    });
    assert.deepEqual(reload, {
      prompt: "durable browser draft",
      assets: 1,
      vault: null,
    });
    const corrupt = await page.evaluate(async () => {
      const { IndexedDbBackend, MobileRepository } = (
        globalThis as unknown as { e3: BrowserFixtures }
      ).e3;
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const r = indexedDB.open("kk-mobile-creation-v1", 1);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      await new Promise<void>((resolve, reject) => {
        const t = db.transaction("snapshots", "readwrite");
        t.objectStore("snapshots").put("{broken", "alice");
        t.oncomplete = () => resolve();
        t.onerror = () => reject(t.error);
      });
      const storage = new IndexedDbBackend(),
        repository = new MobileRepository({
          accountId: "alice",
          backend: storage,
          originalStore: storage,
          hash: async () => "",
          id: () => crypto.randomUUID(),
          now: Date.now,
        });
      let refused = false;
      try {
        await repository.load();
      } catch {
        refused = true;
      }
      let frozen = false;
      try {
        await repository.create("overwrite");
      } catch {
        frozen = true;
      }
      return { refused, frozen, preserved: await storage.read("alice") };
    });
    assert.deepEqual(corrupt, {
      refused: true,
      frozen: true,
      preserved: "{broken",
    });
  } finally {
    await browser.close();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
