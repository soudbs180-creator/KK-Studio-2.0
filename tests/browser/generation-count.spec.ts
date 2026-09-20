import { expect, test } from "@playwright/test";
import { openWorkspace } from "./helpers";

test("视频声音开关按原稿切换，离开卡片后保留选择", async ({ page }) => {
  await openWorkspace(page);
  const node = page.getByTestId("canvas-node-video1");
  await node.focus();
  await page.keyboard.press("Enter");
  const sound = page.getByRole("button", { name: "视频声音" });
  await expect(sound).toHaveAttribute("aria-pressed", "false");
  await sound.click();
  await expect(sound).toHaveAttribute("aria-pressed", "true");
  await expect(sound.locator("img")).toHaveAttribute(
    "src",
    "/design/figma/mic.svg",
  );
  await page.keyboard.press("Escape");
  await node.focus();
  await page.keyboard.press("Enter");
  await expect(sound).toHaveAttribute("aria-pressed", "true");
  await sound.press("Space");
  await expect(sound).toHaveAttribute("aria-pressed", "false");
});

for (const kind of ["image", "video"] as const) {
  test(`${kind} 数量五档可键盘选择，Escape 回焦且切换卡片保留`, async ({
    page,
  }) => {
    await openWorkspace(page);
    const node = page.getByTestId(
      `canvas-node-${kind === "image" ? "image" : "video1"}`,
    );
    await node.focus();
    await page.keyboard.press("Enter");
    const trigger = page.getByRole("button", { name: "生成数量" });
    await trigger.click();
    const slider = page.getByRole("slider", { name: "生成数量" });
    await expect(slider).toBeFocused();
    await expect(slider).toHaveAttribute("aria-valuetext", "8");
    await page.keyboard.press("ArrowLeft");
    await expect(slider).toHaveAttribute("aria-valuetext", "6");
    await page.keyboard.press("Escape");
    await expect(slider).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(trigger).toContainText("6");
    await expect(page.getByTestId(`${kind}-composer`)).toBeVisible();
    await page.keyboard.press("Escape");
    await node.focus();
    await page.keyboard.press("Enter");
    await expect(trigger).toContainText("6");
    await trigger.click();
    await page.keyboard.press("Home");
    for (const count of ["1", "2", "4", "6", "8"]) {
      await expect(slider).toHaveAttribute("aria-valuetext", count);
      if (count !== "8") await page.keyboard.press("ArrowRight");
    }
    await page
      .getByLabel(kind === "image" ? "图片提示词" : "视频提示词")
      .click();
    await expect(slider).toHaveCount(0);
  });
}
