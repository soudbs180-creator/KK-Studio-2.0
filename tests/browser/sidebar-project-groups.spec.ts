import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { arrangeSidebarFolder } from "./sidebar-fixture";

/**
 * TASK-UI-009 侧栏项目分组与文件夹收纳交互增强（会话内 Prototype）。
 * 第三轮收敛模型：
 * - 「项目」区第一层级只放项目文件夹（图标为文件夹的行可展开/收起，
 *   行右侧打开/设置两个按钮除外）；文件夹内是第二层级项目；
 * - 「未分组」区放未放入文件夹的项目（第一层级）；
 * - 未分组可拖入文件夹收纳；拖到「项目」区空白处自动创建以项目
 *   命名的文件夹并收纳；三点菜单「移动到项目组」可选已有或新建文件夹；
 * - 折叠语义：点击文件夹行收起二级；点击项目条目收起全部文件夹；
 *   点击「项目」标题隐藏整组；「未分组」标题折叠全部条目。
 */
async function openSidebar(page: Page): Promise<Page> {
  await page.goto("/");
  const sidebar = page.getByRole("complementary", { name: "工作台侧栏" });
  await expect(sidebar).toBeVisible();
  return sidebar;
}

const groupedSection = (sidebar: Page) =>
  sidebar.locator(".project-groups section").nth(0);
const ungroupedSection = (sidebar: Page) =>
  sidebar.locator(".project-groups section").nth(1);

async function createUngrouped(sidebar: Page, title: string): Promise<void> {
  await sidebar
    .getByRole("button", { name: "创建未分组项目", exact: true })
    .click();
  const input = ungroupedSection(sidebar).locator(".project-title-input");
  await expect(input).toBeFocused();
  await input.fill(title);
  await input.press("Enter");
}

test("创建未分组项目：出现新行并可改名", async ({ page }) => {
  const sidebar = await openSidebar(page);
  await sidebar
    .getByRole("button", { name: "创建未分组项目", exact: true })
    .click();
  const input = ungroupedSection(sidebar).locator(".project-title-input");
  await expect(input).toBeVisible();
  await expect(input).toBeFocused();
  await input.fill("需求笔记");
  await input.press("Enter");
  await expect(
    ungroupedSection(sidebar).getByText("需求笔记", { exact: true }),
  ).toBeVisible();
});

test("项目区第一层只有文件夹：点击行收起二级，右侧两个按钮除外", async ({
  page,
}) => {
  const sidebar = await arrangeSidebarFolder(page);
  const toggle = groupedSection(sidebar).locator(".folder-heading-toggle");
  await expect(toggle).toHaveCount(1);
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(
    groupedSection(sidebar).getByText("KK工作流", { exact: true }),
  ).toBeVisible();
  // 右侧「打开工作台」按钮：不触发收展，只打开工作台。
  await groupedSection(sidebar)
    .getByRole("button", { name: "打开 KK项目 工作台", exact: true })
    .click();
  await expect(page.getByRole("region", { name: "无限画布" })).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  // 右侧「设置」按钮：打开项目组设置菜单，也不触发收展。
  await groupedSection(sidebar)
    .getByRole("button", { name: "KK项目 设置", exact: true })
    .click();
  await expect(
    page.getByRole("menu", { name: "项目组设置", exact: true }),
  ).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  // 点击文件夹行（任意处）：收起/展开二级项目。
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(
    groupedSection(sidebar).getByText("KK工作流", { exact: true }),
  ).toBeHidden();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(
    groupedSection(sidebar).getByText("KK工作流", { exact: true }),
  ).toBeVisible();
});

test("创建项目文件夹：展开显示空提示，点击隐藏二级菜单", async ({ page }) => {
  const sidebar = await openSidebar(page);
  await sidebar
    .getByRole("button", { name: "创建项目文件夹", exact: true })
    .click();
  const folder = sidebar.getByRole("button", {
    name: "新建文件夹",
    exact: true,
  });
  await expect(folder).toHaveAttribute("aria-expanded", "true");
  await expect(sidebar.locator(".project-folder-empty")).toBeVisible();
  await folder.click();
  await expect(folder).toHaveAttribute("aria-expanded", "false");
  await expect(sidebar.locator(".project-folder-empty")).toBeHidden();
  await folder.click();
  await expect(folder).toHaveAttribute("aria-expanded", "true");
  await expect(sidebar.locator(".project-folder-empty")).toBeVisible();
});

test("未分组项目拖入文件夹：二级展开并收纳（保留改名后的标题）", async ({
  page,
}) => {
  const sidebar = await openSidebar(page);
  await sidebar
    .getByRole("button", { name: "创建项目文件夹", exact: true })
    .click();
  const folder = sidebar.getByRole("button", {
    name: "新建文件夹",
    exact: true,
  });
  await createUngrouped(sidebar, "需求笔记");
  const source = ungroupedSection(sidebar).locator(".project-entry", {
    hasText: "需求笔记",
  });
  await source.dragTo(folder, { sourcePosition: { x: 60, y: 14 } });
  await expect(folder).toHaveAttribute("aria-expanded", "true");
  await expect(
    sidebar.locator(".project-nested-entry .project-link", {
      hasText: "需求笔记",
    }),
  ).toBeVisible();
  await expect(
    ungroupedSection(sidebar).getByText("需求笔记", { exact: true }),
  ).toBeHidden();
});

test("拖未分组项目到「项目」区空白处：自动创建以项目命名的文件夹并收纳", async ({
  page,
}) => {
  const sidebar = await openSidebar(page);
  await sidebar
    .getByRole("button", { name: "创建项目文件夹", exact: true })
    .click();
  await createUngrouped(sidebar, "协同设计");
  const source = ungroupedSection(sidebar).locator(".project-entry", {
    hasText: "协同设计",
  });
  const target = groupedSection(sidebar);
  const box = (await target.boundingBox())!;
  await source.dragTo(target, {
    sourcePosition: { x: 60, y: 14 },
    targetPosition: { x: 40, y: Math.max(10, box.height - 8) },
  });
  const folder = groupedSection(sidebar).locator(".folder-heading-toggle", {
    hasText: "协同设计",
  });
  await expect(folder).toHaveAttribute("aria-expanded", "true");
  await expect(
    sidebar.locator(".project-nested-entry .project-link", {
      hasText: "协同设计",
    }),
  ).toBeVisible();
  await expect(
    ungroupedSection(sidebar).getByText("协同设计", { exact: true }),
  ).toBeHidden();
});

test("点击项目条目收起所有文件夹", async ({ page }) => {
  const sidebar = await openSidebar(page);
  await sidebar
    .getByRole("button", { name: "创建项目文件夹", exact: true })
    .click();
  const folder = sidebar.getByRole("button", {
    name: "新建文件夹",
    exact: true,
  });
  await createUngrouped(sidebar, "需求笔记");
  await createUngrouped(sidebar, "另一个项目");
  await ungroupedSection(sidebar)
    .locator(".project-entry", { hasText: "需求笔记" })
    .dragTo(folder, { sourcePosition: { x: 60, y: 14 } });
  await expect(folder).toHaveAttribute("aria-expanded", "true");
  await ungroupedSection(sidebar).locator(".project-entry").first().click();
  await expect(folder).toHaveAttribute("aria-expanded", "false");
  await expect(
    sidebar.locator(".project-nested-entry .project-link", {
      hasText: "需求笔记",
    }),
  ).toBeHidden();
});

test("点击「项目」标题隐藏整组（含文件夹），再点恢复", async ({ page }) => {
  const sidebar = await openSidebar(page);
  await sidebar
    .getByRole("button", { name: "创建项目文件夹", exact: true })
    .click();
  const folder = sidebar.getByRole("button", {
    name: "新建文件夹",
    exact: true,
  });
  await expect(folder).toBeVisible();
  const title = sidebar.getByRole("button", { name: "项目", exact: true });
  await title.click();
  await expect(title).toHaveAttribute("aria-expanded", "false");
  await expect(
    groupedSection(sidebar).locator(".folder-heading-toggle").first(),
  ).toBeHidden();
  await expect(folder).toBeHidden();
  await title.click();
  await expect(title).toHaveAttribute("aria-expanded", "true");
  await expect(folder).toBeVisible();
});

test("点击「未分组」标题隐藏全部条目，再点恢复", async ({ page }) => {
  const sidebar = await openSidebar(page);
  await createUngrouped(sidebar, "临时条目");
  const title = sidebar.getByRole("button", { name: "未分组", exact: true });
  await title.click();
  await expect(title).toHaveAttribute("aria-expanded", "false");
  await expect(
    ungroupedSection(sidebar).getByText("临时条目", { exact: true }),
  ).toBeHidden();
  await title.click();
  await expect(title).toHaveAttribute("aria-expanded", "true");
  await expect(
    ungroupedSection(sidebar).getByText("临时条目", { exact: true }),
  ).toBeVisible();
});

test("项目行缩略图按内容类型区分：图片 / 聊天图标 / 随机纯色", async ({
  page,
}) => {
  const sidebar = await arrangeSidebarFolder(page, true);
  // 文件夹二级真实结果：主要生成内容为图片 → 内容图片缩略图。
  const imageThumb = sidebar.locator(
    ".project-nested-entry .project-thumb-image-src",
  );
  await expect(imageThumb).toHaveCount(1);
  await expect(imageThumb).toHaveAttribute(
    "src",
    "/fixtures/demo/blue-hour.png",
  );
  // 未分组文案项目：纯色块 + 聊天图标。
  const demoRow = ungroupedSection(sidebar).locator(".project-entry", {
    hasText: "对话项目",
  });
  await expect(demoRow.locator(".project-thumb-chat")).toHaveCount(1);
  await expect(demoRow.locator(".project-thumb-chat img")).toHaveAttribute(
    "src",
    "/design/figma/project-chat-glyph.svg",
  );
  // 新建未生成项目 → 纯色块（随机色，不带聊天图标）。
  await createUngrouped(sidebar, "草稿项目");
  const draftRow = ungroupedSection(sidebar).locator(".project-entry", {
    hasText: "草稿项目",
  });
  const draftThumb = draftRow.locator(".project-thumb-color");
  await expect(draftThumb).toHaveCount(1);
  await expect(draftThumb).toHaveCSS("background-color", /rgb\(/);
  await expect(draftRow.locator(".project-thumb-chat")).toHaveCount(0);
  // 拖入文件夹后缩略图随项目保留（仍是纯色块）。
  const folder = sidebar.getByRole("button", {
    name: "KK项目",
    exact: true,
  });
  await draftRow.dragTo(folder, { sourcePosition: { x: 60, y: 14 } });
  await expect(
    sidebar.locator(".project-nested-entry .project-thumb-color"),
  ).toHaveCount(1);
});

test("三点菜单移动到项目组：可移入已有文件夹或新建文件夹", async ({ page }) => {
  const sidebar = await openSidebar(page);
  await sidebar
    .getByRole("button", { name: "创建项目文件夹", exact: true })
    .click();
  await createUngrouped(sidebar, "临时项目A");
  let entry = ungroupedSection(sidebar).locator(".project-entry", {
    hasText: "临时项目A",
  });
  await entry.getByRole("button", { name: "更多项目设置" }).click();
  await expect(
    page.getByRole("menu", { name: "项目设置", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("menuitem", { name: "移动到项目组", exact: true })
    .click();
  const submenu = page.getByRole("menu", {
    name: "移动到项目组",
    exact: true,
  });
  await expect(
    submenu.getByRole("menuitem", { name: "新建文件夹", exact: true }),
  ).toBeVisible();
  await submenu
    .getByRole("menuitem", { name: "新建文件夹", exact: true })
    .click();
  await expect(
    sidebar.locator(".project-nested-entry .project-link", {
      hasText: "临时项目A",
    }),
  ).toBeVisible();
  await expect(
    ungroupedSection(sidebar).getByText("临时项目A", { exact: true }),
  ).toBeHidden();

  await createUngrouped(sidebar, "临时项目B");
  entry = ungroupedSection(sidebar).locator(".project-entry", {
    hasText: "临时项目B",
  });
  await entry.getByRole("button", { name: "更多项目设置" }).click();
  await page
    .getByRole("menuitem", { name: "移动到项目组", exact: true })
    .click();
  await page
    .getByRole("menu", { name: "移动到项目组", exact: true })
    .getByRole("menuitem", { name: "新建项目文件夹", exact: true })
    .click();
  const newFolder = groupedSection(sidebar).locator(".folder-heading-toggle", {
    hasText: "临时项目B",
  });
  await expect(newFolder).toHaveAttribute("aria-expanded", "true");
  await expect(
    sidebar.locator(".project-nested-entry .project-link", {
      hasText: "临时项目B",
    }),
  ).toBeVisible();
  await expect(
    ungroupedSection(sidebar).getByText("临时项目B", { exact: true }),
  ).toBeHidden();
});
