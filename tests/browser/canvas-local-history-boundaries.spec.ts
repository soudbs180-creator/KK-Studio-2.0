import { expect, test, type Page } from "@playwright/test";
import type { CreationSnapshot } from "../../src/features/creation/model";
import { openWorkspace } from "./helpers";

async function project(page: Page) {
  return page.evaluate(() => {
    const state = JSON.parse(
      localStorage.getItem("kk-studio-next:creation:v1")!,
    ) as CreationSnapshot;
    return state.projects.find((entry) => entry.id === state.activeProjectId)!;
  });
}

for (const width of [390, 1920]) {
  test(`${width} 数量和参数按钮焦点不穿透 L/G，画布仍可使用快捷键`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await openWorkspace(page);
    const snap = () =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("kk-canvas-ui-preferences-v1")!)
            .snapEnabled as boolean,
      );
    const before = await snap();
    await page.getByRole("button", { name: "添加资源", exact: true }).click();
    await page.getByRole("menuitem", { name: "视频", exact: true }).click();
    const editor = page.getByTestId("video-composer");
    await editor.getByRole("button", { name: "生成数量", exact: true }).click();
    await editor
      .getByRole("button", { name: "生成 1 个", exact: true })
      .click();
    await page.keyboard.press("l");
    await page.keyboard.press("g");
    expect(await snap()).toBe(before);
    await expect(page.getByRole("region", { name: "画布图层" })).toHaveCount(0);
    await editor.getByRole("button", { name: "视频参数", exact: true }).click();
    const ratio = editor.getByRole("button", { name: "16:9", exact: true });
    await ratio.click();
    await page.keyboard.press("l");
    await page.keyboard.press("g");
    expect(await snap()).toBe(before);
    await expect(page.getByRole("region", { name: "画布图层" })).toHaveCount(0);
    await expect(ratio).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Escape");
    await page.getByTestId("canvas-node-image").focus();
    await page.keyboard.press("Enter");
    const imageEditor = page.getByTestId("image-composer");
    await imageEditor.locator('[data-control="params"] > button').click();
    await imageEditor
      .locator(".parameter-menu")
      .getByRole("button", { name: "自适应", exact: true })
      .click();
    await page.keyboard.press("l");
    await page.keyboard.press("g");
    expect(await snap()).toBe(before);
    await expect(page.getByRole("region", { name: "画布图层" })).toHaveCount(0);
    await page.keyboard.press("Escape");
    const canvas = page.getByTestId("infinite-canvas");
    await canvas.focus();
    await page.keyboard.press("g");
    await expect.poll(snap).toBe(!before);
    await canvas.focus();
    await page.keyboard.press("l");
    await expect(page.getByRole("region", { name: "画布图层" })).toBeVisible();
  });

  for (const ending of ["success", "cancelled"] as const) {
    test(`${width} loading 撤销后 ${ending} 再重做恢复终态与原位置`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 844 });
      await openWorkspace(page);
      await page.getByRole("button", { name: "添加资源", exact: true }).click();
      await page.getByRole("menuitem", { name: "视频", exact: true }).click();
      const editor = page.getByTestId("video-composer");
      await editor.getByLabel("视频提示词").fill("运行中撤销也保留草稿");
      await editor
        .getByRole("button", { name: "生成数量", exact: true })
        .click();
      await editor
        .getByRole("button", { name: "生成 1 个", exact: true })
        .click();
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      let requested = false;
      let responded = false;
      await page.route(
        "**/fixtures/demo/blue-hour-motion.webm",
        async (route) => {
          requested = true;
          await gate;
          await route.fulfill({
            path: "public/fixtures/demo/blue-hour-motion.webm",
            contentType: "video/webm",
          });
          responded = true;
        },
      );
      try {
        await editor
          .getByRole("button", { name: "生成视频", exact: true })
          .click();
        await expect.poll(() => requested).toBe(true);
        await expect
          .poll(
            async () =>
              (await project(page)).items.filter(
                (item) => item.generationStatus === "pending",
              ).length,
          )
          .toBe(1);
        const waiting = await project(page);
        const pending = waiting.items.find(
          (item) => item.generationStatus === "pending",
        )!;
        const canvas = page.getByTestId("infinite-canvas");
        for (
          let step = 0;
          step < 4 &&
          (await project(page)).items.some((item) => item.id === pending.id);
          step++
        ) {
          const previous = JSON.stringify((await project(page)).canvas);
          const previousItems = JSON.stringify((await project(page)).items);
          await canvas.focus();
          await page.keyboard.press("Control+Z");
          await expect
            .poll(async () => {
              const saved = await project(page);
              return (
                JSON.stringify(saved.canvas) !== previous ||
                JSON.stringify(saved.items) !== previousItems
              );
            })
            .toBe(true);
        }
        await expect
          .poll(async () =>
            (await project(page)).items.some((item) => item.id === pending.id),
          )
          .toBe(false);
        await expect(editor.getByLabel("视频提示词")).toHaveValue(
          "运行中撤销也保留草稿",
        );
        if (ending === "cancelled") {
          await editor
            .getByRole("button", { name: "取消本地演示", exact: true })
            .click();
        }
        release();
        await expect.poll(() => responded).toBe(true);
        await expect(editor.getByLabel("视频提示词")).toBeEnabled();
        expect(
          (await project(page)).items.some((item) => item.id === pending.id),
        ).toBe(false);
        await canvas.focus();
        await page.keyboard.press("Control+Shift+Z");
        const terminal = ending === "success" ? "ready" : "error";
        await expect
          .poll(
            async () =>
              (await project(page)).items.find((item) => item.id === pending.id)
                ?.generationStatus,
          )
          .toBe(terminal);
        const restored = await project(page);
        expect(restored.canvas.positions[pending.id]).toEqual(
          waiting.canvas.positions[pending.id],
        );
        expect(restored.canvas.edges).toEqual(waiting.canvas.edges);
        expect(
          restored.items.find((item) => item.id === pending.id)?.result?.source,
        ).toBe(ending === "success" ? "demo" : undefined);
        await expect(
          page.locator('.demo-result-node[data-generation-state="pending"]'),
        ).toHaveCount(0);
        await page.reload();
        await page.getByRole("button", { name: "项目库", exact: true }).click();
        await page
          .locator(".project-library-card")
          .filter({ hasText: "Agent 验证项目" })
          .click();
        await expect
          .poll(
            async () =>
              (await project(page)).items.find((item) => item.id === pending.id)
                ?.generationStatus,
          )
          .toBe(terminal);
        expect((await project(page)).canvas.positions[pending.id]).toEqual(
          waiting.canvas.positions[pending.id],
        );
      } finally {
        release();
      }
    });
  }
}
