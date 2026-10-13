import { expect, test } from "@playwright/test";
import { openWorkspace } from "./helpers";

test("顶部喜欢与独立收藏面板保持固定屏幕尺寸", async ({ page }, testInfo) => {
  await openWorkspace(page);
  await page.getByTestId("canvas-node-image").locator(".image-preview").click();
  const toolbar = page.getByRole("toolbar", { name: /^图片操作/ });
  await toolbar.getByRole("button", { name: /^喜欢/ }).click();
  await expect(
    toolbar.getByRole("button", { name: /^取消喜欢/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "喜欢与标签", exact: true }).click();
  await page.getByRole("menuitem", { name: "我喜欢的", exact: true }).click();
  const likes = page.getByTestId("canvas-likes-panel");
  await expect(likes).toBeVisible();
  await page.getByRole("button", { name: "喜欢与标签", exact: true }).click();
  await page.getByRole("menuitem", { name: "画布标签", exact: true }).click();
  const tags = page.getByTestId("canvas-tags-panel");
  await expect(tags).toBeVisible();
  const world = page.locator(".canvas-stage");
  const beforeTransform = await world.getAttribute("style");
  const before = (await likes.boundingBox())!;
  const handle = likes.getByRole("button", { name: "移动喜欢面板" });
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + 16);
  await page.mouse.down();
  await page.mouse.move(box.x + 120, box.y + 76, { steps: 5 });
  await page.mouse.up();
  const moved = (await likes.boundingBox())!;
  expect(moved.x - before.x).toBeCloseTo(100, 0);
  expect(moved.y - before.y).toBeCloseTo(60, 0);
  expect(moved.width).toBe(before.width);
  expect(moved.height).toBe(before.height);
  expect(await world.getAttribute("style")).toBe(beforeTransform);
  await page.getByRole("button", { name: "画布缩放", exact: true }).click();
  await page.getByRole("menuitemradio", { name: "50%", exact: true }).click();
  const afterZoom = (await likes.boundingBox())!;
  expect(afterZoom.width).toBe(before.width);
  expect(afterZoom.height).toBe(before.height);
  await likes.getByRole("button", { name: "关闭喜欢面板" }).click();
  await expect(likes).toBeHidden();
  await expect(tags).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("fixed-tag-panel.png"),
    animations: "disabled",
  });
});

test("旧收藏进入标签，取消收藏标签后重载不复活", async ({ page }) => {
  await openWorkspace(page);
  await page.evaluate(() => {
    const key = "kk-studio-next:creation:v1";
    const snapshot = JSON.parse(localStorage.getItem(key)!);
    snapshot.projects[0].favoriteIds = ["image"];
    snapshot.revision = Date.now();
    localStorage.setItem(key, JSON.stringify(snapshot));
  });
  await page.reload();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page
    .locator(".project-library-card")
    .filter({ hasText: "Agent 验证项目" })
    .click();
  await page.getByRole("button", { name: "喜欢与标签", exact: true }).click();
  await page.getByRole("menuitem", { name: "画布标签", exact: true }).click();
  const tags = page.getByTestId("canvas-tags-panel");
  await tags.getByLabel("标签分类", { exact: true }).selectOption("收藏");
  await expect(tags.locator(".catalog-tag-card")).toHaveCount(1);
  await tags.getByRole("button", { name: "编辑标签", exact: true }).click();
  await page
    .getByRole("dialog", { name: "编辑标签", exact: true })
    .getByRole("button", { name: "收藏", exact: true })
    .click();
  await expect(tags.locator(".catalog-tag-card")).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("kk-studio-next:creation:v1")!)
            .projects[0].favoriteIds,
      ),
    )
    .toEqual([]);
});
