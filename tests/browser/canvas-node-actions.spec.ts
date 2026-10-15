import { expect, test, type Locator, type Page } from "@playwright/test";
import type { CreationSnapshot } from "../../src/features/creation/model";
import { openWorkspace, uploadCanvasMedia } from "./helpers";

test.use({ hasTouch: true });

async function addDraft(page: Page, kind: string, menuName: string) {
  await page.getByRole("button", { name: "添加资源", exact: true }).tap();
  await page.getByRole("menuitem", { name: menuName, exact: true }).tap();
  const node = page
    .getByTestId(new RegExp(`^canvas-node-added-${kind}-`))
    .last();
  await expect(node).toHaveClass(/is-selected/);
  return node;
}

async function reopenProject(page: Page) {
  await page.reload();
  await page.getByRole("button", { name: "项目库", exact: true }).tap();
  await page
    .locator(".project-library-card")
    .filter({ hasText: "Agent 验证项目" })
    .tap();
}

async function assertPreferences(page: Page, toolbar: Locator) {
  await expect(
    toolbar.getByRole("button", { name: /^取消喜欢/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await toolbar.getByRole("button", { name: "编辑标签", exact: true }).tap();
  const tags = page.getByRole("dialog", { name: "编辑标签", exact: true });
  await expect(
    tags.getByRole("button", { name: "收藏", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    tags.getByRole("button", { name: "人物", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await tags.getByRole("button", { name: "关闭标签编辑", exact: true }).tap();
}

test("窄屏四类空卡片通过卡片菜单删除并撤销", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openWorkspace(page);
  for (const [kind, menuName, title] of [
    ["image", "图片", "新图片卡片"],
    ["video", "视频", "新视频卡片"],
    ["text", "文本", "新文案卡片"],
    ["audio", "音频", "新音频卡片"],
  ]) {
    const node = await addDraft(page, kind, menuName);
    await expect(page.locator(".image-selection-toolbar")).toHaveCount(0);
    await node.focus();
    await node.press("Shift+F10");
    const menu = page.getByRole("menu", {
      name: `卡片菜单：${title}`,
      exact: true,
    });
    await menu
      .getByRole("menuitem", { name: `删除${title}`, exact: true })
      .tap();
    await expect(node).toHaveCount(0);
    await page.getByTestId("infinite-canvas").focus();
    await page.keyboard.press("Control+Z");
    await expect(node).toHaveCount(1);
  }
});

test("未加载的插件卡片可通过卡片菜单删除", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openWorkspace(page);
  await page.evaluate(() => {
    const key = "kk-studio-next:creation:v1";
    const snapshot = JSON.parse(localStorage.getItem(key)!) as CreationSnapshot;
    const project = snapshot.projects.find(
      (entry) => entry.id === snapshot.activeProjectId,
    )!;
    project.items.push({
      id: "added-plugin-actions",
      kind: "text",
      title: "待恢复插件",
      description: "",
      plugin: { type: "missing:node", width: 240, height: 160, metadata: {} },
    });
    project.canvas.positions["added-plugin-actions"] = { x: 30, y: 160 };
    project.canvas.viewport = { x: 0, y: 0, scale: 1 };
    snapshot.revision = Date.now();
    localStorage.setItem(key, JSON.stringify(snapshot));
  });
  await reopenProject(page);
  const node = page.getByTestId("canvas-node-added-plugin-actions");
  await node.locator(".plugin-node").tap();
  await expect(page.locator(".image-selection-toolbar")).toHaveCount(0);
  await node.focus();
  await node.press("Shift+F10");
  await page
    .getByRole("menu", { name: "卡片菜单：待恢复插件", exact: true })
    .getByRole("menuitem", { name: "删除待恢复插件", exact: true })
    .tap();
  await expect(node).toHaveCount(0);
  await page.getByTestId("infinite-canvas").focus();
  await page.keyboard.press("Control+Z");
  await expect(node).toHaveCount(1);
});

for (const width of [320, 390]) {
  for (const kind of ["image", "video"]) {
    test(`手机${width}在50%缩放以独立32px高按钮触屏上传${kind}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 844 });
      await openWorkspace(page);
      const label = kind === "image" ? "图片" : "视频";
      const node = await addDraft(page, kind, label);
      await page.getByRole("button", { name: "画布缩放", exact: true }).tap();
      await page.getByRole("menuitemradio", { name: "50%", exact: true }).tap();
      const toolbar = page.getByRole("toolbar", {
        name: `${kind === "image" ? "图片" : "卡片"}操作：新${label}卡片`,
        exact: true,
      });
      await expect(
        toolbar.getByRole("button", {
          name: `上传${label}`,
          exact: true,
        }),
      ).toHaveCount(0);
      const upload = node.getByRole("button", {
        name: `上传${label}`,
        exact: true,
      });
      await upload.scrollIntoViewIfNeeded();
      await expect(upload).toHaveCSS("border-radius", "8px");
      await expect
        .poll(() =>
          upload.evaluate((button) => {
            const box = button.getBoundingClientRect();
            const hit = document.elementFromPoint(
              box.x + box.width / 2,
              box.y + box.height / 2,
            );
            return {
              widthAtLeast32: box.width >= 32,
              height: box.height,
              hit: button === hit || button.contains(hit),
            };
          }),
        )
        .toEqual({ widthAtLeast32: true, height: 32, hit: true });
      await expect(
        node.getByRole("button", { name: `上传${label}`, exact: true }),
      ).toHaveCSS("border-radius", "8px");
      const position = await node.evaluate((element) => ({
        left: element.style.left,
        top: element.style.top,
      }));
      const chooser = page.waitForEvent("filechooser");
      await upload.tap();
      await (
        await chooser
      ).setFiles(
        kind === "image"
          ? "public/fixtures/demo/blue-hour.png"
          : "public/fixtures/demo/blue-hour-motion.webm",
      );
      await expect(
        node.locator(
          kind === "image" ? ".uploaded-image" : ".video-placeholder video",
        ),
      ).toBeVisible();
      expect(
        await node.evaluate((element) => ({
          left: element.style.left,
          top: element.style.top,
        })),
      ).toEqual(position);
    });
  }
}

for (const deletion of ["toolbar", "keyboard"]) {
  test(`草稿${deletion}删除后撤销和重载保留收藏标签与喜欢`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openWorkspace(page);
    const node = await addDraft(page, "video", "视频");
    await expect(page.locator(".image-selection-toolbar")).toHaveCount(0);
    await uploadCanvasMedia(node, "video");
    const id = (await node.getAttribute("data-node-id"))!;
    const toolbar = page.getByRole("toolbar", {
      name: "卡片操作：blue-hour-motion.webm",
      exact: true,
    });
    await toolbar
      .getByRole("button", { name: "喜欢blue-hour-motion.webm", exact: true })
      .tap();
    await toolbar.getByRole("button", { name: "编辑标签", exact: true }).tap();
    const tags = page.getByRole("dialog", { name: "编辑标签", exact: true });
    await tags.getByRole("button", { name: "收藏", exact: true }).tap();
    await tags.getByRole("button", { name: "人物", exact: true }).tap();
    await tags.getByRole("button", { name: "关闭标签编辑", exact: true }).tap();
    await assertPreferences(page, toolbar);
    if (deletion === "toolbar")
      await toolbar
        .getByRole("button", { name: "删除blue-hour-motion.webm", exact: true })
        .tap();
    else {
      await node.focus();
      await page.keyboard.press("Delete");
    }
    await expect(node).toHaveCount(0);
    await page.getByTestId("infinite-canvas").focus();
    await page.keyboard.press("Control+Z");
    await expect(node).toHaveCount(1);
    await node.locator(".video-node > span").tap();
    await assertPreferences(page, toolbar);
    await expect
      .poll(() =>
        page.evaluate((nodeId) => {
          const snapshot = JSON.parse(
            localStorage.getItem("kk-studio-next:creation:v1")!,
          ) as CreationSnapshot;
          const project = snapshot.projects.find(
            (entry) => entry.id === snapshot.activeProjectId,
          )!;
          return {
            exists: project.items.some((item) => item.id === nodeId),
            favorite: project.favoriteIds.includes(nodeId),
            liked: project.likedIds.includes(nodeId),
          };
        }, id),
      )
      .toEqual({ exists: true, favorite: true, liked: true });
    await reopenProject(page);
    await node.locator(".video-node > span").tap();
    await assertPreferences(page, toolbar);
  });
}

test("资源空态清除筛选和切换分类均重置来源", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openWorkspace(page);
  await page.getByRole("button", { name: "资源管理", exact: true }).tap();
  const panel = page.getByTestId("asset-panel");
  const source = panel.getByLabel("来源筛选", { exact: true });
  await expect
    .poll(() => panel.locator(".asset-card").count())
    .toBeGreaterThan(0);
  await source.selectOption("collection");
  await expect(panel.locator(".asset-card")).toHaveCount(0);
  await panel.getByRole("button", { name: "清除筛选", exact: true }).tap();
  await expect(source).toHaveValue("all");
  await expect
    .poll(() => panel.locator(".asset-card").count())
    .toBeGreaterThan(0);
  await source.selectOption("provider");
  await panel.getByRole("tab", { name: "资产", exact: true }).tap();
  await expect(source).toHaveValue("all");
  await expect
    .poll(() => panel.locator(".asset-card").count())
    .toBeGreaterThan(0);
  await source.selectOption("collection");
  await panel.getByRole("tab", { name: "画布", exact: true }).tap();
  await expect(source).toHaveValue("all");
  await expect
    .poll(() => panel.locator(".asset-card").count())
    .toBeGreaterThan(0);
});
