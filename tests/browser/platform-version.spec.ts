import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const versions = JSON.parse(
  readFileSync(
    new URL("../../config/platform-versions.json", import.meta.url),
    "utf8",
  ),
) as { web: string };

test("Web account and update UI display the Web platform version", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "个人信息", exact: true }).click();
  const popup = page.locator(".account-popup");
  await expect(popup).toContainText(`版本更新 v${versions.web}`);
  await popup.getByRole("button", { name: "查看", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "设置", exact: true });
  await expect(
    settings.getByRole("heading", { name: "通用", exact: true }),
  ).toBeVisible();
  const update = settings.getByRole("region", {
    name: "软件更新",
    exact: true,
  });
  await expect(update).toContainText(`浏览器版 · 当前版本 ${versions.web}`);
  await expect(
    update.getByRole("button", { name: "服务未接入", exact: true }),
  ).toBeDisabled();
  await expect(update).toContainText(
    "更新与官方客户端下载信息尚未接入；此处不表示当前版本已是最新。",
  );
});
