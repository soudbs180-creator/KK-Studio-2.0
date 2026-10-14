import { expect, test } from "@playwright/test";
import { openWorkspace, openSettingsSection } from "./helpers";

test.use({ hasTouch: true });

for (const theme of ["light", "dark"])
  for (const width of [390, 320]) {
    test(`${width}px ${theme} 已上传图片选中时缩放菜单可触摸且原件不改`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: 844 });
      await openWorkspace(page);
      await openSettingsSection(page, "通用");
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
      const upload = page
        .getByRole("toolbar", { name: /^图片操作：/ })
        .getByRole("button", { name: "上传图片", exact: true });
      await expect(upload).toBeVisible();
      await expect
        .poll(() =>
          upload.evaluate((element) => {
            const box = element.getBoundingClientRect();
            const hit = document.elementFromPoint(
              box.x + box.width / 2,
              box.y + box.height / 2,
            );
            return element === hit || Boolean(hit && element.contains(hit));
          }),
        )
        .toBe(true);
      expect(
        await node.evaluate((element) => ({
          left: (element as HTMLElement).style.left,
          top: (element as HTMLElement).style.top,
        })),
      ).toEqual(position);
      await expect(node.locator(".uploaded-image")).toBeVisible();
    });
  }
