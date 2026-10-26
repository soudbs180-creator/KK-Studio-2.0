import { expect, test } from "@playwright/test";

test("通用开关通过键盘切换、持久化并反映滑块状态", async ({ page }) => {
  await page.goto("/");
  const opener = page.getByRole("button", { name: "打开设置", exact: true });
  await opener.click();

  const dialog = page.getByRole("dialog", { name: "设置" });
  const floating = dialog.getByRole("switch", { name: "浮岛布局" });
  const initial = await floating.getAttribute("aria-checked");
  const expected = initial === "true" ? "false" : "true";

  await floating.focus();
  await expect(floating).toBeFocused();
  await page.keyboard.press("Space");
  await expect(floating).toHaveAttribute("aria-checked", expected);
  const thumbTransform = expect.poll(() =>
    floating.locator("span").evaluate((element) => {
      return getComputedStyle(element).transform;
    }),
  );
  if (expected === "true") {
    await thumbTransform.not.toBe("none");
  } else {
    await thumbTransform.toBe("none");
  }
  await expect
    .poll(() =>
      page.evaluate(() => {
        const value = localStorage.getItem("kk-studio-next:settings:v1");
        return value ? JSON.parse(value).floatingLayout : null;
      }),
    )
    .toBe(expected === "true");

  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();
  await page.reload();
  await opener.click();
  await expect(
    page.getByRole("dialog", { name: "设置" }).getByRole("switch", {
      name: "浮岛布局",
    }),
  ).toHaveAttribute("aria-checked", expected);
});

test("桌面专属开关和更新开关明确暴露禁用状态", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "设置" });

  await dialog.getByText("系统偏好与桌面集成", { exact: true }).click();
  for (const name of ["开机自启动", "系统托盘图标", "防止系统休眠"]) {
    const toggle = dialog.getByRole("switch", { name });
    await expect(toggle).toBeDisabled();
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await expect(toggle).toHaveAttribute("aria-disabled", "true");
    await expect(toggle).toHaveCSS("opacity", "0.45");
  }

  await dialog.getByRole("button", { name: "软件更新", exact: true }).click();
  const updates = dialog.locator(".settings-content");
  await expect(
    updates.getByRole("heading", { name: "软件更新", exact: true }),
  ).toBeVisible();
  await expect(
    updates.getByRole("button", { name: "检查更新", exact: true }),
  ).toBeEnabled();
  await expect(updates).toContainText("当前版本运行稳定");

  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "打开设置", exact: true }),
  ).toBeFocused();
});
