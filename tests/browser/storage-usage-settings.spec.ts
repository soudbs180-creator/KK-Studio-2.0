import { expect, test } from "@playwright/test";
import { openSettingsSection, openWorkspace } from "./helpers";
import { createTask } from "../../src/features/creation/model";

test("部分完成和离线终态不会显示为仍在处理中", async ({ page }) => {
  await openWorkspace(page);
  const snapshot = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kk-studio-next:creation:v1")!),
  );
  const project = snapshot.projects[0];
  project.tasks = [
    { ...createTask(project), status: "partial", completedOutputs: 1 },
    { ...createTask(project), status: "offline" },
  ];
  snapshot.revision = Date.now() + 1;
  await page.evaluate(
    (value) => localStorage.setItem("kk-studio-next:creation:v1", value),
    JSON.stringify(snapshot),
  );
  await page.reload();
  await openSettingsSection(page, "套餐与积分");
  const usage = page.locator("[data-usage-state]");
  await expect(
    usage.getByText("任务记录", { exact: true }).locator(".."),
  ).toContainText("2 个");
  await expect(
    usage.getByText("其他任务状态", { exact: true }).locator(".."),
  ).toContainText("2 个");
  await expect(usage).toContainText("部分完成不表示仍在运行");
  await expect(usage.getByText("处理中或待处理", { exact: true })).toHaveCount(
    0,
  );
});

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
  await openSettingsSection(page, "套餐与积分");
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
  await dialog.getByRole("button", { name: "数据管理", exact: true }).click();
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
  await openSettingsSection(page, "数据管理");
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
