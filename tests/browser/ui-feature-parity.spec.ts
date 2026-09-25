async function ownFixtureThread(page: import("@playwright/test").Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("kk-studio-next:creation:v1") || "{}")
            .activeProjectId,
      ),
    )
    .toBeTruthy();
  await page.evaluate(() => {
    const id = JSON.parse(
      localStorage.getItem("kk-studio-next:creation:v1")!,
    ).activeProjectId;
    localStorage.setItem("kk-agent-thread:" + id, "fixture-thread");
  });
}
import { expect, test } from "@playwright/test";
import { openWorkspace } from "./helpers";
import { showCanvasNavigation } from "./helpers";
import { startAgentServer } from "../helpers/agentServer";
import {
  ACCENTS,
  contrast,
  cssRgb,
  themeTokens,
} from "../helpers/designSystem";

async function openPromptLibrary(page: import("@playwright/test").Page) {
  if (page.viewportSize()!.width < 768) {
    const trigger = page.getByRole("button", { name: "应用功能菜单" });
    await trigger.click();
    await page.getByRole("menuitem", { name: "提示词库" }).click();
    return trigger;
  }
  const trigger = page
    .getByRole("navigation", { name: "应用菜单" })
    .getByRole("button", { name: "文件", exact: true });
  await trigger.click();
  await page.getByRole("button", { name: "提示词库" }).click();
  return trigger;
}

test("text templates change visible input while audio exposes only its demo capability", async ({
  page,
}) => {
  await openWorkspace(page);
  await showCanvasNavigation(page);
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page.getByRole("menuitem", { name: "文本", exact: true }).click();
  const textNode = page
    .locator('.canvas-node[data-node-id^="added-text-"]')
    .last();
  await textNode.click();
  await textNode.getByLabel("文案提示词").fill("保留的主题");
  await textNode.getByRole("button", { name: "剧本生成", exact: true }).click();
  await expect(textNode.getByLabel("文案提示词")).toHaveValue(
    /请.*剧本[\s\S]*保留的主题/,
  );
  await textNode
    .getByRole("button", { name: "策划案生成", exact: true })
    .click();
  await expect(textNode.getByLabel("文案提示词")).toHaveValue(
    /请.*策划案[\s\S]*保留的主题/,
  );
  await expect(textNode.getByLabel("文案提示词")).not.toHaveValue(/剧本/);
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page.getByRole("menuitem", { name: "音频", exact: true }).click();
  const audio = page
    .locator('.canvas-node[data-node-id^="added-audio-"]')
    .last();
  await expect(audio.getByRole("group", { name: "文案创作方式" })).toHaveCount(
    0,
  );
  await expect(audio).toContainText("本地演示");
});

test("Agent controls match the vendor protocol fixture, with error feedback and no fallback", async ({
  page,
}, info) => {
  const server = await startAgentServer("idle");
  try {
    await openWorkspace(page);
    const panel = page.locator(".conversation-panel");
    await panel.getByLabel("执行方式").selectOption("codex");
    await panel.getByRole("button", { name: "连接设置", exact: true }).click();
    await page.getByLabel("Agent 地址").fill(server.url);
    await page.getByLabel("连接 Token", { exact: true }).fill("fixture-token");
    await expect(
      page.getByLabel("连接 Token", { exact: true }),
    ).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "连接 Agent", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "已连接", exact: true }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => localStorage.getItem("canvas-agent-token")),
      )
      .toBeNull();
    await page.keyboard.press("Escape");
    for (const width of [390, 768, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      if (!(await panel.isVisible()))
        await page
          .getByRole("button", { name: "打开对话", exact: true })
          .click();
      await expect(panel.getByLabel("对话内容")).toBeVisible();
      expect(
        await panel.evaluate((el) => el.scrollWidth - el.clientWidth),
      ).toBeLessThanOrEqual(1);
      await expect
        .poll(async () => {
          const box = await panel
            .getByRole("button", { name: "发送消息" })
            .boundingBox();
          return box ? box.x + box.width : Number.POSITIVE_INFINITY;
        })
        .toBeLessThanOrEqual(width);
      const box = (await panel
        .getByRole("button", { name: "发送消息" })
        .boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      expect(box.y + box.height).toBeLessThanOrEqual(900);
      await page.screenshot({
        path: info.outputPath(`agent-${width}.png`),
        animations: "disabled",
      });
    }
    await panel.getByLabel("AI权限模式").click();
    await panel
      .getByRole("menuitemradio", { name: "询问", exact: true })
      .click();
    await panel.getByLabel("对话内容").fill("读取画布");
    await panel.getByRole("button", { name: "发送消息" }).click();
    await expect.poll(() => server.turns.length).toBe(1);
    expect(server.turns[0]).toMatchObject({
      messageText: "读取画布",
      permissionMode: "request",
      attachments: [],
    });
    expect(server.turns[0].model).toBeUndefined();
    expect(server.authentication.length).toBeGreaterThan(3);
    expect(
      server.authentication.every(
        (value) => !value.urlToken && value.headerPresent,
      ),
    ).toBe(true);
    await expect(
      panel.getByRole("button", { name: "发送消息" }),
    ).toBeDisabled();
    await expect(panel.getByLabel("对话内容")).toHaveValue("");
    server.failActions(true);
    await panel.getByRole("button", { name: "停止", exact: true }).click();
    await expect(panel.getByRole("alert")).toContainText("受控服务暂时不可用");
    server.emit("codex_approval", {
      requestId: "r1",
      method: "local_shell_execute",
      command: "echo test",
      reason: "审批演示",
    });
    await panel.getByRole("button", { name: "允许", exact: true }).click();
    await expect(
      panel.getByRole("group", { name: "确认 Agent 权限请求" }),
    ).toBeVisible();
    server.failActions(false);
    await panel.getByRole("button", { name: "拒绝", exact: true }).click();
    await expect
      .poll(() => server.decisions.some((d) => d.decision === "decline"))
      .toBe(true);
    await expect(
      panel.getByRole("group", { name: "确认 Agent 权限请求" }),
    ).toHaveCount(0);
    await page.screenshot({
      path: info.outputPath("agent-running.png"),
      animations: "disabled",
    });
    server.disconnect();
    await expect(panel.getByRole("alert")).toContainText("核对任务结果");
    await expect(panel.getByLabel("执行方式")).toHaveValue("codex");
    await expect(panel.getByLabel("添加对话素材")).toBeEnabled();
  } finally {
    await server.close();
  }
});

for (const status of ["idle", "warning"] as const) {
  test(`Agent ${status} hello has an accurate usable entry`, async ({
    page,
  }, info) => {
    const server = await startAgentServer(status);
    try {
      await openWorkspace(page);
      if (status !== "idle") await ownFixtureThread(page);
      const panel = page.locator(".conversation-panel");
      await panel.getByLabel("执行方式").selectOption("codex");
      await panel
        .getByRole("button", { name: "连接设置", exact: true })
        .click();
      await page.getByLabel("Agent 地址").fill(server.url);
      await page
        .getByLabel("连接 Token", { exact: true })
        .fill("fixture-token");
      await page
        .getByRole("button", { name: "连接 Agent", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "已连接", exact: true }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await panel.getByLabel("对话内容").fill("读取画布");
      expect(server.requests.includes("/agent/codex/threads/new")).toBe(false);
      if (status === "idle") {
        await expect(panel).toContainText("Codex 主 Agent · 已连接");
        await page.screenshot({
          path: info.outputPath("agent-idle.png"),
          animations: "disabled",
        });
      } else {
        await expect(panel).toContainText("可选工具暂不可用");
        await expect(panel).toContainText("optional");
        await page.screenshot({
          path: info.outputPath("agent-warning.png"),
          animations: "disabled",
        });
      }
      await expect(
        panel.getByRole("button", { name: "发送消息" }),
      ).toBeEnabled();
      await panel.getByRole("button", { name: "发送消息" }).click();
      await expect.poll(() => server.turns.length).toBe(1);
      expect(
        server.requests.filter(
          (path) => path === "/agent/codex/conversation/prepare",
        ).length,
      ).toBe(status === "idle" ? 1 : 0);
    } finally {
      await server.close();
    }
  });
}

for (const action of ["interrupt", "turn"] as const) {
  test(`a pending old ${action} cannot lock the reconnected Agent UI`, async ({
    page,
  }) => {
    const server = await startAgentServer(
      action === "interrupt" ? "running" : "ready",
    );
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    let intercepted = false;
    await page.route(`**/agent/codex/${action}`, async (route) => {
      intercepted = true;
      await pending;
      await route
        .fulfill({ status: 503, json: { error: "旧请求已结束" } })
        .catch(() => undefined);
    });
    try {
      await openWorkspace(page);
      await ownFixtureThread(page);
      const panel = page.locator(".conversation-panel");
      await panel.getByLabel("执行方式").selectOption("codex");
      await panel
        .getByRole("button", { name: "连接设置", exact: true })
        .click();
      await page.getByLabel("Agent 地址").fill(server.url);
      await page
        .getByLabel("连接 Token", { exact: true })
        .fill("fixture-token");
      await page
        .getByRole("button", { name: "连接 Agent", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "已连接", exact: true }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await panel.getByLabel("对话内容").fill("保留的指令");
      await panel
        .getByRole("button", {
          name: action === "interrupt" ? "停止" : "发送消息",
          exact: true,
        })
        .click();
      await expect.poll(() => intercepted).toBe(true);
      await panel
        .getByRole("button", { name: "连接设置", exact: true })
        .click();
      await page.getByRole("button", { name: "断开", exact: true }).click();
      await page
        .getByRole("button", { name: "连接 Agent", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "已连接", exact: true }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      server.emit("codex_approval", { requestId: "new", method: "shell" });
      await expect(
        panel.getByRole("button", { name: "允许", exact: true }),
      ).toBeEnabled();
      await expect(
        panel.getByRole("button", {
          name: action === "interrupt" ? "停止" : "发送消息",
          exact: true,
        }),
      ).toBeEnabled();
      await expect(panel.getByLabel("对话内容")).toHaveValue("保留的指令");
      release();
      await expect(
        panel.getByText("旧请求已结束", { exact: true }),
      ).toHaveCount(0);
    } finally {
      release();
      await server.close();
    }
  });
}

for (const width of [390, 768, 1920]) {
  test(`prompt library handles themes, long text, errors and focus at ${width}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    let fail = false;
    let delayed = false;
    await page.route("https://raw.githubusercontent.com/**", async (route) => {
      if (delayed) await new Promise((resolve) => setTimeout(resolve, 400));
      if (fail) await route.fulfill({ status: 503, body: "offline" });
      else
        await route.fulfill({
          json: Array.from({ length: 15 }, (_, i) => ({
            id: String(i),
            title: `产品 ${i} ${"W".repeat(80)}`,
            prompt: i === 0 ? "长".repeat(4100) : "产品光影",
            tags: ["产品"],
          })),
        });
    });
    await page.goto("/");
    const opener = await openPromptLibrary(page);
    const dialog = page.getByRole("dialog", { name: "提示词库" });
    await dialog.getByRole("button", { name: "加载来源" }).click();
    await expect(dialog.getByRole("status")).toContainText("15 条");
    await dialog.locator(".prompt-library-item").first().click();
    for (const theme of ["dark", "light"]) {
      for (const accent of ACCENTS) {
        await page.locator("html").evaluate(
          (el, value) => {
            el.setAttribute("data-theme", value.theme);
            el.setAttribute("data-accent", value.accent);
          },
          { theme, accent },
        );
        expect(
          await dialog.evaluate((el) => el.scrollWidth - el.clientWidth),
        ).toBeLessThanOrEqual(1);
        const token = themeTokens(theme, accent);
        await expect(
          dialog.getByRole("button", { name: "加入草稿" }),
        ).toHaveCSS("background-color", cssRgb(token("--bg-accent")));
        await expect(
          dialog.getByRole("button", { name: "加入草稿" }),
        ).toHaveCSS("color", cssRgb(token("--text-on-accent")));
        const colors = await dialog
          .getByRole("button", { name: "加入草稿" })
          .evaluate((el) => {
            const s = getComputedStyle(el);
            return [s.color, s.backgroundColor];
          });
        expect(contrast(colors[0], colors[1])).toBeGreaterThanOrEqual(4.5);
      }
      await page.screenshot({
        path: info.outputPath(`prompt-${width}-${theme}.png`),
        animations: "disabled",
      });
    }
    await dialog.getByRole("button", { name: "加入草稿" }).click();
    await expect(dialog.getByRole("alert")).toContainText("4,000");
    await dialog.getByRole("button", { name: "下一页" }).click();
    await expect(dialog.locator(".prompt-library-item")).toHaveCount(3);
    fail = true;
    await dialog.getByRole("button", { name: "加载来源" }).click();
    await expect(dialog.getByRole("alert")).toContainText("保留本地缓存");
    fail = false;
    delayed = true;
    await dialog.getByRole("button", { name: "加载来源" }).click();
    await dialog.getByRole("button", { name: "取消加载" }).click();
    await expect(dialog.getByRole("status")).toContainText("已取消");
    await page.keyboard.press("Escape");
    await expect(opener).toBeFocused();
    await openPromptLibrary(page);
    await expect(dialog.getByRole("status")).toContainText("本地缓存");
  });
}

test("plugin menu reflects installed canvas plugins and opens their manager", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "添加素材与生成设置" }).click();
  const menu = page.getByRole("dialog", { name: "添加素材与生成设置" });
  await menu.getByRole("button", { name: "插件（MCP）" }).click();
  await expect(page.getByRole("heading", { name: "已安装插件" })).toBeVisible();
});

test("prompt library searches, previews and appends text without submitting", async ({
  page,
}) => {
  await page.route("https://raw.githubusercontent.com/**", (route) =>
    route.fulfill({
      json: [
        {
          id: "one",
          title: "光影产品",
          prompt: "柔和自然光，保留产品比例",
          tags: ["产品"],
        },
        { id: "two", title: "城市", prompt: "雨夜城市" },
      ],
    }),
  );
  await page.goto("/");
  await page.getByLabel("创作提示词").fill("现有草稿");
  await openPromptLibrary(page);
  const dialog = page.getByRole("dialog", { name: "提示词库" });
  await dialog.getByRole("button", { name: "加载来源" }).click();
  await dialog.getByRole("searchbox", { name: "搜索提示词" }).fill("光影");
  await dialog.getByRole("button", { name: "光影产品", exact: true }).click();
  await dialog.getByRole("button", { name: "加入草稿" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByLabel("创作提示词")).toHaveValue(
    "现有草稿\n\n柔和自然光，保留产品比例",
  );
  await expect(page.locator(".start-composer")).toBeVisible();
});

test("disconnected Agent has its own draft and cannot submit to image creation", async ({
  page,
}) => {
  await openWorkspace(page);
  const panel = page.locator(".conversation-panel");
  await panel.getByLabel("执行方式").selectOption("direct");
  await panel.getByLabel("对话内容").fill("图片草稿");
  await panel.getByLabel("执行方式").selectOption("codex");
  await expect(
    panel.getByText("Codex 主 Agent · 未连接", { exact: true }),
  ).toBeVisible();
  await expect(panel.getByLabel("添加对话素材")).toBeEnabled();
  await panel.locator('.chat-composer input[type="file"]').setInputFiles({
    name: "offline-reference.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS1sAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(panel.locator(".start-attachment-chip")).toContainText(
    "offline-reference.png",
  );
  await panel.getByLabel("对话内容").fill("读取当前画布");
  await panel.getByRole("button", { name: "发送消息" }).click();
  await expect(panel.getByRole("alert")).toContainText("连接");
  await expect(panel.locator(".start-attachment-chip")).toHaveCount(1);
  await panel.getByLabel("执行方式").selectOption("direct");
  await expect(panel.getByLabel("对话内容")).toHaveValue("图片草稿");
  await expect(panel.locator(".start-attachment-chip")).toHaveCount(0);
  await panel.getByLabel("执行方式").selectOption("codex");
  await expect(panel.getByLabel("对话内容")).toHaveValue("读取当前画布");
  await expect(panel.locator(".start-attachment-chip")).toContainText(
    "offline-reference.png",
  );
});
