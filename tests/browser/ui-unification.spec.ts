import { expect, test, type Locator } from "@playwright/test";
import { openWorkspace, waitForConversationPanelSettled } from "./helpers";

async function readableDefault(
  form: Locator,
  labelSelector: string,
  expectedLabel: string,
) {
  const geometry = await form.evaluate((element, selector) => {
    const label = element.querySelector<HTMLElement>(selector)!;
    const toolbar = element.querySelector(".composer-toolbar")!;
    const area = toolbar.getBoundingClientRect();
    const controls = [...toolbar.querySelectorAll("button")]
      .filter((button) => button.getClientRects().length)
      .map((button) => {
        const rect = button.getBoundingClientRect();
        return {
          name: button.getAttribute("aria-label") ?? button.textContent,
          left: rect.left,
          right: rect.right,
          center: rect.y + rect.height / 2,
          height: rect.height,
        };
      });
    return {
      text: label.textContent,
      labelWidth: label.clientWidth,
      fullLabelWidth: label.scrollWidth,
      left: area.left,
      right: area.right,
      controls,
    };
  }, labelSelector);
  await test.info().attach(`default-${labelSelector}`, {
    body: JSON.stringify(geometry),
    contentType: "application/json",
  });
  expect(geometry.text).toBe(expectedLabel);
  expect(geometry.labelWidth).toBeGreaterThanOrEqual(geometry.fullLabelWidth);
  const centers = geometry.controls.map((control) => control.center);
  expect(Math.max(...centers) - Math.min(...centers)).toBeLessThanOrEqual(1);
  for (const control of geometry.controls) {
    expect(control.height, control.name ?? "control").toBe(32);
    expect(control.left).toBeGreaterThanOrEqual(geometry.left - 0.5);
    expect(control.right).toBeLessThanOrEqual(geometry.right + 0.5);
  }
}

test("默认绿色、方形圆角上传与输入聚焦保持轻量", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-accent", "default");
  expect(
    await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--kk-accent")
        .trim(),
    ),
  ).toBe("#21a673");
  const upload = page.getByRole("button", {
    name: "添加参考素材",
    exact: true,
  });
  await expect(upload).toHaveCSS("border-radius", "8px");
  const input = page.getByRole("textbox", { name: "创作提示词", exact: true });
  await input.click();
  await input.fill("中文输入保持自然");
  await expect(input).toHaveCSS("outline-style", "none");
  await expect(page.locator(".start-composer")).toHaveCSS(
    "border-color",
    "rgba(0, 0, 0, 0)",
  );
});

for (const width of [390, 1099, 1920]) {
  test(`模型胶囊按内容居中、上传保留方角 ${width}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1080 });
    await page.goto("/");
    const home = page.locator(".start-composer");
    await expect(home.locator(".start-mode-button")).toHaveText(/自动|询问/);
    await readableDefault(home, ".start-model-picker span", "Codex 内置生图");
    await openWorkspace(page);
    if (
      await page
        .getByRole("button", { name: "打开对话", exact: true })
        .isVisible()
    )
      await page.getByRole("button", { name: "打开对话", exact: true }).click();
    await waitForConversationPanelSettled(page);
    const model = page.locator(".chat-model-picker");
    await expect(model).toBeVisible();
    const chat = page.locator(".chat-composer");
    await expect(chat.getByRole("button", { name: "AI权限模式" })).toHaveText(
      /自动|询问/,
    );
    await readableDefault(chat, ".chat-model-name", "Codex 账号默认");
    await expect(model).toHaveCSS("justify-content", "center");
    await expect(page.locator(".chat-attachment-trigger")).toHaveCSS(
      "border-radius",
      "8px",
    );
    const layout = await model.evaluate((button) => {
      const label = button.querySelector<HTMLElement>(".chat-model-name")!;
      const rect = button.getBoundingClientRect();
      return {
        width: rect.width,
        labelWidth: label.clientWidth,
        fullLabelWidth: label.scrollWidth,
        right: rect.right,
        viewport: innerWidth,
      };
    });
    expect(layout.width).toBeGreaterThan(58);
    expect(layout.labelWidth).toBeGreaterThanOrEqual(layout.fullLabelWidth);
    expect(layout.right).toBeLessThanOrEqual(layout.viewport);
    await page.screenshot({
      path: testInfo.outputPath(`unified-${width}.png`),
      animations: "disabled",
    });
  });
}

test("首页不显示画布参数，普通输入草稿仍可恢复", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("生成参数", { exact: true })).toHaveCount(0);
  await page.getByLabel("创作提示词", { exact: true }).fill("保留当前草稿");
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem("kk-studio-next:creation:v1")),
    )
    .toContain("保留当前草稿");
  await page.reload();
  await expect(page.getByLabel("创作提示词", { exact: true })).toHaveValue(
    "保留当前草稿",
  );
  await expect(page.getByLabel("生成数量", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("隐私模式", { exact: true })).toHaveCount(0);
});
