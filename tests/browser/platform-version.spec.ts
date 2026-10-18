import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const versions = JSON.parse(
  readFileSync(
    new URL("../../config/platform-versions.json", import.meta.url),
    "utf8",
  ),
) as { desktop: string; web: string };

test("Web account and update UI display the Web platform version", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "个人信息", exact: true }).click();
  const popup = page.locator(".account-popup");
  await expect(popup).toContainText(`网页版 · v${versions.web}`);
  await popup.getByRole("button", { name: "查看", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "设置", exact: true });
  await expect(
    settings.getByRole("heading", { name: "通用", exact: true }),
  ).toBeVisible();
  const update = settings.getByRole("region", {
    name: "软件更新",
    exact: true,
  });
  await expect(update).toContainText(`网页版 · 当前版本 ${versions.web}`);
  const download = update.getByRole("link", {
    name: "下载 Windows 安装包",
    exact: true,
  });
  const filename = `KK Studio_${versions.desktop}_x64-setup.exe`;
  const url = `https://github.com/soudbs180-creator/KK-Studio-2.0/releases/download/v${versions.desktop}/${encodeURIComponent(filename)}`;
  await expect(download).toHaveAttribute("href", url);
  await expect(download).toHaveAttribute("download", filename);
  await expect(download).not.toHaveAttribute("target", "_blank");
  await page.route(url, (route) =>
    route.fulfill({
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
      body: "MZ installer download fixture",
    }),
  );
  const started = page.waitForEvent("download");
  await download.click();
  expect((await started).suggestedFilename()).toBe(filename);
  await expect(page).toHaveURL("/");
  await expect(update).toContainText(
    "单个安装包含 Windows Agent 运行资源；安装或更新保留本机项目和配置。",
  );
});
