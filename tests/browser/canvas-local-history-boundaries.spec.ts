import { expect, test, type Page } from "@playwright/test";
import type { CreationSnapshot } from "../../src/features/creation/model";
import { openWorkspace } from "./helpers";
import {
  configureMediaNode,
  fixtureVideo,
  approveMediaTask,
} from "./mediaHelpers";

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
    test(`${width} 运行中撤销重做移动，${ending} 不改变队列与原位置`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 844 });
      await openWorkspace(page);
      await page.getByRole("button", { name: "添加资源", exact: true }).click();
      await page.getByRole("menuitem", { name: "视频", exact: true }).click();
      const source = page.getByTestId(/^canvas-node-added-video-/).last();
      const sourceId = (await source.getAttribute("data-node-id"))!;
      await configureMediaNode(page, source, "video");
      await page
        .getByTestId("video-composer")
        .getByLabel("视频提示词")
        .fill("运行中撤销也保留草稿");
      let release!: () => void;
      const requests = await fixtureVideo(
        page,
        new Promise<void>((resolve) => {
          release = resolve;
        }),
      );
      try {
        await page
          .getByTestId("video-composer")
          .getByRole("button", { name: "生成视频", exact: true })
          .click();
        await approveMediaTask(page);
        await expect
          .poll(() => requests.filter((r) => r.method === "GET").length)
          .toBe(1);
        const taskId = (await project(page)).tasks.at(-1)!.id;
        const original = (await project(page)).canvas.positions[sourceId];
        await source.focus();
        await page.keyboard.press("ArrowRight");
        await expect
          .poll(async () => (await project(page)).canvas.positions[sourceId]?.x)
          .toBeGreaterThan(original.x);
        const moved = (await project(page)).canvas.positions[sourceId];
        const canvas = page.getByTestId("infinite-canvas");
        await canvas.focus();
        await page.keyboard.press("Control+Z");
        await expect
          .poll(async () => (await project(page)).canvas.positions[sourceId])
          .toEqual(original);
        await source.focus();
        await page.keyboard.press("Enter");
        await expect(
          page.getByTestId("video-composer").getByLabel("视频提示词"),
        ).toHaveValue("运行中撤销也保留草稿");
        await canvas.focus();
        await page.keyboard.press("Control+Shift+Z");
        await expect
          .poll(async () => (await project(page)).canvas.positions[sourceId])
          .toEqual(moved);
        await source.focus();
        await page.keyboard.press("Enter");
        if (ending === "cancelled")
          await page
            .getByTestId("video-composer")
            .getByRole("button", { name: "取消视频生成", exact: true })
            .click();
        release();
        const status = ending === "success" ? "succeeded" : "unknown";
        await expect
          .poll(
            async () =>
              (await project(page)).tasks.find((t) => t.id === taskId)?.status,
          )
          .toBe(status);
        const finished = await project(page);
        const restored = await project(page);
        expect(restored.tasks.find((t) => t.id === taskId)?.status).toBe(
          status,
        );
        expect(
          restored.items.filter((item) => item.result?.source === "provider"),
        ).toEqual(
          finished.items.filter((item) => item.result?.source === "provider"),
        );
        expect(restored.canvas.edges).toEqual(finished.canvas.edges);
        await expect(
          page.locator('.demo-result-node[data-generation-state="pending"]'),
        ).toHaveCount(0);
        await page.reload();
        await page.getByRole("button", { name: "项目库", exact: true }).click();
        await page
          .locator(".project-library-card")
          .filter({ hasText: "Agent 验证项目" })
          .click();
        expect(
          (await project(page)).tasks.find((t) => t.id === taskId)?.status,
        ).toBe(status);
        expect((await project(page)).canvas.positions[sourceId]).toEqual(moved);
        expect(requests.filter((r) => r.method === "POST")).toHaveLength(1);
      } finally {
        release();
      }
    });
  }
}
