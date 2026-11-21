import { expect, test } from "@playwright/test";
import { openWorkspace } from "./helpers";

test("workspace settings sit beside chat and preserve canvas, form, and focus", async ({
  page,
}, info) => {
  await openWorkspace(page);
  const canvas = page.getByTestId("infinite-canvas");
  const canvasState = await canvas
    .locator(".canvas-stage")
    .getAttribute("style");
  const chat = page.locator(".conversation-panel");
  await page.getByLabel("执行方式").selectOption("direct");
  await page.getByLabel("对话内容").fill("并列显示保留对话草稿");
  const trigger = chat.getByRole("button", {
    name: "前往模型设置",
    exact: true,
  });
  await trigger.click();

  const settings = page.getByRole("dialog", { name: "设置", exact: true });
  await expect(settings).toHaveAttribute("data-pen-node", "hgib1");
  await expect(settings).toHaveAttribute("aria-modal", "false");
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect(canvas).toHaveAttribute("inert", "");
  const area = (await settings.boundingBox())!;
  const peer = (await chat.boundingBox())!;
  expect(area.x + area.width).toBeLessThanOrEqual(peer.x);
  await expect(
    settings.getByRole("button", { name: "模型接入", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await settings
    .getByRole("button", { name: "API Key（官方）", exact: true })
    .click();
  const provider = settings.getByLabel("提供商", { exact: true });
  await provider.fill("继续编辑的设置草稿");
  await settings.screenshot({
    path: info.outputPath("settings-workspace-wide.png"),
  });

  for (const width of [1366, 1099, 390, 1920]) {
    await page.setViewportSize({ width, height: 640 });
    await expect
      .poll(() => settings.evaluate((element) => element.clientWidth))
      .toBeGreaterThan(300);
    await expect(provider).toHaveValue("继续编辑的设置草稿");
    const geometry = await settings.evaluate((element) => {
      const nav = element.querySelector<HTMLElement>(".settings-nav")!;
      const content = element.querySelector<HTMLElement>(".settings-content")!;
      return {
        panelWidth: element.clientWidth,
        contentWidth: content.clientWidth,
        contentScrollWidth: content.scrollWidth,
        contentOverflowY: getComputedStyle(content).overflowY,
        navOverflowY: getComputedStyle(nav).overflowY,
        navVisible: nav.getClientRects().length > 0,
      };
    });
    expect(
      geometry.contentScrollWidth - geometry.contentWidth,
      width + " " + JSON.stringify(geometry),
    ).toBeLessThanOrEqual(1);
    expect(geometry.contentOverflowY, JSON.stringify(geometry)).toBe("auto");
    if (geometry.navVisible)
      expect(geometry.navOverflowY, JSON.stringify(geometry)).toBe("auto");
  }

  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect(settings).toBeInViewport();
  await provider.press("Escape");
  await expect(settings).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(canvas).toBeVisible();
  await expect(canvas.locator(".canvas-stage")).toHaveAttribute(
    "style",
    canvasState!,
  );
  await expect(page.getByLabel("对话内容")).toHaveValue("并列显示保留对话草稿");
});

test("workspace routing waits for settings credential writes", async ({
  page,
}) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "设置", exact: true });
  await settings.getByRole("button", { name: "模型接入", exact: true }).click();
  await settings
    .getByRole("button", { name: "API Key（官方）", exact: true })
    .click();
  await page.evaluate(() => {
    const state = window as Window & { releaseFixtureSave?: () => void };
    Object.assign(window, {
      __TAURI_INTERNALS__: {
        invoke: async (command: string) => {
          if (command === "credential_get") return null;
          if (command === "read_provider_config")
            return { status: "missing", revision: null, connections: [] };
          if (command === "commit_provider_connection") {
            await new Promise<void>((resolve) => {
              state.releaseFixtureSave = resolve;
            });
            return { revision: 1, credentialState: "saved" };
          }
          throw new Error("Unexpected fixture IPC");
        },
      },
    });
  });
  await settings.getByLabel("提供商", { exact: true }).fill("事务导航夹具");
  await settings
    .getByLabel("接口地址", { exact: true })
    .fill("https://navigation.example.test/v1");
  await settings.getByLabel("模型名称", { exact: true }).fill("fixture-text");
  await settings
    .getByLabel("API Key", { exact: true })
    .fill("fixture-workspace-key");
  await settings.getByRole("button", { name: "保存连接", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean(
          (window as Window & { releaseFixtureSave?: () => void })
            .releaseFixtureSave,
        ),
      ),
    )
    .toBe(true);
  const close = settings.getByRole("button", { name: "关闭设置", exact: true });
  await expect(close).toBeDisabled();
  await page.keyboard.press("Control+k");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await expect(settings).toBeVisible();

  await page.evaluate(() =>
    (
      window as Window & { releaseFixtureSave?: () => void }
    ).releaseFixtureSave?.(),
  );
  await expect(close).toBeEnabled();
  await expect(settings.locator(".provider-status")).toContainText(
    "连接信息已保存。",
  );
  await close.click();
  await expect(settings).toBeHidden();
  await expect(page.getByTestId("infinite-canvas")).toBeVisible();
});

test("Agent advanced conversation disclosure uses the shared outline", async ({
  page,
}) => {
  await openWorkspace(page);
  const summary = page.locator(".chat-agent-advanced > summary");
  await expect(summary).toBeVisible();
  await expect(summary).toHaveCSS("list-style-type", "none");
  const glyph = await summary.evaluate(
    (element) => getComputedStyle(element, "::before").maskImage,
  );
  expect(glyph).toContain("/design/pen/disclosure-chevron.svg");
  await summary.press("Enter");
  await expect(summary.locator("..")).toHaveAttribute("open", "");
  await expect(summary).toBeFocused();
  await summary.press("Space");
  await expect(summary.locator("..")).not.toHaveAttribute("open", "");
});
