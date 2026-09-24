import { expect, test, type Page } from "@playwright/test";

async function openMemorySection(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "设置" });
  await dialog
    .locator(".settings-nav")
    .getByRole("button", { name: "记忆", exact: true })
    .click();
  return dialog;
}

test("记忆分区渲染标题、共享隐私说明与默认关闭的开关", async ({ page }) => {
  const dialog = await openMemorySection(page);
  await expect(dialog.getByText("记忆服务", { exact: true })).toBeVisible();
  await expect(dialog.getByText(/隐私：记忆仅存本机/)).toBeVisible();
  const toggle = dialog.getByRole("switch", {
    name: "记忆服务开关",
    exact: true,
  });
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  // 默认关闭：不显示共享状态/列表等启用态内容。
  await expect(dialog.getByText("共享状态", { exact: true })).toHaveCount(0);
});

test("开启记忆后显示共享状态、提炼入口与空态", async ({ page }) => {
  const dialog = await openMemorySection(page);
  const toggle = dialog.getByRole("switch", {
    name: "记忆服务开关",
    exact: true,
  });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await expect(dialog.getByText("共享状态", { exact: true })).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "授权共享目录", exact: true }),
  ).toBeVisible();
  await expect(dialog.getByText("暂无记忆")).toBeVisible();
  // Codex 未连接时提炼按钮禁用并给出提示原因。
  const extract = dialog.getByRole("button", {
    name: "让 Codex 提炼记忆",
    exact: true,
  });
  await expect(extract).toBeDisabled();
});

test("关闭记忆后回到初始态并停止展示启用内容", async ({ page }) => {
  const dialog = await openMemorySection(page);
  const toggle = dialog.getByRole("switch", {
    name: "记忆服务开关",
    exact: true,
  });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await expect(dialog.getByText("共享状态", { exact: true })).toHaveCount(0);
});

test("记忆分区不产生横向溢出", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const dialog = await openMemorySection(page);
  const content = dialog.locator(".settings-content");
  const overflow = await content.evaluate(
    (el) => el.scrollWidth - el.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
