import { expect, test, type Page } from "@playwright/test";
import { openWorkspace } from "./helpers";

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
  return page.evaluate(() => {
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
    const result = [0, 0.25, 0.5, 0.75, 1].map((fraction) => {
      // Keep all tracks on the same elapsed time, including the brand delay.
      for (const animation of animations)
        animation.currentTime = duration * fraction;
      return {
        width: sidebar.getBoundingClientRect().width,
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
        brand: Number(
          getComputedStyle(document.querySelector(".brand strong")!).opacity,
        ),
      };
    });
    for (const animation of animations) animation.finish();
    return result;
  });
}

test("latest two Figma frames retain exact shell anchors through independent collapse", async ({
  page,
}) => {
  await openWorkspace(page);
  await rect(page, ".workspace-content", [291, 45, 1619, 1025]);
  await rect(page, ".task-button", [321, 72, 93, 30]);
  await rect(page, ".canvas-toolbar", [719, 998, 294, 50]);
  await rect(page, ".conversation-panel", [1430, 61, 470, 998]);
  await rect(
    page,
    ".project-groups > section:last-of-type > .project-group-content > .project-entry",
    [14, 511, 263, 29],
  );
  await rect(page, ".canvas-top-right", [1138.015625, 72, 280.984375, 31.109]);
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
  await rect(page, ".canvas-top-right", [1562, 72, 281, 31.109]);
  await rect(page, ".chat-reopen", [1859, 79, 18, 18]);
  await expect(
    page.getByRole("button", { name: "打开对话", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "收起侧边栏", exact: true }).click();
  await rect(page, ".workspace-content", [70, 45, 1840, 1025]);
  await rect(page, ".task-button", [100, 72, 93, 30]);
  await rect(page, ".canvas-toolbar", [719, 998, 294, 50]);
  await rect(page, ".sidebar-search", [22, 942, 26, 26]);
  await rect(page, ".sidebar-settings", [22, 982, 26, 26]);
  await rect(page, ".sidebar-account", [22, 1022, 26, 26]);
  await page.getByRole("button", { name: "打开对话", exact: true }).click();
  await expect(page.getByLabel("对话内容", { exact: true })).toHaveValue(
    "收纳后保留这段草稿",
  );
  await expect(page.locator(".sidebar")).toHaveClass(/is-collapsed/);
  await rect(page, ".canvas-toolbar", [719, 998, 294, 50]);
  await page.getByRole("button", { name: "展开侧边栏", exact: true }).click();
  await rect(page, ".task-button", [321, 72, 93, 30]);
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
  await openWorkspace(page);
  await freezeSidebarMotion(page);
  await page.getByRole("button", { name: "收起侧边栏", exact: true }).click();
  const samples = await sampleSidebarMotion(page);
  expect(samples).toHaveLength(5);
  expect(samples.some(({ frame }) => frame > 71 && frame < 290)).toBe(true);
  expect(samples[0].frame).toBeCloseTo(291, 1);
  expect(samples.at(-1)!.frame).toBeCloseTo(70, 1);
  for (const { frame, task, toolbar } of samples) {
    expect(Math.abs(task - frame - 30)).toBeLessThan(0.1);
    expect(Math.abs(toolbar - 719)).toBeLessThan(0.1);
  }
  await freezeSidebarMotion(page);
  await page.getByRole("button", { name: "展开侧边栏", exact: true }).click();
  const opening = await sampleSidebarMotion(page);
  expect(opening).toHaveLength(5);
  expect(opening[0].width).toBeCloseTo(70, 1);
  expect(opening.at(-1)!.width).toBeCloseTo(291, 1);
  expect(opening.some((frame) => frame.width > 71 && frame.width < 290)).toBe(
    true,
  );
  for (const frame of opening) {
    expect(frame.rows).toEqual([
      [263, 29],
      [231, 29],
      [263, 29],
    ]);
    if (frame.width < 170) expect(frame.brand).toBe(0);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "收起侧边栏", exact: true }).click();
  await page.getByRole("button", { name: "展开侧边栏", exact: true }).click();
  await rect(page, ".workspace-content", [291, 45, 1619, 1025]);
  expect(
    await page
      .locator(".sidebar")
      .evaluate((el) => el.getAnimations({ subtree: true }).length),
  ).toBe(0);
});

test("project row source actions retain navigation, reasons and keyboard management", async ({
  page,
}) => {
  await openWorkspace(page);
  const row = page.locator(".project-entry").first();
  await rect(
    page,
    ".project-groups > section:first-of-type > .project-group-content > .project-entry > .project-pin",
    [230, 413, 20, 21],
  );
  await expect(
    row.getByRole("button", { name: "添加创作页面", exact: true }),
  ).toBeDisabled();
  await expect(
    row.getByRole("button", { name: "添加创作页面", exact: true }),
  ).toHaveAttribute("title", /Prototype/);
  const link = row.locator(".project-link");
  await link.focus();
  await page.keyboard.press("Shift+F10");
  await expect(
    row.getByRole("menu", { name: "项目组设置", exact: true }),
  ).toBeVisible();
  await expect(
    row.getByRole("menuitem", { name: "置顶项目", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(
    row.getByRole("menuitem", { name: "改名字", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("End");
  await expect(
    row.getByRole("menuitem", { name: "关闭项目", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(link).toBeFocused();
  await page
    .getByRole("button", { name: "打开未分组项目库", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "项目库", exact: true }),
  ).toBeVisible();
});
