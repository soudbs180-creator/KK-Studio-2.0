import { expect, test, type Page } from "@playwright/test";
import { openSettingsSection } from "./helpers";

async function method(page: Page, name: string): Promise<void> {
  const methods = page.getByRole("group", { name: "接入方式", exact: true });
  if (await methods.isHidden())
    await page
      .getByRole("button", { name: "返回接入方式", exact: true })
      .click();
  await methods.getByRole("button", { name, exact: true }).click();
}

for (const width of [390, 1920]) {
  test(`本地预设清除远程分类与搜索，保留两个渠道的连接草稿 ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await openSettingsSection(page, "模型接入");
    await method(page, "API Key（官方）");
    await page.getByLabel("提供商", { exact: true }).fill("官方草稿不应被清除");
    const picker = page.locator(".provider-presets");
    await picker.locator("summary").click();
    await picker.getByRole("button", { name: "官方", exact: true }).click();
    await picker.getByLabel("搜索服务商", { exact: true }).fill("OpenAI");
    await method(page, "本地");
    await expect(picker.getByLabel("搜索服务商", { exact: true })).toHaveValue(
      "",
    );
    await expect(
      picker.getByRole("button", { name: "全部", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(picker.locator(".provider-preset-item")).toHaveCount(2);
    await expect(picker.locator(".provider-preset-item strong")).toHaveText([
      "LM Studio",
      "Ollama",
    ]);
    await page.getByLabel("提供商", { exact: true }).fill("本地草稿也要保留");
    await method(page, "API Key（官方）");
    await expect(page.getByLabel("提供商", { exact: true })).toHaveValue(
      "官方草稿不应被清除",
    );
    await method(page, "本地");
    await expect(page.getByLabel("提供商", { exact: true })).toHaveValue(
      "本地草稿也要保留",
    );
  });

  test(`远程预设详情不能留在本地，合法本地预设仍可应用 ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await openSettingsSection(page, "模型接入");
    await method(page, "API Key（官方）");
    const picker = page.locator(".provider-presets");
    await picker.locator("summary").click();
    await picker
      .getByRole("button", { name: "OpenAI Chat Completions", exact: true })
      .click();
    const detail = picker.getByRole("region", {
      name: "预设详情",
      exact: true,
    });
    await expect(
      detail.getByRole("heading", { name: "OpenAI", exact: true }),
    ).toBeVisible();
    await method(page, "本地");
    await expect(detail).toBeHidden();
    await expect(
      picker.getByRole("button", { name: "使用此预设", exact: true }),
    ).toHaveCount(0);
    await expect(page.getByLabel("接口地址", { exact: true })).toHaveValue(
      "http://127.0.0.1:8080/v1",
    );
    await picker
      .getByRole("group", { name: "服务商预设", exact: true })
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: test.info().outputPath(`local-preset-scope-${width}.png`),
      animations: "disabled",
    });
    await picker
      .locator(".provider-preset-item")
      .filter({ hasText: /^LM Studio/ })
      .click();
    await detail
      .getByRole("button", { name: "使用此预设", exact: true })
      .click();
    await expect(page.getByLabel("接口地址", { exact: true })).toHaveValue(
      "http://127.0.0.1:1234/v1",
    );
    await expect(
      page.getByRole("combobox", { name: "认证方式", exact: true }),
    ).toHaveValue("none");
  });
}
