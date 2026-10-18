import {
  expect,
  test,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";
import { contrast } from "../helpers/designSystem";
import { startAgentServer } from "../helpers/agentServer";
import { openSeededProject, waitForConversationPanelSettled } from "./helpers";

test.use({ reducedMotion: "reduce" });

async function isolateNetwork(page: Page, agentUrl?: string): Promise<void> {
  const allowed = new Set([
    "http://127.0.0.1:1423",
    ...(agentUrl ? [new URL(agentUrl).origin] : []),
  ]);
  await page.route("**/*", (route) =>
    allowed.has(new URL(route.request().url()).origin)
      ? route.continue()
      : route.abort("blockedbyclient"),
  );
}

async function expectRoundSend(button: Locator, peer: Locator): Promise<void> {
  const geometry = await button.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      width: (element as HTMLElement).offsetWidth,
      height: (element as HTMLElement).offsetHeight,
      radii: [
        style.borderTopLeftRadius,
        style.borderTopRightRadius,
        style.borderBottomLeftRadius,
        style.borderBottomRightRadius,
      ].map(Number.parseFloat),
    };
  });
  const peerHeight = await peer.evaluate(
    (element) => (element as HTMLElement).offsetHeight,
  );
  expect(geometry.width).toBe(geometry.height);
  expect(geometry.height).toBe(peerHeight);
  for (const radius of geometry.radii)
    expect(radius).toBeGreaterThanOrEqual(geometry.height / 2);
}

async function expectInteractiveStates(
  page: Page,
  button: Locator,
  peer: Locator,
): Promise<void> {
  await expect(button).toBeEnabled();
  await page.mouse.move(0, 0);
  await page.evaluate(() =>
    Promise.all(
      document.getAnimations().map((animation) => animation.finished),
    ),
  );
  await expectRoundSend(button, peer);
  const normal = await button.evaluate((element) => {
    const style = getComputedStyle(element);
    const glyph = element.querySelector("svg")!;
    return {
      background: style.backgroundColor,
      foreground: getComputedStyle(glyph).color,
      glyphWidth: glyph.getBoundingClientRect().width,
      glyphHeight: glyph.getBoundingClientRect().height,
    };
  });
  expect(normal.background).not.toBe("rgba(0, 0, 0, 0)");
  expect(contrast(normal.background, normal.foreground)).toBeGreaterThanOrEqual(
    4.5,
  );
  expect(normal.glyphWidth).toBe(normal.glyphHeight);
  await button.hover();
  await expectRoundSend(button, peer);
  await page.mouse.down();
  try {
    await expectRoundSend(button, peer);
  } finally {
    await page.mouse.move(0, 0);
    await page.mouse.up();
  }
  await page.keyboard.press("Tab");
  await button.focus();
  await expect(button).toBeFocused();
  expect(
    await button.evaluate((element) => {
      const style = getComputedStyle(element);
      return (
        style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0
      );
    }),
  ).toBe(true);
  await expectRoundSend(button, peer);
}

async function recordComposer(
  composer: Locator,
  testInfo: TestInfo,
  name: string,
): Promise<void> {
  await testInfo.attach(`${name}.dom.json`, {
    contentType: "application/json",
    body: JSON.stringify(
      await composer.evaluate((element) => ({
        url: location.href,
        mode: document.querySelector(".app")?.getAttribute("data-runtime-mode"),
        theme: document.documentElement.dataset.theme,
        scripts: [...document.scripts]
          .map((script) => script.src)
          .filter(Boolean),
        stylesheets: [...document.styleSheets].map((sheet) => sheet.href),
        buttons: [...element.querySelectorAll("button")].map((button) => {
          const style = getComputedStyle(button);
          return {
            label: button.getAttribute("aria-label"),
            state: button.dataset.state,
            disabled: button.disabled,
            bounds: button.getBoundingClientRect().toJSON(),
            radius: style.borderRadius,
            background: style.backgroundColor,
            color: style.color,
            outline: style.outline,
          };
        }),
      })),
      null,
      2,
    ),
  });
}

for (const width of [390, 1099, 1920]) {
  test(`首页 ${width}px 发送按钮直接为同排高度的圆形，亮暗主题状态保持`, async ({
    page,
  }, testInfo) => {
    await isolateNetwork(page);
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await expect(page.locator(".app")).toHaveAttribute(
      "data-runtime-mode",
      "production",
    );
    const composer = page.locator(".start-composer");
    const send = composer.getByRole("button", { name: "开始创建项目" });
    const peer = composer.getByRole("button", { name: /^当前模式：/ });
    await expect(send).toBeDisabled();
    await expectRoundSend(send, peer);
    await page.getByLabel("创作提示词").fill("仅验证本地发送按钮，不提交");
    for (const theme of ["dark", "light"]) {
      await page.evaluate((theme) => {
        document.documentElement.dataset.theme = theme;
      }, theme);
      await expectInteractiveStates(page, send, peer);
      await composer.screenshot({
        path: testInfo.outputPath(`home-${width}-${theme}.png`),
        animations: "disabled",
      });
      await recordComposer(composer, testInfo, `home-${width}-${theme}`);
    }
  });

  test(`会话 ${width}px 发送按钮直接为同排高度的圆形，亮暗主题状态保持`, async ({
    page,
  }, testInfo) => {
    const agent = await startAgentServer("idle");
    try {
      await isolateNetwork(page, agent.url);
      await page.addInitScript((endpoint) => {
        localStorage.setItem("canvas-agent-url", endpoint);
      }, agent.url);
      await page.setViewportSize({ width, height: 844 });
      await openSeededProject(page);
      const opener = page.getByRole("button", {
        name: "打开对话",
        exact: true,
      });
      if (await opener.isVisible()) await opener.click();
      await waitForConversationPanelSettled(page);
      const composer = page.locator(".chat-composer");
      const send = composer.getByRole("button", { name: "发送消息" });
      const peer = composer.getByRole("button", { name: "AI权限模式" });
      await expect(send).toBeDisabled();
      await expectRoundSend(send, peer);
      await page
        .getByRole("button", { name: "连接 Codex", exact: true })
        .click();
      await expect(page.locator(".chat-agent-banner")).toContainText("已连接");
      await page.getByLabel("对话内容").fill("仅验证本地发送按钮，不提交");
      for (const theme of ["dark", "light"]) {
        await page.evaluate((theme) => {
          document.documentElement.dataset.theme = theme;
        }, theme);
        await expectInteractiveStates(page, send, peer);
        await composer.screenshot({
          path: testInfo.outputPath(`conversation-${width}-${theme}.png`),
          animations: "disabled",
        });
        await recordComposer(
          composer,
          testInfo,
          `conversation-${width}-${theme}`,
        );
      }
      expect(agent.turns).toHaveLength(0);
    } finally {
      await agent.close();
    }
  });
}
