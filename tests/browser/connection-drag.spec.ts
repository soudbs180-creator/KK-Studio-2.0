import { expect, test, type Page } from "@playwright/test";
import { openWorkspace, showCanvasNavigation } from "./helpers";

async function beginDrag(page: Page): Promise<{ x: number; y: number }> {
  const port = page.getByRole("button", {
    name: "从图片创建卡片添加下游",
    exact: true,
  });
  const box = (await port.boundingBox())!;
  const origin = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(origin.x, origin.y);
  await page.mouse.down();
  await page.mouse.move(origin.x + 120, origin.y + 100, { steps: 10 });
  return origin;
}

async function findBlankCanvasPoint(
  page: Page,
): Promise<{ x: number; y: number }> {
  return page.evaluate(() => {
    const canvas = document.querySelector<HTMLElement>(".infinite-canvas")!;
    const bounds = canvas.getBoundingClientRect();
    const bodies = [
      ...document.querySelectorAll<HTMLElement>(
        ".image-preview,.video-placeholder,.demo-result-node,.creation-composer",
      ),
    ].map((element) => element.getBoundingClientRect());
    const points: { x: number; y: number }[] = [];
    for (let y = bounds.top + 120; y < bounds.bottom - 120; y += 32)
      for (let x = bounds.left + 120; x < bounds.right - 320; x += 32) {
        if (
          bodies.some(
            (body) =>
              x >= body.left &&
              x <= body.right &&
              y >= body.top &&
              y <= body.bottom,
          )
        )
          continue;
        const hit = document.elementFromPoint(x, y);
        if (
          hit?.closest(".canvas") &&
          !hit.closest(".canvas-toolbar,.canvas-hud,.conversation-panel")
        )
          points.push({ x, y });
      }
    if (!points.length) throw new Error("no blank canvas point");
    const center = {
      // Leave room for the 590px editor that opens on the new card's left;
      // this keeps the release-point assertion out of viewport clamping.
      x: bounds.left + bounds.width * 0.35,
      y: (bounds.top + bounds.bottom) / 2,
    };
    return points.sort(
      (a, b) =>
        Math.hypot(a.x - center.x, a.y - center.y) -
        Math.hypot(b.x - center.x, b.y - center.y),
    )[0];
  });
}

test("不同缩放下图片和两张视频连接均落在可见侧边正中", async ({ page }) => {
  await openWorkspace(page);
  await showCanvasNavigation(page);
  for (const scale of ["50%", "100%", "200%"]) {
    await page.locator(".canvas-zoom-trigger").click();
    await page.getByRole("menuitemradio", { name: scale, exact: true }).click();
    const deltas = await page.evaluate(() => {
      const image = document
        .querySelector(".image-preview")!
        .getBoundingClientRect();
      return ["video1", "video2"].map((id) => {
        const video = document
          .querySelector(`[data-testid=canvas-node-${id}] .video-placeholder`)!
          .getBoundingClientRect();
        const curve = document.querySelector(
          `[data-testid=connector-${id}]`,
        ) as SVGPathElement;
        const screen = (point: DOMPoint): DOMPoint =>
          new DOMPoint(point.x, point.y).matrixTransform(curve.getScreenCTM()!);
        const start = screen(curve.getPointAtLength(0));
        const end = screen(curve.getPointAtLength(curve.getTotalLength()));
        return [
          start.x - image.right,
          start.y - image.y - image.height / 2,
          end.x - video.x,
          end.y - video.y - video.height / 2,
        ];
      });
    });
    for (const delta of deltas.flat())
      expect(Math.abs(delta)).toBeLessThan(0.1);
  }
});

test("加号区域磁吸，拖动只预览，释放后选类型才创建并连线", async ({ page }) => {
  await openWorkspace(page);
  const node = page.getByTestId("canvas-node-image");
  const position = await node.getAttribute("style");
  const stage = await page.getByTestId("canvas-stage").getAttribute("style");
  const port = node.locator(".node-add-follow");
  const box = (await port.boundingBox())!;
  const visual = port.locator(".node-add-visual");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 27);
  expect(
    await visual.evaluate((el) =>
      parseFloat(getComputedStyle(el).translate.split(" ")[1]),
    ),
  ).toBeGreaterThan(8);
  expect(
    await port
      .locator(".node-port-plus")
      .evaluate((el) => getComputedStyle(el).width),
  ).toBe("11.75px");
  await beginDrag(page);
  await expect(page.getByTestId("connection-drag-preview")).toBeVisible();
  await expect(page.locator(".add-node-menu")).toHaveCount(0);
  await expect(page.locator("[data-canvas-node]")).toHaveCount(3);
  await expect(node).toHaveAttribute("style", position!);
  await expect(page.getByTestId("canvas-stage")).toHaveAttribute(
    "style",
    stage!,
  );
  const stageBeforeDrop = (await page
    .getByTestId("canvas-stage")
    .boundingBox())!;
  await page.mouse.move(940, 690, { steps: 10 });
  await page.mouse.up();
  const menu = page.getByRole("menu", { name: "新增下游卡片" });
  await expect(menu).toBeVisible();
  await expect(page.getByTestId("connection-drag-preview")).toHaveCount(0);
  expect(await menu.boundingBox()).toMatchObject({ width: 296, height: 586 });
  await expect(menu.getByRole("menuitem")).toHaveCount(12);
  await expect(
    menu.getByRole("menuitem", { name: "表格", exact: true }),
  ).toBeDisabled();
  await expect(
    menu.getByRole("menuitem", { name: "表格", exact: true }),
  ).toHaveAttribute("title", "表格编辑器尚未接入");
  await menu.getByRole("menuitem", { name: "视频", exact: true }).click();
  const created = page.getByTestId(/^canvas-node-added-video-/).nth(0);
  await expect(created).toBeFocused();
  await expect(page.getByTestId(/^connector-added-video-/)).toHaveCount(1);
  await expect(node).toHaveAttribute("style", position!);
  // The new node must meet the actual release point regardless of sidebar
  // width or desktop surface scaling; old world coordinates assumed x=287.
  const visible = (await created.locator(".video-placeholder").boundingBox())!;
  const stageAfterDrop = (await page
    .getByTestId("canvas-stage")
    .boundingBox())!;
  // Focusing a new video exposes its wider editor and may pan the viewport.
  // The dropped world point must stay exact through that view-only movement.
  expect(
    Math.abs(visible.x - stageAfterDrop.x - (940 - stageBeforeDrop.x)),
  ).toBeLessThanOrEqual(1);
  expect(
    Math.abs(
      visible.y +
        visible.height / 2 -
        stageAfterDrop.y -
        (690 - stageBeforeDrop.y),
    ),
  ).toBeLessThanOrEqual(1);
});

test("新增节点同事件连线仍遵守参考图能力限制", async ({ page }) => {
  await openWorkspace(page);
  const source = page.getByTestId("canvas-node-video1");
  await source
    .getByRole("button", { name: "从视频卡片 1添加下游", exact: true })
    .click();
  await page
    .getByRole("menu", { name: "新增下游卡片" })
    .getByRole("menuitem", { name: "图片", exact: true })
    .click();
  await expect(
    page.getByTestId(/^canvas-node-added-image-/).nth(0),
  ).toBeVisible();
  await expect(page.getByTestId(/^connector-added-image-/)).toHaveCount(0);
});

test("拖出取消和无效区域释放无残留，键盘随后仍能打开菜单", async ({ page }) => {
  await openWorkspace(page);
  const port = page.getByRole("button", {
    name: "从图片创建卡片添加下游",
    exact: true,
  });
  for (const mode of ["escape", "blur", "pointercancel", "outside"] as const) {
    await beginDrag(page);
    await expect(page.getByTestId("connection-drag-preview")).toBeVisible();
    if (mode === "escape") await page.keyboard.press("Escape");
    if (mode === "blur")
      await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    if (mode === "pointercancel")
      await port.dispatchEvent("pointercancel", { pointerId: 1 });
    if (mode === "outside") await page.mouse.move(20, 20);
    await page.mouse.up();
    await expect(page.getByTestId("connection-drag-preview")).toHaveCount(0);
    await expect(page.locator(".add-node-menu")).toHaveCount(0);
    await expect(page.locator("[data-canvas-node]")).toHaveCount(3);
    await port.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".add-node-menu")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(port).toBeFocused();
  }
});

test("底栏、空白双击与下游共用菜单；窄屏和减弱动态可用", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openWorkspace(page);
  const stage = page.getByTestId("canvas-stage");
  const before = await stage.getAttribute("style");
  await page.mouse.dblclick(950, 800);
  await expect(page.getByRole("menu", { name: "添加节点" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(stage).toHaveAttribute("style", before!);
  for (const [width, height] of [
    [1920, 1080],
    [1440, 900],
    [768, 1024],
    [390, 844],
    [663, 450],
  ]) {
    await page.setViewportSize({ width, height });
    await page.getByRole("button", { name: "添加资源", exact: true }).click();
    const menu = page.locator(".add-node-menu");
    const b = (await menu.boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(16);
    expect(b.y).toBeGreaterThanOrEqual(16);
    expect(b.x + b.width).toBeLessThanOrEqual(width - 16);
    expect(b.y + b.height).toBeLessThanOrEqual(height - 16);
    expect(
      await menu.evaluate((el) => el.getAnimations({ subtree: true }).length),
    ).toBe(0);
    await expect(
      menu.getByRole("menuitem", { name: "文本", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(
      menu.getByRole("menuitem", { name: "图片", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("End");
    // Plugins activate asynchronously; End targets the current last enabled item.
    await expect(
      menu.locator('button[role="menuitem"]:enabled').last(),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "添加资源", exact: true }),
    ).toBeFocused();
  }
});

test("平移缩放后按释放点创建文本，结果连线居中并保留原草稿", async ({
  page,
}) => {
  await openWorkspace(page);
  await showCanvasNavigation(page);
  const image = page.getByTestId("canvas-node-image");
  await image.focus();
  await page.keyboard.press("Enter");
  await page.getByLabel("图片提示词").fill("保留这份未生成的草稿");
  await page.locator(".canvas-zoom-trigger").click();
  await page.getByRole("menuitemradio", { name: "50%", exact: true }).click();
  await page.mouse.move(1000, 820);
  await page.mouse.down({ button: "middle" });
  await page.mouse.move(1040, 850, { steps: 5 });
  await page.mouse.up({ button: "middle" });
  await beginDrag(page);
  const releasePoint = await findBlankCanvasPoint(page);
  await page.mouse.move(releasePoint.x, releasePoint.y, { steps: 5 });
  await page.mouse.up();
  await page.getByRole("menuitem", { name: "文本", exact: true }).click();
  const text = page.getByTestId(/^canvas-node-added-text-/).nth(0);
  const body = (await text.locator(".demo-result-node").boundingBox())!;
  expect(Math.abs(body.x - releasePoint.x)).toBeLessThanOrEqual(1);
  expect(
    Math.abs(body.y + body.height / 2 - releasePoint.y),
  ).toBeLessThanOrEqual(1);
  await text.locator(".node-add-follow").click();
  await page.getByRole("menuitem", { name: "音频", exact: true }).click();
  const deltas = await page
    .getByTestId(/^connector-added-audio-/)
    .evaluate((el) => {
      const curve = el as SVGPathElement;
      const source = document
        .querySelector('[data-node-id^="added-text-"] .demo-result-node')!
        .getBoundingClientRect();
      const target = document
        .querySelector('[data-node-id^="added-audio-"] .demo-result-node')!
        .getBoundingClientRect();
      const start = curve
        .getPointAtLength(0)
        .matrixTransform(curve.getScreenCTM()!);
      const end = curve
        .getPointAtLength(curve.getTotalLength())
        .matrixTransform(curve.getScreenCTM()!);
      return [
        start.x - source.right,
        start.y - source.y - source.height / 2,
        end.x - target.x,
        end.y - target.y - target.height / 2,
      ];
    });
  for (const delta of deltas) expect(Math.abs(delta)).toBeLessThan(0.1);
  await image.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("图片提示词")).toHaveValue(
    "保留这份未生成的草稿",
  );
});

test("触屏加号可拖出释放，菜单保持44px以上行高并可点选", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 768, height: 1024 },
    hasTouch: true,
  });
  const page = await context.newPage();
  await openWorkspace(page);
  await page.getByRole("button", { name: "添加资源", exact: true }).tap();
  await page.getByRole("menuitem", { name: "文本", exact: true }).tap();
  const port = page
    .getByTestId(/^canvas-node-added-text-/)
    .nth(0)
    .locator(".node-add-follow");
  const box = (await port.boundingBox())!;
  expect(box.width).toBeCloseTo(44, 1);
  const session = await context.newCDPSession(page);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: box.x + box.width / 2, y: box.y + box.height / 2, id: 1 },
    ],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ ...(await findBlankCanvasPoint(page)), id: 1 }],
  });
  await expect(page.getByTestId("connection-drag-preview")).toBeVisible();
  await expect(page.locator(".add-node-menu")).toHaveCount(0);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  const menu = page.locator(".add-node-menu");
  await expect(menu).toBeVisible();
  expect(
    (await menu
      .getByRole("menuitem", { name: "音频", exact: true })
      .boundingBox())!.height,
  ).toBeGreaterThanOrEqual(44);
  await menu.getByRole("menuitem", { name: "音频", exact: true }).tap();
  await expect(page.getByTestId(/^connector-added-audio-/)).toHaveCount(1);
  await expect(page.getByTestId("connection-drag-preview")).toHaveCount(0);
  await expect(page.locator("[data-canvas-node]")).toHaveCount(5);
  await page.setViewportSize({ width: 768, height: 450 });
  await page.getByRole("button", { name: "添加资源", exact: true }).tap();
  const textRow = (await page
    .getByRole("menuitem", { name: "文本", exact: true })
    .boundingBox())!;
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: textRow.x + 100, y: textRow.y + 25, id: 1 }],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: textRow.x + 100, y: textRow.y - 20, id: 1 }],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(page.locator(".add-node-menu")).toBeVisible();
  await expect(page.locator("[data-canvas-node]")).toHaveCount(5);
  await context.close();
});
