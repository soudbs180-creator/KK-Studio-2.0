import { expect, test } from "@playwright/test";
import { waitForConversationPanelSettled } from "./helpers";

test("latest Figma shell is loaded by the real production page", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".app")).toHaveAttribute(
    "data-runtime-entry",
    "src/main.tsx",
  );
  await expect(page.locator(".app")).toHaveAttribute(
    "data-runtime-mode",
    "production",
  );
  await expect(page.locator(".sidebar")).toHaveCSS("width", "291px");
  await expect(page.locator(".sidebar")).toHaveCSS(
    "background-color",
    "rgb(22, 22, 22)",
  );
  await page.screenshot({
    path: test.info().outputPath("after-landing.png"),
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "项目库", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await waitForConversationPanelSettled(page);
  await expect(page.locator(".conversation-panel")).toHaveCSS(
    "background-color",
    "rgb(22, 22, 22)",
  );
  const boxes = await page.evaluate(() =>
    Object.fromEntries(
      [
        ".workspace-content",
        ".conversation-panel",
        ".chat-composer",
        ".chat-composer textarea",
        ".chat-composer > div",
        ".canvas-toolbar",
      ].map((selector) => {
        const rect = document.querySelector(selector)!.getBoundingClientRect();
        return [selector, [rect.x, rect.y, rect.width, rect.height]];
      }),
    ),
  );
  const figma: Record<string, number[]> = {
    ".workspace-content": [291, 45, 1619, 1025],
    ".conversation-panel": [1430, 61, 470, 998],
    ".chat-composer": [1450, 844, 426, 170],
    ".chat-composer textarea": [1463, 857, 400, 64],
    ".chat-composer > div": [1463, 977, 400, 24],
    ".canvas-toolbar": [719, 998, 294, 50],
  };
  for (const [selector, expected] of Object.entries(figma))
    expected.forEach((value, index) =>
      expect(Math.abs(boxes[selector][index] - value), selector).toBeLessThan(
        1,
      ),
    );
  await expect(page.locator(".chat-composer > div > button").nth(1)).toHaveCSS(
    "height",
    "22px",
  );
  await page.screenshot({
    path: test.info().outputPath("after-workspace.png"),
    animations: "disabled",
  });
  await page.getByRole("button", { name: "收起侧边栏", exact: true }).click();
  await expect(page.locator(".sidebar")).toHaveCSS("width", "70px");
  await expect
    .poll(
      async () => (await page.locator(".workspace-content").boundingBox())!.x,
    )
    .toBe(70);
  await expect
    .poll(async () => (await page.locator(".canvas-toolbar").boundingBox())!.x)
    .toBeCloseTo(719, 0);
  await page.screenshot({
    path: test.info().outputPath("after-collapsed.png"),
    animations: "disabled",
  });
});

test("scaled desktop keeps the complete surface visible and input interactions work", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect
    .poll(async () => (await page.locator(".app").boundingBox())!.width)
    .toBe(1440);
  const app = (await page.locator(".app").boundingBox())!;
  expect(app.x).toBe(0);
  expect(app.y).toBeCloseTo(45, 0);
  expect(app.height).toBe(810);
  await page
    .getByRole("button", { name: "项目库", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  const send = page.getByRole("button", { name: "发送消息", exact: true });
  await expect(send).toBeDisabled();
  await page.getByLabel("对话内容", { exact: true }).fill("本地 UI 验证草稿");
  await expect(send).toBeEnabled();
  await send.click();
  await expect(page.getByLabel("API Key")).toBeVisible();
  await expect(page.getByLabel("对话内容")).toHaveValue("本地 UI 验证草稿");
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page.getByRole("button", { name: "AI权限模式", exact: true }).click();
  await expect(
    page.getByRole("menuitemradio", { name: "自动", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".chat-mode-popover")).toHaveCount(0);
  await page.screenshot({
    path: test.info().outputPath("after-1440.png"),
    animations: "disabled",
  });
});
