import { expect, test } from "@playwright/test";

test("MCP 设置保存 endpoint，完成真实握手并展示 tools/list 返回的 inputSchema", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  let listCalls = 0;
  await page.route("https://mcp.example.test/mcp", async (route) => {
    const request = route.request();
    const body = request.postDataJSON() as {
      id?: number;
      method?: string;
    };
    if (body.method === "initialize") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "MCP-Session-Id": "browser-fixture-session" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          result: {
            protocolVersion: "2025-11-25",
            capabilities: { tools: { listChanged: false } },
            serverInfo: { name: "Browser fixture", version: "1.0.0" },
          },
        }),
      });
      return;
    }
    if (body.method === "notifications/initialized") {
      await route.fulfill({ status: 202, body: "" });
      return;
    }
    if (body.method === "tools/list") {
      listCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          result: {
            tools: [
              {
                name: "read_canvas",
                title: "读取画布",
                description: "只读画布信息",
                inputSchema: {
                  type: "object",
                  properties: { projectId: { type: "string" } },
                  required: ["projectId"],
                },
              },
            ],
          },
        }),
      });
      return;
    }
    if (body.method === "tools/call") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          result: {
            content: [{ type: "text", text: "canvas-ready" }],
          },
        }),
      });
      return;
    }
    await route.fulfill({ status: 404, body: "" });
  });

  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "设置" });
  await dialog.getByRole("button", { name: "MCP", exact: true }).click();
  await dialog.getByLabel("MCP服务器名称").fill("Browser fixture");
  await dialog.getByLabel("MCP地址").fill("https://mcp.example.test/mcp");
  await dialog.getByRole("button", { name: "保存服务器" }).click();
  await expect(
    dialog.getByText("Browser fixture", { exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "连接", exact: true }).click();
  await expect(
    dialog.getByText("已连接 · 1 个工具", { exact: true }),
  ).toBeVisible();
  expect(listCalls).toBe(1);
  await dialog
    .getByRole("button", { name: "查看工具详情", exact: true })
    .click();
  await expect(
    dialog.getByRole("list", { name: "Browser fixture工具" }),
  ).toContainText("projectId");
  await expect(
    dialog.getByText("stdio、OAuth 和 Agent 自动调用仍为 Prototype。", {
      exact: false,
    }),
  ).toBeVisible();
  page.once("dialog", (browserDialog) => {
    expect(browserDialog.message()).toContain("read_canvas");
    void browserDialog.accept();
  });
  await dialog
    .getByRole("button", { name: "调用工具（需确认）", exact: true })
    .click();
  await expect(dialog.locator(".settings-mcp-tool-result")).toContainText(
    "canvas-ready",
  );
});

test("MCP 设置拒绝不安全的远程 HTTP endpoint", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "设置" });
  await dialog.getByRole("button", { name: "MCP", exact: true }).click();
  await dialog.getByLabel("MCP服务器名称").fill("Unsafe");
  await dialog.getByLabel("MCP地址").fill("http://remote.example.test/mcp");
  await dialog.getByRole("button", { name: "保存服务器" }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "远程 MCP 必须使用 HTTPS",
  );
});
