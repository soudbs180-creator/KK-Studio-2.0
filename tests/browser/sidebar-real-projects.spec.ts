import { expect, test, type Page } from "@playwright/test";
import {
  CREATION_STORAGE_KEY,
  createProject,
  createTask,
  emptySnapshot,
  projectChatView,
  serializeCreationSnapshot,
} from "../../src/features/creation/model";
import { BASE_CANVAS_ITEMS } from "../../src/domain/canvasItems";
import { createProjectCanvas } from "../../src/domain/projectCanvas";
import { expandSidebar } from "./helpers";

async function seedProjects(page: Page, runningTask = false) {
  await page.goto("/");
  const first = createProject({
    prompt: "",
    model: "kk-image-2",
    kind: "image",
    attachments: [],
  });
  const second = createProject({
    prompt: "",
    model: "kk-image-2",
    kind: "image",
    attachments: [],
  });
  const projects = [
    { ...first, name: "项目甲", items: [], canvas: createProjectCanvas([]) },
    {
      ...second,
      name: "项目乙",
      items: BASE_CANVAS_ITEMS,
      canvas: createProjectCanvas(BASE_CANVAS_ITEMS),
      tasks: runningTask
        ? [
            {
              ...createTask(second),
              status: "running" as const,
              submissionState: "submitted" as const,
            },
          ]
        : [],
    },
  ];
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: CREATION_STORAGE_KEY,
    value: JSON.stringify(
      serializeCreationSnapshot({
        ...emptySnapshot(),
        version: 3,
        revision: Date.now(),
        projects: projects.map(projectChatView),
        activeProjectId: first.id,
      }),
    ),
  });
  await page.reload();
  await expandSidebar(page);
  return { first, second };
}

test("空项目库的侧栏和搜索没有固定演示项目", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".sidebar .project-entry")).toHaveCount(0);
  await expect(page.locator(".sidebar")).not.toContainText("KK工作流");
  await expect(page.locator(".sidebar")).not.toContainText("KK项目");
  await page.keyboard.press("Control+k");
  await page.getByRole("tab", { name: "项目", exact: true }).click();
  await expect(page.locator(".catalog-result")).toHaveCount(0);
});

test("侧栏按真实项目 ID 打开，改名和删除与项目库及刷新一致", async ({
  page,
}) => {
  const { second } = await seedProjects(page);
  const sidebar = page.getByRole("complementary", { name: "工作台侧栏" });
  await expect(sidebar.locator(".project-entry")).toHaveCount(2);
  await sidebar.getByRole("button", { name: "项目乙", exact: true }).click();
  await expect(page.getByRole("region", { name: "无限画布" })).toBeVisible();
  await expect(page.locator(".canvas-node")).toHaveCount(
    BASE_CANVAS_ITEMS.length,
  );
  await expect
    .poll(() =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key) || "{}").activeProjectId,
        CREATION_STORAGE_KEY,
      ),
    )
    .toBe(second.id);

  const entry = sidebar.locator(".project-entry").filter({ hasText: "项目乙" });
  await entry.getByRole("button", { name: "更多项目设置" }).click();
  await expect(entry.locator(".project-menu")).toHaveCSS(
    "border-radius",
    "10px",
  );
  await expect(entry.getByRole("menuitem", { name: "改名字" })).toHaveCSS(
    "height",
    "32px",
  );
  await expect(entry.getByRole("menuitem", { name: "改名字" })).toHaveCSS(
    "border-radius",
    "8px",
  );
  await entry.getByRole("menuitem", { name: "改名字" }).click();
  await expect(sidebar.getByRole("textbox", { name: "项目名称" })).toHaveCSS(
    "height",
    "32px",
  );
  await sidebar.getByRole("textbox", { name: "项目名称" }).fill("项目乙改名");
  await sidebar.getByRole("textbox", { name: "项目名称" }).press("Enter");
  await page.reload();
  await expandSidebar(page);
  await expect(
    sidebar.getByRole("button", { name: "项目乙改名" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await expect(page.locator(".project-library-card")).toHaveCount(2);
  await expect(
    page.locator(".project-library-card").filter({ hasText: "项目乙改名" }),
  ).toBeVisible();

  const renamed = sidebar
    .locator(".project-entry")
    .filter({ hasText: "项目乙改名" });
  await renamed.getByRole("button", { name: "更多项目设置" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await renamed.getByRole("menuitem", { name: "删除项目" }).click();
  await page.reload();
  await expandSidebar(page);
  await expect(sidebar.getByRole("button", { name: "项目乙改名" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await expect(page.locator(".project-library-card")).toHaveCount(1);
  await expect(page.locator(".project-library-card")).toContainText("项目甲");
});

test("项目和文件夹改名按 Escape 取消，原项目名称刷新后不变", async ({
  page,
}) => {
  await seedProjects(page);
  const sidebar = page.getByRole("complementary", { name: "工作台侧栏" });
  const project = sidebar
    .locator(".project-entry")
    .filter({ hasText: "项目甲" });
  await project.getByRole("button", { name: "更多项目设置" }).click();
  await project.getByRole("menuitem", { name: "改名字" }).click();
  await sidebar
    .getByRole("textbox", { name: "项目名称" })
    .fill("不应保存的名称");
  await sidebar.getByRole("textbox", { name: "项目名称" }).press("Escape");
  await expect(
    sidebar.getByRole("button", { name: "项目甲", exact: true }),
  ).toBeVisible();
  await sidebar.getByRole("button", { name: "创建项目文件夹" }).click();
  const folder = sidebar.locator(".project-folder-group").first();
  await expect(
    folder.getByRole("button", { name: "打开 新建文件夹 工作台" }),
  ).toBeDisabled();
  await folder.getByRole("button", { name: "新建文件夹 设置" }).click();
  await folder.getByRole("menuitem", { name: "改名字" }).click();
  await folder
    .getByRole("textbox", { name: "项目文件夹名称" })
    .fill("不应保存的文件夹");
  await folder.getByRole("textbox", { name: "项目文件夹名称" }).press("Escape");
  await expect(folder.locator(".folder-heading-title")).toHaveText(
    "新建文件夹",
  );
  await page.reload();
  await expandSidebar(page);
  await expect(
    sidebar.getByRole("button", { name: "项目甲", exact: true }),
  ).toBeVisible();
});

test("搜索项目分类只列出实际保存的项目并打开所选 ID", async ({ page }) => {
  const { second } = await seedProjects(page);
  await page.keyboard.press("Control+k");
  await page.getByRole("tab", { name: "项目", exact: true }).click();
  await expect(page.locator(".catalog-result")).toHaveCount(2);
  await expect(
    page.getByText("没有找到匹配的内容", { exact: false }),
  ).toHaveCount(0);
  await page.locator(".catalog-result").filter({ hasText: "项目乙" }).click();
  await expect(page.getByRole("region", { name: "无限画布" })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key) || "{}").activeProjectId,
        CREATION_STORAGE_KEY,
      ),
    )
    .toBe(second.id);
});

test("项目库创建的持久文件夹在侧栏和刷新后可见", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.getByRole("button", { name: "新建文件夹", exact: true }).click();
  await expandSidebar(page);
  await expect(page.locator(".sidebar .folder-heading-title")).toHaveText(
    "新建文件夹",
  );
  await expect
    .poll(() =>
      page.evaluate(
        (key) =>
          JSON.parse(localStorage.getItem(key) ?? "{}").projectGroups?.length,
        CREATION_STORAGE_KEY,
      ),
    )
    .toBe(1);
  await page.reload();
  await expandSidebar(page);
  await expect(page.locator(".sidebar .folder-heading-title")).toHaveText(
    "新建文件夹",
  );
});

test("状态不明的任务保留项目，删除入口说明禁用原因", async ({ page }) => {
  await seedProjects(page, true);
  const entry = page
    .locator(".sidebar .project-entry")
    .filter({ hasText: "项目乙" });
  await entry.getByRole("button", { name: "更多项目设置" }).click();
  await expect(
    entry.getByRole("menuitem", { name: "删除项目" }),
  ).toBeDisabled();
  await expect(
    entry.getByRole("menuitem", { name: "删除项目" }),
  ).toHaveAttribute("title", /任务/);
});

test("失败状态仍有未知受理记录时不允许删除真实项目", async ({ page }) => {
  const { second } = await seedProjects(page);
  const task = createTask(second);
  await page.evaluate(
    ({ key, id, uncertainTask }) => {
      const snapshot = JSON.parse(localStorage.getItem(key)!);
      snapshot.projects.find(
        (project: { id: string }) => project.id === id,
      ).tasks = [uncertainTask];
      snapshot.revision = Math.max(snapshot.revision + 1, Date.now());
      localStorage.setItem(key, JSON.stringify(snapshot));
    },
    {
      key: CREATION_STORAGE_KEY,
      id: second.id,
      uncertainTask: {
        ...task,
        status: "failed",
        submissionState: "unknown",
        outputs: task.outputs?.map((output) => ({
          ...output,
          status: "unknown",
        })),
      },
    },
  );
  await page.reload();
  await expandSidebar(page);
  const entry = page
    .locator(".sidebar .project-entry")
    .filter({ hasText: "项目乙" });
  await entry.getByRole("button", { name: "更多项目设置" }).click();
  await expect(
    entry.getByRole("menuitem", { name: "删除项目" }),
  ).toBeDisabled();
});

test("取消新项目改名后经过文件夹收纳和删除不会重新抢焦点", async ({ page }) => {
  await page.goto("/");
  await expandSidebar(page);
  const sidebar = page.getByRole("complementary", { name: "工作台侧栏" });
  await sidebar.getByRole("button", { name: "创建未分组项目" }).click();
  const nameInput = sidebar.getByRole("textbox", { name: "项目名称" });
  await expect(nameInput).toBeVisible();
  await nameInput.press("Escape");
  await expect(nameInput).toHaveCount(0);
  await sidebar.getByRole("button", { name: "创建项目文件夹" }).click();
  const folder = sidebar.locator(".project-folder-group").first();
  await sidebar
    .locator(".project-group-content .project-entry")
    .first()
    .dragTo(folder.locator(".folder-heading-toggle"));
  await expect(
    folder.locator(".project-nested-entry .project-entry"),
  ).toHaveCount(1);
  await folder.getByRole("button", { name: "新建文件夹 设置" }).click();
  await folder.getByRole("menuitem", { name: "删除项目组" }).click();
  await expect(
    sidebar.locator(".project-group-content .project-entry"),
  ).toHaveCount(1);
  await expect(nameInput).toHaveCount(0);
});

test("折叠分组后创建项目或文件夹仍立即显示新条目", async ({ page }) => {
  await page.goto("/");
  await expandSidebar(page);
  const sidebar = page.getByRole("complementary", { name: "工作台侧栏" });
  const ungrouped = sidebar.getByRole("button", {
    name: "未分组",
    exact: true,
  });
  const grouped = sidebar.getByRole("button", { name: "项目", exact: true });
  await ungrouped.click();
  await expect(ungrouped).toHaveAttribute("aria-expanded", "false");
  await sidebar.getByRole("button", { name: "创建未分组项目" }).click();
  await expect(ungrouped).toHaveAttribute("aria-expanded", "true");
  await expect(
    sidebar.getByRole("textbox", { name: "项目名称" }),
  ).toBeVisible();
  await sidebar.getByRole("textbox", { name: "项目名称" }).press("Escape");
  await grouped.click();
  await expect(grouped).toHaveAttribute("aria-expanded", "false");
  await sidebar.getByRole("button", { name: "创建项目文件夹" }).click();
  await expect(grouped).toHaveAttribute("aria-expanded", "true");
  await expect(sidebar.locator(".project-folder-group")).toBeVisible();
});

test("移动到折叠的项目组后目标文件夹自动显示", async ({ page }) => {
  await seedProjects(page);
  const sidebar = page.getByRole("complementary", { name: "工作台侧栏" });
  await sidebar.getByRole("button", { name: "创建项目文件夹" }).click();
  const grouped = sidebar.getByRole("button", { name: "项目", exact: true });
  await grouped.click();
  await expect(grouped).toHaveAttribute("aria-expanded", "false");
  const entry = sidebar
    .locator(".project-group-content .project-entry")
    .filter({ hasText: "项目乙" });
  await entry.getByRole("button", { name: "更多项目设置" }).click();
  await entry.getByRole("menuitem", { name: "移动到项目组" }).click();
  await entry
    .getByRole("menuitem", { name: "新建文件夹", exact: true })
    .click();
  await expect(grouped).toHaveAttribute("aria-expanded", "true");
  await expect(
    sidebar.locator(".project-folder-group .project-nested-entry"),
  ).toContainText("项目乙");
});

test("项目和文件夹置顶持久化，刷新后保留并能取消置顶", async ({ page }) => {
  await page.route(/^https?:\/\//, (route) =>
    new URL(route.request().url()).origin === "http://127.0.0.1:1423"
      ? route.continue()
      : route.abort(),
  );
  await seedProjects(page);
  const sidebar = page.getByRole("complementary", { name: "工作台侧栏" });
  const rows = sidebar.locator(
    ".project-group-content .project-entry .project-link",
  );
  await expect(rows.first()).toContainText("项目甲");
  await sidebar
    .locator(".project-entry")
    .filter({ hasText: "项目乙" })
    .getByRole("button", { name: "置顶项目" })
    .click();
  await expect(rows.first()).toContainText("项目乙");
  await sidebar.getByRole("button", { name: "创建项目文件夹" }).click();
  await sidebar.getByRole("button", { name: "创建项目文件夹" }).click();
  const folders = sidebar.locator(
    ".project-folder-group .folder-heading-toggle",
  );
  await expect(folders.first()).toContainText("新建文件夹");
  const second = sidebar.locator(".project-folder-group").nth(1);
  await second.locator(".folder-heading-toggle").click({ button: "right" });
  await second.getByRole("menuitem", { name: "置顶文件夹" }).click();
  await expect(folders.first()).toContainText("新建文件夹 2");
  await page.reload();
  await expandSidebar(page);
  await expect(rows.first()).toContainText("项目乙");
  await expect(folders).toHaveCount(2);
  await expect(folders.first()).toHaveText("新建文件夹 2");
  await expect(folders.nth(1)).toHaveText("新建文件夹");
  await sidebar
    .locator(".project-entry")
    .filter({ hasText: "项目乙" })
    .getByRole("button", { name: "取消置顶项目" })
    .click();
  const pinnedFolder = sidebar.locator(".project-folder-group").first();
  await pinnedFolder
    .locator(".folder-heading-toggle")
    .click({ button: "right" });
  await pinnedFolder.getByRole("menuitem", { name: "取消置顶文件夹" }).click();
  await page.reload();
  await expandSidebar(page);
  await expect(rows.first()).toContainText("项目甲");
  await expect(folders.first()).toHaveText("新建文件夹");
});

test("三种项目排序持久化，窄屏键盘选择后重载保持", async ({ page }, info) => {
  await page.route(/^https?:\/\//, (route) =>
    new URL(route.request().url()).origin === "http://127.0.0.1:1423"
      ? route.continue()
      : route.abort(),
  );
  await page.setViewportSize({ width: 820, height: 720 });
  await seedProjects(page, true);
  const sidebar = page.getByRole("complementary", { name: "工作台侧栏" });
  const trigger = sidebar.getByRole("button", {
    name: "项目显示与排序",
    exact: true,
  });
  for (const [mode, label] of [
    ["priority", "任务状态优先"],
    ["recent", "最近更新"],
    ["manual", "项目原有顺序"],
  ] as const) {
    await trigger.click();
    const choice = sidebar.getByRole("menuitemradio", {
      name: label,
      exact: true,
    });
    await choice.focus();
    await choice.press("Space");
    await expect
      .poll(() =>
        page.evaluate(
          (key) =>
            JSON.parse(localStorage.getItem(key) ?? "{}").sidebarPreferences
              ?.sortMode,
          CREATION_STORAGE_KEY,
        ),
      )
      .toBe(mode);
    const order = await sidebar
      .locator(".project-group-content .project-link")
      .allTextContents();
    if (mode === "priority") expect(order[0]).toBe("项目乙");
    await page.reload();
    await expandSidebar(page);
    await expect(
      sidebar.locator(".project-group-content .project-link"),
    ).toHaveText(order);
    await trigger.click();
    await expect(
      sidebar.getByRole("menuitemradio", { name: label }),
    ).toHaveAttribute("aria-checked", "true");
    await page.screenshot({
      path: info.outputPath(`sidebar-sort-${mode}-820.png`),
    });
    await page.keyboard.press("Escape");
  }
});

test("偏好保存冲突保留原库，项目文件夹置顶及排序入口同步禁用", async ({
  page,
}) => {
  const project = createProject({
    prompt: "原草稿",
    model: "image-test",
    kind: "image",
    attachments: [],
  });
  const snapshot = serializeCreationSnapshot({
    ...emptySnapshot(),
    version: 3,
    revision: 4,
    activeProjectId: null,
    projects: [projectChatView({ ...project, name: "保全项目" })],
    projectGroups: [{ id: "preserved-group", name: "保全文件夹" }],
  });
  await page.addInitScript((saved) => {
    const state = { saved, writes: 0 };
    Object.assign(window, {
      sidebarPersistenceProbe: state,
      __TAURI_INTERNALS__: {
        invoke: async (command: string) => {
          if (command === "read_creation_snapshot")
            return { status: "loaded", snapshot: state.saved };
          if (command === "credential_get") return null;
          if (command === "write_creation_snapshot") {
            state.writes++;
            throw new Error("conflict: synthetic existing revision");
          }
          throw new Error(`Unexpected IPC: ${command}`);
        },
      },
    });
  }, snapshot);
  await page.goto("/");
  await expandSidebar(page);
  const sidebar = page.getByRole("complementary", { name: "工作台侧栏" });
  const pin = sidebar.getByRole("button", { name: "置顶项目", exact: true });
  await expect(pin).toBeEnabled();
  await pin.click();
  await expect(page.getByRole("alert")).toContainText("读取保护");
  await expect(
    sidebar.getByRole("button", { name: "取消置顶项目", exact: true }),
  ).toBeDisabled();
  await sidebar
    .getByRole("button", { name: "保全文件夹 设置", exact: true })
    .click();
  await expect(
    sidebar.getByRole("menuitem", { name: "置顶文件夹", exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await sidebar
    .getByRole("button", { name: "项目显示与排序", exact: true })
    .click();
  for (const label of ["项目原有顺序", "最近更新", "任务状态优先"])
    await expect(
      sidebar.getByRole("menuitemradio", { name: label }),
    ).toBeDisabled();
  const durable = await page.evaluate(
    () =>
      (
        window as unknown as {
          sidebarPersistenceProbe: { saved: unknown; writes: number };
        }
      ).sidebarPersistenceProbe,
  );
  expect(durable.saved).toEqual(snapshot);
  expect(durable.writes).toBe(1);
});

test("删除持久文件夹只解除归属，恢复空组后项目仍在未分组", async ({ page }) => {
  await seedProjects(page);
  const sidebar = page.getByRole("complementary", { name: "工作台侧栏" });
  await sidebar.getByRole("button", { name: "创建项目文件夹" }).click();
  const folder = sidebar.locator(".project-folder-group").first();
  await sidebar
    .locator(".project-entry")
    .filter({ hasText: "项目乙" })
    .dragTo(folder.locator(".folder-heading-toggle"));
  await expect(folder.locator(".project-nested-entry")).toContainText("项目乙");
  await folder.getByRole("button", { name: "新建文件夹 设置" }).click();
  await folder.getByRole("menuitem", { name: "删除项目组" }).click();
  await expect(
    sidebar.locator(".project-groups section").nth(1).getByRole("button", {
      name: "项目乙",
    }),
  ).toBeVisible();
  await sidebar.getByRole("button", { name: "恢复项目文件夹" }).click();
  await expect(folder.locator(".project-folder-empty")).toBeVisible();
  await expect(
    sidebar
      .locator(".project-groups section")
      .nth(1)
      .getByRole("button", { name: "项目乙", exact: true }),
  ).toBeVisible();
});
