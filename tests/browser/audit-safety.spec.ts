import { expect, test } from "@playwright/test";
import {
  createProject,
  emptySnapshot,
  CREATION_STORAGE_KEY,
} from "../../src/features/creation/model";
import { expandSidebar } from "./helpers";

for (const width of [1920, 390]) {
  test(`尚未开放的聊天入口说明原因 ${width}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await page
      .getByRole("button", {
        name: width === 390 ? "应用功能菜单" : "文件",
        exact: true,
      })
      .click();
    for (const name of ["新建窗口", "新建聊天", "新建临时聊天"]) {
      const item = page.getByRole(width === 390 ? "menuitem" : "button", {
        name,
        exact: true,
      });
      await expect(item).toBeDisabled();
      await expect(item).toHaveAttribute("title", /尚未完成/);
    }
    await page.screenshot({
      path: testInfo.outputPath("disabled-chat-entries.png"),
    });
  });
}

test("受保护历史聊天可切换查看，重开仍保留原始快照", async ({
  page,
}, testInfo) => {
  const project = createProject({
    prompt: "",
    model: "image-test",
    kind: "image",
    attachments: [],
  });
  project.name = "只读恢复验证";
  const first = Object.values(project.chats!)[0];
  first.draft.prompt = "草稿 A";
  first.messages = [{ id: "a", role: "assistant", content: "历史消息 A" }];
  project.chats!.second = {
    ...first,
    id: "second",
    name: "对话 B",
    draft: { text: "草稿 B" },
    messages: [{ id: "b", role: "assistant", content: "历史消息 B" }],
  };
  const raw = JSON.stringify({
    ...emptySnapshot(),
    version: 3,
    schemaVersion: 3,
    revision: Date.now(),
    projects: [project],
    activeProjectId: project.id,
  });
  await page.addInitScript(
    ({ key, raw }) => {
      if (!sessionStorage.getItem("audit-safety-seeded")) {
        localStorage.setItem(key, raw);
        sessionStorage.setItem("audit-safety-seeded", "yes");
      }
    },
    { key: CREATION_STORAGE_KEY, raw },
  );
  await page.goto("/");
  await expect(page.locator(".creation-storage-notice")).toContainText(
    "读取保护",
  );
  for (const [width, height] of [
    [1920, 1080],
    [390, 480],
  ]) {
    await page.setViewportSize({ width, height });
    await page.getByRole("button", { name: "个人信息", exact: true }).click();
    await page
      .locator(".account-popup")
      .getByRole("button", { name: "查看", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "软件更新", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".creation-storage-notice")).toContainText(
      "读取保护",
    );
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
  await expandSidebar(page);
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page
    .locator(".project-library-card")
    .filter({ hasText: project.name })
    .click();
  await expect(
    page.getByRole("textbox", { name: "对话内容", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".conversation-messages")).toContainText(
    "历史消息 A",
  );
  await page.getByRole("tab", { name: "对话 B", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "对话内容", exact: true }),
  ).toHaveValue("草稿 B");
  await expect(page.locator(".conversation-messages")).toContainText(
    "历史消息 B",
  );
  expect(
    await page.evaluate(
      (key) => localStorage.getItem(key),
      CREATION_STORAGE_KEY,
    ),
  ).toBe(raw);
  await page.screenshot({ path: testInfo.outputPath("protected-history.png") });
  await page.reload();
  expect(
    await page.evaluate(
      (key) => localStorage.getItem(key),
      CREATION_STORAGE_KEY,
    ),
  ).toBe(raw);
  await expect(page.locator(".creation-storage-notice")).toContainText(
    "读取保护",
  );
});

test("素材未接持久垃圾箱时禁用操作，保留已归档原件", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "文件", exact: true }).click();
  await page.getByRole("button", { name: "资产管理", exact: true }).click();
  const panel = page.getByTestId("asset-panel");
  await panel
    .locator('input[type="file"]')
    .setInputFiles("public/fixtures/demo/blue-hour.png");
  const action = panel.getByRole("button", { name: /移入垃圾箱/ }).first();
  await expect(action).toBeDisabled();
  await expect(action).toHaveAttribute("title", /持久存储/);
  await panel.getByRole("tab", { name: /垃圾箱/ }).click();
  await expect(panel).toContainText("素材垃圾箱尚未接入持久存储");
  await page.screenshot({
    path: testInfo.outputPath("disabled-asset-trash.png"),
  });
});
