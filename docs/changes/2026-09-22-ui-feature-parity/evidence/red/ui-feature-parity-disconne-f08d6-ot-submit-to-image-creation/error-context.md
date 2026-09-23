# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui-feature-parity.spec.ts >> disconnected Agent has its own draft and cannot submit to image creation
- Location: tests\browser\ui-feature-parity.spec.ts:31:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('.conversation-panel').getByRole('button', { name: '本地 Agent', exact: true })

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
    - generic [ref=e15]: 前端预览
  - generic [ref=e16]:
    - complementary "工作台侧栏" [ref=e17]:
      - generic [ref=e18]:
        - strong [ref=e20]: KK Studio
        - button "搜索" [ref=e21] [cursor=pointer]
        - button "收起侧边栏" [expanded] [ref=e23] [cursor=pointer]
      - navigation "主导航" [ref=e25]:
        - button "开始创作" [ref=e26] [cursor=pointer]
        - button "项目库" [ref=e29] [cursor=pointer]
        - button "Skill" [ref=e32] [cursor=pointer]
        - button "ComfyUI 工作流" [ref=e35] [cursor=pointer]
      - generic [ref=e38]:
        - generic [ref=e39]:
          - button "项目" [expanded] [ref=e40] [cursor=pointer]
          - generic [ref=e41]:
            - button "项目显示与排序" [ref=e42] [cursor=pointer]
            - button "创建项目文件夹" [ref=e43] [cursor=pointer]
        - generic [ref=e44]:
          - generic [ref=e45]:
            - button "KK项目" [ref=e46] [cursor=pointer]
            - button "打开 KK项目 工作台" [ref=e49] [cursor=pointer]
            - button "添加创作页面" [disabled] [ref=e50]
          - generic [ref=e52]:
            - button "KK工作流" [ref=e53] [cursor=pointer]
            - button "置顶项目" [ref=e56] [cursor=pointer]
            - button "更多项目设置" [ref=e57] [cursor=pointer]
        - generic [ref=e58]:
          - generic [ref=e59]:
            - button "未分组" [expanded] [ref=e60] [cursor=pointer]
            - generic [ref=e61]:
              - button "打开未分组项目库" [ref=e62] [cursor=pointer]
              - button "创建创作页" [disabled] [ref=e63]
          - generic [ref=e64]:
            - button "KK工作流" [ref=e65] [cursor=pointer]
            - button "置顶项目" [ref=e68] [cursor=pointer]
            - button "更多项目设置" [ref=e69] [cursor=pointer]
      - generic [ref=e70]:
        - button "个人信息" [ref=e71] [cursor=pointer]:
          - generic "本地前端预览，尚未连接真实账号" [ref=e73]: Prototype
        - button "打开设置" [ref=e74] [cursor=pointer]
    - main [ref=e76]:
      - generic [ref=e77]:
        - generic [ref=e78]:
          - strong [ref=e79]: 未命名项目
          - generic [ref=e80]: 已保存
        - region "无限画布" [ref=e81]:
          - generic:
            - group "图片创建卡片，点击或按回车选择，拖动可移动，方向键可微调":
              - generic:
                - button "上传图片" [ref=e82] [cursor=pointer]
                - generic [ref=e86]: 图片
              - button "从图片创建卡片添加下游" [ref=e93] [cursor=pointer]
            - group "视频卡片 1，点击或按回车选择，拖动可移动，方向键可微调" [ref=e94]:
              - generic [ref=e95]: 视频
              - button "从视频卡片 1添加下游" [ref=e99] [cursor=pointer]
            - group "视频卡片 2，点击或按回车选择，拖动可移动，方向键可微调" [ref=e100]:
              - generic [ref=e101]: 视频
              - button "从视频卡片 2添加下游" [ref=e105] [cursor=pointer]
            - generic:
              - generic:
                - img:
                  - button "连接 图片创建卡片 → 视频卡片 1" [ref=e106] [cursor=pointer]
                - button "删除连线 图片创建卡片 → 视频卡片 1":
                  - generic: 剪开连线
              - generic:
                - img:
                  - button "连接 图片创建卡片 → 视频卡片 2" [ref=e107] [cursor=pointer]
                - button "删除连线 图片创建卡片 → 视频卡片 2":
                  - generic: 剪开连线
          - paragraph [ref=e108]: 左键拖动空白处框选，中键或右键拖动画布；拖动卡片可移动，卡片聚焦后可用方向键微调。
          - generic:
            - button "打开任务列表" [ref=e111] [cursor=pointer]:
              - generic [ref=e112]: 任务列表
            - group "画布导航" [ref=e114]:
              - button "画布缩放" [ref=e115] [cursor=pointer]:
                - generic [ref=e116]: 100%
              - generic [ref=e117]:
                - button "整理画布" [ref=e118] [cursor=pointer]:
                  - generic [ref=e119]: 整理
                - button "切换为网格背景" [ref=e121] [cursor=pointer]
                - textbox "画布背景颜色": "#0a0a0a"
                - button "显示连线" [pressed] [ref=e122] [cursor=pointer]
                - button "小地图" [ref=e123] [cursor=pointer]
          - toolbar "画布工具" [ref=e125]:
            - button "添加资源" [ref=e126] [cursor=pointer]
            - button "当前工具：选择" [ref=e127] [cursor=pointer]
            - button "选择画布工具" [ref=e128] [cursor=pointer]
            - button "资产管理" [ref=e129] [cursor=pointer]
            - button "打开喜欢与收藏" [ref=e130] [cursor=pointer]
            - button "帮助与快捷键" [ref=e131] [cursor=pointer]
        - complementary [ref=e132]:
          - generic [ref=e133]:
            - strong [ref=e134]: 未命名项目
            - button "对话记录" [ref=e135] [cursor=pointer]
            - button "收起对话" [ref=e136] [cursor=pointer]
          - generic [ref=e138]:
            - heading "从一个想法开始" [level=3] [ref=e140]
            - paragraph [ref=e141]: 描述你的创意，将灵感连接到画布。
          - generic [ref=e142]:
            - textbox "对话内容" [active] [ref=e143]:
              - /placeholder: 描述你想要生成的内容
              - text: 图片草稿
            - generic [ref=e145]:
              - button "添加对话素材" [ref=e146] [cursor=pointer]
              - button "模型" [ref=e148] [cursor=pointer]:
                - generic [ref=e149]: kk-image-2
              - button "Skill" [ref=e151] [cursor=pointer]
              - button "插件" [ref=e153] [cursor=pointer]
              - button "AI权限模式" [ref=e155] [cursor=pointer]: 自动
              - button "开启语音输入" [ref=e156] [cursor=pointer]
              - button "发送消息" [ref=e157] [cursor=pointer]
          - generic [ref=e158]: 请确保授权，合法使用
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
  8  |   await expect(menu).toContainText("已启用 4 个画布插件");
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
> 35 |   await panel.getByRole("button", { name: "本地 Agent", exact: true }).click();
     |                                                                      ^ Error: locator.click: Test timeout of 30000ms exceeded.
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