import { expect, test, type Page } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

type RunningService = {
  process: ChildProcessWithoutNullStreams;
  endpoint: string;
  pairingCode: string;
};

async function startService(): Promise<RunningService> {
  const root = mkdtempSync(join(tmpdir(), "kk-companion-browser-"));
  const child = spawn(
    process.execPath,
    ["src/features/local-service/main.ts", root],
    { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] },
  );
  return new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`本机服务启动超时：${output}`));
    }, 10_000);
    child.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString();
      const endpoint = /listening on (http:\/\/127\.0\.0\.1:\d+)/.exec(
        output,
      )?.[1];
      const pairingCode = /Pairing code: (\S+)/.exec(output)?.[1];
      if (!endpoint || !pairingCode) return;
      clearTimeout(timer);
      resolve({ process: child, endpoint, pairingCode });
    });
    child.stderr.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function seedLegacyData(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const assetId = "asset-039058c6f2c0cb492c533b0a";
    const snapshot = {
      version: 2,
      revision: 0,
      activeProjectId: null,
      projects: [],
      homeDraft: {
        prompt: "",
        model: "",
        kind: "image",
        attachments: [
          {
            id: "legacy-attachment",
            assetId,
            name: "legacy.png",
            mime: "image/png",
            size: 3,
            dataUrl: `kk-asset:${assetId}`,
          },
        ],
        approvalMode: "auto",
        privacyMode: "byok_local",
        outputCount: 1,
        updatedAt: 0,
      },
    };
    const metadata = {
      assetId,
      sha256:
        "039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
      mime: "image/png",
      size: 3,
      tags: ["迁移"],
      provenance: { generatedAt: "2026-09-29T00:00:00.000Z" },
    };
    const creation = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("kk-studio-next", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("creation");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = creation.transaction("creation", "readwrite");
      transaction.objectStore("creation").put(snapshot, "snapshot");
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    creation.close();
    const assets = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("kk-studio-assets", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("blobs");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = assets.transaction("blobs", "readwrite");
      transaction.objectStore("blobs").put(
        {
          blob: new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }),
          metadata,
        },
        assetId,
      );
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    assets.close();
  });
}

test("Web 迁移预检/导入不删除旧 IndexedDB", async ({ page }) => {
  const service = await startService();
  try {
    await page.goto("/");
    await page.evaluate(
      async ({ endpoint, pairingCode }) => {
        const paired = await fetch(`${endpoint}/v1/pair`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: pairingCode }),
        });
        if (!paired.ok) throw new Error(`pair failed: ${paired.status}`);
        const health = await (await fetch(`${endpoint}/health`)).json();
        localStorage.setItem(
          "kk-studio-next:companion:v1",
          JSON.stringify({
            version: 1,
            endpoint,
            deviceId: health.deviceId,
            protocolVersion: health.protocolVersion,
            enabled: true,
          }),
        );
      },
      { endpoint: service.endpoint, pairingCode: service.pairingCode },
    );
    await seedLegacyData(page);
    await page.reload();
    await page.getByRole("button", { name: "打开设置", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "设置", exact: true });
    await dialog.getByRole("button", { name: "储存", exact: true }).click();
    const companion = dialog.getByTestId("companion-settings");
    await companion.getByRole("button", { name: "检查连接" }).click();
    await expect(companion.locator(".settings-companion-status")).toHaveText(
      "已连接",
    );
    await companion.getByRole("button", { name: "预检旧数据" }).click();
    await expect(page.locator(".settings-feedback")).toContainText("预检通过");
    await companion.getByRole("button", { name: /确认导入 1 个素材/ }).click();
    await expect(page.locator(".settings-feedback")).toContainText(
      "已导入本机服务",
    );
    const result = await page.evaluate(async (endpoint) => {
      const serviceSnapshot = await (
        await fetch(`${endpoint}/v1/snapshot`, { credentials: "include" })
      ).json();
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("kk-studio-next");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const legacySnapshot = await new Promise<unknown>((resolve, reject) => {
        const request = db
          .transaction("creation")
          .objectStore("creation")
          .get("snapshot");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      db.close();
      return { serviceSnapshot, legacySnapshot };
    }, service.endpoint);
    expect(
      result.serviceSnapshot.snapshot.homeDraft.attachments[0].assetId,
    ).toBe("asset-039058c6f2c0cb492c533b0a");
    expect(result.legacySnapshot).toMatchObject({ revision: 0 });
  } finally {
    service.process.kill();
  }
});
