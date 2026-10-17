import { expect, test, type Page, type Locator } from "@playwright/test";
import { emptySnapshot } from "../../src/features/creation/model";
import { openSettingsSection } from "./helpers";

test.use({ hasTouch: true, viewport: { width: 390, height: 480 } });
const endpoint = "http://127.0.0.1:4319";
const manifest = {
  protocolVersion: 1,
  snapshotRevision: 0,
  createdAt: "2026-10-14T00:00:00.000Z",
  files: [],
  manifestSha256: "a".repeat(64),
};

async function fixture(page: Page) {
  const pending: {
    key: string | null;
    count: number;
    gate: Promise<void>;
    release: () => void;
  } = { key: null, count: 0, gate: Promise.resolve(), release: () => {} };
  await page.addInitScript(
    (endpoint) =>
      localStorage.setItem(
        "kk-studio-next:companion:v1",
        JSON.stringify({
          version: 1,
          endpoint,
          deviceId: "busy-fixture",
          protocolVersion: 1,
          enabled: true,
        }),
      ),
    endpoint,
  );
  await page.route(endpoint + "/**", async (route) => {
    const request = route.request();
    const key = request.method() + " " + new URL(request.url()).pathname;
    if (key === pending.key) {
      pending.count += 1;
      await pending.gate;
    }
    const headers = {
      "Access-Control-Allow-Origin":
        request.headers().origin ?? "http://127.0.0.1:1423",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (request.method() === "OPTIONS" || key === "DELETE /v1/session") {
      await route.fulfill({ status: 204, headers, body: "" });
      return;
    }
    const data = () =>
      request.postDataJSON() as {
        snapshot: { revision: number };
        manifestSha256: string;
        assets: { size: number }[];
        backupId: string;
      };
    const bodies: Record<string, () => unknown> = {
      "GET /health": () => ({
        status: "ok",
        service: "kk-local-companion",
        protocolVersion: 1,
        deviceId: "busy-fixture",
      }),
      "GET /v1/assets": () => ({ assets: [] }),
      "GET /v1/snapshot": () => ({
        status: "missing",
        snapshot: null,
        revision: null,
      }),
      "PUT /v1/snapshot": () => ({
        status: "saved",
        revision: data().snapshot.revision,
      }),
      "POST /v1/pair": () => ({ protocolVersion: 1, deviceId: "busy-fixture" }),
      "POST /v1/backups/export": () => ({
        status: "created",
        backupId: "busy-backup",
        manifest,
      }),
      "GET /v1/backups": () => ({ backups: [{ id: "busy-backup", manifest }] }),
      "POST /v1/backups/restore": () => ({
        status: "restored",
        id: data().backupId,
        revision: 1,
      }),
      "POST /v1/migration/preflight": () => ({
        status: "ready",
        reportId: "71bca184-8330-4ee5-b454-9e9c80c270c1",
        manifestSha256: data().manifestSha256,
        snapshotRevision: data().snapshot.revision,
        assetCount: 0,
        assetBytes: 0,
      }),
      "POST /v1/migration/import": () => ({
        status: "imported",
        revision: data().snapshot.revision,
      }),
    };
    const body = bodies[key]?.();
    if (body === undefined)
      throw new Error("Unexpected companion fixture request " + key);
    await route.fulfill({
      status: 200,
      headers,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
  await page.goto("/");
  await openSettingsSection(page, "网络");
  const dialog = page.getByRole("dialog", { name: "设置", exact: true });
  const companion = dialog.getByTestId("companion-settings");
  await expect(companion.locator(".settings-companion-status")).toHaveText(
    "已连接",
  );
  await companion.getByLabel("一次性配对码", { exact: true }).fill("12345678");
  return {
    dialog,
    companion,
    pending,
    hold: (key: string) => {
      pending.key = key;
      pending.count = 0;
      pending.gate = new Promise<void>((resolve) => {
        pending.release = () => {
          pending.key = null;
          resolve();
        };
      });
    },
  };
}

async function assertLocked(dialog: Locator) {
  await expect(
    dialog.getByRole("button", { name: "关闭设置", exact: true }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole("button", { name: "返回设置分类", exact: true }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole("button", {
      name: "通用",
      exact: true,
      includeHidden: true,
    }),
  ).toBeDisabled();
}

async function seedLegacy(page: Page) {
  const snapshot = emptySnapshot();
  await page.evaluate(async (snapshot) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("kk-studio-next", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("creation");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("creation", "readwrite");
      tx.objectStore("creation").put(snapshot, "snapshot");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, snapshot);
  return snapshot;
}

test("companion check, pairing and disconnect each own the navigation lock", async ({
  page,
}) => {
  const { dialog, companion, pending, hold } = await fixture(page);
  for (const [name, key] of [
    ["检查连接", "GET /health"],
    ["连接并配对", "POST /v1/pair"],
    ["断开", "DELETE /v1/session"],
  ] as const) {
    hold(key);
    await companion.getByRole("button", { name, exact: true }).click();
    await expect.poll(() => pending.count).toBe(1);
    await assertLocked(dialog);
    await expect(
      companion.getByRole("button", { name: "断开", exact: true }),
    ).toBeDisabled();
    await expect(
      companion.getByLabel("本机服务地址", { exact: true }),
    ).toBeDisabled();
    if (name === "断开")
      for (const childName of ["预检旧数据", "创建备份", "恢复最近备份"])
        await expect(
          companion.getByRole("button", { name: childName, exact: true }),
        ).toBeDisabled();
    pending.release();
    await expect(
      dialog.getByRole("button", { name: "关闭设置", exact: true }),
    ).toBeEnabled();
    expect(pending.count).toBe(1);
  }
  await expect(companion.locator(".settings-companion-status")).toHaveText(
    "未连接",
  );
  await companion.getByLabel("一次性配对码", { exact: true }).fill("12345678");
  await expect(
    companion.getByRole("button", { name: "连接并配对", exact: true }),
  ).toBeEnabled();
});

test("child backup and restore lock parent actions and cancelled restore sends no POST", async ({
  page,
}) => {
  const { dialog, companion, pending, hold } = await fixture(page);
  hold("POST /v1/backups/export");
  await companion
    .getByRole("button", { name: "创建备份", exact: true })
    .click();
  await expect.poll(() => pending.count).toBe(1);
  await assertLocked(dialog);
  for (const name of [
    "连接并配对",
    "检查连接",
    "断开",
    "创建备份",
    "恢复最近备份",
  ])
    await expect(
      companion.getByRole("button", { name, exact: true }),
    ).toBeDisabled();
  pending.release();
  await expect(
    companion.getByText("最近备份：busy-backup", { exact: true }),
  ).toBeVisible();
  await expect(
    companion.getByRole("button", { name: "断开", exact: true }),
  ).toBeEnabled();
  let restorePosts = 0;
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      request.url() === endpoint + "/v1/backups/restore"
    )
      restorePosts += 1;
  });
  hold("GET /v1/backups");
  page.once("dialog", (confirmation) => {
    expect(confirmation.message()).toContain("busy-backup");
    expect(confirmation.message()).toContain("替换本机服务的当前项目快照");
    void confirmation.dismiss();
  });
  await companion
    .getByRole("button", { name: "恢复最近备份", exact: true })
    .click();
  await expect.poll(() => pending.count).toBe(1);
  await assertLocked(dialog);
  await expect(
    companion.getByRole("button", { name: "断开", exact: true }),
  ).toBeDisabled();
  pending.release();
  await expect(
    companion.getByText("已取消恢复，当前项目未改动。", { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "关闭设置", exact: true }),
  ).toBeEnabled();
  expect(restorePosts).toBe(0);
  hold("POST /v1/backups/restore");
  page.once("dialog", (confirmation) => void confirmation.accept());
  await companion
    .getByRole("button", { name: "恢复最近备份", exact: true })
    .click();
  await expect.poll(() => pending.count).toBe(1);
  await assertLocked(dialog);
  await expect(
    companion.getByRole("button", { name: "断开", exact: true }),
  ).toBeDisabled();
  pending.release();
  await expect(dialog.locator(".settings-feedback")).toContainText(
    "已恢复本机备份：busy-backup",
  );
  await expect(
    companion.getByRole("button", { name: "断开", exact: true }),
  ).toBeEnabled();
  expect(restorePosts).toBe(1);
});

test("preflight and import own independent locks without losing legacy data", async ({
  page,
}) => {
  const { dialog, companion, pending, hold } = await fixture(page);
  const legacy = await seedLegacy(page);
  await page.evaluate(() => {
    const original = indexedDB.databases.bind(indexedDB);
    const state = window as Window & { releasePreflight?: () => void };
    const gate = new Promise<void>((resolve) => {
      state.releasePreflight = resolve;
    });
    indexedDB.databases = async () => {
      await gate;
      indexedDB.databases = original;
      return original();
    };
  });
  await companion
    .getByRole("button", { name: "预检旧数据", exact: true })
    .click();
  await assertLocked(dialog);
  await expect(
    companion.getByRole("button", { name: "断开", exact: true }),
  ).toBeDisabled();
  await expect(
    companion.getByRole("button", { name: "预检旧数据", exact: true }),
  ).toBeDisabled();
  await page.evaluate(() => {
    (window as Window & { releasePreflight?: () => void }).releasePreflight?.();
  });
  const importButton = companion.getByRole("button", {
    name: "确认导入 0 个素材",
    exact: true,
  });
  await expect(importButton).toBeEnabled();
  hold("POST /v1/migration/preflight");
  await importButton.click();
  await expect.poll(() => pending.count).toBe(1);
  await assertLocked(dialog);
  await expect(
    companion.getByRole("button", { name: "断开", exact: true }),
  ).toBeDisabled();
  await expect(importButton).toBeDisabled();
  pending.release();
  await expect(dialog.locator(".settings-feedback")).toContainText(
    "已导入本机服务",
  );
  await expect(
    companion.getByRole("button", { name: "断开", exact: true }),
  ).toBeEnabled();
  expect(pending.count).toBe(1);
  await expect(
    companion.getByRole("button", { name: "预检旧数据", exact: true }),
  ).toBeEnabled();
  const retained = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("kk-studio-next");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<unknown>((resolve, reject) => {
        const request = db
          .transaction("creation", "readonly")
          .objectStore("creation")
          .get("snapshot");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  });
  expect(retained).toEqual(legacy);
});
