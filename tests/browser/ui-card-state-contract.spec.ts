import { expect, test } from "@playwright/test";
import { expandSidebar, openWorkspace } from "./helpers";
import { CREATION_STORAGE_KEY } from "../../src/features/creation/model";

for (const width of [390, 1099, 1920]) {
  for (const [kind, label, fixture] of [
    ["image", "图片", "public/fixtures/demo/blue-hour.png"],
    ["video", "视频", "public/fixtures/demo/blue-hour-motion.webm"],
  ]) {
    test(`主内容决定上传与工具栏互斥 ${kind} ${width}`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
      await openWorkspace(page);
      const close = page.getByRole("button", { name: "收起对话", exact: true });
      if (await close.isVisible()) await close.click();
      await page.getByRole("button", { name: "添加资源", exact: true }).click();
      await page.getByRole("menuitem", { name: label, exact: true }).click();
      const node = page
        .getByTestId(new RegExp(`^canvas-node-added-${kind}-`))
        .last();
      const id = await node.getAttribute("data-node-id");
      const upload = node.getByRole("button", {
        name: `上传${label}`,
        exact: true,
      });
      const toolbar = page.locator(".image-selection-toolbar");
      const input = node
        .locator(
          kind === "image"
            ? 'input[type="file"][accept="image/png,image/jpeg,image/webp,image/gif"]'
            : 'input[type="file"][accept="video/mp4,video/webm"]',
        )
        .first();
      const assertEmpty = async () => {
        await expect(upload).toBeVisible();
        await expect(toolbar).toHaveCount(0);
        await expect(upload).toHaveCSS("border-radius", "8px");
      };
      await assertEmpty();
      await page
        .getByLabel(`${label}提示词`, { exact: true })
        .fill("输入提示词不等于已有媒体内容");
      await assertEmpty();
      await input.setInputFiles({
        name: "invalid.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("invalid media"),
      });
      await expect(
        page.locator('.generation-feedback[role="status"]:visible'),
      ).toContainText("请选择");
      await assertEmpty();
      await input.setInputFiles(fixture);
      const media = node.locator(
        kind === "image" ? ".uploaded-image" : ".video-placeholder video",
      );
      await expect(media).toBeVisible();
      await expect(upload).toHaveCount(0);
      await expect(toolbar).toHaveCount(1);
      await node.focus();
      await node.press("Escape");
      await expect(toolbar).toHaveCount(0);
      await expect(upload).toHaveCount(0);
      await node.press("Enter");
      await expect(toolbar).toHaveCount(1);
      await expect(upload).toHaveCount(0);
      await expect(page.locator(".project-save-state")).toContainText("已保存");
      const assetId = await page.evaluate(
        ({ key, id }) => {
          const state = JSON.parse(localStorage.getItem(key)!);
          return state.projects
            .find(
              (project: { id: string }) => project.id === state.activeProjectId,
            )
            .items.find((item: { id: string }) => item.id === id).assetId;
        },
        { key: CREATION_STORAGE_KEY, id },
      );
      expect(assetId).toBeTruthy();
      await page.reload();
      if (width >= 768) await expandSidebar(page);
      await page.getByRole("button", { name: "项目库", exact: true }).click();
      await page
        .locator(".project-library-card")
        .filter({ hasText: "Agent 验证项目" })
        .click();
      if (await close.isVisible()) await close.click();
      await node.focus();
      await node.press("Enter");
      await expect(media).toBeVisible();
      await expect(upload).toHaveCount(0);
      await expect(toolbar).toHaveCount(1);
      await expect(
        page.getByLabel(`${label}提示词`, { exact: true }),
      ).toHaveValue("输入提示词不等于已有媒体内容");
      await page.screenshot({
        path: info.outputPath(`${kind}-content-only-toolbar-${width}.png`),
        animations: "disabled",
      });
    });
  }
}
