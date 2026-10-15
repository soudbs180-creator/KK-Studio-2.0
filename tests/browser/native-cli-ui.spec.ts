import { expect, test } from "@playwright/test";
import { openSettingsSection } from "./helpers";

for (const width of [390, 1099, 1920]) {
  for (const label of ["Codex", "Gemini", "CodeBuddy"]) {
    test(`${label} CLI 管理卡片使用统一表面、内边距与字阶 ${width}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1080 });
      await page.goto("/");
      await expect(page.getByLabel("创作提示词")).toBeVisible();
      await page.evaluate(() => {
        Object.assign(window, {
          isTauri: true,
          __TAURI_INTERNALS__: {
            invoke: async (
              command: string,
              args: Record<string, unknown> = {},
            ) => {
              if (command === "agent_runtime_status")
                return {
                  available: false,
                  running: false,
                  healthy: false,
                  reason: "隔离视觉夹具不启动 Agent。",
                };
              if (command === "credential_get") return null;
              if (command === "read_provider_config")
                return { status: "missing", revision: null, connections: [] };
              if (command === "cli_inspect")
                return {
                  tool: args.tool,
                  installed: true,
                  complete: true,
                  nodeAvailable: true,
                  npmAvailable: true,
                  version: "fixture 1.0",
                  cliPath: `C:\\${"long-cli-path-".repeat(30)}\\cli.js`,
                  message: "视觉夹具检测完成；没有调用真实 CLI。",
                };
              if (command === "cli_bridge_state")
                return {
                  owned: false,
                  running: false,
                  healthy: false,
                  message: "视觉夹具不启动 CLI 桥。",
                };
              throw new Error(`Unexpected CLI UI fixture IPC: ${command}`);
            },
          },
        });
      });
      await openSettingsSection(page, "模型接入");
      const dialog = page.getByRole("dialog", { name: "设置", exact: true });
      await dialog
        .getByRole("button", {
          name: label === "Codex" ? "Codex 主 Agent" : "CLI 账号",
          exact: true,
        })
        .click();
      if (label !== "Codex")
        await dialog
          .getByRole("button", { name: `${label} CLI`, exact: true })
          .click();
      const card = dialog.getByRole("region", {
        name: `${label} CLI 管理`,
        exact: true,
      });
      await card
        .getByRole("button", { name: `检测 ${label} CLI`, exact: true })
        .click();
      await expect(card).toContainText("fixture 1.0");
      await expect(
        card.getByRole("button", { name: `登录 ${label} CLI` }),
      ).toBeEnabled();
      const visual = await card.evaluate((element) => {
        const style = getComputedStyle(element);
        const heading = element.querySelector("h3")!;
        const body = element.querySelector("p")!;
        const probe = document.createElement("span");
        probe.style.background = "var(--kk-bg-card)";
        element.append(probe);
        const expectedBackground = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return {
          background: style.backgroundColor,
          expectedBackground,
          padding: ["Top", "Right", "Bottom", "Left"].map((side) =>
            style.getPropertyValue(`padding-${side.toLowerCase()}`),
          ),
          headingSize: getComputedStyle(heading).fontSize,
          bodySize: getComputedStyle(body).fontSize,
          headingInset:
            heading.getBoundingClientRect().left -
            element.getBoundingClientRect().left,
          overflow: element.scrollWidth - element.clientWidth,
          factsOverflow:
            element.querySelector("dl")!.scrollWidth -
            element.querySelector("dl")!.clientWidth,
        };
      });
      expect.soft(visual.background).toBe(visual.expectedBackground);
      expect.soft(visual.padding).toEqual(["16px", "16px", "16px", "16px"]);
      expect.soft(visual.headingSize).toBe("14px");
      expect.soft(visual.bodySize).toBe("14px");
      expect.soft(visual.headingInset).toBeGreaterThanOrEqual(16);
      expect.soft(visual.overflow).toBeLessThanOrEqual(1);
      expect.soft(visual.factsOverflow).toBeLessThanOrEqual(1);
      await expect(
        card.getByRole("heading", { name: `${label} CLI` }),
      ).toBeVisible();
      expect(
        await dialog.evaluate(
          (element) => element.scrollWidth - element.clientWidth,
        ),
      ).toBeLessThanOrEqual(1);
    });
  }
}
