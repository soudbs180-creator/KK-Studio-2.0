import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { openSeededProject, expandSidebar } from "./helpers";
import { CREATION_STORAGE_KEY } from "../../src/features/creation/model";
import { SETTINGS_STORAGE_KEY } from "../../src/domain/settings";

const fence = String.fromCharCode(96).repeat(3);
const source =
  "# 正文 🌏\n\n| 项目 | 状态 |\n| --- | --- |\n| 图片 | 完整 |\n\n" +
  fence +
  "js\nconst 原文 = '<tag>';\n" +
  fence +
  "\n\n<script>window.__markdownAttack = true</script>\n\n[危险](javascript:alert%281%29)";

async function openMessages(page: Page, theme: "dark" | "light") {
  await page.addInitScript(
    ({ key, theme }) => {
      localStorage.setItem("kk-chat-channel", "direct");
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          language: "zh-CN",
          theme,
          accent: "default",
          floatingLayout: true,
          removeWatermark: true,
        }),
      );
    },
    { key: SETTINGS_STORAGE_KEY, theme },
  );
  await openSeededProject(page);
  await page.evaluate(
    ({ key, content }) => {
      const snapshot = JSON.parse(localStorage.getItem(key)!);
      snapshot.revision = Date.now() + 1000;
      snapshot.projects[0].name = "Markdown 🌏 测试";
      snapshot.projects[0].messages = [
        { id: "markdown-user", role: "user", content, createdAt: Date.now() },
        {
          id: "internal-status",
          role: "system",
          content: "内部状态标记",
          createdAt: Date.now(),
        },
      ];
      localStorage.setItem(key, JSON.stringify(snapshot));
    },
    { key: CREATION_STORAGE_KEY, content: source },
  );
  await page.reload();
  await expandSidebar(page);
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page
    .locator(".project-library-card")
    .filter({ hasText: "Markdown 🌏 测试" })
    .click();
  await expect(page.getByRole("region", { name: "无限画布" })).toBeVisible();
  const panel = page.locator(".conversation-panel");
  await expect(panel.getByRole("heading", { name: "正文 🌏" })).toBeVisible();
  return panel;
}

for (const theme of ["dark", "light"] as const) {
  test(
    "safe message Markdown and original copy remain usable in " + theme,
    async ({ page }) => {
      const panel = await openMessages(page, theme);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(panel.getByRole("table")).toContainText("完整");
      await expect(panel.locator("pre code")).toHaveText(
        "const 原文 = '<tag>';",
      );
      await expect(panel.locator('a[href^="javascript:"]')).toHaveCount(0);
      expect(
        await page.evaluate(() => Reflect.get(window, "__markdownAttack")),
      ).toBeUndefined();
      await page.evaluate(() =>
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: {
            writeText: async (value: string) => {
              Reflect.set(window, "__copiedMessage", value);
            },
          },
        }),
      );
      const copy = panel
        .getByRole("button", { name: "复制消息", exact: true })
        .first();
      await copy.click();
      await expect(panel.getByRole("status")).toContainText("已复制消息");
      expect(
        await page.evaluate(() => Reflect.get(window, "__copiedMessage")),
      ).toBe(source);
      await page.evaluate(() =>
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: {
            writeText: async () => {
              throw new Error("permission denied");
            },
          },
        }),
      );
      await copy.click();
      await expect(panel.getByRole("status")).toContainText("复制失败");
      await expect(copy).toBeEnabled();
      const overflow = await panel
        .locator(".message-markdown")
        .first()
        .evaluate(
          (element) =>
            element.getBoundingClientRect().width >
            element.parentElement!.getBoundingClientRect().width + 1,
        );
      expect(overflow).toBe(false);
    },
  );
}

test("local Markdown export includes originals and excludes internal status objects", async ({
  page,
}) => {
  const panel = await openMessages(page, "dark");
  const buttons = await panel.locator("header > button").all();
  const boxes = await Promise.all(
    buttons.map((button) => button.boundingBox()),
  );
  expect(boxes).toHaveLength(3);
  for (let index = 1; index < boxes.length; index++)
    expect(boxes[index - 1]!.x + boxes[index - 1]!.width).toBeLessThanOrEqual(
      boxes[index]!.x,
    );
  await panel.getByRole("button", { name: "对话记录", exact: true }).click();
  await expect(panel).toContainText("本次会话共");
  const exported = page.waitForEvent("download");
  await panel.getByRole("button", { name: "导出对话 Markdown" }).click();
  const download = await exported;
  expect(download.suggestedFilename()).toBe("Markdown 🌏 测试.md");
  const path = await download.path();
  expect(path).not.toBeNull();
  const output = await readFile(path!, "utf8");
  expect(output).toContain(source);
  expect(output).not.toContain("内部状态标记");
});
