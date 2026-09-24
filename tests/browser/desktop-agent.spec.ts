import { expect, test, type Page } from "@playwright/test";
import { startAgentServer } from "../helpers/agentServer";

async function networkSettings(page: Page) {
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page.getByRole("button", { name: "网络", exact: true }).click();
  return page.getByRole("region", { name: "桌面 Agent 服务" });
}

test("Web explains desktop ownership while preserving manual connections", async ({
  page,
}) => {
  await page.goto("/");
  const panel = await networkSettings(page);
  await expect(panel).toContainText("桌面版可一键启动");
  await expect(
    panel.getByRole("button", { name: "启动并连接" }),
  ).toBeDisabled();
  await expect(page.getByLabel("Agent 地址")).toBeEditable();
});

test("CodeBuddy delegation distinguishes disconnected, saved and verified states", async ({
  page,
}) => {
  const agent = await startAgentServer("idle");
  let cliPath = "";
  let probeFails = true;
  try {
    await page.route(agent.url + "/agent/codebuddy/**", async (route) => {
      const request = route.request();
      if (request.url().endsWith("/probe")) {
        await route.fulfill({
          status: probeFails ? 502 : 200,
          contentType: "application/json",
          body: JSON.stringify(
            probeFails
              ? { ok: false, error: "CodeBuddy 未登录" }
              : { ok: true, model: "hy4-preview", durationMs: 120 },
          ),
        });
        probeFails = false;
        return;
      }
      if (request.method() === "POST") cliPath = request.postDataJSON().cliPath;
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          configured: Boolean(cliPath),
          cliPath,
        }),
      });
    });
    await page.goto("/");
    await networkSettings(page);
    const pathInput = page.getByRole("textbox", { name: "CodeBuddy CLI 路径" });
    await expect(pathInput).toBeDisabled();
    await page.getByLabel("Agent 地址").fill(agent.url);
    await page.getByLabel("连接 Token", { exact: true }).fill("fixture-token");
    await page.getByRole("button", { name: "连接 Agent", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "已连接", exact: true }),
    ).toBeVisible();
    await pathInput.fill("C:/WorkBuddy/cli/bin/codebuddy");
    await page.getByRole("button", { name: "保存 CodeBuddy 路径" }).click();
    await expect(
      page.getByRole("status", { name: "CodeBuddy 状态" }),
    ).toContainText("已保存，尚未测试");
    await page.getByRole("button", { name: "测试 CodeBuddy 连接" }).click();
    await expect(
      page.getByRole("alert", { name: "CodeBuddy 错误" }),
    ).toContainText("未登录");
    await page.getByRole("button", { name: "测试 CodeBuddy 连接" }).click();
    await expect(
      page.getByRole("status", { name: "CodeBuddy 状态" }),
    ).toContainText("已验证");
    await expect(
      page.getByRole("status", { name: "CodeBuddy 状态" }),
    ).toContainText("hy4-preview");
  } finally {
    await agent.close();
  }
});

test("a desktop package without runtime shows its actual unavailable state", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("创作提示词")).toBeVisible();
  await page.evaluate(() =>
    Object.assign(window, {
      isTauri: true,
      __TAURI_INTERNALS__: {
        invoke: async () => ({
          available: false,
          running: false,
          healthy: false,
          reason: "此安装包未包含 Windows Agent 运行资源。",
        }),
      },
    }),
  );
  const panel = await networkSettings(page);
  await expect(panel).toContainText("未包含 Windows Agent 运行资源");
  await expect(
    panel.getByRole("button", { name: "启动并连接" }),
  ).toBeDisabled();
});

test("an external handshake cannot be taken over by the desktop start control", async ({
  page,
}) => {
  const agent = await startAgentServer("idle");
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  try {
    await page.goto("/");
    await expect(page.getByLabel("创作提示词")).toBeVisible();
    await page.evaluate(() =>
      Object.assign(window, {
        isTauri: true,
        __TAURI_INTERNALS__: {
          invoke: async () => ({
            available: true,
            running: false,
            healthy: false,
          }),
        },
      }),
    );
    await page.route(agent.url + "/health", async (route) => {
      await held;
      await route.continue();
    });
    const panel = await networkSettings(page);
    await page.getByLabel("Agent 地址").fill(agent.url);
    await page
      .getByLabel("连接 Token", { exact: true })
      .fill("external-session-token");
    await page.getByRole("button", { name: "连接 Agent", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "连接中…", exact: true }),
    ).toBeDisabled();
    await expect(
      panel.getByRole("button", { name: "启动并连接" }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "断开", exact: true }).click();
    await expect(
      panel.getByRole("button", { name: "启动并连接" }),
    ).toBeEnabled();
  } finally {
    release();
    await agent.close();
  }
});

test("desktop starts, connects and stops the owned service without persisting its token", async ({
  page,
}) => {
  const agent = await startAgentServer("idle");
  try {
    await page.goto("/");
    await expect(page.getByLabel("创作提示词")).toBeVisible();
    await page.evaluate((endpoint) => {
      let running = false;
      Object.assign(window, {
        isTauri: true,
        __TAURI_INTERNALS__: {
          invoke: async (command: string) => {
            if (command === "agent_runtime_start") {
              running = true;
              return { endpoint, token: "d".repeat(64), pid: 1234 };
            }
            if (command === "agent_runtime_stop") {
              running = false;
              return;
            }
            if (command === "agent_runtime_status")
              return {
                available: true,
                running,
                healthy: running,
                endpoint: running ? endpoint : null,
                pid: running ? 1234 : null,
              };
            if (command === "credential_get") return null;
            throw Error("Unexpected native command");
          },
        },
      });
    }, agent.url);
    const panel = await networkSettings(page);
    await panel.getByRole("button", { name: "启动并连接" }).click();
    await expect(
      page.getByRole("button", { name: "已连接", exact: true }),
    ).toBeDisabled();
    await expect(panel).toContainText("服务运行中");
    expect(
      await page.evaluate(() => JSON.stringify(localStorage)),
    ).not.toContain("d".repeat(64));
    await panel.getByRole("button", { name: "停止服务", exact: true }).click();
    await expect(panel).toContainText("服务已停止");
    await expect(
      page.getByRole("button", { name: "连接 Agent", exact: true }),
    ).toBeEnabled();
    await panel.getByRole("button", { name: "启动并连接" }).click();
    await expect(
      page.getByRole("button", { name: "已连接", exact: true }),
    ).toBeDisabled();
  } finally {
    await agent.close();
  }
});
