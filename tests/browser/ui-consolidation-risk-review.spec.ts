import { expect, test, type Page } from "@playwright/test";
import { openWorkspace, uploadCanvasMedia } from "./helpers";
import type { CreationSnapshot } from "../../src/features/creation/model";

async function reopenProject(page: Page) {
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page
    .locator(".project-library-card")
    .filter({ hasText: "Agent 验证项目" })
    .click();
  await expect(page.getByRole("region", { name: "无限画布" })).toBeVisible();
}

async function openCollection(page: Page, name: "我喜欢的" | "画布标签") {
  await page.getByRole("button", { name: "喜欢与标签", exact: true }).click();
  await page.getByRole("menuitem", { name, exact: true }).click();
}

test("非图片工具栏跟随本卡片，画外图片标题不能隐藏同行视频操作", async ({
  page,
}, testInfo) => {
  await openWorkspace(page);
  await page.evaluate(() => {
    const key = "kk-studio-next:creation:v1";
    const snapshot = JSON.parse(localStorage.getItem(key)!) as CreationSnapshot;
    const project = snapshot.projects.find(
      (entry) => entry.id === snapshot.activeProjectId,
    )!;
    project.canvas!.positions.image = { x: 82, y: -2500 };
    project.canvas!.positions.video1 = { x: 140, y: 320 };
    project.canvas!.positions.video2 = { x: 570, y: 320 };
    project.canvas!.viewport = { x: 0, y: 0, scale: 0.8 };
    snapshot.revision = Math.max(snapshot.revision + 1, Date.now());
    localStorage.setItem(key, JSON.stringify(snapshot));
  });
  await page.reload();
  await reopenProject(page);
  for (const id of ["video1", "video2"]) {
    const node = page.getByTestId("canvas-node-" + id);
    await uploadCanvasMedia(node, "video");
    await node.locator(".video-node > span").click();
    const toolbar = page.getByRole("toolbar", { name: /^卡片操作：/ });
    await expect(toolbar).toBeVisible();
    await expect(toolbar.getByRole("button", { name: /^喜欢/ })).toBeVisible();
    await expect(
      toolbar.getByRole("button", { name: "编辑标签", exact: true }),
    ).toBeVisible();
    await expect
      .poll(async () => {
        const card = (await node.boundingBox())!;
        const actions = (await toolbar.boundingBox())!;
        return card.y - (actions.y + actions.height);
      })
      .toBeGreaterThanOrEqual(4);
    await expect
      .poll(async () => {
        const card = (await node.boundingBox())!;
        const actions = (await toolbar.boundingBox())!;
        return card.y - (actions.y + actions.height);
      })
      .toBeLessThanOrEqual(32);
    expect(
      (await page.locator(".image-caption").boundingBox())!.y,
    ).toBeLessThan(0);
  }
  await page.screenshot({
    path: testInfo.outputPath("nonimage-own-toolbar.png"),
    animations: "disabled",
  });
});

test("空图片只显示上传，有图后才显示内容操作", async ({ page }) => {
  await openWorkspace(page);
  const node = page.getByTestId("canvas-node-image");
  await expect(node.locator(".uploaded-image")).toHaveCount(0);
  await node.locator(".image-preview").click();
  const toolbar = page.getByRole("toolbar", { name: /^图片操作：/ });
  await expect(toolbar).toHaveCount(0);
  await expect(
    node.getByRole("button", { name: "上传图片", exact: true }),
  ).toBeVisible();
  await uploadCanvasMedia(node, "image");
  await expect(toolbar).toBeVisible();
  await expect(
    node.getByRole("button", { name: "上传图片", exact: true }),
  ).toHaveCount(0);
  await expect(
    toolbar.getByRole("button", { name: "放大查看参考图片", exact: true }),
  ).toBeEnabled();
  await expect(
    toolbar.getByRole("button", { name: "重绘参考图片", exact: true }),
  ).toBeEnabled();
  await toolbar.getByRole("button", { name: /^喜欢/ }).click();
  await expect(
    toolbar.getByRole("button", { name: /^取消喜欢/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await toolbar.getByRole("button", { name: "编辑标签", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "编辑标签", exact: true });
  await editor.getByRole("button", { name: "人物", exact: true }).click();
  await editor
    .getByRole("button", { name: "关闭标签编辑", exact: true })
    .click();
  await openCollection(page, "画布标签");
  const tags = page.getByTestId("canvas-tags-panel");
  await tags.getByLabel("标签分类", { exact: true }).selectOption("人物");
  await expect(tags.locator(".catalog-tag-card")).toHaveCount(1);
});

test("共享输入焦点样式覆盖高优先级旧规则，保留内部弱提示", async ({ page }) => {
  await page.goto("/");
  // Browser CSS fixtures exercise the real loaded rules for three page-specific
  // parents; they do not claim those pages' feature/runtime acceptance.
  await page.evaluate(() => {
    const host = document.createElement("div");
    host.id = "focus-regression-fixtures";
    host.style.cssText =
      "position:fixed;left:8px;top:80px;z-index:99999;background:var(--kk-bg-surface)";
    for (const name of [
      "google-agent-controls",
      "stage-plan-panel",
      "catalog-page-search",
    ]) {
      const wrapper = document.createElement("div");
      wrapper.className = name;
      const input = document.createElement("input");
      input.setAttribute("aria-label", "weak-focus-" + name);
      input.value = "输入草稿";
      wrapper.append(input);
      host.append(wrapper);
    }
    document.body.append(host);
  });
  for (const name of [
    "google-agent-controls",
    "stage-plan-panel",
    "catalog-page-search",
  ]) {
    const input = page.getByLabel("weak-focus-" + name, { exact: true });
    await input.focus();
    await expect(input).toHaveCSS("outline-style", "none");
    await expect
      .poll(() =>
        input.evaluate((element) => getComputedStyle(element).boxShadow),
      )
      .toContain("inset");
    await expect
      .poll(() =>
        input.evaluate(
          (element) => getComputedStyle(element.parentElement!).outlineStyle,
        ),
      )
      .toBe("none");
  }
  await page
    .locator("#focus-regression-fixtures")
    .evaluate((element) => element.remove());
});

test("390首页按钮全部位于输入容器内，无画布生成参数或模型入口溢出", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const composer = page.locator(".start-composer");
  const footer = composer.locator(".start-composer-footer");
  await expect(composer).toBeVisible();
  const geometry = await footer.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return {
      width: element.clientWidth,
      scrollWidth: element.scrollWidth,
      buttons: [...element.querySelectorAll<HTMLButtonElement>("button")]
        .filter((button) => button.getClientRects().length > 0)
        .map((button) => {
          const rect = button.getBoundingClientRect();
          return {
            name: button.ariaLabel || button.textContent?.trim(),
            left: rect.left,
            right: rect.right,
            width: rect.width,
            row: rect.top,
          };
        }),
      left: box.left,
      right: box.right,
    };
  });
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.width + 1);
  for (const button of geometry.buttons) {
    expect(button.left, String(button.name)).toBeGreaterThanOrEqual(
      geometry.left - 1,
    );
    expect(button.right, String(button.name)).toBeLessThanOrEqual(
      geometry.right + 1,
    );
    expect(button.width, String(button.name)).toBeGreaterThanOrEqual(24);
  }
  await expect(
    composer.getByRole("button", { name: "生成参数", exact: true }),
  ).toHaveCount(0);
  await expect(
    composer.getByRole("button", { name: "开始创建项目", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("home-mobile-no-overflow.png"),
    animations: "disabled",
  });
});

test("重叠的已打开面板可以反复从菜单置顶且另一个仍打开", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openWorkspace(page);
  for (const name of [
    "我喜欢的",
    "画布标签",
    "我喜欢的",
    "画布标签",
  ] as const) {
    await openCollection(page, name);
    const selected = page.getByTestId(
      name === "我喜欢的" ? "canvas-likes-panel" : "canvas-tags-panel",
    );
    await expect(
      selected.getByRole("button", {
        name: name === "我喜欢的" ? "移动喜欢面板" : "移动标签面板",
      }),
    ).toBeFocused();
    await expect
      .poll(() =>
        selected.evaluate((element) => {
          const box = element.getBoundingClientRect();
          return document
            .elementFromPoint(box.x + 20, box.y + 20)
            ?.closest("[data-testid]")
            ?.getAttribute("data-testid");
        }),
      )
      .toBe(name === "我喜欢的" ? "canvas-likes-panel" : "canvas-tags-panel");
  }
  await expect(page.getByTestId("canvas-likes-panel")).toBeVisible();
  await expect(page.getByTestId("canvas-tags-panel")).toBeVisible();
});
