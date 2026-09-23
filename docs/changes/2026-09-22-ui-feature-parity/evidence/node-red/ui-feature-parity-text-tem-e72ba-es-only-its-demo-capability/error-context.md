# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui-feature-parity.spec.ts >> text templates change visible input while audio exposes only its demo capability
- Location: tests\browser\ui-feature-parity.spec.ts:7:1

# Error details

```
Error: expect(locator).toHaveValue(expected) failed

Locator: locator('.canvas-node[data-node-id^="added-text-"]').last().getByLabel('文案提示词')
Expected pattern: /请.*剧本[\s\S]*保留的主题/
Received string:  "保留的主题"
Timeout: 5000ms

Call log:
  - Expect "toHaveValue" locator('.canvas-node[data-node-id^="added-text-"]').last().getByLabel('文案提示词') with timeout 5000ms
  - waiting for locator('.canvas-node[data-node-id^="added-text-"]').last().getByLabel('文案提示词')
    14 × locator resolved to <textarea maxlength="4000" aria-label="文案提示词" placeholder="描述你想要生成的内容">保留的主题</textarea>
       - unexpected value "保留的主题"

```

```yaml
- textbox "文案提示词":
  - /placeholder: 描述你想要生成的内容
  - text: 保留的主题
```

# Test source

```ts
  1   | import { expect, test } from "@playwright/test";
  2   | import { openWorkspace } from "./helpers";
  3   | import { showCanvasNavigation } from "./helpers";
  4   | import { startAgentServer } from "../helpers/agentServer";
  5   | import { ACCENTS, contrast } from "../helpers/designSystem";
  6   | 
  7   | test("text templates change visible input while audio exposes only its demo capability", async ({ page }) => {
  8   |   await openWorkspace(page);
  9   |   await showCanvasNavigation(page);
  10  |   await page.getByRole("button", { name: "添加资源", exact: true }).click();
  11  |   await page.getByRole("menuitem", { name: "文本", exact: true }).click();
  12  |   const textNode = page.locator('.canvas-node[data-node-id^="added-text-"]').last();
  13  |   await textNode.click();
  14  |   await textNode.getByLabel("文案提示词").fill("保留的主题");
  15  |   await textNode.getByRole("button", { name: "剧本生成", exact: true }).click();
> 16  |   await expect(textNode.getByLabel("文案提示词")).toHaveValue(/请.*剧本[\s\S]*保留的主题/);
      |                                              ^ Error: expect(locator).toHaveValue(expected) failed
  17  |   await textNode.getByRole("button", { name: "策划案生成", exact: true }).click();
  18  |   await expect(textNode.getByLabel("文案提示词")).toHaveValue(/请.*策划案[\s\S]*保留的主题/);
  19  |   await expect(textNode.getByLabel("文案提示词")).not.toHaveValue(/剧本/);
  20  |   await page.getByRole("button", { name: "添加资源", exact: true }).click();
  21  |   await page.getByRole("menuitem", { name: "音频", exact: true }).click();
  22  |   const audio = page.locator('.canvas-node[data-node-id^="added-audio-"]').last();
  23  |   await expect(audio.getByRole("group", { name: "文案创作方式" })).toHaveCount(0);
  24  |   await expect(audio).toContainText("本地演示");
  25  | });
  26  | 
  27  | test("Agent controls match the live fixture channel, with error feedback and no fallback", async ({
  28  |   page,
  29  | }, info) => {
  30  |   const server = await startAgentServer();
  31  |   try {
  32  |     await openWorkspace(page);
  33  |     const panel = page.locator(".conversation-panel");
  34  |     await panel
  35  |       .getByRole("button", { name: "本地 Agent", exact: true })
  36  |       .click();
  37  |     await panel.getByRole("button", { name: "连接设置", exact: true }).click();
  38  |     await page.getByLabel("Agent 地址").fill(server.url);
  39  |     await page.getByLabel("连接 Token", { exact: true }).fill("fixture-token");
  40  |     await expect(
  41  |       page.getByLabel("连接 Token", { exact: true }),
  42  |     ).toHaveAttribute("type", "password");
  43  |     await page.getByRole("button", { name: "连接 Agent", exact: true }).click();
  44  |     await expect(
  45  |       page.getByRole("button", { name: "已连接", exact: true }),
  46  |     ).toBeVisible();
  47  |     await expect
  48  |       .poll(() =>
  49  |         page.evaluate(() => localStorage.getItem("canvas-agent-token")),
  50  |       )
  51  |       .toBeNull();
  52  |     await page.keyboard.press("Escape");
  53  |     await panel
  54  |       .getByLabel("Agent 权限", { exact: true })
  55  |       .selectOption("request");
  56  |     await panel.getByLabel("Agent 指令").fill("读取画布");
  57  |     await panel.getByRole("button", { name: "发送给 Agent" }).click();
  58  |     await expect.poll(() => server.turns.length).toBe(1);
  59  |     expect(server.turns[0]).toMatchObject({
  60  |       messageText: "读取画布",
  61  |       permissionMode: "request",
  62  |       attachments: [],
  63  |     });
  64  |     expect(server.turns[0].model).toBeUndefined();
  65  |     await expect(
  66  |       panel.getByRole("button", { name: "Agent 执行中…" }),
  67  |     ).toBeDisabled();
  68  |     await expect(panel.getByLabel("Agent 指令")).toHaveValue("");
  69  |     server.failActions(true);
  70  |     await panel.getByRole("button", { name: "停止", exact: true }).click();
  71  |     await expect(panel.getByRole("alert")).toContainText("受控服务暂时不可用");
  72  |     server.emit("codex_approval", {
  73  |       requestId: "r1",
  74  |       method: "local_shell_execute",
  75  |       command: "echo test",
  76  |       reason: "审批演示",
  77  |     });
  78  |     await panel.getByRole("button", { name: "允许", exact: true }).click();
  79  |     await expect(
  80  |       panel.getByRole("group", { name: "确认 Agent 权限请求" }),
  81  |     ).toBeVisible();
  82  |     server.failActions(false);
  83  |     await panel.getByRole("button", { name: "拒绝", exact: true }).click();
  84  |     await expect
  85  |       .poll(() => server.decisions.some((d) => d.decision === "decline"))
  86  |       .toBe(true);
  87  |     await expect(
  88  |       panel.getByRole("group", { name: "确认 Agent 权限请求" }),
  89  |     ).toHaveCount(0);
  90  |     await page.screenshot({
  91  |       path: info.outputPath("agent-running.png"),
  92  |       animations: "disabled",
  93  |     });
  94  |     server.disconnect();
  95  |     await expect(panel.getByRole("alert")).toContainText("核对任务结果");
  96  |     await expect(
  97  |       panel.getByRole("button", { name: "本地 Agent", exact: true }),
  98  |     ).toHaveAttribute("aria-pressed", "true");
  99  |     await expect(panel.getByLabel("添加对话素材")).toBeHidden();
  100 |   } finally {
  101 |     await server.close();
  102 |   }
  103 | });
  104 | 
  105 | for (const width of [390, 768, 1920]) {
  106 |   test(`prompt library handles themes, long text, errors and focus at ${width}`, async ({
  107 |     page,
  108 |   }, info) => {
  109 |     await page.setViewportSize({ width, height: 900 });
  110 |     let fail = false;
  111 |     let delayed = false;
  112 |     await page.route("https://raw.githubusercontent.com/**", async (route) => {
  113 |       if (delayed) await new Promise((resolve) => setTimeout(resolve, 400));
  114 |       if (fail) await route.fulfill({ status: 503, body: "offline" });
  115 |       else
  116 |         await route.fulfill({
```