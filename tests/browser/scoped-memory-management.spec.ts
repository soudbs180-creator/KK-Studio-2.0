import { expect, test, type Page } from "@playwright/test";
import { CREATION_STORAGE_KEY } from "../../src/features/creation/model";
import { emptyStoreV2 } from "../../src/features/memory/kkMemorySchema";
import { openSeededProject, openSettingsSection } from "./helpers";

async function seedScopedMemory(page: Page) {
  const identity = await page.evaluate((key) => {
    const snapshot = JSON.parse(localStorage.getItem(key)!);
    const project = snapshot.projects.find(
      (entry: { id: string }) => entry.id === snapshot.activeProjectId,
    );
    return { projectId: project.id, chatId: project.activeChatId };
  }, CREATION_STORAGE_KEY);
  const namespaces = [
    `project:${identity.projectId}`,
    `session:${JSON.stringify([identity.projectId, identity.chatId])}`,
    "project:other-project",
  ];
  const contents = [
    "仅当前项目的偏好",
    "仅当前会话的偏好",
    "其他项目的隐私偏好",
  ];
  const stores = namespaces.map((namespace, i) => ({
    ...emptyStoreV2(namespace),
    metadata: { ...emptyStoreV2(namespace).metadata, recordCount: 1 },
    records: [
      {
        id: `scope-record-${i}`,
        content: contents[i],
        memoryType: "user_preference",
        confidence: 0.9,
        fingerprint: String(i).repeat(64),
        source: "manual_user",
        createdAt: "2026-11-04T00:00:00.000Z",
        updatedAt: "2026-11-04T00:00:00.000Z",
        active: true,
      },
    ],
  }));
  await page.evaluate(async (entries) => {
    const request = indexedDB.open("kk-studio-memory-v2", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("namespaces");
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("namespaces", "readwrite");
      for (const entry of entries)
        tx.objectStore("namespaces").put(
          JSON.stringify(entry),
          entry.namespace,
        );
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, stores);
  return namespaces;
}

test("记忆范围切换、删除及重载使用真实作用域存储", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSeededProject(page);
  const namespaces = await seedScopedMemory(page);
  await openSettingsSection(page, "记忆管理");
  const panel = page.getByRole("dialog", { name: "设置", exact: true });
  await panel.getByRole("switch", { name: "记忆服务开关" }).click();
  const scope = panel.getByRole("combobox", { name: "记忆范围", exact: true });
  await scope.click();
  await page.getByRole("option", { name: "当前项目", exact: true }).click();
  await expect(
    panel.getByText("仅当前项目的偏好", { exact: true }),
  ).toBeVisible();
  await expect(
    panel.getByText("仅当前会话的偏好", { exact: true }),
  ).toHaveCount(0);
  await expect(
    panel.getByText("其他项目的隐私偏好", { exact: true }),
  ).toHaveCount(0);
  page.once("dialog", (confirmation) => confirmation.accept());
  await panel
    .getByRole("button", { name: "删除记忆：仅当前项目的偏好", exact: true })
    .click();
  await expect(panel.getByText("暂无记忆", { exact: true })).toBeVisible();
  await scope.click();
  await page.getByRole("option", { name: "当前会话", exact: true }).click();
  await expect(
    panel.getByText("仅当前会话的偏好", { exact: true }),
  ).toBeVisible();
  const row = panel.locator(".settings-memory-scope");
  expect(
    await row.evaluate((element) => ({
      padding: getComputedStyle(element).padding,
      gap: getComputedStyle(element).gap,
      headingLine: getComputedStyle(element.querySelector("h3")!).lineHeight,
    })),
  ).toEqual({ padding: "12px", gap: "12px", headingLine: "24px" });
  await page.screenshot({
    path: test.info().outputPath("memory-scope-1440.png"),
  });
  const counts = await page.evaluate(async (keys) => {
    const request = indexedDB.open("kk-studio-memory-v2", 1);
    const db = await new Promise<IDBDatabase>((resolve) => {
      request.onsuccess = () => resolve(request.result);
    });
    const counts = await Promise.all(
      keys.map(
        (key) =>
          new Promise<number>((resolve) => {
            const read = db
              .transaction("namespaces")
              .objectStore("namespaces")
              .get(key);
            read.onsuccess = () =>
              resolve(JSON.parse(read.result).records.length);
          }),
      ),
    );
    db.close();
    return counts;
  }, namespaces);
  expect(counts).toEqual([0, 1, 1]);
  await page.reload();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page
    .locator(".project-library-card")
    .filter({ hasText: "Agent 验证项目" })
    .click();
  await openSettingsSection(page, "记忆管理");
  await panel.getByRole("combobox", { name: "记忆范围" }).click();
  await page.getByRole("option", { name: "当前项目", exact: true }).click();
  await expect(panel.getByText("暂无记忆", { exact: true })).toBeVisible();
});

test("没有项目上下文时范围选项禁用，390px 触控范围可见", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await openSettingsSection(page, "记忆管理");
  const panel = page.getByRole("dialog", { name: "设置", exact: true });
  await panel.getByRole("switch", { name: "记忆服务开关" }).click();
  const scope = panel.getByRole("combobox", { name: "记忆范围", exact: true });
  await scope.scrollIntoViewIfNeeded();
  const hit = await scope.evaluate((button) => {
    const bounds = button.getBoundingClientRect();
    const pseudo = getComputedStyle(button, "::before");
    return {
      visual: bounds.height,
      hit: parseFloat(pseudo.height),
      acceptsOuterHit: button.contains(
        document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y - 4),
      ),
    };
  });
  expect(hit).toEqual({ visual: 32, hit: 44, acceptsOuterHit: true });
  await scope.click();
  await expect(
    page.getByRole("option", { name: "当前项目", exact: true }),
  ).toHaveAttribute("aria-disabled", "true");
  await expect(
    page.getByRole("option", { name: "当前会话", exact: true }),
  ).toHaveAttribute("aria-disabled", "true");
  await scope.press("Escape");
  await page.screenshot({
    path: test.info().outputPath("memory-scope-390.png"),
  });
});

test("范围 A→B→A 的迟到读取不能覆盖最新记忆", async ({ page }) => {
  await openSeededProject(page);
  const [projectKey] = await seedScopedMemory(page);
  await openSettingsSection(page, "记忆管理");
  const panel = page.getByRole("dialog", { name: "设置", exact: true });
  await panel.getByRole("switch", { name: "记忆服务开关" }).click();
  await expect(panel.getByText("暂无记忆", { exact: true })).toBeVisible();
  await page.evaluate((key) => {
    const original = IDBObjectStore.prototype.get;
    let hold = true;
    IDBObjectStore.prototype.get = function (query) {
      const request = original.call(this, query);
      if (this.name === "namespaces" && query === key && hold) {
        hold = false;
        Object.defineProperty(request, "onsuccess", {
          set(handler) {
            request.addEventListener("success", (event) => {
              (
                window as typeof window & { releaseMemoryRead?: () => void }
              ).releaseMemoryRead = () => handler.call(request, event);
            });
          },
        });
      }
      return request;
    };
  }, projectKey);
  const scope = panel.getByRole("combobox", { name: "记忆范围" });
  await scope.click();
  await page.getByRole("option", { name: "当前项目", exact: true }).click();
  await page.waitForFunction(() =>
    Boolean(
      (window as typeof window & { releaseMemoryRead?: () => void })
        .releaseMemoryRead,
    ),
  );
  await scope.click();
  await page.getByRole("option", { name: "当前会话", exact: true }).click();
  await expect(
    panel.getByText("仅当前会话的偏好", { exact: true }),
  ).toBeVisible();
  await page.evaluate(async (key) => {
    const request = indexedDB.open("kk-studio-memory-v2", 1);
    const db = await new Promise<IDBDatabase>((resolve) => {
      request.onsuccess = () => resolve(request.result);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("namespaces", "readwrite");
      const store = tx.objectStore("namespaces");
      const read = store.get(key);
      read.onsuccess = () => {
        const data = JSON.parse(read.result);
        data.records[0].content = "更新后的项目偏好";
        store.put(JSON.stringify(data), key);
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, projectKey);
  await scope.click();
  await page.getByRole("option", { name: "当前项目", exact: true }).click();
  await expect(
    panel.getByText("更新后的项目偏好", { exact: true }),
  ).toBeVisible();
  await page.evaluate(() =>
    (window as typeof window & { releaseMemoryRead?: () => void })
      .releaseMemoryRead!(),
  );
  await expect(
    panel.getByText("更新后的项目偏好", { exact: true }),
  ).toBeVisible();
  await expect(
    panel.getByText("仅当前项目的偏好", { exact: true }),
  ).toHaveCount(0);
});
