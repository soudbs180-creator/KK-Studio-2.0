import { expect, test } from "@playwright/test";
import { openSettingsSection } from "./helpers";

test("Gemini 预设进入专用 Google 配置，已有通用连接草稿保留", async ({
  page,
}) => {
  await page.goto("/");
  await openSettingsSection(page, "模型接入");
  const dialog = page.getByRole("dialog", { name: "设置", exact: true });
  await dialog
    .getByRole("button", { name: "API Key（官方）", exact: true })
    .click();
  await dialog.getByLabel("提供商", { exact: true }).fill("保留的供应商草稿");
  await dialog.getByText("服务商预设与接口文档", { exact: true }).click();
  await dialog
    .getByRole("button", { name: /^Gemini GenerateContent$/ })
    .click();
  const detail = dialog.getByRole("region", { name: "预设详情", exact: true });
  await expect(detail.getByRole("link", { name: "官方网站" })).toHaveAttribute(
    "href",
    "https://ai.google.dev",
  );
  await expect(detail.getByRole("link", { name: "获取密钥" })).toHaveAttribute(
    "href",
    "https://aistudio.google.com/apikey",
  );
  await expect(detail.getByRole("link", { name: "接口文档" })).toHaveAttribute(
    "href",
    "https://ai.google.dev/api",
  );
  await detail.getByRole("button", { name: "前往 Google 配置" }).click();
  await expect(dialog.getByLabel("Google 密钥", { exact: true })).toBeFocused();
  await expect(dialog.getByLabel("提供商", { exact: true })).toHaveValue(
    "保留的供应商草稿",
  );
});

for (const loginStatus of ["unknown", "required"] as const) {
  test(`CLI 的 ${loginStatus} 依据显示实际状态，准备命令可复制`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const copies: string[] = [];
      Object.assign(window, { commandCopies: copies });
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            copies.push(text);
          },
        },
      });
    });
    const requests: string[] = [];
    await page.route("http://127.0.0.1:1424/**", async (route) => {
      requests.push(new URL(route.request().url()).pathname);
      await route.fulfill({
        json: {
          installed: true,
          version: "fixture 1.0",
          login: false,
          loginStatus,
        },
      });
    });
    await page.goto("/");
    await openSettingsSection(page, "模型接入");
    const dialog = page.getByRole("dialog", { name: "设置", exact: true });
    await dialog.getByRole("button", { name: "CLI 账号", exact: true }).click();
    await expect(
      dialog.getByRole("button", { name: "Gemini CLI", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await dialog
      .getByRole("button", { name: "检测 Gemini CLI", exact: true })
      .click();
    const state = dialog.getByLabel("Gemini CLI 检测状态", { exact: true });
    await expect(state).toContainText(
      loginStatus === "unknown" ? "未确认" : "需要登录",
    );
    await expect(state).toContainText("fixture 1.0");
    await dialog
      .getByRole("button", { name: "复制登录命令", exact: true })
      .click();
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as Window & { commandCopies: string[] }).commandCopies,
        ),
      )
      .toEqual(["gemini"]);
    expect(requests).toEqual(["/status"]);
    await dialog
      .getByRole("button", { name: "CodeBuddy CLI", exact: true })
      .click();
    await expect(
      dialog.getByLabel("CodeBuddy CLI 路径", { exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "测试 CodeBuddy 连接" }),
    ).toBeDisabled();
  });
}
