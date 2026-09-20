import { test, expect } from "@playwright/test";
import { openWorkspace } from "./helpers";

test("Modal 关闭按钮、Escape 和遮罩点击均关闭并回焦触发按钮", async ({
  page,
}) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "打开设置", exact: true });

  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "设置" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "关闭设置", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(dialog).toBeVisible();
  await page.mouse.click(8, 8);
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("嵌套 Modal 的 Escape 只关闭最内层并保持父层，第二次才关闭父层", async ({
  page,
}) => {
  await openWorkspace(page);
  const assetTrigger = page.getByRole("button", {
    name: "资产管理",
    exact: true,
  });
  await assetTrigger.click();
  const assetDialog = page.getByRole("dialog", { name: "资产管理" });
  await expect(assetDialog).toBeVisible();
  await assetDialog.getByRole("tab", { name: "资产", exact: true }).click();

  const createTrigger = assetDialog.getByRole("button", {
    name: "创建主体",
    exact: true,
  });
  await createTrigger.click();
  const childDialog = page.getByRole("dialog", { name: "创建主体" });
  await expect(childDialog).toBeVisible();
  await expect(page.locator("dialog[open]")).toHaveCount(2);

  await page.keyboard.press("Escape");
  await expect(childDialog).toHaveCount(0);
  await expect(assetDialog).toBeVisible();
  await expect(createTrigger).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(assetDialog).toHaveCount(0);
  await expect(assetTrigger).toBeFocused();
});

test("侧栏菜单互斥，IME 合成不误关闭，打开设置会收起来源菜单", async ({
  page,
}) => {
  await page.goto("/");
  const projectMenuTrigger = page.getByRole("button", {
    name: "项目显示与排序",
    exact: true,
  });
  const accountTrigger = page.getByRole("button", {
    name: "个人信息",
    exact: true,
  });

  await projectMenuTrigger.click();
  const projectMenu = page.getByRole("menu", { name: "项目显示与排序" });
  await expect(projectMenu).toBeVisible();
  await accountTrigger.click();
  const accountMenu = page.getByLabel("个人信息（本地 Prototype）");
  await expect(accountMenu).toBeVisible();
  await expect(projectMenu).toHaveCount(0);

  await page.dispatchEvent("body", "keydown", {
    key: "Escape",
    code: "Escape",
    isComposing: true,
  });
  await expect(accountMenu).toBeVisible();
  await expect(projectMenu).toHaveCount(0);

  await page.keyboard.press("Escape");
  await expect(accountMenu).toHaveCount(0);
  await expect(accountTrigger).toBeFocused();

  await projectMenuTrigger.click();
  await expect(projectMenu).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(projectMenu).toHaveCount(0);
  await expect(projectMenuTrigger).toBeFocused();

  await accountTrigger.click();
  await page
    .getByLabel("个人信息（本地 Prototype）")
    .getByRole("button", {
      name: "打开主题设置",
      exact: true,
    })
    .click();
  const settingsDialog = page.getByRole("dialog", { name: "设置" });
  await expect(settingsDialog).toBeVisible();
  await expect(accountMenu).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(settingsDialog).toHaveCount(0);
  await expect(accountMenu).toHaveCount(0);
  await expect(accountTrigger).toBeFocused();
});
