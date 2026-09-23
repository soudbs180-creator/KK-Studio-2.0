# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui-feature-parity.spec.ts >> prompt library searches, previews and appends text without submitting
- Location: tests\browser\ui-feature-parity.spec.ts:13:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: '提示词库', exact: true })

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
      - region "开始创作" [ref=e77]:
        - generic [ref=e78]:
          - generic [ref=e79]:
            - heading "KK Studio" [level=1] [ref=e80]
            - paragraph [ref=e81]: 属于你的多模态 Agent 团队
          - generic [ref=e82]:
            - textbox "创作提示词" [active] [ref=e83]:
              - /placeholder: 描述你要生成的内容，或查看创作指南
              - text: 现有草稿
            - generic [ref=e84]:
              - generic [ref=e85]:
                - button "添加参考素材" [ref=e86] [cursor=pointer]
                - button "模型" [ref=e88] [cursor=pointer]:
                  - generic [ref=e89]: kk-image-2
                - generic [ref=e90]:
                  - generic [ref=e91]: 批量
                  - combobox "生成数量" [ref=e92] [cursor=pointer]:
                    - option "1 张" [selected]
                    - option "4 张"
                    - option "8 张"
                    - option "16 张"
                    - option "32 张"
                - generic [ref=e93]:
                  - generic [ref=e94]: 数据
                  - combobox "隐私模式" [ref=e95] [cursor=pointer]:
                    - option "BYOK 本地" [selected]
                    - option "仅本地"
                    - option "平台额度（Prototype）"
                - button "Skill" [ref=e97] [cursor=pointer]
                - button "插件" [ref=e100] [cursor=pointer]
              - generic [ref=e102]:
                - button "开启语音输入" [ref=e103] [cursor=pointer]
                - button "当前模式：自动" [ref=e105] [cursor=pointer]: 自动
                - button "开始创建项目" [ref=e106] [cursor=pointer]
        - generic [ref=e107]:
          - tablist "开始创作内容" [ref=e108]:
            - tab "创作灵感" [selected] [ref=e109] [cursor=pointer]
            - tab "Skill" [ref=e110] [cursor=pointer]
          - generic "灵感分类" [ref=e111]:
            - button "H3 精选" [pressed] [ref=e112] [cursor=pointer]
            - button "特效包装" [ref=e113] [cursor=pointer]
            - button "品牌广告" [ref=e114] [cursor=pointer]
            - button "影视片头" [ref=e115] [cursor=pointer]
            - button "MV" [ref=e116] [cursor=pointer]
            - button "二次元 PV" [ref=e117] [cursor=pointer]
          - generic [ref=e118]:
            - button "H3 精选 蓝调时刻 · 城市短片 用一张参考图规划镜头、节奏和配乐，适合快速验证画面方向。" [ref=e119] [cursor=pointer]:
              - generic [ref=e120]:
                - generic [ref=e121]: H3 精选
                - strong [ref=e122]: 蓝调时刻 · 城市短片
                - paragraph [ref=e123]: 用一张参考图规划镜头、节奏和配乐，适合快速验证画面方向。
            - button "品牌广告 产品故事板 把产品卖点拆成可编辑的画面节点，再交给模型继续完善。" [ref=e124] [cursor=pointer]:
              - generic [ref=e125]:
                - generic [ref=e126]: 品牌广告
                - strong [ref=e127]: 产品故事板
                - paragraph [ref=e128]: 把产品卖点拆成可编辑的画面节点，再交给模型继续完善。
            - button "音乐 MV 音乐 MV 分镜 从一句歌词开始，生成镜头草稿与视觉参考，保持创作方向可控。" [ref=e129] [cursor=pointer]:
              - generic [ref=e130]:
                - generic [ref=e131]: 音乐 MV
                - strong [ref=e132]: 音乐 MV 分镜
                - paragraph [ref=e133]: 从一句歌词开始，生成镜头草稿与视觉参考，保持创作方向可控。
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
> 20 |   await page.getByRole("button", { name: "提示词库", exact: true }).click();
     |                                                                 ^ Error: locator.click: Test timeout of 30000ms exceeded.
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