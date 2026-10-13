import { expect, test } from "@playwright/test";
import { openSettingsSection, openWorkspace } from "./helpers";

test("使用记录只展示当前项目和真实回执，浏览器占用注明估算", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.storage, "estimate", {
      value: async () => ({ usage: 1024 * 1024, quota: 10 * 1024 * 1024 }),
      configurable: true,
    });
  });
  await openWorkspace(page);
  await openSettingsSection(page, "使用记录");
  const dialog = page.getByRole("dialog", { name: "设置", exact: true });
  const usage = dialog.locator("[data-usage-state]");
  await expect(usage).toHaveAttribute("data-usage-state", "saved");
  await expect(usage.getByText("已保存项目").locator("..")).toContainText(
    "1 个",
  );
  await expect(usage.getByText("Token 用量").locator("..")).toContainText(
    "未报告",
  );
  await expect(
    usage.getByText("已报告的 USD 费用").locator(".."),
  ).toContainText("未报告");
  await dialog.getByRole("button", { name: "储存", exact: true }).click();
  const storage = dialog.getByRole("region", { name: "数据保存与资源管理" });
  await expect(storage).toHaveAttribute("aria-busy", "false");
  await expect(storage.getByText("浏览器估算占用").locator("..")).toContainText(
    "1.0 MiB",
  );
  await expect(storage.getByText("浏览器估算配额").locator("..")).toContainText(
    "10.0 MiB",
  );
  await expect(storage).toContainText("喜欢记录偏好");
  await page.screenshot({
    path: info.outputPath("storage-estimate.png"),
    animations: "disabled",
  });
});

test("存储估算失败给出可重试状态，已保存项目不变", async ({ page }) => {
  await page.addInitScript(() => {
    let failed = false;
    Object.defineProperty(navigator.storage, "estimate", {
      value: async () => {
        if (!failed) {
          failed = true;
          throw new Error("estimate unavailable fixture");
        }
        return { usage: 0, quota: 10 * 1024 * 1024 };
      },
      configurable: true,
    });
  });
  await openWorkspace(page);
  await openSettingsSection(page, "储存");
  const storage = page.getByRole("region", { name: "数据保存与资源管理" });
  await expect(storage.getByRole("alert")).toContainText("保存位置未能读取");
  await storage.getByRole("button", { name: "刷新存储信息" }).click();
  await expect(storage.getByRole("alert")).toHaveCount(0);
  await expect(storage.getByText("浏览器估算占用").locator("..")).toContainText(
    "0.0 MiB",
  );
  await expect(storage.getByText("当前项目记录").locator("..")).toContainText(
    "1 个",
  );
});
