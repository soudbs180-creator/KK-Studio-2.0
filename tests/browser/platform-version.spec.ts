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
  await popup.getByRole("button", { name: "检测", exact: true }).click();
  await expect(page.locator(".settings-version-current")).toHaveText(
    `当前版本 ${versions.web}`,
  );
  await expect(page.locator(".settings-version")).toContainText(
    "更新检查尚未接入",
  );
});
