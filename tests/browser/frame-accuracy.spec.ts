import { expect, test, type Page } from "@playwright/test";
import { openWorkspace } from "./helpers";
import { arrangeSidebarFolder } from "./sidebar-fixture";

async function openArrangedWorkspace(page: Page) {
  const sidebar = await arrangeSidebarFolder(page);
  await sidebar.getByRole("button", { name: "Agent 验证项目" }).click();
  await expect(page.getByRole("region", { name: "无限画布" })).toBeVisible();
  await sidebar.locator(".folder-heading-toggle").click();
}

async function rect(page: Page, selector: string, expected: number[]) {
  await expect
    .poll(
      async () => {
        const box = await page.locator(selector).boundingBox();
        if (!box) return Infinity;
        return Math.max(
          ...[box.x, box.y, box.width, box.height].map((n, i) =>
            Math.abs(n - expected[i]),
          ),
        );
      },
      { message: selector },
    )
    .toBeLessThan(0.1);
}

async function freezeSidebarMotion(page: Page) {
  // Observe the actual React class change before returning across processes.
  // A busy CI worker can otherwise miss the entire 300ms transition after click.
  await page.evaluate(() => {
    const sidebar = document.querySelector(".sidebar")!;
    const observer = new MutationObserver(() => {
      const animations = sidebar.getAnimations({ subtree: true });
      const width = animations.find(
        (animation) =>
          animation instanceof CSSTransition &&
          animation.transitionProperty === "width" &&
          (animation.effect as KeyframeEffect).target === sidebar,
      );
      if (!width) return;
      for (const animation of animations) {
        animation.pause();
        animation.currentTime = 0;
      }
      observer.disconnect();
    });
    observer.observe(sidebar, {
      attributes: true,
      attributeFilter: ["class"],
    });
  });
}

async function sampleSidebarMotion(page: Page) {
  return page.evaluate(async () => {
    const sidebar = document.querySelector(".sidebar")!;
    const animations = sidebar.getAnimations({ subtree: true });
    const width = animations.find(
      (animation) =>
        animation instanceof CSSTransition &&
        animation.transitionProperty === "width" &&
        (animation.effect as KeyframeEffect).target === sidebar,
    );
    if (!width || width.playState !== "paused")
      throw new Error("Expected the real sidebar width transition");
    const duration = width.effect?.getComputedTiming().duration;
    if (typeof duration !== "number" || duration <= 0)
      throw new Error("Expected a nonzero sidebar transition duration");
    const result = [];
    for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
      // Keep all tracks on the same elapsed time, including the brand delay.
      for (const animation of animations)
        animation.currentTime = duration * fraction;
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      result.push({
        width: sidebar.getBoundingClientRect().width,
        usableWidth: parseFloat(
          getComputedStyle(
            document.querySelector(".infinite-canvas")!,
          ).getPropertyValue("--canvas-usable-width"),
        ),
        frame: document
          .querySelector(".workspace-content")!
          .getBoundingClientRect().x,
        task: document.querySelector(".task-button")!.getBoundingClientRect().x,
        toolbar: document
          .querySelector(".canvas-toolbar")!
          .getBoundingClientRect().x,
        rows: [...document.querySelectorAll(".project-link")].map((el) => {
          const r = el.getBoundingClientRect();
          return [r.width, r.height];
        }),
        folders: [...document.querySelectorAll(".folder-heading-row")].map(
          (el) => {
            const r = el.getBoundingClientRect();
            return [r.width, r.height];
          },
        ),
        brand: Number(
          getComputedStyle(document.querySelector(".brand strong")!).opacity,
        ),
      });
    }
    for (const animation of animations) animation.finish();
    return result;
  });
}

test("latest two Figma frames retain exact shell anchors through independent collapse", async ({
  page,
}) => {
  await openArrangedWorkspace(page);
  await rect(page, ".workspace-content", [292, 52, 1628, 1028]);
  await rect(page, ".task-button", [444, 86, 96, 32]);
  await rect(
    page,
    ".project-groups > section:last-of-type > .project-group-content > .project-entry",
    [
      16,
      (await page
        .locator(".project-groups > section:last-of-type > .group-heading-row")
        .evaluate((e) => e.getBoundingClientRect().bottom)) + 4,
      259,
      36,
    ],
  );
  await rect(page, ".canvas-top-right", [1123, 84, 281, 36]);
  await expect(page.getByRole("group", { name: "画布导航" })).toBeVisible();
  const openNavigation = await page.locator(".canvas-top-right").boundingBox();
  const openPanel = await page.locator(".conversation-panel").boundingBox();
  expect(openNavigation!.x + openNavigation!.width).toBeLessThanOrEqual(
    openPanel!.x - 10,
  );
  await page.getByRole("button", { name: "小地图", exact: true }).click();
  await expect(page.getByRole("region", { name: "画布小地图" })).toBeVisible();
  await page.getByRole("button", { name: "小地图", exact: true }).click();
  await page.getByLabel("对话内容", { exact: true }).fill("收纳后保留这段草稿");
  await page.getByRole("button", { name: "收起对话", exact: true }).click();
  await rect(page, ".canvas-top-right", [1559, 84, 281, 36]);
  await rect(page, ".chat-reopen", [1848, 80, 44, 44]);
  await expect(
    page.getByRole("button", { name: "打开对话", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "收起侧边栏", exact: true }).click();
  await rect(page, ".workspace-content", [72, 52, 1848, 1028]);
  await rect(page, ".task-button", [224, 86, 96, 32]);
  await rect(page, ".canvas-toolbar", [852, 1016, 288, 52]);
  await rect(page, ".sidebar-search", [20, 952, 32, 32]);
  await rect(page, ".sidebar-settings", [20, 1032, 32, 32]);
  await rect(page, ".sidebar-account", [20, 992, 32, 32]);
  await page.getByRole("button", { name: "打开对话", exact: true }).click();
  await expect(page.getByLabel("对话内容", { exact: true })).toHaveValue(
    "收纳后保留这段草稿",
  );
  await expect(page.locator(".sidebar")).toHaveClass(/is-collapsed/);
  await rect(page, ".canvas-toolbar", [608, 1016, 288, 52]);
  await page.getByRole("button", { name: "展开侧边栏", exact: true }).click();
  await rect(page, ".task-button", [444, 86, 96, 32]);
});

test("closing chat cannot steal focus already moved to a canvas card", async ({
  page,
}) => {
  await openWorkspace(page);
  await page.evaluate(() => {
    document
      .querySelector<HTMLButtonElement>('[aria-label="收起对话"]')!
      .click();
    document
      .querySelector<HTMLElement>('[data-testid="canvas-node-image"]')!
      .focus();
  });
  await expect(page.getByTestId("canvas-node-image")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("图片提示词")).toBeVisible();
});

test("sidebar motion keeps the task attached to the frame and toolbar stationary", async ({
  page,
}) => {
  await openArrangedWorkspace(page);
  await freezeSidebarMotion(page);
  await page.getByRole("button", { name: "收起侧边栏", exact: true }).click();
  const samples = await sampleSidebarMotion(page);
  expect(samples).toHaveLength(5);
  expect(samples.some(({ frame }) => frame > 71 && frame < 290)).toBe(true);
  expect(samples[0].frame).toBeCloseTo(292, 1);
  expect(samples.at(-1)!.frame).toBeCloseTo(72, 1);
  for (const { frame, task, toolbar, usableWidth } of samples) {
    expect(Math.abs(task - frame - 152)).toBeLessThan(0.1);
    expect(Math.abs(toolbar - frame - (usableWidth - 288) / 2)).toBeLessThan(
      0.1,
    );
  }
  await freezeSidebarMotion(page);
  await page.getByRole("button", { name: "展开侧边栏", exact: true }).click();
  const opening = await sampleSidebarMotion(page);
  expect(opening).toHaveLength(5);
  expect(opening[0].width).toBeCloseTo(72, 1);
  expect(opening.at(-1)!.width).toBeCloseTo(292, 1);
  expect(opening.some((frame) => frame.width > 71 && frame.width < 290)).toBe(
    true,
  );
  for (const frame of opening) {
    // 文件夹二级子项目行 231px（比文件夹行 263px 短，层级缩进）；未分组行 263px
    expect(frame.rows).toEqual([
      [235, 36],
      [259, 36],
    ]);
    expect(frame.folders).toEqual([[259, 36]]);
    if (frame.width < 170) expect(frame.brand).toBe(0);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "收起侧边栏", exact: true }).click();
  await page.getByRole("button", { name: "展开侧边栏", exact: true }).click();
  await rect(page, ".workspace-content", [292, 52, 1628, 1028]);
  expect(
    await page
      .locator(".sidebar")
      .evaluate((el) => el.getAnimations({ subtree: true }).length),
  ).toBe(0);
});

test("项目文件夹行保留打开、设置与键盘菜单管理", async ({ page }) => {
  await openArrangedWorkspace(page);
  const group = page.locator(".project-folder-group").first();
  const toggle = group.locator(".folder-heading-toggle");
  const row = (await group.locator(".folder-heading-row").boundingBox())!;
  expect(row).toMatchObject({ x: 16, width: 259, height: 36 });
  await rect(
    page,
    ".project-groups > section:first-of-type > .project-folder-group > .folder-heading-row > .folder-heading-toggle",
    [row.x + 4, row.y + 2, 251, 32],
  );
  await rect(
    page,
    ".project-groups > section:first-of-type > .project-folder-group > .folder-heading-row > .project-pin",
    [row.x + 187, row.y + 2, 32, 32],
  );
  await rect(
    page,
    ".project-groups > section:first-of-type > .project-folder-group > .folder-heading-row > .project-more",
    [row.x + 223, row.y + 2, 32, 32],
  );
  // 第二层级子项目行：231px（比文件夹行 263px 短），右缘对齐文件夹行右缘，
  // 右侧图标列位与文件夹行一致（文件夹行比项目长）。
  await rect(
    page,
    ".project-groups > section:first-of-type > .project-folder-group > .project-nested-entry > .project-entry",
    [row.x + 24, row.y + row.height + 4, 235, 36],
  );
  const open = group.getByRole("button", {
    name: "打开 KK项目 工作台",
    exact: true,
  });
  await open.click();
  await expect(page.getByRole("region", { name: "无限画布" })).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await toggle.focus();
  await page.keyboard.press("Shift+F10");
  await expect(
    group.getByRole("menu", { name: "项目组设置", exact: true }),
  ).toBeVisible();
  await expect(
    group.getByRole("menuitem", { name: "置顶文件夹", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(
    group.getByRole("menuitem", { name: "改名字", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("End");
  await expect(
    group.getByRole("menuitem", { name: "删除项目组", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    group.getByRole("button", { name: "KK项目 设置", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "打开未分组项目库", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "项目库", exact: true }),
  ).toBeVisible();
});
