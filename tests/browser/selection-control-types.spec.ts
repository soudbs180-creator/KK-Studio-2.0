import { expect, test } from "@playwright/test";
import { openWorkspace } from "./helpers";

test.afterEach(async ({ page }, testInfo) => {
  await testInfo.attach("runtime", {
    body: JSON.stringify(
      await page.evaluate(() => ({
        url: location.href,
        runtime: document.documentElement.dataset,
        scripts: Array.from(document.scripts).map((script) => script.src),
        styles: Array.from(document.styleSheets).map((sheet) => sheet.href),
      })),
    ),
    contentType: "application/json",
  });
  await page.screenshot({ path: testInfo.outputPath("controls.png") });
});

test("画布浏览器选择共享44高容器和中性选中底色", async ({ page }) => {
  await openWorkspace(page);
  const group = page.getByRole("radiogroup", { name: "视图切换" });
  await expect(group).toHaveCSS("width", "144px");
  await expect(group).toHaveCSS("height", "44px");
  await expect(group).toHaveCSS("gap", "4px");
  await expect(group).toHaveCSS("background-color", "rgb(31, 31, 31)");
  const buttons = group.getByRole("radio");
  for (const button of await buttons.all()) {
    await expect(button).toHaveCSS("height", "44px");
    await expect(button).toHaveCSS("font-size", "12px");
  }
  const browser = group.getByRole("radio", { name: "浏览器", exact: true });
  await browser.click();
  await expect(browser).toHaveAttribute("aria-checked", "true");
  await expect(browser).toHaveCSS("background-color", "rgb(51, 51, 51)");
  await group.getByRole("radio", { name: "画布", exact: true }).click();
  await expect(browser).toHaveAttribute("aria-checked", "false");
});

test("清晰度选择32高且文字可读，切换保留当前参数", async ({ page }) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page.getByRole("menuitem", { name: "视频", exact: true }).click();
  const node = page.getByTestId(/^canvas-node-added-video-/).first();
  await node.getByRole("button", { name: "视频参数", exact: true }).click();
  const group = node.getByRole("group", { name: "清晰度", exact: true });
  await expect(group).toHaveCSS("gap", "4px");
  await expect(group).toHaveCSS("background-color", "rgb(31, 31, 31)");
  for (const button of await group.getByRole("button").all()) {
    await expect(button).toHaveCSS("height", "32px");
    await expect(button).toHaveCSS("font-size", "12px");
  }
  const quality = group.getByRole("button", { name: "1080p", exact: true });
  await expect(
    group.getByRole("button", { name: "4K", exact: true }),
  ).toBeDisabled();
  await quality.click();
  await expect(quality).toHaveAttribute("aria-pressed", "true");
  await expect(quality).toHaveCSS("background-color", "rgb(51, 51, 51)");
});

test("任务阶段六选一保持同一容器，点击后只有对应阶段选中", async ({ page }) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "打开任务列表", exact: true }).click();
  const panel = page.getByRole("region", { name: "任务列表", exact: true });
  await expect(
    panel.getByRole("searchbox", { name: "搜索任务", exact: true }),
  ).toBeVisible();
  await expect(panel.locator(".task-panel-search")).toHaveText("");
  const failed = panel.getByRole("button", { name: "失败", exact: true });
  await failed.click();
  await expect(failed).toHaveCSS("height", "32px");
  await expect(failed).toHaveCSS("background-color", "rgb(51, 51, 51)");
  expect(
    await failed.evaluate(
      (element) => getComputedStyle(element, "::before").content,
    ),
  ).toBe("none");
  await expect(
    panel.getByRole("button", { name: "关闭任务列表", exact: true }),
  ).toHaveCSS("width", "32px");
  await page
    .getByRole("button", { name: "打开任务工作台", exact: true })
    .click();
  const tabs = page.getByRole("tablist", { name: "任务阶段", exact: true });
  await expect(tabs).toHaveCSS("height", "48px");
  const group = tabs.locator(".task-workbench-tab-options");
  await expect(group).toHaveCSS("gap", "4px");
  await expect(group).toHaveCSS("background-color", "rgb(31, 31, 31)");
  await expect(group.getByRole("tab")).toHaveCount(6);
  for (const button of await group.getByRole("tab").all()) {
    await expect(button).toHaveCSS("height", "32px");
    await expect(button).toHaveCSS("font-size", "12px");
  }
  const plan = group.getByRole("tab", { name: "Plan", exact: true });
  await plan.click();
  await expect(plan).toHaveAttribute("aria-selected", "true");
  await expect(plan).toHaveCSS("background-color", "rgb(51, 51, 51)");
  await expect(group.locator('[aria-selected="true"]')).toHaveCount(1);
});

test("工具栏独立箭头保持圆形居中，展开后向上且菜单不推挤底栏", async ({
  page,
}) => {
  await openWorkspace(page);
  const toolbar = page.locator(".canvas-toolbar");
  const toggle = toolbar.locator(".toolbar-toggle");
  await expect(toggle).toHaveCSS("width", "24px");
  await expect(toggle).toHaveCSS("height", "44px");
  const before = await toolbar.boundingBox();
  const arrow = toggle.locator(".toolbar-icon-collapse");
  await expect(arrow).toHaveCSS("width", "8px");
  await expect(arrow).toHaveCSS("height", "8px");
  const buttonBox = (await toggle.boundingBox())!;
  const arrowBox = (await arrow.boundingBox())!;
  expect(arrowBox.x + arrowBox.width / 2).toBeCloseTo(
    buttonBox.x + buttonBox.width / 2,
    1,
  );
  expect(arrowBox.y + arrowBox.height / 2).toBeCloseTo(
    buttonBox.y + buttonBox.height / 2,
    1,
  );
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  const plate = await toggle.evaluate((element) => {
    const style = getComputedStyle(element, "::before");
    return {
      width: style.width,
      height: style.height,
      radius: style.borderRadius,
      background: style.backgroundColor,
    };
  });
  expect(plate).toEqual({
    width: "24px",
    height: "24px",
    radius: "1000px",
    background: "rgb(27, 27, 27)",
  });
  await expect(arrow).toHaveCSS("transform", "matrix(-1, 0, 0, -1, 0, 0)");
  const menu = page.getByRole("menu", { name: "画布工具选择", exact: true });
  await expect(menu).toBeVisible();
  const menuBox = (await menu.boundingBox())!;
  expect(menuBox.x).toBeCloseTo(buttonBox.x, 1);
  expect(buttonBox.y - menuBox.y - menuBox.height).toBeCloseTo(8, 1);
  expect(await toolbar.boundingBox()).toEqual(before);
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(arrow).toHaveCSS("transform", "none");
});

test("素材库选择保留容器底色且没有标题下划线，辅助控件同级", async ({
  page,
}) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "资源管理", exact: true }).click();
  const panel = page.getByTestId("asset-panel");
  const scope = panel.getByRole("tablist", { name: "资源范围" });
  const buttons = scope.getByRole("tab");
  await expect(buttons).toHaveCount(3);
  for (let index = 0; index < (await buttons.count()); index++) {
    await expect(buttons.nth(index)).toHaveCSS("height", "32px");
    expect(
      await buttons
        .nth(index)
        .evaluate((element) => getComputedStyle(element, "::after").content),
    ).toBe("none");
  }
  const selectedColor = await buttons
    .nth(0)
    .evaluate((element) => getComputedStyle(element).backgroundColor);
  await buttons.nth(1).click();
  await expect(buttons.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(buttons.nth(1)).toHaveCSS("background-color", selectedColor);
  await expect(
    panel.getByRole("button", { name: "关闭资产管理", exact: true }),
  ).toHaveCSS("height", "32px");
  await expect(panel.locator(".asset-drag-icon")).toHaveCSS("width", "16px");
  await expect(
    panel.getByRole("button", { name: "列表视图", exact: true }),
  ).toHaveCSS("height", "32px");
  for (const name of ["类型筛选", "标签筛选", "排序方式"])
    await expect(panel.getByLabel(name, { exact: true })).toHaveCSS(
      "height",
      "32px",
    );
  await panel.getByLabel("类型筛选", { exact: true }).selectOption("video");
  await expect(panel.getByLabel("类型筛选", { exact: true })).toHaveValue(
    "video",
  );
});

test("扩展标题靠左按内容排列，单一下划线随点击和缩放保持居中", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/");
  await page
    .getByRole("complementary", { name: "工作台侧栏" })
    .getByRole("button", { name: "扩展", exact: true })
    .click();
  const tabs = page.getByRole("tablist", { name: "扩展分类", exact: true });
  const buttons = tabs.getByRole("tab");
  const line = tabs.getByTestId("sliding-pill-indicator");
  await expect(buttons).toHaveText(["Skill", "MCP", "协作伙伴"]);
  for (const width of [1920, 1280]) {
    await page.setViewportSize({ width, height: 1080 });
    const boxes = await buttons.evaluateAll((elements) =>
      elements.map((element) => {
        const box = element.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(element);
        return {
          left: box.left,
          right: box.right,
          width: box.width,
          text: range.getBoundingClientRect().width,
        };
      }),
    );
    for (let i = 0; i < boxes.length; i++) {
      expect(boxes[i].width - boxes[i].text).toBeCloseTo(16, 0);
      if (i) expect(boxes[i].left - boxes[i - 1].right).toBeCloseTo(8, 0);
    }
    expect(boxes[2].right - boxes[0].left).toBeLessThan(220);
    for (const index of [0, 2, 1]) {
      await buttons.nth(index).click();
      await expect(buttons.nth(index)).toHaveAttribute("aria-selected", "true");
      await expect(line).toHaveCount(1);
      await expect(line).toHaveCSS("width", "24px");
      await expect(line).toHaveCSS("height", "2px");
      await expect
        .poll(async () => {
          const selected = await buttons.nth(index).boundingBox();
          const indicator = await line.boundingBox();
          return Math.abs(
            indicator!.x +
              indicator!.width / 2 -
              selected!.x -
              selected!.width / 2,
          );
        })
        .toBeLessThan(1);
    }
  }
});

test("项目库标题切换文字保持同色同字重，只有细胶囊移位", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  const tabs = page.locator(".catalog-page-tabs").first();
  const buttons = tabs.getByRole("tab");
  await expect(buttons).toHaveCount(3);
  const colors = await buttons.evaluateAll((elements) =>
    elements.map((element) => {
      const style = getComputedStyle(element);
      return {
        color: style.color,
        weight: style.fontWeight,
        background: style.backgroundColor,
      };
    }),
  );
  expect(new Set(colors.map((item) => item.color)).size).toBe(1);
  expect(new Set(colors.map((item) => item.weight)).size).toBe(1);
  expect(colors.every((item) => item.background === "rgba(0, 0, 0, 0)")).toBe(
    true,
  );
  await buttons.nth(1).click();
  await expect(buttons.nth(1)).toHaveAttribute("aria-selected", "true");
  const indicator = tabs.getByTestId("sliding-pill-indicator");
  await expect(indicator).toHaveCount(1);
  await expect(indicator).toHaveCSS("width", "24px");
  await expect(indicator).toHaveCSS("height", "2px");
  expect(
    await buttons
      .nth(0)
      .evaluate((element) => getComputedStyle(element, "::after").content),
  ).toBe("none");
});

test("模型能力使用容器内选择，不继承标题下划线", async ({ page }) => {
  await page.goto("/");
  await page
    .locator(".start-composer")
    .getByRole("button", { name: "模型", exact: true })
    .click();
  const menu = page.getByRole("menu", { name: "选择模型", exact: true });
  const tabs = menu.getByRole("tablist", { name: "模型能力分类", exact: true });
  await expect(tabs.getByRole("tab")).toHaveCount(2);
  await expect(tabs).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  for (const button of await tabs.getByRole("tab").all()) {
    await expect(button).toHaveCSS("height", "32px");
    expect(
      await button.evaluate(
        (element) => getComputedStyle(element, "::after").content,
      ),
    ).toBe("none");
  }
  await menu.getByRole("tab", { name: "图像生成", exact: true }).click();
  await expect(
    menu.getByRole("tab", { name: "图像生成", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
});

test("开始页标题保留横向留白，点击后仅切换细胶囊", async ({ page }) => {
  await page.goto("/");
  const tabs = page.locator(".start-tabs");
  const buttons = tabs.getByRole("tab");
  await expect(buttons).toHaveCount(2);
  const textBoxes = await buttons.evaluateAll((elements) =>
    elements.map((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const box = range.getBoundingClientRect();
      return { left: box.left, right: box.right };
    }),
  );
  expect(textBoxes[1].left - textBoxes[0].right).toBeGreaterThanOrEqual(24);
  const color = await buttons
    .nth(0)
    .evaluate((element) => getComputedStyle(element).color);
  await buttons.nth(1).click();
  await expect(buttons.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(buttons.nth(1)).toHaveCSS("color", color);
  await expect(buttons.nth(0)).toHaveCSS("color", color);
  await expect(tabs.getByTestId("sliding-pill-indicator")).toHaveCSS(
    "height",
    "2px",
  );
});

test.describe("触控沿用相同控件规则", () => {
  test.use({ hasTouch: true });

  test("窄屏沿用52高底栏与44点击区，不被旧手机样式覆盖", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openWorkspace(page);
    const toolbar = page.locator(".canvas-toolbar");
    await expect(toolbar).toBeVisible();
    await expect(toolbar).toHaveCSS("height", "52px");
    await expect(toolbar).toHaveCSS("gap", "4px");
    await expect(toolbar.locator(".toolbar-toggle")).toHaveCSS("width", "44px");
    await expect(toolbar.locator(".toolbar-icon-collapse")).toHaveCSS(
      "width",
      "8px",
    );
    const box = (await toolbar.boundingBox())!;
    expect(box.width).toBe(304);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
  });

  test("素材库垃圾箱及辅助操作均保留44像素点击区域", async ({ page }) => {
    await openWorkspace(page);
    const arrowButton = page.locator(".canvas-toolbar > .toolbar-toggle");
    await expect(arrowButton).toHaveCSS("width", "44px");
    await expect(arrowButton).toHaveCSS("height", "44px");
    await expect(arrowButton.locator(".toolbar-icon-collapse")).toHaveCSS(
      "width",
      "8px",
    );
    await page.getByRole("button", { name: "资源管理", exact: true }).click();
    const panel = page.getByTestId("asset-panel");
    const trash = panel.getByRole("tab", { name: "垃圾箱", exact: true });
    await panel.evaluate(async (element) => {
      await Promise.all(
        element
          .closest("dialog")!
          .getAnimations()
          .map((animation) => animation.finished),
      );
    });
    const box = (await trash.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    for (const name of ["关闭资产管理", "列表视图", "网格视图"])
      await expect(panel.getByRole("button", { name, exact: true })).toHaveCSS(
        "height",
        "44px",
      );
    await expect(panel.locator(".asset-drag-icon")).toHaveCSS("width", "16px");
    await trash.click();
    await expect(trash).toHaveAttribute("aria-selected", "true");
    expect(
      await trash.evaluate(
        (element) => getComputedStyle(element, "::after").content,
      ),
    ).toBe("none");
  });
});
