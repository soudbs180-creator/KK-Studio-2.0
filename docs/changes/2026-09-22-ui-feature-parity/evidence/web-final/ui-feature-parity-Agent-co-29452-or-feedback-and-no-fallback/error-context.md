# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui-feature-parity.spec.ts >> Agent controls match the live fixture channel, with error feedback and no fallback
- Location: tests\browser\ui-feature-parity.spec.ts:46:1

# Error details

```
Error: expect(received).toBeLessThanOrEqual(expected)

Expected: <= 390
Received:    609
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - strong [ref=e5]: KK Studio
    - navigation "应用菜单" [ref=e6]:
      - button "文件" [ref=e8] [cursor=pointer]
      - button "编辑" [ref=e10] [cursor=pointer]
      - button "窗口" [ref=e12] [cursor=pointer]
      - button "帮助" [ref=e14] [cursor=pointer]
    - button "搜索与收藏" [ref=e15] [cursor=pointer]
  - generic [ref=e16]:
    - complementary "工作台侧栏" [ref=e17]:
      - generic [ref=e18]:
        - button "搜索" [ref=e19] [cursor=pointer]
        - button "展开侧边栏" [ref=e21] [cursor=pointer]
      - navigation "主导航" [ref=e23]:
        - button "开始创作" [ref=e24] [cursor=pointer]
        - button "项目库" [ref=e26] [cursor=pointer]
        - button "Skill" [ref=e28] [cursor=pointer]
        - button "ComfyUI 工作流" [ref=e30] [cursor=pointer]
      - generic:
        - button "个人信息" [ref=e32] [cursor=pointer]
        - button "打开设置" [ref=e34] [cursor=pointer]
    - main [ref=e36]:
      - generic [ref=e37]:
        - generic [ref=e38]:
          - strong [ref=e39]: 未命名项目
          - generic [ref=e40]: 已保存
        - region "无限画布" [ref=e41]:
          - generic:
            - group "图片创建卡片，点击或按回车选择，拖动可移动，方向键可微调":
              - generic:
                - button "上传图片" [ref=e42] [cursor=pointer]
                - generic [ref=e46]: 图片
              - button "从图片创建卡片添加下游" [ref=e53] [cursor=pointer]
            - group "视频卡片 1，点击或按回车选择，拖动可移动，方向键可微调" [ref=e54]:
              - generic [ref=e55]: 视频
              - button "从视频卡片 1添加下游" [ref=e59] [cursor=pointer]
            - group "视频卡片 2，点击或按回车选择，拖动可移动，方向键可微调" [ref=e60]:
              - generic [ref=e61]: 视频
              - button "从视频卡片 2添加下游" [ref=e65] [cursor=pointer]
            - generic:
              - generic:
                - img:
                  - button "连接 图片创建卡片 → 视频卡片 1" [ref=e66] [cursor=pointer]
                - button "删除连线 图片创建卡片 → 视频卡片 1":
                  - generic: 剪开连线
              - generic:
                - img:
                  - button "连接 图片创建卡片 → 视频卡片 2" [ref=e67] [cursor=pointer]
                - button "删除连线 图片创建卡片 → 视频卡片 2":
                  - generic: 剪开连线
          - paragraph [ref=e68]: 左键拖动空白处框选，中键或右键拖动画布；拖动卡片可移动，卡片聚焦后可用方向键微调。
          - button "打开任务列表" [ref=e71] [cursor=pointer]:
            - generic [ref=e72]: 任务列表
          - toolbar "画布工具" [ref=e73]:
            - button "添加资源" [ref=e74] [cursor=pointer]
            - button "当前工具：选择" [ref=e75] [cursor=pointer]
            - button "选择画布工具" [ref=e76] [cursor=pointer]
            - button "资产管理" [ref=e77] [cursor=pointer]
            - button "打开喜欢与收藏" [ref=e78] [cursor=pointer]
            - button "帮助与快捷键" [ref=e79] [cursor=pointer]
        - complementary [ref=e80]:
          - generic [ref=e81]:
            - strong [ref=e82]: 未命名项目
            - button "对话记录" [ref=e83] [cursor=pointer]
            - button "收起对话" [ref=e84] [cursor=pointer]
          - group "对话通道" [ref=e85]:
            - button "图片创作" [ref=e86] [cursor=pointer]
            - button "本地 Agent" [pressed] [ref=e87] [cursor=pointer]
          - generic "本地 Agent 会话" [ref=e89]:
            - status [ref=e90]: Agent 尚未连接
            - alert [ref=e91]: 无法连接本地 Agent，请检查服务后重新连接。
            - paragraph [ref=e92]: 请先在连接设置中启动并连接本地 Agent。图片创作仍可单独使用。
          - generic [ref=e94]:
            - generic [ref=e95]: Agent 指令
            - textbox "Agent 指令" [ref=e96]:
              - /placeholder: 描述任务，让 Agent 读取并操作当前画布
            - generic [ref=e97]:
              - generic [ref=e98]: 模型：本地服务默认
              - generic [ref=e99]:
                - text: Agent 权限
                - combobox "Agent 权限" [ref=e100] [cursor=pointer]:
                  - option "每次询问" [selected]
                  - option "自动允许安全操作"
                  - option "全部放行"
            - paragraph [ref=e101]: 发送文字指令；图片参考请在画布中提供。此处权限仅用于本地 Agent。
            - generic [ref=e102]:
              - button "连接设置" [ref=e103] [cursor=pointer]
              - button "开启语音输入" [ref=e104] [cursor=pointer]
              - button "发送给 Agent" [disabled] [ref=e105]
          - generic [ref=e106]: 请确保授权，合法使用
```

# Test source

```ts
  1   | import { expect, test } from "@playwright/test";
  2   | import { openWorkspace } from "./helpers";
  3   | import { showCanvasNavigation } from "./helpers";
  4   | import { startAgentServer } from "../helpers/agentServer";
  5   | import {
  6   |   ACCENTS,
  7   |   contrast,
  8   |   cssRgb,
  9   |   themeTokens,
  10  | } from "../helpers/designSystem";
  11  | 
  12  | test("text templates change visible input while audio exposes only its demo capability", async ({
  13  |   page,
  14  | }) => {
  15  |   await openWorkspace(page);
  16  |   await showCanvasNavigation(page);
  17  |   await page.getByRole("button", { name: "添加资源", exact: true }).click();
  18  |   await page.getByRole("menuitem", { name: "文本", exact: true }).click();
  19  |   const textNode = page
  20  |     .locator('.canvas-node[data-node-id^="added-text-"]')
  21  |     .last();
  22  |   await textNode.click();
  23  |   await textNode.getByLabel("文案提示词").fill("保留的主题");
  24  |   await textNode.getByRole("button", { name: "剧本生成", exact: true }).click();
  25  |   await expect(textNode.getByLabel("文案提示词")).toHaveValue(
  26  |     /请.*剧本[\s\S]*保留的主题/,
  27  |   );
  28  |   await textNode
  29  |     .getByRole("button", { name: "策划案生成", exact: true })
  30  |     .click();
  31  |   await expect(textNode.getByLabel("文案提示词")).toHaveValue(
  32  |     /请.*策划案[\s\S]*保留的主题/,
  33  |   );
  34  |   await expect(textNode.getByLabel("文案提示词")).not.toHaveValue(/剧本/);
  35  |   await page.getByRole("button", { name: "添加资源", exact: true }).click();
  36  |   await page.getByRole("menuitem", { name: "音频", exact: true }).click();
  37  |   const audio = page
  38  |     .locator('.canvas-node[data-node-id^="added-audio-"]')
  39  |     .last();
  40  |   await expect(audio.getByRole("group", { name: "文案创作方式" })).toHaveCount(
  41  |     0,
  42  |   );
  43  |   await expect(audio).toContainText("本地演示");
  44  | });
  45  | 
  46  | test("Agent controls match the live fixture channel, with error feedback and no fallback", async ({
  47  |   page,
  48  | }, info) => {
  49  |   const server = await startAgentServer();
  50  |   try {
  51  |     await openWorkspace(page);
  52  |     const panel = page.locator(".conversation-panel");
  53  |     await panel
  54  |       .getByRole("button", { name: "本地 Agent", exact: true })
  55  |       .click();
  56  |     await panel.getByRole("button", { name: "连接设置", exact: true }).click();
  57  |     await page.getByLabel("Agent 地址").fill(server.url);
  58  |     await page.getByLabel("连接 Token", { exact: true }).fill("fixture-token");
  59  |     await expect(
  60  |       page.getByLabel("连接 Token", { exact: true }),
  61  |     ).toHaveAttribute("type", "password");
  62  |     await page.getByRole("button", { name: "连接 Agent", exact: true }).click();
  63  |     await expect(
  64  |       page.getByRole("button", { name: "已连接", exact: true }),
  65  |     ).toBeVisible();
  66  |     await expect
  67  |       .poll(() =>
  68  |         page.evaluate(() => localStorage.getItem("canvas-agent-token")),
  69  |       )
  70  |       .toBeNull();
  71  |     await page.keyboard.press("Escape");
  72  |     for (const width of [390, 768, 1920]) {
  73  |       await page.setViewportSize({ width, height: 900 });
  74  |       if (!(await panel.isVisible()))
  75  |         await page
  76  |           .getByRole("button", { name: "打开对话", exact: true })
  77  |           .click();
  78  |       await expect(panel.getByLabel("Agent 指令")).toBeVisible();
  79  |       expect(
  80  |         await panel.evaluate((el) => el.scrollWidth - el.clientWidth),
  81  |       ).toBeLessThanOrEqual(1);
  82  |       const box = (await panel
  83  |         .getByRole("button", { name: "发送给 Agent" })
  84  |         .boundingBox())!;
  85  |       expect(box.x).toBeGreaterThanOrEqual(0);
> 86  |       expect(box.x + box.width).toBeLessThanOrEqual(width);
      |                                 ^ Error: expect(received).toBeLessThanOrEqual(expected)
  87  |       expect(box.y + box.height).toBeLessThanOrEqual(900);
  88  |       await page.screenshot({
  89  |         path: info.outputPath(`agent-${width}.png`),
  90  |         animations: "disabled",
  91  |       });
  92  |     }
  93  |     await panel
  94  |       .getByLabel("Agent 权限", { exact: true })
  95  |       .selectOption("request");
  96  |     await panel.getByLabel("Agent 指令").fill("读取画布");
  97  |     await panel.getByRole("button", { name: "发送给 Agent" }).click();
  98  |     await expect.poll(() => server.turns.length).toBe(1);
  99  |     expect(server.turns[0]).toMatchObject({
  100 |       messageText: "读取画布",
  101 |       permissionMode: "request",
  102 |       attachments: [],
  103 |     });
  104 |     expect(server.turns[0].model).toBeUndefined();
  105 |     expect(server.authentication.length).toBeGreaterThan(3);
  106 |     expect(
  107 |       server.authentication.every(
  108 |         (value) => !value.urlToken && value.headerPresent,
  109 |       ),
  110 |     ).toBe(true);
  111 |     await expect(
  112 |       panel.getByRole("button", { name: "Agent 执行中…" }),
  113 |     ).toBeDisabled();
  114 |     await expect(panel.getByLabel("Agent 指令")).toHaveValue("");
  115 |     server.failActions(true);
  116 |     await panel.getByRole("button", { name: "停止", exact: true }).click();
  117 |     await expect(panel.getByRole("alert")).toContainText("受控服务暂时不可用");
  118 |     server.emit("codex_approval", {
  119 |       requestId: "r1",
  120 |       method: "local_shell_execute",
  121 |       command: "echo test",
  122 |       reason: "审批演示",
  123 |     });
  124 |     await panel.getByRole("button", { name: "允许", exact: true }).click();
  125 |     await expect(
  126 |       panel.getByRole("group", { name: "确认 Agent 权限请求" }),
  127 |     ).toBeVisible();
  128 |     server.failActions(false);
  129 |     await panel.getByRole("button", { name: "拒绝", exact: true }).click();
  130 |     await expect
  131 |       .poll(() => server.decisions.some((d) => d.decision === "decline"))
  132 |       .toBe(true);
  133 |     await expect(
  134 |       panel.getByRole("group", { name: "确认 Agent 权限请求" }),
  135 |     ).toHaveCount(0);
  136 |     await page.screenshot({
  137 |       path: info.outputPath("agent-running.png"),
  138 |       animations: "disabled",
  139 |     });
  140 |     server.disconnect();
  141 |     await expect(panel.getByRole("alert")).toContainText("核对任务结果");
  142 |     await expect(
  143 |       panel.getByRole("button", { name: "本地 Agent", exact: true }),
  144 |     ).toHaveAttribute("aria-pressed", "true");
  145 |     await expect(panel.getByLabel("添加对话素材")).toBeHidden();
  146 |   } finally {
  147 |     await server.close();
  148 |   }
  149 | });
  150 | 
  151 | for (const width of [390, 768, 1920]) {
  152 |   test(`prompt library handles themes, long text, errors and focus at ${width}`, async ({
  153 |     page,
  154 |   }, info) => {
  155 |     await page.setViewportSize({ width, height: 900 });
  156 |     let fail = false;
  157 |     let delayed = false;
  158 |     await page.route("https://raw.githubusercontent.com/**", async (route) => {
  159 |       if (delayed) await new Promise((resolve) => setTimeout(resolve, 400));
  160 |       if (fail) await route.fulfill({ status: 503, body: "offline" });
  161 |       else
  162 |         await route.fulfill({
  163 |           json: Array.from({ length: 15 }, (_, i) => ({
  164 |             id: String(i),
  165 |             title: `产品 ${i} ${"W".repeat(80)}`,
  166 |             prompt: i === 0 ? "长".repeat(4100) : "产品光影",
  167 |             tags: ["产品"],
  168 |           })),
  169 |         });
  170 |     });
  171 |     await page.goto("/");
  172 |     const opener = page.getByRole("button", { name: "提示词库", exact: true });
  173 |     await opener.click();
  174 |     const dialog = page.getByRole("dialog", { name: "提示词库" });
  175 |     await dialog.getByRole("button", { name: "加载来源" }).click();
  176 |     await expect(dialog.getByRole("status")).toContainText("15 条");
  177 |     await dialog.locator(".prompt-library-item").first().click();
  178 |     for (const theme of ["dark", "light"]) {
  179 |       for (const accent of ACCENTS) {
  180 |         await page.locator("html").evaluate(
  181 |           (el, value) => {
  182 |             el.setAttribute("data-theme", value.theme);
  183 |             el.setAttribute("data-accent", value.accent);
  184 |           },
  185 |           { theme, accent },
  186 |         );
```