import { expect, test, type Page } from "@playwright/test";
import {
  CREATION_STORAGE_KEY,
  createProject,
  createTask,
  emptySnapshot,
  type CreationSnapshot,
} from "../../src/features/creation/model";
import { expandSidebar } from "./helpers";

async function seed(page: Page, pending = false) {
  await page.goto("/");
  const project = createProject({
    prompt: "原项目",
    model: "image-test",
    kind: "image",
    attachments: [],
  });
  project.composerDraft.prompt = "未发送草稿";
  if (pending)
    project.tasks = [
      { ...createTask(project), status: "unknown", submissionState: "unknown" },
    ];
  await page.evaluate(
    ({ key, snapshot }) => localStorage.setItem(key, JSON.stringify(snapshot)),
    {
      key: CREATION_STORAGE_KEY,
      snapshot: {
        ...emptySnapshot(),
        revision: Date.now(),
        projects: [project],
        activeProjectId: project.id,
      },
    },
  );
  await page.reload();
  await expandSidebar(page);
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "新建文件夹", exact: true }),
  ).toBeEnabled();
  return project;
}
async function snapshot(page: Page): Promise<CreationSnapshot> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "{}"),
    CREATION_STORAGE_KEY,
  );
}

test("项目库与侧栏共用名称分组和完整垃圾箱，取消删除不改项目，刷新后可从两处恢复", async ({
  page,
}) => {
  const original = await seed(page);
  const library = page.getByRole("region", { name: "项目库" });
  await library
    .getByRole("button", { name: "新建文件夹", exact: true })
    .click();
  await library
    .getByLabel("筛选项目分组")
    .selectOption({ label: "新建文件夹" });
  const initialName = await library
    .getByLabel("项目组名称", { exact: true })
    .inputValue();
  expect(initialName).toBe("新建文件夹");
  await library.getByLabel("项目组名称", { exact: true }).fill("客户组");
  await library
    .getByRole("button", { name: "保存分组名称", exact: true })
    .click();
  await expect
    .poll(async () => (await snapshot(page)).projectGroups?.[0].name)
    .toBe("客户组");
  await library.getByLabel("筛选项目分组").selectOption("all");
  const card = library.locator(".project-library-card");
  await card.getByRole("button", { name: "更多项目设置" }).click();
  await card.getByRole("menuitem", { name: "改名字", exact: true }).click();
  await expect(library).toBeVisible();
  await card
    .getByRole("textbox", { name: "项目名称", exact: true })
    .fill("手动名称");
  await card
    .getByRole("textbox", { name: "项目名称", exact: true })
    .press("Enter");
  await card.getByRole("button", { name: "更多项目设置" }).click();
  await card
    .getByRole("menuitem", { name: "移动到项目组", exact: true })
    .click();
  await card.getByRole("menuitem", { name: "客户组", exact: true }).click();
  await expect(library).toBeVisible();
  await expect(
    page.locator(".sidebar .project-nested-entry .project-link"),
  ).toContainText("手动名称");
  await expect
    .poll(async () => (await snapshot(page)).projects[0].groupId)
    .toBeTruthy();
  const grouped = (await snapshot(page)).projects[0];
  await card.getByRole("button", { name: "更多项目设置" }).click();
  page.once("dialog", (dialog) => dialog.dismiss());
  await card.getByRole("menuitem", { name: "删除项目", exact: true }).click();
  await expect(card).toHaveCount(1);
  expect((await snapshot(page)).projects[0].trashedAt).toBeUndefined();
  await card.getByRole("button", { name: "更多项目设置" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await card.getByRole("menuitem", { name: "删除项目", exact: true }).click();
  await expect(card).toHaveCount(0);
  await expect
    .poll(async () => (await snapshot(page)).projects[0].trashedAt)
    .toBeTruthy();
  const trashed = await snapshot(page);
  expect(trashed.activeProjectId).toBeNull();
  expect(trashed.projects[0].composerDraft.prompt).toBe("未发送草稿");
  expect(trashed.projects[0].items).toEqual(grouped.items);
  expect(trashed.projects[0].canvas).toEqual(grouped.canvas);
  await page.reload();
  await expandSidebar(page);
  const sidebar = page.getByRole("complementary", { name: "工作台侧栏" });
  await expect(sidebar.locator(".project-link")).toHaveCount(0);
  await sidebar.getByRole("button", { name: "项目显示与排序" }).click();
  await sidebar
    .getByRole("menuitemcheckbox", { name: "项目垃圾箱 (1)", exact: true })
    .click();
  await expect(
    sidebar.getByRole("menu", { name: "项目显示与排序" }),
  ).toHaveCount(0);
  const trashRow = sidebar.locator(".project-trash-list .project-entry");
  await trashRow.getByRole("button", { name: "更多项目设置" }).click();
  await trashRow
    .getByRole("menuitem", { name: "恢复项目", exact: true })
    .click();
  await expect
    .poll(async () => (await snapshot(page)).projects[0].trashedAt)
    .toBeUndefined();
  await sidebar.getByRole("button", { name: "项目显示与排序" }).click();
  const returnToProjects = sidebar.getByRole("menuitemcheckbox", {
    name: "返回项目",
    exact: true,
  });
  await expect(returnToProjects).toHaveAttribute("aria-checked", "true");
  await returnToProjects.click();
  const row = sidebar.locator(".project-entry").filter({ hasText: "手动名称" });
  await row.getByRole("button", { name: "更多项目设置" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await row.getByRole("menuitem", { name: "删除项目", exact: true }).click();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await library.getByRole("tab", { name: "垃圾箱", exact: true }).click();
  await library.getByRole("button", { name: "更多项目设置" }).click();
  await library
    .getByRole("menuitem", { name: "恢复项目", exact: true })
    .click();
  await expect
    .poll(async () => (await snapshot(page)).projects[0].trashedAt)
    .toBeUndefined();
  await library.getByRole("tab", { name: "本地项目", exact: true }).click();
  await expect(card).toContainText("手动名称");
  expect((await snapshot(page)).projects[0].id).toBe(original.id);
  expect((await snapshot(page)).projects[0].nameSource).toBe("manual");
});

for (const [width, height] of [
  [390, 480],
  [390, 844],
  [1920, 1080],
]) {
  test(`侧栏垃圾箱收进原项目菜单，键盘切换和命中可用 ${width}×${height}`, async ({
    page,
  }, info) => {
    const original = await seed(page);
    await page.setViewportSize({ width, height });
    if (width < 768) {
      await page
        .getByRole("button", { name: "应用功能菜单", exact: true })
        .click();
      await page
        .getByRole("menuitem", { name: "展开 / 收起侧边栏", exact: true })
        .click();
    }
    await expandSidebar(page);
    const sidebar = page.getByRole("complementary", { name: "工作台侧栏" });
    const trigger = sidebar.getByRole("button", {
      name: "项目显示与排序",
      exact: true,
    });
    const menu = sidebar.getByRole("menu", {
      name: "项目显示与排序",
      exact: true,
    });
    await expect(sidebar.locator(".project-trash-toggle")).toHaveCount(0);
    await expect(
      sidebar.locator(
        ".project-groups-header > .project-groups-actions > button",
      ),
    ).toHaveCount(2);
    await trigger.click();
    const radios = menu.getByRole("menuitemradio");
    await expect(radios).toHaveCount(5);
    const trash = menu.getByRole("menuitemcheckbox", {
      name: "项目垃圾箱 (0)",
      exact: true,
    });
    await expect(trash).toHaveAttribute("aria-checked", "false");
    await radios.last().focus();
    await page.keyboard.press("Tab");
    await expect(trash).toBeFocused();
    const hit = await trash.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        reachable: element.contains(
          document.elementFromPoint(
            box.x + box.width / 2,
            box.y + box.height / 2,
          ),
        ),
      };
    });
    expect(hit.x).toBeGreaterThanOrEqual(0);
    expect(hit.y).toBeGreaterThanOrEqual(0);
    expect(hit.x + hit.width).toBeLessThanOrEqual(width);
    expect(hit.y + hit.height).toBeLessThanOrEqual(height);
    expect(hit.reachable).toBe(true);
    await info.attach("trash-menu-dom", {
      body: JSON.stringify({
        width,
        height,
        hit,
        radioLabels: await radios.allTextContents(),
        runtime: await page.evaluate(() => {
          const root = document.querySelector<HTMLElement>(
            "[data-runtime-mode]",
          );
          return {
            url: location.href,
            mode: root?.dataset.runtimeMode,
            entry: root?.dataset.runtimeEntry,
            scripts: [...document.scripts]
              .map((script) => script.src)
              .filter(Boolean),
          };
        }),
      }),
      contentType: "application/json",
    });
    await page.screenshot({
      path: info.outputPath(`trash-menu-${width}-${height}.png`),
      animations: "disabled",
    });
    await page.keyboard.press("Space");
    await expect(menu).toHaveCount(0);
    await expect(sidebar.getByLabel("侧栏项目垃圾箱")).toBeVisible();
    await expect(
      page.getByRole("region", { name: "项目库", exact: true }),
    ).toBeVisible();
    expect((await snapshot(page)).activeProjectId).toBe(original.id);
    await trigger.click();
    const back = menu.getByRole("menuitemcheckbox", {
      name: "返回项目",
      exact: true,
    });
    await expect(back).toHaveAttribute("aria-checked", "true");
    await back.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await back.click();
    await expect(menu).toHaveCount(0);
    await expect(sidebar.getByLabel("侧栏项目垃圾箱")).toHaveCount(0);
    await expect(sidebar.locator(".project-link")).toHaveCount(1);
    await expect(page.getByRole("region", { name: "无限画布" })).toHaveCount(0);
  });
}

test("两个入口对状态不明任务显示同一个禁用原因，删组重载只解除归属", async ({
  page,
}) => {
  await seed(page, true);
  const library = page.getByRole("region", { name: "项目库" });
  await library
    .locator(".project-library-card")
    .getByRole("button", { name: "更多项目设置" })
    .click();
  await expect(
    library.getByRole("menuitem", { name: "删除项目", exact: true }),
  ).toBeDisabled();
  await expect(
    library.getByRole("menuitem", { name: "删除项目", exact: true }),
  ).toHaveAttribute("title", /任务/);
  await page.keyboard.press("Escape");
  await library
    .getByRole("button", { name: "新建文件夹", exact: true })
    .click();
  await library
    .locator(".project-library-card")
    .getByRole("button", { name: "更多项目设置" })
    .click();
  await library
    .getByRole("menuitem", { name: "移动到项目组", exact: true })
    .click();
  await library
    .getByRole("menuitem", { name: "新建文件夹", exact: true })
    .click();
  await library
    .getByLabel("筛选项目分组")
    .selectOption({ label: "新建文件夹" });
  await library
    .getByRole("button", { name: "删除项目组", exact: true })
    .click();
  await expect
    .poll(async () => (await snapshot(page)).projects[0].groupId)
    .toBeUndefined();
  await page.reload();
  await expandSidebar(page);
  const row = page.locator(".sidebar .project-group-content .project-entry");
  await row.getByRole("button", { name: "更多项目设置" }).click();
  await expect(
    row.getByRole("menuitem", { name: "删除项目", exact: true }),
  ).toBeDisabled();
  expect((await snapshot(page)).projects).toHaveLength(1);
});

test("项目库新增操作在390、1099、1920宽度有真实DOM和截图证据", async ({
  page,
}, testInfo) => {
  await seed(page);
  for (const width of [390, 1099, 1920]) {
    await page.setViewportSize({ width, height: 1080 });
    const library = page.getByRole("region", { name: "项目库" });
    await expect(library).toBeVisible();
    const card = library.locator(".project-library-card");
    await card.getByRole("button", { name: "更多项目设置" }).click();
    const menu = card.getByRole("menu", { name: "项目设置", exact: true });
    await expect(menu).toBeVisible();
    const box = await menu.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    await testInfo.attach(`runtime-${width}`, {
      body: JSON.stringify(
        await page.evaluate(() => ({
          route: location.href,
          entry: [...document.scripts]
            .map((script) => script.src)
            .filter(Boolean),
          mode: document.documentElement.dataset.runtimeMode,
          menu: document
            .querySelector(".project-library-card .project-menu")
            ?.getBoundingClientRect()
            .toJSON(),
        })),
      ),
      contentType: "application/json",
    });
    await page.screenshot({
      path: testInfo.outputPath(`project-lifecycle-${width}.png`),
      fullPage: true,
    });
    await page.keyboard.press("Escape");
  }
});

test("并发保存冲突保留磁盘原件和内存草稿，两个入口暂停写入并提供恢复操作", async ({
  page,
}) => {
  await seed(page);
  await page.evaluate(async () => {
    const request = indexedDB.open("kk-studio-next", 1);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("creation", "readwrite");
      const store = tx.objectStore("creation");
      const read = store.get("snapshot");
      read.onsuccess = () => {
        const remote = read.result;
        remote.revision += 20;
        remote.projects[0].name = "另一窗口的项目名称";
        store.put(remote, "snapshot");
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  const library = page.getByRole("region", { name: "项目库" });
  const card = library.locator(".project-library-card");
  await card.getByRole("button", { name: "更多项目设置" }).click();
  await card.getByRole("menuitem", { name: "改名字", exact: true }).click();
  await card
    .getByRole("textbox", { name: "项目名称", exact: true })
    .fill("未保存的手动草稿");
  await card
    .getByRole("textbox", { name: "项目名称", exact: true })
    .press("Enter");
  await expect(page.getByRole("alert")).toContainText("项目已在另一窗口更新");
  await expect(page.getByRole("alert")).toContainText("本次修改仅在内存中");
  await expect(
    page.getByRole("button", { name: "下载未保存草稿", exact: true }),
  ).toBeVisible();
  await card.getByRole("button", { name: "更多项目设置" }).click();
  await expect(
    card.getByRole("menuitem", { name: "改名字", exact: true }),
  ).toBeDisabled();
  await expect(
    card.getByRole("menuitem", { name: "移动到项目组", exact: true }),
  ).toBeDisabled();
  await expect(
    card.getByRole("menuitem", { name: "删除项目", exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(page.locator(".sidebar .project-link")).toContainText(
    "未保存的手动草稿",
  );
  await page
    .locator(".sidebar .project-entry")
    .getByRole("button", { name: "更多项目设置" })
    .click();
  await expect(
    page
      .locator(".sidebar .project-entry")
      .getByRole("menuitem", { name: "改名字", exact: true }),
  ).toBeDisabled();
  const preserved = await page.evaluate(async () => {
    const request = indexedDB.open("kk-studio-next", 1);
    const db = await new Promise<IDBDatabase>((resolve) => {
      request.onsuccess = () => resolve(request.result);
    });
    const read = db
      .transaction("creation", "readonly")
      .objectStore("creation")
      .get("snapshot");
    const saved = await new Promise<CreationSnapshot>((resolve) => {
      read.onsuccess = () => resolve(read.result);
    });
    db.close();
    return {
      savedName: saved.projects[0].name,
      draft: JSON.parse(
        sessionStorage.getItem("kk-studio-next:creation:v1:pending") ?? "{}",
      ).snapshot.projects[0].name,
    };
  });
  expect(preserved).toEqual({
    savedName: "另一窗口的项目名称",
    draft: "未保存的手动草稿",
  });
});

test("垃圾箱保存延迟期间切到另一项目，迟到保存不会改变新项目的路由", async ({
  page,
}) => {
  const original = await seed(page);
  const sidebar = page.getByRole("complementary", { name: "工作台侧栏" });
  await sidebar
    .getByRole("button", { name: "创建未分组项目", exact: true })
    .click();
  await sidebar
    .getByRole("textbox", { name: "项目名称", exact: true })
    .press("Escape");
  await expect.poll(async () => (await snapshot(page)).projects.length).toBe(2);
  await page.evaluate(async () => {
    const request = indexedDB.open("kk-studio-next", 1);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("creation", "readwrite");
      const store = transaction.objectStore("creation");
      let held = true;
      Object.assign(window, {
        releaseProjectSave: () => {
          held = false;
        },
      });
      function hold(): void {
        const read = store.get("snapshot");
        read.onsuccess = () => {
          resolve();
          if (held) hold();
        };
        read.onerror = () => reject(read.error);
      }
      transaction.oncomplete = () => db.close();
      transaction.onerror = () => reject(transaction.error);
      hold();
    });
  });
  const row = sidebar
    .locator(".project-entry")
    .filter({ hasText: "未命名项目" });
  await row.getByRole("button", { name: "更多项目设置", exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await row.getByRole("menuitem", { name: "删除项目", exact: true }).click();
  await sidebar.getByRole("button", { name: "原项目", exact: true }).click();
  await expect(page.getByRole("region", { name: "无限画布" })).toBeVisible();
  await page.evaluate(() =>
    (
      window as Window & { releaseProjectSave: () => void }
    ).releaseProjectSave(),
  );
  await expect
    .poll(async () => (await snapshot(page)).activeProjectId)
    .toBe(original.id);
  await expect(page.getByRole("region", { name: "无限画布" })).toBeVisible();
  await expect(page.getByRole("region", { name: "项目库" })).toHaveCount(0);
});
