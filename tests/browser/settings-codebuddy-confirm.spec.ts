import { expect, test } from "@playwright/test";
import { startAgentServer } from "../helpers/agentServer";

for (const confirmed of [false, true]) {
  test(`CodeBuddy 清空已有路径需确认：${confirmed ? "确认" : "取消"}`, async ({
    page,
  }) => {
    const agent = await startAgentServer("idle");
    const savedPath = "C:/fixture/codebuddy.js";
    let cliPath = savedPath;
    const writes: string[] = [];
    try {
      await page.route(agent.url + "/agent/codebuddy/config", async (route) => {
        if (route.request().method() === "POST") {
          cliPath = route.request().postDataJSON().cliPath;
          writes.push(cliPath);
        }
        await route.fulfill({
          json: { configured: Boolean(cliPath), cliPath },
        });
      });
      await page.goto("/");
      await page.getByRole("button", { name: "打开设置", exact: true }).click();
      await page
        .getByRole("navigation", { name: "设置分类" })
        .getByRole("button", { name: "模型接入", exact: true })
        .click();
      await page
        .getByRole("tab", { name: "CLI 直连 CLI", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Codex CLI / 主 Agent", exact: true })
        .click();
      await page.getByText("高级连接选项", { exact: true }).click();
      await page.getByLabel("Agent 地址", { exact: true }).fill(agent.url);
      await page
        .getByLabel("连接 Token", { exact: true })
        .fill("fixture-token");
      await page
        .getByRole("button", { name: "连接 Agent", exact: true })
        .click();
      await expect(
        page
          .getByRole("dialog", { name: "设置", exact: true })
          .getByRole("button", { name: "已连接", exact: true }),
      ).toBeVisible();
      await page
        .getByRole("tab", { name: "CLI 直连 CLI", exact: true })
        .click();
      await page
        .getByRole("button", { name: "CodeBuddy CLI", exact: true })
        .click();
      const input = page.getByLabel("CodeBuddy CLI 路径", { exact: true });
      await expect(input).toHaveValue(savedPath);
      await input.fill("");
      let prompt = "";
      page.once("dialog", async (dialog) => {
        prompt = dialog.message();
        if (confirmed) await dialog.accept();
        else await dialog.dismiss();
      });
      await page
        .getByRole("button", { name: "保存 CodeBuddy 路径", exact: true })
        .click();
      await expect
        .poll(() => prompt)
        .toContain("确认移除已保存的 CodeBuddy 路径");
      expect(prompt).toContain("委派将不可用");
      await expect(input).toHaveValue(confirmed ? "" : savedPath);
      await expect(
        page.getByRole("button", { name: "关闭设置", exact: true }),
      ).toBeEnabled();
      expect(writes).toEqual(confirmed ? [""] : []);
    } finally {
      await agent.close();
    }
  });
}
