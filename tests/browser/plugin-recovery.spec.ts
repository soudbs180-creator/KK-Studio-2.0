import { expect, test, type Page } from "@playwright/test";
import {
  addAndEditBundledPlugins,
  bundledPlugins,
  expectBundledPluginContents,
} from "../support/pluginFlow.mjs";
import type { CreationSnapshot } from "../../src/features/creation/model";

async function readDurable(page: Page): Promise<CreationSnapshot> {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open("kk-studio-next", 1);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const read = db
            .transaction("creation")
            .objectStore("creation")
            .get("snapshot");
          read.onsuccess = () => {
            db.close();
            resolve(read.result);
          };
          read.onerror = () => {
            db.close();
            reject(read.error);
          };
        };
      }),
  );
}

for (const width of [390, 1099, 1920]) {
  test(`四个随包插件离线编辑并刷新恢复完整内容和负载 ${width}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.route("https://esm.sh/**", (route) => route.abort());
    await page.goto("/");
    await page.getByRole("button", { name: "项目库", exact: true }).click();
    await page.getByRole("button", { name: "新建项目", exact: true }).click();
    await addAndEditBundledPlugins(page);
    await expect
      .poll(async () =>
        (await readDurable(page))?.projects[0]?.items.map(
          (item) => item.plugin?.metadata?.content,
        ),
      )
      .toEqual(bundledPlugins.map((plugin) => plugin.content));
    const original = (await readDurable(page)).projects[0].items;
    // Require actual IndexedDB recovery rather than a local recovery copy.
    await page.evaluate(() => {
      localStorage.removeItem("kk-studio-next:creation:v1");
      sessionStorage.removeItem("kk-studio-next:creation:v1:pending");
    });
    await page.reload();
    await page.getByRole("button", { name: "项目库", exact: true }).click();
    await expect(page.locator(".project-library-card")).toHaveCount(1);
    await page.locator(".project-library-card").click();
    await expectBundledPluginContents(page);
    expect((await readDurable(page)).projects[0].items).toEqual(original);
    expect(errors).toEqual([]);
    await page.screenshot({ path: info.outputPath("plugins-recovered.png") });
  });
}

test("恢复卡片与打开的添加菜单随迟到插件激活自动更新", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await addAndEditBundledPlugins(page);
  await expect
    .poll(async () =>
      (await readDurable(page))?.projects[0]?.items.map(
        (item) => item.plugin?.metadata?.content,
      ),
    )
    .toEqual(bundledPlugins.map((plugin) => plugin.content));
  const original = (await readDurable(page)).projects[0].items;
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const imports = new Map<string, number>();
  await page.route("**/plugins/*.js*", async (route) => {
    const url = new URL(route.request().url());
    if (
      route.request().resourceType() !== "script" ||
      url.searchParams.has("fixture-original")
    ) {
      await route.continue();
      return;
    }
    const count = (imports.get(url.pathname) ?? 0) + 1;
    imports.set(url.pathname, count);
    if (count === 1) {
      await route.continue();
      return;
    }
    await pending;
    url.searchParams.set("fixture-original", "1");
    await route.fulfill({
      contentType: "text/javascript",
      body: `import plugin from ${JSON.stringify(url.href)};
        export default { ...plugin, setup(ctx) {
          const cleanup = plugin.setup?.(ctx);
          const root = document.documentElement;
          const active = JSON.parse(root.dataset.fixtureActivePlugins || "[]");
          root.dataset.fixtureActivePlugins = JSON.stringify([...active, plugin.id]);
          return cleanup;
        }};`,
    });
  });
  try {
    await page.evaluate(() => {
      localStorage.removeItem("kk-studio-next:creation:v1");
      sessionStorage.removeItem("kk-studio-next:creation:v1:pending");
    });
    await page.reload();
    await page.getByRole("button", { name: "项目库", exact: true }).click();
    await page.locator(".project-library-card").click();
    await expect(page.locator(".plugin-node-missing")).toHaveCount(4);
    await page.getByRole("button", { name: "添加资源", exact: true }).click();
    const menu = page.locator(".add-node-menu");
    await expect(menu).toBeVisible();
    await expect(page.locator(".project-save-state")).toHaveText("已保存");
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    release();
    // setup and registration finish in one synchronous activation call.
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            JSON.parse(
              document.documentElement.dataset.fixtureActivePlugins || "[]",
            ).length,
        ),
      )
      .toBe(4);
    await expectBundledPluginContents(page);
    for (const plugin of bundledPlugins) {
      await expect(
        menu.getByRole("menuitem", { name: plugin.title, exact: true }),
      ).toBeVisible();
    }
    expect((await readDurable(page)).projects[0].items).toEqual(original);
    await page.screenshot({ path: info.outputPath("plugins-late-loaded.png") });
  } finally {
    release();
  }
});

test("损坏插件读取和重试不会覆盖IndexedDB原件及备份", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "项目库", exact: true }),
  ).toBeVisible();
  const corrupt = {
    version: 2,
    revision: 99,
    activeProjectId: "bad-plugin-project",
    homeDraft: {},
    projects: [
      {
        id: "bad-plugin-project",
        items: [
          {
            id: "bad-plugin-item",
            title: "原件",
            description: "",
            kind: "text",
            plugin: {
              type: "svg:vector",
              width: 0,
              metadata: { content: "原始内容" },
            },
          },
        ],
      },
    ],
  };
  await page.evaluate(
    (original) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("kk-studio-next", 1);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const transaction = db.transaction("creation", "readwrite");
          transaction.objectStore("creation").put(original, "snapshot");
          transaction.objectStore("creation").put(original, "backup");
          transaction.oncomplete = () => {
            db.close();
            localStorage.removeItem("kk-studio-next:creation:v1");
            sessionStorage.removeItem("kk-studio-next:creation:v1:pending");
            resolve();
          };
          transaction.onerror = () => {
            db.close();
            reject(transaction.error);
          };
        };
      }),
    corrupt,
  );
  await page.reload();
  await expect(page.getByRole("alert")).toContainText(/原件|保护/);
  await page.getByLabel("创作提示词").fill("坏数据后仍保留内存草稿");
  await page.getByRole("button", { name: "重新读取", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(/原件|保护/);
  expect(await readDurable(page)).toEqual(corrupt);
  const backup = await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open("kk-studio-next", 1);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const read = db
            .transaction("creation")
            .objectStore("creation")
            .get("backup");
          read.onsuccess = () => {
            db.close();
            resolve(read.result);
          };
          read.onerror = () => {
            db.close();
            reject(read.error);
          };
        };
      }),
  );
  expect(backup).toEqual(corrupt);
  expect(
    await page.evaluate(() =>
      localStorage.getItem("kk-studio-next:creation:v1"),
    ),
  ).toBeNull();
});
