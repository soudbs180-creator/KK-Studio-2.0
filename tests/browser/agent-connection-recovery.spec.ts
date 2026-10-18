import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import { startAgentServer } from "../helpers/agentServer";
import {
  createProject,
  emptySnapshot,
  type CreationSnapshot,
} from "../../src/features/creation/model";
import { openSeededProject, openSettingsSection } from "./helpers";

function projectSnapshot() {
  const project = createProject({
    prompt: "",
    model: "kk-image-2",
    kind: "image",
    attachments: [],
  });
  project.name = "连接恢复项目";
  return {
    ...emptySnapshot(),
    activeProjectId: project.id,
    projects: [project],
  };
}

/** The product lifecycle runs normally; only native IPC uses a local fixture. */
async function nativeFixture(
  page: Page,
  endpoint: string,
  snapshot: CreationSnapshot,
  owned = false,
) {
  if (owned)
    snapshot = {
      ...snapshot,
      projects: snapshot.projects.map((project) => ({
        ...project,
        agentThreadId: "fixture-thread",
      })),
    };
  await page.addInitScript(
    ({ endpoint, snapshot }) => {
      const key = "agent-recovery-native-fixture";
      const state = {
        saved: JSON.parse(sessionStorage.getItem(key) ?? "null") ?? snapshot,
        running: false,
      };
      Object.assign(window, {
        isTauri: true,
        __TAURI_INTERNALS__: {
          metadata: {
            currentWindow: { label: "main" },
            currentWebview: { label: "main" },
          },
          transformCallback: () => 1,
          unregisterCallback: () => undefined,
          invoke: async (
            command: string,
            args?: { snapshot?: CreationSnapshot },
          ) => {
            if (command === "read_creation_snapshot")
              return { status: "loaded", snapshot: state.saved };
            if (command === "write_creation_snapshot") {
              state.saved = args!.snapshot;
              sessionStorage.setItem(key, JSON.stringify(state.saved));
              return;
            }
            if (command === "agent_runtime_start") {
              state.running = true;
              return { endpoint, token: "r".repeat(64), pid: 1234 };
            }
            if (command === "agent_runtime_status")
              return {
                available: true,
                running: state.running,
                healthy: state.running,
                endpoint: state.running ? endpoint : undefined,
              };
            if (command === "agent_runtime_stop") {
              state.running = false;
              return;
            }
            if (command === "credential_get") return null;
            if (command === "read_provider_config")
              return { status: "missing", revision: null, connections: [] };
            if (command === "task_host_list" || command === "asset_list")
              return [];
            if (command === "plugin:window|is_maximized") return false;
            if (command === "plugin:event|listen") return 1;
            if (command === "plugin:event|unlisten") return;
            throw new Error(`Unexpected fixture IPC: ${command}`);
          },
        },
      });
    },
    { endpoint, snapshot },
  );
}

async function connectionSettings(page: Page) {
  await openSettingsSection(page, "模型接入");
  return page.locator(".settings-agent-card").filter({
    has: page.getByRole("heading", { name: /Codex 主 Agent/ }),
  });
}

test("desktop home readies its service without creating a conversation and has one reconnect entry", async ({
  page,
}, testInfo) => {
  const agent = await startAgentServer("idle");
  try {
    await nativeFixture(page, agent.url, emptySnapshot());
    await page.goto("/");
    const card = await connectionSettings(page);
    await expect(card).toContainText("已就绪");
    await expect(
      card.getByRole("button", { name: "重新连接", exact: true }),
    ).toBeVisible();
    await expect(card.getByRole("button", { name: "启动并连接" })).toHaveCount(
      0,
    );
    await expect(card.getByLabel("Agent 地址")).toBeHidden();
    await expect(card.getByRole("button", { name: "停止服务" })).toBeHidden();
    expect(agent.conversation().threadId).toBe("");
    expect(agent.requests).not.toContain("/agent/codex/conversation/prepare");
    await card.getByRole("button", { name: "重新连接", exact: true }).click();
    await expect(card).toContainText("已就绪");
    expect(agent.conversation().threadId).toBe("");
    for (const width of [1920, 1099, 390]) {
      await page.setViewportSize({ width, height: 1080 });
      // Resizing to a phone exposes the methods level before its detail page.
      const methods = page.getByRole("group", { name: "接入方式" });
      if (width < 768 && (await methods.isVisible()))
        await methods
          .getByRole("button", { name: "Codex 主 Agent", exact: true })
          .click();
      await expect(card).toBeVisible();
      const reconnect = card.getByRole("button", {
        name: "重新连接",
        exact: true,
      });
      const disconnect = card.getByRole("button", {
        name: "断开",
        exact: true,
      });
      const colors = {
        reconnect: await reconnect.evaluate(
          (element) => getComputedStyle(element).backgroundColor,
        ),
        disconnect: await disconnect.evaluate(
          (element) => getComputedStyle(element).backgroundColor,
        ),
      };
      expect(colors.disconnect).not.toBe(colors.reconnect);
      await card.screenshot({
        path: testInfo.outputPath(`home-ready-${width}.png`),
      });
      const identity = await page.evaluate(() => ({
        url: location.href,
        entry: document
          .querySelector(".app")
          ?.getAttribute("data-runtime-entry"),
        mode: document.querySelector(".app")?.getAttribute("data-runtime-mode"),
        scripts: [...document.scripts]
          .map((script) => script.src)
          .filter(Boolean),
      }));
      await fs.writeFile(
        testInfo.outputPath(`home-ready-${width}.dom.json`),
        JSON.stringify(
          {
            ...identity,
            width,
            colors,
            text: await card.innerText(),
          },
          null,
          2,
        ),
      );
    }
    await card.getByText("高级连接选项", { exact: true }).click();
    await expect(card.getByRole("button", { name: "停止服务" })).toBeEnabled();
    expect(agent.turns).toHaveLength(0);
    expect(agent.requests).not.toContain("/agent/codex/turn");
  } finally {
    await agent.close();
  }
});

test("desktop restores its owned project and keeps explicit disconnect paused across reload", async ({
  page,
}) => {
  const agent = await startAgentServer("ready");
  try {
    await nativeFixture(page, agent.url, projectSnapshot(), true);
    await page.goto("/");
    let card = await connectionSettings(page);
    await expect(
      card.getByRole("button", { name: "已连接", exact: true }),
    ).toBeDisabled();
    await card.getByRole("button", { name: "断开", exact: true }).click();
    await expect(
      card.getByRole("button", { name: "重新连接", exact: true }),
    ).toBeEnabled();
    await page.reload();
    card = await connectionSettings(page);
    await expect(
      card.getByRole("button", { name: "重新连接", exact: true }),
    ).toBeEnabled();
    await card.getByRole("button", { name: "重新连接", exact: true }).click();
    await expect(
      card.getByRole("button", { name: "已连接", exact: true }),
    ).toBeDisabled();
    expect(agent.conversation().threadId).toBe("fixture-thread");
    expect(agent.requests).not.toContain("/agent/codex/threads/new");
    expect(agent.turns).toHaveLength(0);
    expect(agent.requests).not.toContain("/agent/codex/turn");
    expect(
      await page.evaluate(() => JSON.stringify(localStorage)),
    ).not.toContain("r".repeat(64));
  } finally {
    await agent.close();
  }
});

test("legacy desktop rejects an unowned ready session until the user explicitly creates a new conversation", async ({
  page,
}) => {
  const agent = await startAgentServer("ready");
  try {
    const legacy = projectSnapshot();
    delete legacy.projects[0].chats;
    delete legacy.projects[0].activeChatId;
    await nativeFixture(page, agent.url, legacy);
    await page.goto("/");
    const card = await connectionSettings(page);
    await expect(card.getByRole("alert")).toContainText("服务已有其他会话");
    expect(agent.conversation().threadId).toBe("fixture-thread");
    expect(agent.requests).not.toContain("/canvas/activate");
    expect(agent.requests).not.toContain("/agent/codex/threads/new");
    await card.getByText("高级连接选项", { exact: true }).click();
    await card
      .getByRole("button", { name: "新建 Agent 会话", exact: true })
      .click();
    await expect(
      card.getByRole("button", { name: "已连接", exact: true }),
    ).toBeDisabled();
    expect(agent.conversation().threadId).toBe("replacement-thread");
    expect(
      agent.requests.filter((path) => path.endsWith("/threads/new")),
    ).toHaveLength(1);
    expect(agent.requests.some((path) => path.endsWith("/delete"))).toBe(false);
    expect(agent.turns).toHaveLength(0);
    expect(agent.requests).not.toContain("/agent/codex/turn");
  } finally {
    await agent.close();
  }
});

test("a chat-backed project refuses explicit thread replacement and preserves the unowned session", async ({
  page,
}) => {
  const agent = await startAgentServer("ready");
  try {
    await nativeFixture(page, agent.url, projectSnapshot());
    await page.goto("/");
    const card = await connectionSettings(page);
    await expect(card.getByRole("alert")).toContainText("服务已有其他会话");
    await card.getByText("高级连接选项", { exact: true }).click();
    await card
      .getByRole("button", { name: "新建 Agent 会话", exact: true })
      .click();
    await expect(card.getByRole("alert")).toContainText("线程不可替换");
    expect(agent.conversation().threadId).toBe("fixture-thread");
    expect(agent.requests).not.toContain("/canvas/activate");
    expect(agent.requests).not.toContain("/agent/codex/threads/new");
    expect(agent.requests.some((path) => path.endsWith("/delete"))).toBe(false);
    expect(agent.turns).toHaveLength(0);
  } finally {
    await agent.close();
  }
});

test("pending approval disables disconnect, reconnect and stopping the owned service", async ({
  page,
}) => {
  const agent = await startAgentServer("ready");
  try {
    await nativeFixture(page, agent.url, projectSnapshot(), true);
    await page.goto("/");
    const card = await connectionSettings(page);
    await expect(
      card.getByRole("button", { name: "已连接", exact: true }),
    ).toBeDisabled();
    agent.emit("codex_approval", {
      requestId: "approval-recovery",
      method: "shell",
      reason: "受控操作等待审批",
    });
    await expect(
      card.getByRole("button", { name: "断开", exact: true }),
    ).toBeDisabled();
    await card.getByText("高级连接选项", { exact: true }).click();
    await expect(card.getByRole("button", { name: "停止服务" })).toBeDisabled();
    await expect(
      card.getByRole("button", { name: "新建 Agent 会话" }),
    ).toBeDisabled();
    await expect(card.getByLabel("Agent 地址")).toBeDisabled();
    expect(agent.requests).not.toContain("/agent/codex/threads/new");
    expect(agent.turns).toHaveLength(0);
    expect(agent.requests).not.toContain("/agent/codex/turn");
  } finally {
    await agent.close();
  }
});

test("Web manual connection stays available and keeps its token only in memory", async ({
  page,
}) => {
  const agent = await startAgentServer("idle");
  try {
    await openSeededProject(page);
    let card = await connectionSettings(page);
    await card.getByText("高级连接选项", { exact: true }).click();
    await card.getByLabel("Agent 地址").fill(agent.url);
    await card
      .getByLabel("连接 Token", { exact: true })
      .fill("manual-fixture-token");
    await card.getByRole("button", { name: "连接 Agent", exact: true }).click();
    await expect(
      card.getByRole("button", { name: "已连接", exact: true }),
    ).toBeDisabled();
    expect(
      await page.evaluate(() => JSON.stringify(localStorage)),
    ).not.toContain("manual-fixture-token");
    await card.getByRole("button", { name: "断开", exact: true }).click();
    await page.reload();
    card = await connectionSettings(page);
    await card.getByText("高级连接选项", { exact: true }).click();
    await expect(card.getByLabel("连接 Token", { exact: true })).toHaveValue(
      "",
    );
    await expect(
      card.getByRole("button", { name: "连接 Agent", exact: true }),
    ).toBeEnabled();
    expect(agent.turns).toHaveLength(0);
    expect(agent.requests).not.toContain("/agent/codex/turn");
  } finally {
    await agent.close();
  }
});
