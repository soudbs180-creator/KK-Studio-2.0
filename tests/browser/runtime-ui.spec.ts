import { expect, test } from "@playwright/test";
import { waitForConversationPanelSettled } from "./helpers";

const evidence = "test-results/runtime/ui-runtime-2026-09-10";

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
    path: evidence + "/after-landing.png",
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
        ".chat-composer .composer-toolbar",
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
    ".canvas-toolbar": [719, 998, 294, 50],
  };
  for (const [selector, expected] of Object.entries(figma))
    expected.forEach((value, index) =>
      expect(Math.abs(boxes[selector][index] - value), selector).toBeLessThan(
        1,
      ),
    );
  // DS 1.3 replaces fixed Figma input height with a shared, growing form.
  const form = boxes[".chat-composer"];
  const input = boxes[".chat-composer textarea"];
  const toolbar = boxes[".chat-composer .composer-toolbar"];
  expect(input).toEqual([form[0] + 13, form[1] + 13, form[2] - 26, 60]);
  expect(toolbar).toEqual([input[0], input[1] + input[3] + 8, input[2], 32]);
  expect(form[3]).toBe(126);
  await expect(
    page.getByRole("button", { name: "开启语音输入", exact: true }),
  ).toHaveCSS("height", "32px");
  await page.screenshot({
    path: evidence + "/after-workspace.png",
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
    path: evidence + "/after-collapsed.png",
    animations: "disabled",
  });
});

test("responsive desktop fills the viewport without scaling readable controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect
    .poll(async () => (await page.locator(".app").boundingBox())!.width)
    .toBe(1440);
  const app = (await page.locator(".app").boundingBox())!;
  expect(app.x).toBe(0);
  expect(app.y).toBe(0);
  expect(app.height).toBe(900);
  await expect(page.locator(".topbar strong")).toHaveCSS("font-size", "12px");
  await page
    .getByRole("button", { name: "项目库", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await page.getByLabel("执行方式").selectOption("direct");
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
    path: evidence + "/after-1440.png",
    animations: "disabled",
  });
});
