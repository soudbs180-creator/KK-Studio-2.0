import { expect, test } from "@playwright/test";

test("未接入 updater 时旧偏好不能伪造检查或安装成功", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "kk:update-preferences",
      JSON.stringify({
        autoCheckOnLaunch: true,
        notifyOnUpdates: true,
        channel: "beta",
      }),
    );
  });
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "设置", exact: true });
  await settings.getByRole("button", { name: "软件更新", exact: true }).click();
  const update = settings.getByRole("region", {
    name: "软件更新",
    exact: true,
  });
  await expect(update.getByRole("button", { name: "检查更新" })).toBeDisabled();
  await expect(update.getByRole("status")).toContainText("尚未检查更新");
  await expect(update.getByRole("status")).toContainText("未下载或安装更新");
  await expect(update.getByRole("switch")).toBeDisabled();
  await expect(update.getByRole("switch")).toHaveAttribute(
    "aria-checked",
    "false",
  );
  await expect(
    update.getByRole("link", { name: "查看正式发布记录", exact: true }),
  ).toHaveAttribute(
    "href",
    "https://github.com/soudbs180-creator/KK-Studio-2.0/releases",
  );
  await expect(update).not.toContainText("当前已是最新版本");
  await expect(update).not.toContainText("更新包已校验就绪");
  for (const width of [1920, 390]) {
    await page.setViewportSize({ width, height: 844 });
    const label = update.locator("#automatic-downloads-label");
    const description = update.locator("#automatic-downloads-description");
    const titleBox = await label.boundingBox();
    const copyBox = await description.boundingBox();
    expect(titleBox).not.toBeNull();
    expect(copyBox).not.toBeNull();
    expect(copyBox!.y).toBeGreaterThanOrEqual(titleBox!.y + titleBox!.height);
  }
  await page.screenshot({
    path: testInfo.outputPath("app-update-unavailable.png"),
    fullPage: true,
  });
});
