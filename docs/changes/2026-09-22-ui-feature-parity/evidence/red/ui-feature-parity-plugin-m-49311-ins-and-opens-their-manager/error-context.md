# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui-feature-parity.spec.ts >> plugin menu reflects installed canvas plugins and opens their manager
- Location: tests\browser\ui-feature-parity.spec.ts:4:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByRole('menu', { name: '选择插件' })
Expected substring: "已启用 4 个画布插件"
Received string:    "当前没有已连接的插件。管理插件连接"
Timeout: 5000ms

Call log:
  - Expect "toContainText" getByRole('menu', { name: '选择插件' }) with timeout 5000ms
  - waiting for getByRole('menu', { name: '选择插件' })
    14 × locator resolved to <div role="menu" aria-label="选择插件" class="start-skill-popover start-plugin-popover">…</div>
       - unexpected value "当前没有已连接的插件。管理插件连接"

```

```yaml
- menu "选择插件":
  - paragraph: 当前没有已连接的插件。
  - menuitem "管理插件连接"
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | import { openWorkspace } from "./helpers";
  3  | 
  4  | test("plugin menu reflects installed canvas plugins and opens their manager", async ({ page }) => {
  5  |   await page.goto("/");
  6  |   await page.locator(".start-composer").getByRole("button", { name: "插件", exact: true }).click();
  7  |   const menu = page.getByRole("menu", { name: "选择插件" });
> 8  |   await expect(menu).toContainText("已启用 4 个画布插件");
     |                      ^ Error: expect(locator).toContainText(expected) failed
  9  |   await menu.getByRole("menuitem", { name: "管理画布插件" }).click();
  10 |   await expect(page.getByRole("heading", { name: "已安装插件" })).toBeVisible();
  11 | });
  12 | 
  13 | test("prompt library searches, previews and appends text without submitting", async ({ page }) => {
  14 |   await page.route("https://raw.githubusercontent.com/**", route => route.fulfill({ json: [
  15 |     { id: "one", title: "光影产品", prompt: "柔和自然光，保留产品比例", tags: ["产品"] },
  16 |     { id: "two", title: "城市", prompt: "雨夜城市" },
  17 |   ] }));
  18 |   await page.goto("/");
  19 |   await page.getByLabel("创作提示词").fill("现有草稿");
  20 |   await page.getByRole("button", { name: "提示词库", exact: true }).click();
  21 |   const dialog = page.getByRole("dialog", { name: "提示词库" });
  22 |   await dialog.getByRole("button", { name: "加载来源" }).click();
  23 |   await dialog.getByRole("searchbox", { name: "搜索提示词" }).fill("光影");
  24 |   await dialog.getByRole("button", { name: "光影产品", exact: true }).click();
  25 |   await dialog.getByRole("button", { name: "加入草稿" }).click();
  26 |   await expect(dialog).not.toBeVisible();
  27 |   await expect(page.getByLabel("创作提示词")).toHaveValue("现有草稿\n\n柔和自然光，保留产品比例");
  28 |   await expect(page.locator(".start-composer")).toBeVisible();
  29 | });
  30 | 
  31 | test("disconnected Agent has its own draft and cannot submit to image creation", async ({ page }) => {
  32 |   await openWorkspace(page);
  33 |   const panel = page.locator(".conversation-panel");
  34 |   await panel.getByLabel("对话内容").fill("图片草稿");
  35 |   await panel.getByRole("button", { name: "本地 Agent", exact: true }).click();
  36 |   await expect(panel.getByText("Agent 尚未连接", { exact: true })).toBeVisible();
  37 |   await expect(panel.getByLabel("添加对话素材")).toHaveCount(0);
  38 |   await panel.getByLabel("Agent 指令").fill("读取当前画布");
  39 |   await expect(panel.getByRole("button", { name: "发送给 Agent" })).toBeDisabled();
  40 |   await panel.getByRole("button", { name: "图片创作", exact: true }).click();
  41 |   await expect(panel.getByLabel("对话内容")).toHaveValue("图片草稿");
  42 |   await panel.getByRole("button", { name: "本地 Agent", exact: true }).click();
  43 |   await expect(panel.getByLabel("Agent 指令")).toHaveValue("读取当前画布");
  44 | });
  45 | 
```