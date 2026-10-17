import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";
import { chromium } from "@playwright/test";
import type { MobileRepository } from "../src/storage/repository.ts";
import type { IndexedDbBackend } from "../src/storage/indexedDbBackend.ts";

type Fixtures = {
  MobileRepository: typeof MobileRepository;
  IndexedDbBackend: typeof IndexedDbBackend;
};

test("actual Edge reload retains account library metadata messages originals and locally approved proposals", async () => {
  const bundle = buildSync({
    stdin: {
      contents:
        "import {IndexedDbBackend} from './indexedDbBackend.ts'; import {MobileRepository} from './repository.ts'; globalThis.advanced={IndexedDbBackend,MobileRepository};",
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
    const before = await page.evaluate(async () => {
      const { MobileRepository, IndexedDbBackend } = (
        globalThis as unknown as { advanced: Fixtures }
      ).advanced;
      const storage = new IndexedDbBackend();
      const create = (accountId: string) =>
        new MobileRepository({
          accountId,
          backend: storage,
          originalStore: storage,
          hash: async (bytes) => {
            const digest = await crypto.subtle.digest(
              "SHA-256",
              new Uint8Array(bytes),
            );
            return Array.from(new Uint8Array(digest), (v) =>
              v.toString(16).padStart(2, "0"),
            ).join("");
          },
          id: () => crypto.randomUUID(),
          now: () => 100,
        });
      const r = create("alice");
      await r.initialize();
      await r.local.createLibrary({
        kind: "skill-instruction",
        name: "Local instructions",
        content: "Do not dispatch tools",
      });
      let s = await r.create("Advanced"),
        p = s.projects[0];
      s = await r.local.setProjectMetadata(
        p.id,
        { group: "Work", pinned: true },
        p.revision,
      );
      p = s.projects[0];
      s = await r.appendMessage(
        p.id,
        {
          id: "message",
          projectId: p.id,
          conversationId: "c",
          role: "user",
          text: "Original text",
          createdAt: 100,
        },
        p.revision,
      );
      p = s.projects[0];
      s = await r.local.editMessage(p.id, "message", "Derivative", p.revision);
      p = s.projects[0];
      s = await r.local.deleteMessage(p.id, "message", p.revision);
      p = s.projects[0];
      const asset = await r.storeOriginal({
        bytes: new Uint8Array([4, 5, 6]),
        mime: "application/octet-stream",
        name: "Retained original",
        provenance: { source: "import" },
      });
      await r.local.setAssetFavorite(asset.id, true);
      s = await r.local.stageProposal(
        p.id,
        {
          kind: "canvas",
          title: "Approved asset",
          operations: [
            {
              type: "add_node",
              node: {
                id: "asset-node",
                kind: "file",
                x: 5,
                y: 6,
                assetId: asset.id,
              },
            },
          ],
        },
        p.revision,
      );
      p = s.projects[0];
      const q = p.canvasProposals![0];
      const preview = r.local.previewProposal(p.id, q.id);
      if (
        preview.canvas.nodes.length !== 1 ||
        (await r.load()).projects[0].canvas.nodes.length !== 0
      )
        throw new Error("Preview mutated source");
      s = await r.local.approveProposal(p.id, q.id, 0, p.revision);
      p = s.projects[0];
      const library = await r.local.exportLibrary(),
        bob = create("bob");
      await bob.initialize();
      const b = await bob.local.importLibrary(library);
      if (
        b.projects.length !== 0 ||
        b.assets.length !== 0 ||
        b.library![0].id === s.library![0].id
      )
        throw new Error("Account import identity leaked");
      const fork = await r.local.forkProject(p.id, p.revision);
      if (fork.projects[1].canvas.nodes[0].id === p.canvas.nodes[0].id)
        throw new Error("Fork node identity shared");
      return {
        projectId: p.id,
        assetId: asset.id,
        proposalId: q.id,
        libraryId: s.library![0].id,
      };
    });
    await page.reload();
    const after = await page.evaluate(async (before) => {
      const { MobileRepository, IndexedDbBackend } = (
        globalThis as unknown as { advanced: Fixtures }
      ).advanced;
      const storage = new IndexedDbBackend();
      const create = (accountId: string) =>
        new MobileRepository({
          accountId,
          backend: storage,
          originalStore: storage,
          hash: async (bytes) => {
            const digest = await crypto.subtle.digest(
              "SHA-256",
              new Uint8Array(bytes),
            );
            return Array.from(new Uint8Array(digest), (v) =>
              v.toString(16).padStart(2, "0"),
            ).join("");
          },
          id: () => crypto.randomUUID(),
          now: () => 100,
        });
      const r = create("alice"),
        s = await r.load(),
        p = s.projects.find((p) => p.id === before.projectId)!;
      const bob = await create("bob").load();
      return {
        group: p.group,
        pinned: p.pinned,
        original: p.messages[0].text,
        deleted: p.messages[0].deletedAt,
        derivative: p.messages[1].text,
        lineage: p.messages[1].editedFromId,
        proposal: p.canvasProposals!.find((q) => q.id === before.proposalId)
          ?.status,
        nodeAsset: p.canvas.nodes[0].assetId,
        favorite: s.assets.find((a) => a.id === before.assetId)?.favorite,
        bytes: Array.from(await r.readOriginal(before.assetId)),
        libraryRetained: s.library![0].id === before.libraryId,
        projects: s.projects.length,
        bobProjects: bob.projects.length,
        bobLibrary: bob.library?.length,
        tasks: p.tasks.length,
      };
    }, before);
    assert.deepEqual(after, {
      group: "Work",
      pinned: true,
      original: "Original text",
      deleted: 100,
      derivative: "Derivative",
      lineage: "message",
      proposal: "approved",
      nodeAsset: before.assetId,
      favorite: true,
      bytes: [4, 5, 6],
      libraryRetained: true,
      projects: 2,
      bobProjects: 0,
      bobLibrary: 1,
      tasks: 0,
    });
  } finally {
    await browser.close();
    server.close();
  }
});
