import { expect, test } from "@playwright/test";

test("home defaults to Codex and offline submission has an explicit reason", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const composer = page.locator(".start-composer");
  await composer
    .getByLabel("创作提示词", { exact: true })
    .fill("测试未配置模型");
  const submit = composer.getByRole("button", {
    name: "开始创建项目",
    exact: true,
  });
  await expect(submit).toBeEnabled();
  await expect(
    composer.getByRole("button", { name: "模型", exact: true }),
  ).toContainText("Codex 内置生图");
  await page.context().setOffline(true);
  await composer
    .getByLabel("创作提示词", { exact: true })
    .fill("离线编辑仍保留草稿");
  await expect(submit).toBeDisabled();
  await expect(submit).toHaveAttribute("aria-describedby");
  await expect(page.locator(".start-composer-feedback")).toContainText("离线");
});
