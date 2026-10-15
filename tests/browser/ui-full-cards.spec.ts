import { expect, test } from "@playwright/test";
import { openWorkspace } from "./helpers";

for (const width of [390, 1099, 1920]) {
  for (const [kind, label] of [
    ["image", "图片"],
    ["video", "视频"],
    ["text", "文本"],
    ["audio", "音频"],
  ]) {
    test(`卡片输入使用新控件且模型不侵入正文 ${kind} ${width}`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
      await openWorkspace(page);
      const close = page.getByRole("button", { name: "收起对话", exact: true });
      if (await close.isVisible()) await close.click();
      await page.getByRole("button", { name: "添加资源", exact: true }).click();
      await page.getByRole("menuitem", { name: label, exact: true }).click();
      const composer = page.locator(".creation-composer:visible");
      await expect(composer).toHaveCount(1);
      const geometry = await composer.evaluate((element) => {
        const box = (item: Element) => {
          const r = item.getBoundingClientRect();
          return { x: r.x, y: r.y, right: r.right, bottom: r.bottom };
        };
        const controls = [
          ...element.querySelectorAll(
            ".voice-button,.expand-composer,.generate-button,.composer-ref-add",
          ),
        ]
          .filter((item) => item.getClientRects().length)
          .map((item) => ({
            name: item.getAttribute("aria-label"),
            height: getComputedStyle(item).height,
            width: getComputedStyle(item).width,
            radius: getComputedStyle(item).borderRadius,
            text: item.classList.contains("generate-button"),
          }));
        return {
          controls,
          model: element.querySelector(".model-button")
            ? box(element.querySelector(".model-button")!)
            : null,
          input: box(element.querySelector("textarea")!),
        };
      });
      await info.attach("card-controls", {
        body: JSON.stringify(geometry),
        contentType: "application/json",
      });
      await page.screenshot({
        path: info.outputPath(`${kind}-${width}.png`),
        animations: "disabled",
      });
      for (const control of geometry.controls) {
        expect(control.height, control.name ?? "控件").toBe("32px");
        if (!control.text)
          expect(control.width, control.name ?? "控件").toBe("32px");
        expect(control.radius, control.name ?? "控件").toBe(
          control.text ? "999px" : "8px",
        );
      }
      if (geometry.model) {
        const overlaps =
          geometry.model.x < geometry.input.right &&
          geometry.model.right > geometry.input.x &&
          geometry.model.y < geometry.input.bottom &&
          geometry.model.bottom > geometry.input.y;
        expect(overlaps, "模型操作与正文输入区域分离").toBe(false);
      }
    });
  }
}

for (const [kind, label, inputLabel] of [
  ["video", "视频", "视频提示词"],
  ["audio", "音频", "音频提示词"],
]) {
  test(`旧项目重开保留长${label}草稿和新输入框`, async ({ page }) => {
    await openWorkspace(page);
    await page.getByRole("button", { name: "添加资源", exact: true }).click();
    await page.getByRole("menuitem", { name: label, exact: true }).click();
    const node = page
      .getByTestId(new RegExp(`^canvas-node-added-${kind}-`))
      .last();
    const id = await node.getAttribute("data-testid");
    const prompt = "恢复长草稿".repeat(1000).slice(0, 4500);
    await page.getByLabel(inputLabel, { exact: true }).fill(prompt);
    await expect(page.locator(".project-save-state")).toContainText("已保存");
    await page.reload();
    await page.getByRole("button", { name: "项目库", exact: true }).click();
    await page
      .locator(".project-library-card")
      .filter({ hasText: "Agent 验证项目" })
      .click();
    const restored = page.getByTestId(id!);
    await restored.focus();
    await restored.press("Enter");
    await expect(page.getByLabel(inputLabel, { exact: true })).toHaveValue(
      prompt,
    );
    await expect(
      page.locator(".creation-composer:visible .generate-button"),
    ).toHaveCSS("border-radius", "999px");
  });
}
