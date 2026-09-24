import { expect, test, type Page } from "@playwright/test";

async function openMemorySection(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "设置" });
  await dialog
    .locator(".settings-nav")
    .getByRole("button", { name: "记忆", exact: true })
    .click();
  return dialog;
}

test("记忆分区渲染标题、共享隐私说明与默认关闭的开关", async ({ page }) => {
  const dialog = await openMemorySection(page);
  await expect(dialog.getByText("记忆服务", { exact: true })).toBeVisible();
  await expect(dialog.getByText(/隐私：完整记忆文件仅存本机/)).toBeVisible();
  const toggle = dialog.getByRole("switch", {
    name: "记忆服务开关",
    exact: true,
  });
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  // 默认关闭：不显示共享状态/列表等启用态内容。
  await expect(dialog.getByText("共享状态", { exact: true })).toHaveCount(0);
});

test("开启记忆后显示共享状态、提炼入口与空态", async ({ page }) => {
  const dialog = await openMemorySection(page);
  const toggle = dialog.getByRole("switch", {
    name: "记忆服务开关",
    exact: true,
  });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await expect(dialog.getByText("共享状态", { exact: true })).toBeVisible();
  const authorize = dialog.getByRole("button", {
    name: "授权共享目录",
    exact: true,
  });
  await expect(authorize).toBeVisible();
  expect((await authorize.boundingBox())?.height).toBeLessThanOrEqual(40);
  await expect(dialog.getByText("暂无记忆")).toBeVisible();
  // Codex 未连接时提炼按钮禁用并给出提示原因。
  const extract = dialog.getByRole("button", {
    name: "让 Codex 提炼记忆",
    exact: true,
  });
  await expect(extract).toBeDisabled();
  await page.locator(".settings-feedback button").click();
  await page.screenshot({
    path: "docs/changes/2026-09-24-local-memory/evidence/memory-enabled-web.png",
  });
  await dialog.locator(".settings-content").evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await page.screenshot({
    path: "docs/changes/2026-09-24-local-memory/evidence/memory-list-web.png",
  });
});

test("关闭记忆后回到初始态并停止展示启用内容", async ({ page }) => {
  const dialog = await openMemorySection(page);
  const toggle = dialog.getByRole("switch", {
    name: "记忆服务开关",
    exact: true,
  });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await expect(dialog.getByText("共享状态", { exact: true })).toHaveCount(0);
});

test("记忆分区不产生横向溢出", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const dialog = await openMemorySection(page);
  const content = dialog.locator(".settings-content");
  const overflow = await content.evaluate(
    (el) => el.scrollWidth - el.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test("390 宽度下记忆设置仍可滚动访问按钮和列表", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const dialog = await openMemorySection(page);
  await dialog.getByRole("switch", { name: "记忆服务开关" }).click();
  const content = dialog.locator(".settings-content");
  expect(
    await content.evaluate(
      (element) => element.scrollWidth - element.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
  await content.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(dialog.getByText("暂无记忆", { exact: true })).toBeVisible();
  await page.locator(".settings-feedback button").click();
  await page.screenshot({
    path: "docs/changes/2026-09-24-local-memory/evidence/memory-enabled-390.png",
  });
});

test("记忆初始化建立独立数据库与两个对象仓库", async ({ page }) => {
  const dialog = await openMemorySection(page);
  await dialog.getByRole("switch", { name: "记忆服务开关" }).click();
  await expect(dialog.getByText("共享状态", { exact: true })).toBeVisible();
  await expect(dialog.getByText("仅本应用（浏览器未授权）")).toBeVisible();

  const stores = await page.evaluate(async () => {
    const request = indexedDB.open("kk-studio-memory");
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const names = [...db.objectStoreNames];
    db.close();
    return names;
  });
  expect(stores).toEqual(["memory", "memory-fs-handle"]);
});

test("损坏的本地记忆显示读取错误，不伪装为空列表", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const request = indexedDB.open("kk-studio-memory", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("memory");
      request.result.createObjectStore("memory-fs-handle");
    };
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("memory", "readwrite");
      tx.objectStore("memory").put(null, "default");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });

  const dialog = await openMemorySection(page);
  await dialog.getByRole("switch", { name: "记忆服务开关" }).click();
  await expect(
    dialog.getByText("本地记忆读取失败，原数据已保留。"),
  ).toBeVisible();
  await expect(dialog.getByText("暂无记忆", { exact: true })).toHaveCount(0);
});

test("清空共享记忆前需要确认，取消时原记录仍在", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const request = indexedDB.open("kk-studio-memory", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("memory");
      request.result.createObjectStore("memory-fs-handle");
    };
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("memory", "readwrite");
      tx.objectStore("memory").put(
        {
          version: 1,
          namespace: "",
          records: [
            {
              id: "remember-me",
              content: "以后请用日系插画风格",
              memoryType: "user_preference",
              confidence: 0.9,
              fingerprint: "remember-me-fingerprint",
              source: "manual_user",
              createdAt: "2026-09-24T00:00:00.000Z",
              updatedAt: "2026-09-24T00:00:00.000Z",
              active: true,
            },
          ],
        },
        "default",
      );
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });

  const dialog = await openMemorySection(page);
  await dialog.getByRole("switch", { name: "记忆服务开关" }).click();
  await expect(
    dialog.getByText("以后请用日系插画风格", { exact: true }),
  ).toBeVisible();
  page.once("dialog", (confirmation) => confirmation.dismiss());
  await dialog.getByRole("button", { name: "清空全部记忆" }).click();
  await expect(
    dialog.getByText("以后请用日系插画风格", { exact: true }),
  ).toBeVisible();
  page.once("dialog", (confirmation) => confirmation.accept());
  await dialog.getByRole("button", { name: "清空全部记忆" }).click();
  await expect(dialog.getByText("暂无记忆", { exact: true })).toBeVisible();
});
