import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 1366, height: 768 },
  { width: 390, height: 640 },
]) {
  test(`settings content disclosures use an outline and keep keyboard behavior at ${viewport.width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.getByRole("button", { name: "打开设置", exact: true }).click();
    const settings = page.getByRole("dialog", { name: "设置", exact: true });
    await expect(settings.locator(".settings-panel")).toBeVisible();
    if (viewport.width === 390) {
      await settings
        .getByRole("combobox", { name: "主题", exact: true })
        .selectOption("light");
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    }
    const nav = settings.getByRole("navigation", { name: "设置分类" });
    for (const [section, label] of [
      ["通用", "高级偏好"],
      ["通用", "系统与未接入偏好"],
      ["网络", "独立转发代理"],
      ["模型接入", "高级连接选项"],
      ["模型接入", "ComfyUI 工作流"],
      ["数据管理", "偏好备份"],
    ]) {
      const back = settings.getByRole("button", {
        name: "返回设置分类",
        exact: true,
      });
      if (viewport.width <= 767) {
        await expect(back).toBeVisible();
        await back.click();
      }
      await nav.getByRole("button", { name: section, exact: true }).click();
      if (label === "高级连接选项") {
        await settings.getByRole("button", { name: /Codex.*主 Agent/ }).click();
      }
      if (label === "ComfyUI 工作流") {
        if (viewport.width <= 767) {
          const accessBack = settings.getByRole("button", {
            name: "返回接入方式",
          });
          if (await accessBack.isVisible()) await accessBack.click();
        }
        await settings
          .getByRole("button", { name: "本地", exact: true })
          .click();
      }
      const summary = settings.locator("summary").filter({ hasText: label });
      await expect(summary).toBeVisible();
      const detail = summary.locator("..");
      const shape = () =>
        summary.evaluate((element) => {
          const marker = getComputedStyle(element, "::before");
          return {
            display: getComputedStyle(element).display,
            listStyle: getComputedStyle(element).listStyleType,
            image: marker.maskImage,
            transform: marker.transform,
            overflow: element.scrollWidth - element.clientWidth,
          };
        });
      const closed = await shape();
      expect(closed).toMatchObject({ display: "block", listStyle: "none" });
      expect(closed.image).toContain("/design/pen/disclosure-chevron.svg");
      expect(closed.transform).not.toBe("none");
      expect(closed.overflow).toBe(0);
      await summary.focus();
      await page.keyboard.press("Enter");
      await expect(detail).toHaveAttribute("open", "");
      await expect(summary).toBeFocused();
      expect((await shape()).transform).toBe("none");
      await summary.screenshot({
        path: info.outputPath(label + "-open.png"),
      });
      await page.keyboard.press("Space");
      await expect(detail).not.toHaveAttribute("open", "");
      await summary.click();
      await expect(detail).toHaveAttribute("open", "");
    }
  });
}
