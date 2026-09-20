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

async function armSidebarTransitionSampling(page: Page): Promise<void> {
  await page.evaluate(() => {
    const sidebar = document.querySelector<HTMLElement>(".sidebar");
    if (!sidebar) throw new Error("Expected the sidebar before sampling");

    const observer = new MutationObserver(() => {
      const transitions = sidebar
        .getAnimations()
        .filter(
          (item) =>
            "transitionProperty" in item && item.playState !== "finished",
        );
      if (!transitions.length) return;

      for (const transition of transitions) {
        transition.pause();
        transition.currentTime = 0;
      }
      observer.disconnect();
    });
    observer.observe(sidebar, {
      attributes: true,
      attributeFilter: ["class"],
    });
  });
}

async function sampleSidebarTransition(page: Page) {
  return page.evaluate(async () => {
    const sidebar = document.querySelector<HTMLElement>(".sidebar");
    if (!sidebar) throw new Error("Expected the sidebar while sampling");

    let transitions: Animation[] = [];
    for (let attempt = 0; attempt < 60; attempt += 1) {
      transitions = sidebar
        .getAnimations()
        .filter(
          (item) =>
            "transitionProperty" in item && item.playState !== "finished",
        );
      if (
        transitions.length &&
        transitions.every((item) => item.playState === "paused")
      )
        break;
      await new Promise(requestAnimationFrame);
    }
    if (
      !transitions.length ||
      transitions.some((item) => item.playState !== "paused")
    )
      throw new Error("Expected the real sidebar width/padding transitions");

    const durations = transitions.map(
      (item) => item.effect?.getComputedTiming().duration,
    );
    const duration = durations.find(
      (value): value is number => typeof value === "number" && value > 0,
    );
    if (duration === undefined)
      throw new Error("Expected a nonzero sidebar transition duration");

    const samples = [0, 0.25, 0.5, 0.75, 1].map((fraction) => {
      for (const transition of transitions) {
        transition.currentTime = duration * fraction;
      }
      const frame = document
        .querySelector(".workspace-content")!
        .getBoundingClientRect();
      const task = document
        .querySelector(".task-button")!
        .getBoundingClientRect();
      const toolbar = document
        .querySelector(".canvas-toolbar")!
        .getBoundingClientRect();
      return {
        frameX: frame.x,
        taskX: task.x,
        toolbarX: toolbar.x,
        width: sidebar.getBoundingClientRect().width,
        rows: [...document.querySelectorAll(".project-link")].map((el) => {
          const row = el.getBoundingClientRect();
          return [row.width, row.height];
        }),
        brand: Number(
          getComputedStyle(document.querySelector(".brand strong")!).opacity,
        ),
      };
    });
    for (const transition of transitions) transition.finish();
    return samples;
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
    ".project-groups > section:last-of-type > .project-entry",
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
  await armSidebarTransitionSampling(page);
  await page.getByRole("button", { name: "收起侧边栏", exact: true }).click();
  const samples = await sampleSidebarTransition(page);
  expect(
    samples.some((sample) => sample.frameX > 71 && sample.frameX < 290),
  ).toBe(true);
  for (const sample of samples) {
    expect(Math.abs(sample.taskX - sample.frameX - 30)).toBeLessThan(0.1);
    expect(Math.abs(sample.toolbarX - 719)).toBeLessThan(0.1);
  }

  await armSidebarTransitionSampling(page);
  await page.getByRole("button", { name: "展开侧边栏", exact: true }).click();
  const opening = await sampleSidebarTransition(page);
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
    ".project-groups > section:first-of-type > .project-entry > .project-pin",
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
