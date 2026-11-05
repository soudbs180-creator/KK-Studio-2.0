import { expect, test } from "@playwright/test";
import { openWorkspace } from "./helpers";
import { createProject, activeChat } from "../../src/domain/creationModel.ts";

test("消息操作栏先备份再回滚整轮，恢复用量且刷新不复活已撤回消息", async ({
  page,
}) => {
  const project = createProject({
    prompt: "",
    model: "text-fixture",
    kind: "text",
    attachments: [],
  });
  const chat = activeChat(project)!;
  chat.mainAgent = "direct";
  chat.draft.conversationChannel = "direct";
  chat.messages = [
    { id: "u1", role: "user", content: "保留第一轮", createdAt: 1 },
    {
      id: "a1",
      role: "assistant",
      content: "保留第一轮回复",
      createdAt: 2,
      tokenUsage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    },
    { id: "u2", role: "user", content: "撤回第二轮", createdAt: 3 },
    {
      id: "a2",
      role: "assistant",
      content: "撤回第二轮回复",
      createdAt: 4,
      tokenUsage: { promptTokens: 20, completionTokens: 10, totalTokens: 30 },
    },
  ];
  chat.tokenUsage = { promptTokens: 30, completionTokens: 15, totalTokens: 45 };
  await openWorkspace(page, { [chat.id]: chat });
  await page
    .getByRole("button", { name: "回滚到此轮", exact: true })
    .nth(2)
    .click();
  const dialog = page.getByRole("dialog", { name: "回滚到此轮", exact: true });
  await dialog.getByRole("button", { name: "取消回滚", exact: true }).click();
  await expect(page.getByText("撤回第二轮", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "回滚到此轮", exact: true })
    .nth(2)
    .click();
  await dialog.getByRole("button", { name: "确认回滚", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const saved = () =>
    page.evaluate(() => {
      const snapshot = JSON.parse(
        localStorage.getItem("kk-studio-next:creation:v1")!,
      );
      const project = snapshot.projects.find(
        (p: { id: string }) => p.id === snapshot.activeProjectId,
      );
      return project.chats[project.activeChatId];
    });
  await expect.poll(async () => (await saved()).messages.length).toBe(2);
  expect((await saved()).rewindBackups.at(-1).messages).toHaveLength(4);
  expect((await saved()).tokenUsage.totalTokens).toBe(15);
  await page.reload();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.locator(".project-library-card").first().click();
  await expect(page.getByText("撤回第二轮", { exact: true })).toHaveCount(0);
  await expect(page.getByText("保留第一轮回复", { exact: true })).toBeVisible();
});
