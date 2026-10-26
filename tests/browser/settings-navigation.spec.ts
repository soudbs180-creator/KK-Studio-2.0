// Hierarchical navigation and fixture-only IPC cancellation boundaries.
import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

async function openApi(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).tap();
  await page.getByRole("button", { name: "返回设置分类", exact: true }).tap();
  await page.getByRole("button", { name: "模型接入", exact: true }).tap();
  await page.getByRole("tab", { name: "官方直连 API", exact: true }).tap();
  await expect(page.getByLabel("接口地址", { exact: true })).toBeEditable();
}

test("手机分类与接入方式有返回层级，预设只展示一个当前步骤，草稿保留", async ({
  page,
}) => {
  await openApi(page);
  const dialog = page.getByRole("dialog", { name: "设置", exact: true });
  await expect(
    dialog.getByRole("tablist", { name: "5 大模型接入渠道" }),
  ).toBeVisible();
  await dialog.getByLabel("提供商", { exact: true }).fill("导航返回保留草稿");
  await dialog.getByRole("tab", { name: "官方直连 API", exact: true }).tap();
  await expect(dialog.getByLabel("提供商", { exact: true })).toHaveValue(
    "导航返回保留草稿",
  );
  await dialog.getByText("服务商预设与快速填入", { exact: true }).tap();
  const presets = dialog.locator(".provider-presets");
  await presets.getByLabel("搜索服务商", { exact: true }).fill("豆包");
  const doubao = presets
    .getByRole("listitem")
    .filter({ hasText: "豆包（火山方舟）" });
  await expect(doubao).toBeVisible();
  await doubao.getByRole("button", { name: "一键填入", exact: true }).tap();
  await expect(dialog.getByLabel("提供商", { exact: true })).toHaveValue(
    "豆包（火山方舟）",
  );
  await expect(presets.getByLabel("搜索服务商", { exact: true })).toHaveValue(
    "豆包",
  );
  await dialog.getByRole("button", { name: "返回设置分类", exact: true }).tap();
  const nav = dialog.getByRole("navigation", { name: "设置分类" });
  await expect(nav).toBeVisible();
  expect(
    await nav.evaluate((element) => element.scrollWidth - element.clientWidth),
  ).toBeLessThanOrEqual(1);
  await nav.getByRole("button", { name: "模型接入", exact: true }).tap();
  await dialog.getByRole("tab", { name: "官方直连 API", exact: true }).tap();
  await expect(dialog.getByLabel("提供商", { exact: true })).toHaveValue(
    "豆包（火山方舟）",
  );
});

test("待提交凭据事务期间返回、分类、预设和关闭都不能卸载操作", async ({
  page,
}) => {
  await openApi(page);
  const dialog = page.getByRole("dialog", { name: "设置", exact: true });
  const save = dialog.getByRole("button", { name: "保存连接", exact: true });
  await expect(save).toBeEnabled();
  await page.evaluate(() => {
    const state = window as Window & {
      __saveStarted?: boolean;
      __releaseSave?: () => void;
    };
    Object.assign(window, {
      __TAURI_INTERNALS__: {
        invoke: async (command: string, args: Record<string, unknown>) => {
          if (command === "credential_get") return null;
          if (command === "read_provider_config")
            return { status: "missing", revision: null, connections: [] };
          if (command === "commit_provider_connection") {
            state.__saveStarted = true;
            await new Promise<void>((resolve) => {
              state.__releaseSave = resolve;
            });
            return { revision: 1, credentialState: "saved" };
          }
          throw new Error(
            "Unexpected fixture IPC: " + command + String(Boolean(args)),
          );
        },
      },
    });
  });
  await dialog.getByLabel("提供商", { exact: true }).fill("Navigation fixture");
  await dialog
    .getByLabel("接口地址", { exact: true })
    .fill("https://navigation.example.test/v1");
  await dialog.getByLabel("模型名称", { exact: true }).fill("fixture-text");
  await dialog
    .getByLabel("API Key", { exact: true })
    .fill("fixture-navigation-key");
  await expect(save).toBeEnabled();
  await save.tap();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { __saveStarted?: boolean }).__saveStarted,
      ),
    )
    .toBe(true);
  await expect(
    dialog.getByRole("button", { name: "返回设置分类", exact: true }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole("button", { name: "关闭设置", exact: true }),
  ).toBeDisabled();
  await expect(dialog.locator(".provider-status")).not.toContainText(
    "连接信息已保存。",
  );
  for (const item of await dialog.locator(".settings-nav-item").all())
    await expect(item).toBeDisabled();
  await expect(dialog.locator(".provider-presets > summary")).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await page.mouse.click(1, 1);
  await expect(dialog).toBeVisible();
  await page.evaluate(() =>
    (window as Window & { __releaseSave?: () => void }).__releaseSave?.(),
  );
  await expect(save).toBeEnabled();
  await expect(dialog.locator(".provider-status")).toContainText(
    "连接信息已保存。",
  );
  await expect(
    dialog.getByRole("button", { name: "返回设置分类", exact: true }),
  ).toBeEnabled();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "fixture-navigation-key",
  );
  await dialog.getByRole("button", { name: "关闭设置", exact: true }).tap();
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "模型", exact: true }).tap();
  await expect(
    page.getByRole("menu", { name: "选择模型", exact: true }),
  ).toBeVisible();
});
