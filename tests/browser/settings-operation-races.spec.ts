import { expect, test, type Page } from "@playwright/test";
import { openSettingsSection } from "./helpers";

test.use({ hasTouch: true });

async function prepareMcp(page: Page) {
  await openSettingsSection(page, "扩展");
  const dialog = page.getByRole("dialog", { name: "设置", exact: true });
  await dialog
    .getByRole("tab", { name: /^MCP(?: 工具)?$/, exact: true })
    .click();
  await dialog.getByLabel("MCP服务器名称").fill("Busy fixture");
  await dialog.getByLabel("MCP地址").fill("https://busy-mcp.example.test/mcp");
  await dialog.getByRole("button", { name: "保存服务器", exact: true }).click();
  return dialog;
}

for (const width of [1920, 390, 320]) {
  test(
    "MCP handshake locks navigation and cancellation restores controls " +
      width,
    async ({ page }) => {
      await page.setViewportSize({ width, height: 480 });
      let release!: () => void;
      let handshakes = 0;
      await page.route("https://busy-mcp.example.test/mcp", async (route) => {
        const body = route.request().postDataJSON() as {
          id: number;
          method: string;
        };
        if (body.method === "server/discover") {
          handshakes += 1;
          if (handshakes === 1)
            await new Promise<void>((resolve) => {
              release = resolve;
            });
          await route
            .fulfill({
              contentType: "application/json",
              body: JSON.stringify({
                jsonrpc: "2.0",
                id: body.id,
                result: { protocolVersions: ["2026-07-28"] },
              }),
            })
            .catch(() => undefined);
        } else if (body.method === "tools/list")
          await route.fulfill({
            contentType: "application/json",
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: body.id,
              result: { tools: [] },
            }),
          });
        else await route.fulfill({ status: 404, body: "" });
      });
      await page.goto("/");
      const dialog = await prepareMcp(page);
      await dialog.getByRole("button", { name: "连接", exact: true }).click();
      await expect.poll(() => handshakes).toBe(1);
      await expect(
        dialog.getByRole("button", { name: "关闭设置", exact: true }),
      ).toBeDisabled();
      if (width < 768)
        await expect(
          dialog.getByRole("button", { name: "返回设置分类", exact: true }),
        ).toBeDisabled();
      for (const tab of await dialog.getByRole("tab").all())
        await expect(tab).toBeDisabled();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeVisible();
      await page.mouse.click(2, 2);
      await expect(dialog).toBeVisible();
      await dialog.getByRole("button", { name: "取消", exact: true }).click();
      await expect(
        dialog.getByRole("button", { name: "关闭设置", exact: true }),
      ).toBeEnabled();
      await expect(dialog.getByText("未连接", { exact: true })).toBeVisible();
      release();
      await dialog.getByRole("button", { name: "连接", exact: true }).click();
      await expect(
        dialog.getByText("已连接 · 0 个工具", { exact: true }),
      ).toBeVisible();
      expect(handshakes).toBe(2);
    },
  );
}

test("pending MCP tool call blocks plugin mutations and restores them after stopping wait", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "canvas-plugins",
      JSON.stringify([
        {
          id: "busy-fixture",
          name: "Busy fixture plugin",
          version: "1",
          url: "https://plugin.example.test/fixture.js",
          enabled: true,
          source:
            "export default {id:'busy-fixture',name:'Busy fixture plugin',version:'1',nodes:[{type:'busy-fixture:card',title:'Fixture',icon:'',defaultSize:{width:100,height:100},Content:()=>null}]}",
        },
      ]),
    );
  });
  let release!: () => void;
  let calls = 0;
  await page.route("https://busy-mcp.example.test/mcp", async (route) => {
    const body = route.request().postDataJSON() as {
      id: number;
      method: string;
    };
    let result: unknown;
    if (body.method === "server/discover")
      result = { protocolVersions: ["2026-07-28"] };
    else if (body.method === "tools/list")
      result = {
        tools: [{ name: "pending_fixture", inputSchema: { type: "object" } }],
      };
    else if (body.method === "tools/call") {
      calls += 1;
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      result = { content: [{ type: "text", text: "late fixture reply" }] };
    } else {
      await route.fulfill({ status: 404, body: "" });
      return;
    }
    await route
      .fulfill({
        contentType: "application/json",
        body: JSON.stringify({ jsonrpc: "2.0", id: body.id, result }),
      })
      .catch(() => undefined);
  });
  await page.goto("/");
  const dialog = await prepareMcp(page);
  const plugin = dialog.getByRole("switch", {
    name: "停用 Busy fixture plugin",
    exact: true,
  });
  await expect(plugin).toBeEnabled();
  const before = await page.evaluate(() =>
    localStorage.getItem("canvas-plugins"),
  );
  await dialog.getByRole("button", { name: "连接", exact: true }).click();
  await expect(
    dialog.getByText("已连接 · 1 个工具", { exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "查看工具详情", exact: true })
    .click();
  page.once("dialog", (confirmation) => void confirmation.accept());
  await dialog
    .getByRole("button", { name: "调用工具（需确认）", exact: true })
    .click();
  await expect.poll(() => calls).toBe(1);
  await expect(plugin).toBeDisabled();
  await expect(
    dialog.getByRole("button", { name: "更新", exact: true }),
  ).toBeDisabled();
  const uninstall = dialog.getByRole("button", { name: "卸载", exact: true });
  expect(await uninstall.count()).toBeGreaterThan(0);
  for (const button of await uninstall.all())
    await expect(button).toBeDisabled();
  await expect(dialog.getByLabel("插件地址", { exact: true })).toBeDisabled();
  expect(
    await page.evaluate(() => localStorage.getItem("canvas-plugins")),
  ).toBe(before);
  await expect(
    dialog.getByRole("button", { name: "关闭设置", exact: true }),
  ).toBeDisabled();
  await dialog
    .getByRole("button", { name: "停止等待工具结果", exact: true })
    .click();
  await expect(dialog.locator(".settings-mcp-tool-result")).toContainText(
    "可能已在远端执行",
  );
  await expect(plugin).toBeEnabled();
  await expect(
    dialog.getByRole("button", { name: "关闭设置", exact: true }),
  ).toBeEnabled();
  release();
  expect(calls).toBe(1);
  await dialog.getByRole("button", { name: "关闭设置", exact: true }).click();
  await expect(dialog).toBeHidden();
  await openSettingsSection(page, "扩展");
  await dialog
    .getByRole("tab", { name: /^MCP(?: 工具)?$/, exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "关闭设置", exact: true }),
  ).toBeEnabled();
  await expect(plugin).toBeEnabled();
});
