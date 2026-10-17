import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";
import { chromium } from "@playwright/test";
import type { IndexedDbBackend } from "../src/storage/indexedDbBackend.ts";
import type { MobileRepository } from "../src/storage/repository.ts";
import type { MobileExecutionReceipt } from "../src/core/mobileModel.ts";
import type { CreationTask } from "@kk-studio/creation-contracts";

type BrowserFixtures = {
  IndexedDbBackend: typeof IndexedDbBackend;
  MobileRepository: typeof MobileRepository;
};

test("actual IndexedDB saves reordered Comfy acceptance after connection removal and reload preserves historical evidence", async () => {
  const bundle = buildSync({
    stdin: {
      contents:
        "import {IndexedDbBackend} from './indexedDbBackend.ts'; import {MobileRepository} from './repository.ts'; globalThis.comfyReview={IndexedDbBackend,MobileRepository};",
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
    const written = await page.evaluate(async () => {
      const { IndexedDbBackend, MobileRepository } = (
        globalThis as unknown as { comfyReview: BrowserFixtures }
      ).comfyReview;
      const backend = new IndexedDbBackend(),
        repo = new MobileRepository({
          accountId: "comfy-review",
          backend,
          originalStore: backend,
          hash: async () => "0".repeat(64),
          id: () => crypto.randomUUID(),
          now: () => 100,
        });
      await repo.initialize();
      await repo.saveConnections([
        {
          id: "comfy",
          name: "Public fixture",
          provider: "ComfyUI",
          protocol: "comfyui",
          baseUrl: "https://captured.example",
          credentialRef: "PUBLIC-REF",
        },
      ]);
      const project = (await repo.create("Capture")).projects[0],
        id = "11111111-1111-4111-8111-111111111111";
      const task: CreationTask = {
        id,
        idempotencyKey: id,
        kind: "image",
        prompt: "Public workflow",
        model: "Comfy",
        status: "queued",
        submissionState: "intent",
        createdAt: 100,
        updatedAt: 100,
        attachments: [],
        attempt: 1,
        requestedOutputs: 1,
        completedOutputs: 0,
        providerConnectionId: "comfy",
        providerCredentialRef: "PUBLIC-REF",
        providerBaseUrl: "https://captured.example",
        privacyMode: "byok_local",
        outputs: [
          { index: 0, status: "waiting", model: "Comfy", createdAt: 100 },
        ],
      };
      let p = (await repo.appendTask(project.id, task, project.revision))
        .projects[0];
      const capture: MobileExecutionReceipt = {
        taskId: id,
        connectionId: "comfy",
        protocol: "comfyui",
        comfy: {
          identity: {
            submissionId: id,
            projectId: project.id,
            connectionId: "comfy",
            baseUrl: "https://captured.example",
            workflowRevision: 1,
            workflow: {
              output: {
                inputs: { filename_prefix: "Captured" },
                _meta: { title: "Output" },
                class_type: "SaveImage",
              },
            },
            capturedAt: 100,
          },
          requestedOutputs: 1,
          promptId: id,
          promptIdConfirmed: false,
        },
      };
      p = (await repo.saveExecutionReceipt(project.id, capture, p.revision))
        .projects[0];
      p = (
        await repo.updateTask(
          project.id,
          { ...task, status: "running", submissionState: "submitted" },
          p.revision,
        )
      ).projects[0];
      await repo.saveConnections([]);
      const confirmed: MobileExecutionReceipt = {
        ...capture,
        providerRequestId: "22222222-2222-4222-8222-222222222222",
        comfy: {
          ...capture.comfy!,
          identity: {
            capturedAt: 100,
            workflow: {
              output: {
                class_type: "SaveImage",
                inputs: { filename_prefix: "Captured" },
                _meta: { title: "Output" },
              },
            },
            workflowRevision: 1,
            baseUrl: "https://captured.example",
            connectionId: "comfy",
            projectId: project.id,
            submissionId: id,
          },
          promptId: "22222222-2222-4222-8222-222222222222",
          promptIdConfirmed: true,
          queueNumber: 1,
        },
      };
      const saved = await repo.saveExecutionReceipt(
          project.id,
          confirmed,
          p.revision,
        ),
        receipt = saved.projects[0].executionReceipts![0];
      return {
        confirmed: receipt.comfy!.promptIdConfirmed,
        prompt: receipt.providerRequestId,
        origin: receipt.comfy!.identity.baseUrl,
        time: receipt.comfy!.identity.capturedAt,
        filename:
          receipt.comfy!.identity.workflow.output.inputs.filename_prefix,
        connections: saved.connections.length,
      };
    });
    assert.deepEqual(written, {
      confirmed: true,
      prompt: "22222222-2222-4222-8222-222222222222",
      origin: "https://captured.example",
      time: 100,
      filename: "Captured",
      connections: 0,
    });
    await page.reload();
    const restored = await page.evaluate(async () => {
      const { IndexedDbBackend, MobileRepository } = (
        globalThis as unknown as { comfyReview: BrowserFixtures }
      ).comfyReview;
      const backend = new IndexedDbBackend(),
        repo = new MobileRepository({
          accountId: "comfy-review",
          backend,
          originalStore: backend,
          hash: async () => "0".repeat(64),
          id: () => crypto.randomUUID(),
          now: () => 100,
        });
      const state = await repo.load(),
        p = state.projects[0],
        receipt = p.executionReceipts![0];
      const backup = await repo.backup(p.id),
        copy = (await repo.restore(backup)).projects[1],
        historical = copy.executionReceipts![0];
      const before = await backend.read("comfy-review");
      let readOnlyRejected = false;
      try {
        await repo.saveExecutionReceipt(
          copy.id,
          { ...historical, readOnly: false },
          copy.revision,
        );
      } catch (error) {
        readOnlyRejected = /read.only|restored/i.test(String(error));
      }
      return {
        submission: p.tasks[0].submissionState,
        confirmed: receipt.comfy!.promptIdConfirmed,
        prompt: receipt.providerRequestId,
        origin: p.tasks[0].providerBaseUrl,
        connections: state.connections.length,
        refsStripped: !backup.includes("PUBLIC-REF"),
        historicalPrompt: historical.comfy!.promptId,
        readOnly: historical.readOnly,
        executableConnection: copy.tasks[0].providerConnectionId ?? null,
        readOnlyRejected,
        priorPreserved: before === (await backend.read("comfy-review")),
      };
    });
    assert.deepEqual(restored, {
      submission: "unknown",
      confirmed: true,
      prompt: "22222222-2222-4222-8222-222222222222",
      origin: "https://captured.example",
      connections: 0,
      refsStripped: true,
      historicalPrompt: "22222222-2222-4222-8222-222222222222",
      readOnly: true,
      executableConnection: null,
      readOnlyRejected: true,
      priorPreserved: true,
    });
  } finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
