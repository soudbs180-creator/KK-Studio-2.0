import { expect, test } from "@playwright/test";
import { openWorkspace } from "./helpers";

for (const width of [390, 1099, 1920]) {
  test(`重绘复用当前图片模型菜单 ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
    await openWorkspace(page);
    const close = page.getByRole("button", { name: "收起对话", exact: true });
    if (await close.isVisible()) await close.click();
    const node = page.getByTestId("canvas-node-image");
    await node
      .locator('input[type="file"]')
      .first()
      .setInputFiles("public/fixtures/demo/blue-hour.png");
    await expect(node.locator(".uploaded-image")).toBeVisible();
    await node.focus();
    await node.press("Enter");
    await page
      .getByRole("toolbar", { name: /^图片操作：/ })
      .getByRole("button", { name: "重绘参考图片", exact: true })
      .click();
    const model = page.getByRole("button", { name: "重绘模型", exact: true });
    await expect(model).toHaveCSS("height", "32px");
    await expect(model).toHaveCSS("border-radius", "999px");
    await model.click();
    await expect(
      page.locator(".image-edit-model .kk-model-menu"),
    ).toBeVisible();
    await expect(page.locator(".image-edit-model select")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(model).toBeFocused();
    await expect(page.locator(".image-edit-model .kk-model-menu")).toHaveCount(
      0,
    );
    await page.screenshot({
      path: info.outputPath(`redraw-model-${width}.png`),
      animations: "disabled",
    });
  });

  test(`Google沿用共享模型胶囊并保留自定义型号 ${width}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
    await openWorkspace(page);
    const open = page.getByRole("button", { name: "打开对话", exact: true });
    if (await open.isVisible()) await open.click();
    await page.getByLabel("执行方式", { exact: true }).selectOption("google");
    const trigger = page.getByRole("button", {
      name: "Google 模型",
      exact: true,
    });
    await expect(trigger).toHaveCSS("height", "32px");
    await expect(trigger).toHaveCSS("border-radius", "999px");
    await trigger.click();
    const menu = page.getByRole("menu", { name: "Google 模型", exact: true });
    const model = "gemini-private-long-project-model-".repeat(3);
    await menu
      .getByLabel("搜索或输入 Google 型号", { exact: true })
      .fill(model);
    await menu.getByRole("menuitemradio").filter({ hasText: model }).click();
    await expect(menu).toHaveCount(0);
    await expect(trigger).toContainText(model);
    await trigger.click();
    await expect(
      menu.getByRole("menuitemradio", { checked: true }),
    ).toContainText(model);
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await expect(menu).toHaveCount(0);
    await trigger.click();
    await page
      .locator(".chat-composer")
      .getByRole("button", { name: "扩展", exact: true })
      .click();
    await expect(menu).toHaveCount(0);
    await page.keyboard.press("Escape");
    await page.screenshot({
      path: info.outputPath(`google-model-${width}.png`),
      animations: "disabled",
    });
    await page.reload();
    await page.getByRole("button", { name: "项目库", exact: true }).click();
    await page
      .locator(".project-library-card")
      .filter({ hasText: "Agent 验证项目" })
      .click();
    if (await open.isVisible()) await open.click();
    await page.getByLabel("执行方式", { exact: true }).selectOption("google");
    await expect(trigger).toBeVisible();
    await expect(trigger).toHaveAttribute("title", /\S/);
    await expect(
      page
        .locator(".google-agent-controls")
        .getByLabel("Google 输出", { exact: true }),
    ).toHaveValue("text");
  });
}

for (const channel of ["codex", "google"]) {
  test(`${channel} 模型搜索回车不提交草稿，IME确认不选型`, async ({ page }) => {
    await openWorkspace(page);
    const reopen = page.getByRole("button", { name: "打开对话", exact: true });
    if (await reopen.isVisible()) await reopen.click();
    await page.getByLabel("执行方式", { exact: true }).selectOption(channel);
    const form = page.locator(".chat-composer");
    const draft = "菜单回车与输入法确认都不能发送这份草稿";
    await form.getByLabel("对话内容", { exact: true }).fill(draft);
    await expect(
      form.getByRole("button", { name: "发送消息", exact: true }),
    ).toBeEnabled();
    await form.evaluate((element) => {
      element.setAttribute("data-menu-submit-count", "0");
      element.addEventListener("submit", () => {
        element.setAttribute(
          "data-menu-submit-count",
          String(Number(element.getAttribute("data-menu-submit-count")) + 1),
        );
      });
    });
    const trigger = form.getByRole("button", {
      name: channel === "google" ? "Google 模型" : "模型",
      exact: true,
    });
    const previous = await trigger.getAttribute("title");
    await trigger.click();
    const menu = page.getByRole("menu", {
      name: channel === "google" ? "Google 模型" : "选择模型",
      exact: true,
    });
    const search = menu.getByLabel(
      channel === "google" ? "搜索或输入 Google 型号" : "搜索模型、厂商或参数",
      { exact: true },
    );
    for (const query of ["", "   "]) {
      await search.fill(query);
      await search.press("Enter");
      await expect(form).toHaveAttribute("data-menu-submit-count", "0");
      await expect(menu).toBeVisible();
    }
    await search.fill("ime-model-fixture");
    for (const ime of [
      { isComposing: true, keyCode: 0 },
      { isComposing: false, keyCode: 229 },
    ]) {
      const prevented = await search.evaluate(
        (element, ime) =>
          !element.dispatchEvent(
            new KeyboardEvent("keydown", {
              key: "Enter",
              code: "Enter",
              ...ime,
              bubbles: true,
              cancelable: true,
            }),
          ),
        ime,
      );
      expect(prevented).toBe(true);
      await expect(menu).toBeVisible();
      await expect(trigger).toHaveAttribute("title", previous!);
    }
    await expect(form).toHaveAttribute("data-menu-submit-count", "0");
    await expect(form.getByLabel("对话内容", { exact: true })).toHaveValue(
      draft,
    );
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
  });
}
