import { expect, test } from "@playwright/test";
import {
  openWorkspace,
  openSettingsSection,
  panCanvasToRevealAction,
} from "./helpers";

test.use({ hasTouch: true });

for (const theme of ["light", "dark"])
  for (const width of [390, 320]) {
    test(`${width}px ${theme} 已上传图片选中时缩放菜单可触摸且原件不改`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: 844 });
      await openWorkspace(page);
      await openSettingsSection(page, "通用设置");
      await page
        .getByRole("combobox", { name: "主题", exact: true })
        .selectOption(theme);
      await page.getByRole("button", { name: "关闭设置", exact: true }).tap();
      await page.getByRole("button", { name: "添加资源", exact: true }).tap();
      await page.getByRole("menuitem", { name: "图片", exact: true }).tap();
      const node = page.getByTestId(/^canvas-node-added-image-/).last();
      await node
        .locator('input[type="file"]')
        .first()
        .setInputFiles("public/fixtures/demo/blue-hour.png");
      await expect(node.locator(".uploaded-image")).toBeVisible();
      await node.focus();
      await node.press("Enter");
      const position = await node.evaluate((element) => ({
        left: (element as HTMLElement).style.left,
        top: (element as HTMLElement).style.top,
      }));
      const canvas = page.getByTestId("infinite-canvas");
      await canvas.focus();
      for (let index = 0; index < 20; index++)
        await page.keyboard.press("Control+-");
      const scale = page.getByRole("button", { name: "画布缩放", exact: true });
      await expect(scale).toContainText("20%");
      await scale.tap();
      for (const option of await page
        .getByRole("menu", { name: "画布缩放比例", exact: true })
        .getByRole("menuitemradio")
        .all()) {
        await option.scrollIntoViewIfNeeded();
        await expect
          .poll(() =>
            option.evaluate((element) => {
              const menu = element.closest('[role="menu"]')!;
              const outer = menu.getBoundingClientRect();
              const inner = element.getBoundingClientRect();
              return (
                inner.left >= outer.left &&
                inner.right <= outer.right &&
                inner.top >= outer.top &&
                inner.bottom <= outer.bottom
              );
            }),
          )
          .toBe(true);
        await expect
          .poll(() =>
            option.evaluate((element) => {
              const box = element.getBoundingClientRect();
              const hit = document.elementFromPoint(
                box.x + box.width / 2,
                box.y + box.height / 2,
              );
              return element === hit || Boolean(hit && element.contains(hit));
            }),
          )
          .toBe(true);
      }
      const preset = page.getByRole("menuitemradio", {
        name: "50%",
        exact: true,
      });
      await expect
        .poll(() =>
          preset.evaluate((element) => {
            const box = element.getBoundingClientRect();
            const hit = document.elementFromPoint(
              box.x + box.width / 2,
              box.y + box.height / 2,
            );
            return element === hit || Boolean(hit && element.contains(hit));
          }),
        )
        .toBe(true);
      await page.screenshot({
        path: info.outputPath(`selected-zoom-${theme}-${width}.png`),
        animations: "disabled",
      });
      await preset.tap();
      await expect(scale).toContainText("50%");
      await expect(
        page.getByRole("menu", { name: "画布缩放比例", exact: true }),
      ).toBeHidden();
      const actions = page.getByRole("toolbar", { name: /^图片操作：/ });
      const preview = actions.getByRole("button", {
        name: "放大查看参考图片",
        exact: true,
      });
      await expect(preview).toBeVisible();
      await expect(actions).toHaveCSS("overflow-x", "visible");
      await expect(canvas).toHaveCSS("overflow-x", "clip");
      await expect
        .poll(async () => {
          const bar = (await actions.boundingBox())!;
          const card = (await node.locator(".image-preview").boundingBox())!;
          return bar.x + bar.width / 2 - (card.x + card.width / 2);
        })
        .toBeCloseTo(0, 0);
      expect(
        await actions.evaluate(
          (element) => element.scrollWidth - element.clientWidth,
        ),
      ).toBe(0);
      const bounds = (await canvas.boundingBox())!;
      const bar = (await actions.boundingBox())!;
      expect(
        bar.x < bounds.x || bar.x + bar.width > bounds.x + bounds.width,
      ).toBe(true);
      await panCanvasToRevealAction(page, preview);
      await expect
        .poll(() =>
          preview.evaluate((element) => {
            const box = element.getBoundingClientRect();
            const hit = document.elementFromPoint(
              box.x + box.width / 2,
              box.y + box.height / 2,
            );
            return element === hit || Boolean(hit && element.contains(hit));
          }),
        )
        .toBe(true);
      await preview.tap();
      await expect(
        page.getByRole("dialog", { name: "预览参考图片", exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "关闭素材预览", exact: true })
        .tap();
      expect(
        await node.evaluate((element) => ({
          left: (element as HTMLElement).style.left,
          top: (element as HTMLElement).style.top,
        })),
      ).toEqual(position);
      await expect(node.locator(".uploaded-image")).toBeVisible();
    });
  }
