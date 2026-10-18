import { expect, test, type Page } from "@playwright/test";
import {
  createProject,
  emptyDraft,
  emptySnapshot,
  serializeCreationSnapshot,
  projectChatView,
  CREATION_STORAGE_KEY,
  type CreationSnapshot,
} from "../../src/features/creation/model";
import { startAgentServer } from "../helpers/agentServer";
import { expandSidebar, waitForConversationPanelSettled } from "./helpers";

async function stored(page: Page): Promise<CreationSnapshot> {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open("kk-studio-next", 1);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const read = db
            .transaction("creation")
            .objectStore("creation")
            .get("snapshot");
          read.onsuccess = () => {
            db.close();
            resolve(read.result);
          };
          read.onerror = () => {
            db.close();
            reject(read.error);
          };
        };
      }),
  );
}

test("ordinary old chats edit and send within their own canonical scope and reopen offline", async ({
  page,
}, info) => {
  const service = await startAgentServer("idle");
  try {
    const project = createProject({
      prompt: "",
      kind: "text",
      model: "fixture",
      attachments: [],
    });
    project.name = "聊天迁移验收";
    const first = project.chats![project.activeChatId!];
    first.name = "聊天 A";
    first.mainAgent = "codex";
    first.draft = {
      ...emptyDraft(),
      conversationChannel: "codex",
      prompt: "草稿 A",
    };
    first.messages = [
      { id: "saved-a", role: "assistant", content: "离线历史 A" },
    ];
    project.chats!.other = {
      ...first,
      id: "other",
      name: "聊天 B",
      draft: { ...first.draft, prompt: "草稿 B" },
      messages: [{ id: "saved-b", role: "assistant", content: "离线历史 B" }],
    };
    const raw = JSON.stringify(
      serializeCreationSnapshot({
        ...emptySnapshot(),
        version: 3,
        revision: Date.now(),
        activeProjectId: project.id,
        projects: [projectChatView(project)],
      }),
    );
    await page.addInitScript(
      ({ raw, endpoint, key }) => {
        if (!sessionStorage.getItem("chat-migration-seeded")) {
          localStorage.setItem(key, raw);
          localStorage.setItem("canvas-agent-url", endpoint);
          sessionStorage.setItem("chat-migration-seeded", "yes");
        }
      },
      { raw, endpoint: service.url, key: CREATION_STORAGE_KEY },
    );
    await page.goto("/");
    await expandSidebar(page);
    await page.getByRole("button", { name: "项目库", exact: true }).click();
    await page
      .locator(".project-library-card")
      .filter({ hasText: project.name })
      .click();
    const input = page.getByRole("textbox", { name: "对话内容", exact: true });
    await expect(input).toBeEnabled();
    await expect(input).toHaveValue("草稿 A");
    await expect(page.locator(".conversation-messages")).toContainText(
      "离线历史 A",
    );
    await input.fill("编辑后的 A");
    await page.getByRole("tab", { name: "聊天 B", exact: true }).click();
    await expect(input).toHaveValue("草稿 B");
    await input.fill("编辑后的 B");
    await page.getByRole("tab", { name: "聊天 A", exact: true }).click();
    await expect(input).toHaveValue("编辑后的 A");
    await page.getByRole("button", { name: "连接 Codex", exact: true }).click();
    await expect(page.locator(".chat-agent-banner")).toContainText("已连接");
    await page.getByRole("button", { name: "发送消息", exact: true }).click();
    await expect.poll(() => service.turns.length).toBe(1);
    expect(service.turns[0].scope).toMatchObject({
      projectId: project.id,
      chatId: first.id,
    });
    service.emit("agent_event", {
      threadId: "fixture-thread",
      turnId: "turn-a",
      type: "item.completed",
      item: { id: "reply-a", type: "agent_message", text: "本地协议回执 A" },
    });
    service.emit("agent_event", {
      threadId: "fixture-thread",
      turnId: "turn-a",
      type: "turn.completed",
      status: "completed",
    });
    await expect
      .poll(async () =>
        (await stored(page)).projects[0].chats![first.id].messages.some(
          (message) => message.content === "本地协议回执 A",
        ),
      )
      .toBe(true);
    await expect
      .poll(
        async () => (await stored(page)).projects[0].chats!.other.draft.prompt,
      )
      .toBe("编辑后的 B");
    const persisted = await stored(page);
    expect(Object.hasOwn(persisted.projects[0], "composerDraft")).toBe(false);
    expect(Object.hasOwn(persisted.projects[0], "messages")).toBe(false);
    await service.close();
    await page.reload();
    await page.getByRole("button", { name: "项目库", exact: true }).click();
    await page
      .locator(".project-library-card")
      .filter({ hasText: project.name })
      .click();
    await expect(page.locator(".conversation-messages")).toContainText(
      "本地协议回执 A",
    );
    await page.getByRole("tab", { name: "聊天 B", exact: true }).click();
    await expect(input).toHaveValue("编辑后的 B");
    await expect(page.locator(".conversation-messages")).toContainText(
      "离线历史 B",
    );
    await page.setViewportSize({ width: 390, height: 480 });
    await page.getByRole("button", { name: "打开对话", exact: true }).click();
    await waitForConversationPanelSettled(page);
    await expect(input).toBeVisible();
    await expect(input).toBeEnabled();
    await expect(input).toHaveValue("编辑后的 B");
    await expect(page.locator(".conversation-messages")).toContainText(
      "离线历史 B",
    );
    await page.screenshot({
      path: info.outputPath("canonical-chats-reopened-phone.png"),
    });
  } finally {
    await service.close();
  }
});
