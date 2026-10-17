import { expect, test } from "@playwright/test";
import { startAgentServer } from "../helpers/agentServer";
import { openWorkspace } from "./helpers";
import { PROVIDER_CONNECTIONS_STORAGE_KEY } from "../../src/features/creation/providerRegistry";
import {
  CREATION_STORAGE_KEY,
  type CreationSnapshot,
} from "../../src/features/creation/model";

const pixel =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

test("Codex执行中模型菜单不能绕过执行方式锁", async ({ page }) => {
  const agent = await startAgentServer("idle");
  try {
    await page.addInitScript(
      ({ endpoint, key }) => {
        localStorage.setItem("canvas-agent-url", endpoint);
        localStorage.setItem(
          key,
          JSON.stringify([
            {
              id: "state-api",
              provider: "State API",
              displayName: "State API",
              model: "state-image-model",
              kind: "user_byok",
              baseUrl: "https://state.example.test/v1",
              credentialRef: "state-api",
              capabilities: {
                modalities: ["image"],
                operations: ["generate"],
                async: false,
              },
              state: "active",
              concurrencyLimit: 1,
              verificationStatus: "unverified",
            },
          ]),
        );
      },
      { endpoint: agent.url, key: PROVIDER_CONNECTIONS_STORAGE_KEY },
    );
    await openWorkspace(page);
    await page.getByRole("button", { name: "连接 Codex", exact: true }).click();
    await expect(page.locator(".chat-agent-banner")).toContainText("已连接");
    const trigger = page.getByRole("button", { name: "模型", exact: true });
    await trigger.click();
    const menu = page.getByRole("menu", { name: "选择模型", exact: true });
    await menu.getByRole("tab", { name: "中转 API", exact: true }).click();
    await menu.getByRole("searchbox").fill("state-image-model");
    await expect(
      menu.getByRole("menuitemradio", { name: /^state-image-model/ }),
    ).toBeVisible();
    agent.emit("codex_state", { busy: true });
    await expect(page.getByLabel("执行方式", { exact: true })).toBeDisabled();
    await expect(trigger).toBeDisabled();
    await expect(menu).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "停止", exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("执行方式", { exact: true })).toHaveValue(
      "codex",
    );
    agent.emit("codex_state", { busy: false });
    await expect(trigger).toBeEnabled();
    await expect(menu).toHaveCount(0);
  } finally {
    await agent.close();
  }
});

test("Codex、Google与API切换保留各自草稿和附件", async ({ page }) => {
  await openWorkspace(page);
  await expect(page.locator(".chat-composer")).toHaveCount(1);
  const channel = page.getByLabel("执行方式", { exact: true });
  const input = page.getByLabel("对话内容", { exact: true });
  const files = page.locator('.chat-composer input[type="file"]');
  await input.fill("Codex未发送草稿");
  await files.setInputFiles({
    name: "codex-state.png",
    mimeType: "image/png",
    buffer: Buffer.from(pixel, "base64"),
  });
  await expect(
    page.getByRole("button", { name: "移除素材 codex-state.png", exact: true }),
  ).toBeVisible();
  await channel.selectOption("google");
  await expect(page.locator(".chat-composer")).toHaveCount(1);
  await input.fill("Google未发送草稿");
  await files.setInputFiles({
    name: "google-state.png",
    mimeType: "image/png",
    buffer: Buffer.from(pixel, "base64"),
  });
  await expect(
    page.getByRole("button", {
      name: "移除素材 google-state.png",
      exact: true,
    }),
  ).toBeVisible();
  await channel.selectOption("direct");
  await expect(page.locator(".chat-composer")).toHaveCount(1);
  await input.fill("API未发送草稿");
  await channel.selectOption("codex");
  await expect(input).toHaveValue("Codex未发送草稿");
  await expect(
    page.getByRole("button", { name: "移除素材 codex-state.png", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "移除素材 google-state.png",
      exact: true,
    }),
  ).toHaveCount(0);
  await channel.selectOption("google");
  await expect(input).toHaveValue("Google未发送草稿");
  await expect(
    page.getByRole("button", {
      name: "移除素材 google-state.png",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "移除素材 codex-state.png", exact: true }),
  ).toHaveCount(0);
  await channel.selectOption("direct");
  await expect(input).toHaveValue("API未发送草稿");
  await expect(
    page.locator(".chat-composer .start-attachment-chip"),
  ).toHaveCount(0);
});

for (const width of [390, 1920]) {
  test(`文本模型菜单Escape只关菜单且重选不复活 ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
    await openWorkspace(page);
    const close = page.getByRole("button", { name: "收起对话", exact: true });
    if (await close.isVisible()) await close.click();
    await page.getByRole("button", { name: "添加资源", exact: true }).click();
    await page.getByRole("menuitem", { name: "文本", exact: true }).click();
    const node = page.getByTestId(/^canvas-node-added-text-/).last();
    const editor = page.getByTestId("text-composer");
    const trigger = editor.getByRole("button", {
      name: "画布模型",
      exact: true,
    });
    await trigger.click();
    const menu = editor.getByRole("menu", { name: "选择模型", exact: true });
    await menu.getByRole("searchbox").focus();
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(node).toHaveClass(/is-selected/);
    await expect(trigger).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(node).not.toHaveClass(/is-selected/);
    await node.focus();
    await node.press("Enter");
    await expect(editor).toBeVisible();
    await expect(menu).toHaveCount(0);
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
}

test("API后台任务保留提交型号，新草稿与选型可编辑", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requests = 0;
  const submittedBodies: Record<string, unknown>[] = [];
  await page.route("https://state-variants.example/v1/models", (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: "aurora-1-2k-high",
            capabilities: { modalities: ["image"], sizes: ["1920x1080"] },
          },
          {
            id: "aurora-1-4k-high",
            capabilities: { modalities: ["image"], sizes: ["3840x2160"] },
          },
        ],
      },
    }),
  );
  await page.route(
    "https://state-variants.example/v1/images/generations",
    async (route) => {
      requests++;
      submittedBodies.push(route.request().postDataJSON());
      await gate;
      await route
        .fulfill({ json: { data: [{ b64_json: pixel }] } })
        .catch(() => {});
    },
  );
  try {
    await openWorkspace(page);
    await page.getByRole("button", { name: "打开设置", exact: true }).click();
    await page.getByRole("button", { name: "模型接入", exact: true }).click();
    await page
      .getByRole("button", { name: "API Key（官方）", exact: true })
      .click();
    await page.getByLabel("提供商", { exact: true }).fill("State Variants");
    await page.getByLabel("接口地址").fill("https://state-variants.example/v1");
    await page.getByLabel("API Key", { exact: true }).fill("fixture-state-key");
    await page.getByLabel("模型名称").fill("aurora-1-2k-high");
    await page.getByRole("button", { name: "保存连接", exact: true }).click();
    await page
      .getByRole("button", { name: "测试连接并刷新模型", exact: true })
      .click();
    await expect(page.getByLabel("已发现的模型")).toContainText(
      "aurora-1-4k-high",
    );
    await page.getByRole("button", { name: "关闭设置", exact: true }).click();
    const trigger = page.getByRole("button", { name: "模型", exact: true });
    await trigger.click();
    const menu = page.getByRole("menu", { name: "选择模型", exact: true });
    await menu.getByRole("tab", { name: "官方 API", exact: true }).click();
    await menu.getByRole("searchbox").fill("aurora-1-2k-high");
    await menu.getByRole("menuitemradio", { name: /aurora-1/ }).click();
    await page.getByLabel("对话内容", { exact: true }).fill("等待中的图片任务");
    await page.getByRole("button", { name: "发送消息", exact: true }).click();
    await page.getByRole("button", { name: "批准并提交", exact: true }).click();
    await expect.poll(() => requests).toBe(1);
    const nextDraft = page.getByLabel("对话内容", { exact: true });
    await expect(nextDraft).toBeEnabled();
    await nextDraft.fill("后台任务期间准备下一份草稿");
    await expect(nextDraft).toHaveValue("后台任务期间准备下一份草稿");
    const task = () =>
      page.evaluate((key) => {
        const snapshot = JSON.parse(
          localStorage.getItem(key) ?? "{}",
        ) as CreationSnapshot;
        return snapshot.projects
          ?.flatMap((project) => project.tasks)
          .find((task) => task.prompt === "等待中的图片任务");
      }, CREATION_STORAGE_KEY);
    await expect
      .poll(async () => (await task())?.model)
      .toBe("aurora-1-2k-high");
    const submittedTask = await task();
    const variant = page.getByLabel("型号参数", { exact: true });
    await expect(variant).toBeEnabled();
    await variant.selectOption("aurora-1-4k-high");
    await expect(variant).toHaveValue("aurora-1-4k-high");
    await expect(trigger).toBeEnabled();
    await expect(nextDraft).toHaveValue("后台任务期间准备下一份草稿");
    expect(submittedBodies).toHaveLength(1);
    expect(submittedBodies[0].model).toBe("aurora-1-2k-high");
    expect(await task()).toMatchObject({
      id: submittedTask!.id,
      model: "aurora-1-2k-high",
      providerConnectionId: submittedTask!.providerConnectionId,
      outputs: [{ model: "aurora-1-2k-high" }],
    });
  } finally {
    release();
  }
});
