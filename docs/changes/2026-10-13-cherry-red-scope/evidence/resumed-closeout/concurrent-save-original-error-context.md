# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: desktop-data-stability.spec.ts >> 两个窗口并发保存时保留先提交的原件和冲突草稿
- Location: tests\browser\desktop-data-stability.spec.ts:435:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "first window saved"
Received: "initial"

Call Log:
- Timeout 5000ms exceeded while waiting on the predicate
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
    - generic [ref=e15]: 浏览器版
  - generic [ref=e16]:
    - complementary "工作台侧栏" [ref=e17]:
      - generic [ref=e18]:
        - button "搜索" [ref=e19] [cursor=pointer]
        - button "展开侧边栏" [ref=e21] [cursor=pointer]
      - navigation "主导航" [ref=e23]:
        - button "开始创作" [ref=e24] [cursor=pointer]
        - button "项目库" [ref=e27] [cursor=pointer]
        - button "扩展" [ref=e30] [cursor=pointer]
        - button "ComfyUI 工作流" [ref=e33] [cursor=pointer]
      - generic:
        - button "个人信息" [ref=e36] [cursor=pointer]
        - button "打开设置" [ref=e38] [cursor=pointer]
    - main [ref=e40]:
      - region "开始创作" [ref=e41]:
        - generic [ref=e42]:
          - generic [ref=e43]:
            - heading "KK Studio" [level=1] [ref=e44]
            - paragraph [ref=e45]: 属于你的多模态 Agent 团队
          - generic [ref=e46]:
            - textbox "创作提示词" [active] [ref=e47]:
              - /placeholder: 描述你想要生成的内容
              - text: first window saved
            - generic [ref=e48]:
              - generic [ref=e49]:
                - button "添加参考素材" [ref=e50] [cursor=pointer]
                - button "模型" [ref=e52] [cursor=pointer]:
                  - generic [ref=e53]: 选模型
                - button "扩展" [ref=e56] [cursor=pointer]
              - generic [ref=e59]:
                - button "开启语音输入" [ref=e60] [cursor=pointer]
                - button "当前模式：自动" [ref=e63] [cursor=pointer]: 自动
                - button "开始创建项目" [disabled] [ref=e64]
          - status [ref=e65]:
            - text: 请先在设置中配置模型服务。
            - button "前往模型设置" [ref=e66] [cursor=pointer]
        - generic [ref=e67]:
          - tablist "开始创作内容" [ref=e68]:
            - tab "创作灵感" [selected] [ref=e69] [cursor=pointer]
            - tab "技能" [ref=e70] [cursor=pointer]
          - tabpanel "创作灵感" [ref=e71]:
            - generic "灵感分类" [ref=e72]:
              - button "H3 精选" [pressed] [ref=e73] [cursor=pointer]
              - button "特效包装" [ref=e74] [cursor=pointer]
              - button "品牌广告" [ref=e75] [cursor=pointer]
              - button "影视片头" [ref=e76] [cursor=pointer]
              - button "MV" [ref=e77] [cursor=pointer]
              - button "二次元 PV" [ref=e78] [cursor=pointer]
            - region "H3 精选灵感" [ref=e79]:
              - button "H3 精选 蓝调时刻 · 城市短片 用一张参考图规划镜头、节奏和配乐，适合快速验证画面方向。" [ref=e80] [cursor=pointer]:
                - generic [ref=e81]:
                  - generic [ref=e82]: H3 精选
                  - strong [ref=e83]: 蓝调时刻 · 城市短片
                  - paragraph [ref=e84]: 用一张参考图规划镜头、节奏和配乐，适合快速验证画面方向。
              - button "品牌广告 产品故事板 把产品卖点拆成可编辑的画面节点，再交给模型继续完善。" [ref=e85] [cursor=pointer]:
                - generic [ref=e86]:
                  - generic [ref=e87]: 品牌广告
                  - strong [ref=e88]: 产品故事板
                  - paragraph [ref=e89]: 把产品卖点拆成可编辑的画面节点，再交给模型继续完善。
              - button "音乐 MV 音乐 MV 分镜 从一句歌词开始，生成镜头草稿与视觉参考，保持创作方向可控。" [ref=e90] [cursor=pointer]:
                - generic [ref=e91]:
                  - generic [ref=e92]: 音乐 MV
                  - strong [ref=e93]: 音乐 MV 分镜
                  - paragraph [ref=e94]: 从一句歌词开始，生成镜头草稿与视觉参考，保持创作方向可控。
```

# Test source

```ts
  362 |             },
  363 |             {
  364 |               id: "video1",
  365 |               kind: "video",
  366 |               title: "视频卡片 1",
  367 |               description: "",
  368 |             },
  369 |           ],
  370 |         })),
  371 |       }),
  372 |     );
  373 |   });
  374 |   await page.goto("/");
  375 |   await page.getByRole("button", { name: "项目库", exact: true }).click();
  376 |   await page
  377 |     .locator(".project-library-card")
  378 |     .filter({ hasText: "项目 A" })
  379 |     .click();
  380 |   const node = page.locator('[data-node-id="image"]');
  381 |   await node.focus();
  382 |   await node.press("ArrowRight");
  383 |   const edge = page.getByRole("button", {
  384 |     name: "连接 图片创建卡片 → 视频卡片 1",
  385 |     exact: true,
  386 |   });
  387 |   await edge.focus();
  388 |   await edge.press("Delete");
  389 |   await expect(edge).toHaveCount(0);
  390 |   const canvas = page.getByTestId("infinite-canvas");
  391 |   await canvas.focus();
  392 |   await canvas.press("Control+-");
  393 |   await expect(page.locator(".project-save-state")).toContainText("已保存");
  394 |   const a = (await stored(page)).projects.find(
  395 |     (project: { id: string }) => project.id === "A",
  396 |   ).canvas;
  397 |   expect(a.positions.image.x).toBe(90);
  398 |   expect(a.edges).toEqual([]);
  399 |   expect(a.viewport.scale).toBeLessThan(1);
  400 |   await page.getByRole("button", { name: "项目库", exact: true }).click();
  401 |   await page
  402 |     .locator(".project-library-card")
  403 |     .filter({ hasText: "项目 B" })
  404 |     .click();
  405 |   await expect(node).toHaveCSS("left", "82px");
  406 |   await expect(edge).toHaveCount(1);
  407 |   await node.focus();
  408 |   await node.press("ArrowDown");
  409 |   await expect(page.locator(".project-save-state")).toContainText("已保存");
  410 |   await page.reload();
  411 |   await page.getByRole("button", { name: "项目库", exact: true }).click();
  412 |   await page
  413 |     .locator(".project-library-card")
  414 |     .filter({ hasText: "项目 A" })
  415 |     .click();
  416 |   await expect(node).toHaveCSS("left", "90px");
  417 |   await expect(edge).toHaveCount(0);
  418 |   const transform = await page
  419 |     .getByTestId("canvas-stage")
  420 |     .evaluate((element) => {
  421 |       const matrix = new DOMMatrix(getComputedStyle(element).transform);
  422 |       return { scale: matrix.a, x: matrix.e, y: matrix.f };
  423 |     });
  424 |   expect(transform.scale).toBeCloseTo(a.viewport.scale, 5);
  425 |   expect(transform.x).toBeCloseTo(a.viewport.x, 3);
  426 |   expect(transform.y).toBeCloseTo(a.viewport.y, 3);
  427 |   const b = (await stored(page)).projects.find(
  428 |     (project: { id: string }) => project.id === "B",
  429 |   ).canvas;
  430 |   expect(b.positions.image).toEqual({ x: 82, y: 115 });
  431 |   expect(b.edges).toHaveLength(1);
  432 |   expect(b.viewport.scale).toBe(1);
  433 | });
  434 | 
  435 | test("两个窗口并发保存时保留先提交的原件和冲突草稿", async ({
  436 |   page,
  437 |   context,
  438 | }) => {
  439 |   await page.goto("/");
  440 |   await page.getByLabel("创作提示词").fill("initial");
  441 |   await expect
  442 |     .poll(() =>
  443 |       page.evaluate(
  444 |         () =>
  445 |           JSON.parse(localStorage.getItem("kk-studio-next:creation:v1") ?? "{}")
  446 |             .homeDraft?.prompt,
  447 |       ),
  448 |     )
  449 |     .toBe("initial");
  450 |   const second = await context.newPage();
  451 |   await second.goto("/");
  452 |   await expect(second.getByLabel("创作提示词")).toHaveValue("initial");
  453 |   await page.getByLabel("创作提示词").fill("first window saved");
  454 |   await expect
  455 |     .poll(() =>
  456 |       page.evaluate(
  457 |         () =>
  458 |           JSON.parse(localStorage.getItem("kk-studio-next:creation:v1") ?? "{}")
  459 |             .homeDraft?.prompt,
  460 |       ),
  461 |     )
> 462 |     .toBe("first window saved");
      |      ^ Error: expect(received).toBe(expected) // Object.is equality
  463 |   await second.getByLabel("创作提示词").fill("second window unsaved");
  464 |   await expect(second.getByRole("alert")).toContainText(/其他窗口|另一窗口/);
  465 |   expect(
  466 |     await page.evaluate(
  467 |       () =>
  468 |         JSON.parse(localStorage.getItem("kk-studio-next:creation:v1")!)
  469 |           .homeDraft.prompt,
  470 |     ),
  471 |   ).toBe("first window saved");
  472 |   const download = second.waitForEvent("download");
  473 |   await second.getByRole("button", { name: "下载未保存草稿" }).click();
  474 |   const downloaded = JSON.parse(
  475 |     await readFile((await (await download).path())!, "utf8"),
  476 |   );
  477 |   expect(downloaded.homeDraft.prompt).toBe("second window unsaved");
  478 |   await second.getByRole("button", { name: "重新读取", exact: true }).click();
  479 |   await expect(second.getByLabel("创作提示词")).toHaveValue(
  480 |     "first window saved",
  481 |   );
  482 | });
  483 | 
  484 | test("画布参数不会在重开项目后回到默认值", async ({ page }) => {
  485 |   await page.goto("/");
  486 |   await page.getByRole("button", { name: "打开设置", exact: true }).click();
  487 |   await page.getByRole("button", { name: "模型接入", exact: true }).click();
  488 |   await page
  489 |     .getByRole("button", { name: "API Key（官方）", exact: true })
  490 |     .click();
  491 |   await page.getByLabel("接口地址").fill("https://models.example.test/v1");
  492 |   await page.getByLabel("模型名称").fill("image-test");
  493 |   await page.getByRole("button", { name: "保存", exact: true }).click();
  494 |   await page.getByLabel("当前模型用途").selectOption("image");
  495 |   await page.getByLabel("支持的图片尺寸").fill("1024x1024, 1536x1024");
  496 |   await page
  497 |     .getByRole("button", { name: "保存此模型能力", exact: true })
  498 |     .click();
  499 |   await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  500 |   await page.getByRole("button", { name: "项目库", exact: true }).click();
  501 |   await page.getByRole("button", { name: "新建项目", exact: true }).click();
  502 |   await expect(page.locator(".canvas-node")).toHaveCount(0);
  503 |   await page.getByRole("button", { name: "添加资源", exact: true }).click();
  504 |   await page.getByRole("menuitem", { name: "图片", exact: true }).click();
  505 |   const node = page.locator("[data-testid^='canvas-node-added-image-']");
  506 |   await node.focus();
  507 |   await node.press("Enter");
  508 |   await node.getByTitle("使用当前模型声明支持的尺寸").click();
  509 |   await node
  510 |     .getByRole("button", { name: "1536x1024 · 3:2", exact: true })
  511 |     .click();
  512 |   await node.press("Escape");
  513 |   await expect(page.locator(".project-save-state")).toContainText("已保存");
  514 |   await page.reload();
  515 |   await page.getByRole("button", { name: "项目库", exact: true }).click();
  516 |   await page
  517 |     .locator(".project-library-card")
  518 |     .filter({ hasText: "未命名项目" })
  519 |     .click();
  520 |   await node.focus();
  521 |   await node.press("Enter");
  522 |   await expect(
  523 |     node.getByRole("button", { name: "1536x1024 · 3:2" }),
  524 |   ).toBeVisible();
  525 | });
  526 | 
  527 | test("画布位置与新增身份在保存重开后保持", async ({ page }) => {
  528 |   await page.goto("/");
  529 |   await page.getByRole("button", { name: "项目库", exact: true }).click();
  530 |   await page.getByRole("button", { name: "新建项目", exact: true }).click();
  531 |   await expect(page.locator(".canvas-node")).toHaveCount(0);
  532 |   await page.getByRole("button", { name: "添加资源", exact: true }).click();
  533 |   await page.getByRole("menuitem", { name: "图片", exact: true }).click();
  534 |   const node = page
  535 |     .locator("[data-testid^='canvas-node-added-image-']")
  536 |     .first();
  537 |   const initialLeft = parseFloat(
  538 |     await node.evaluate((element) => getComputedStyle(element).left),
  539 |   );
  540 |   await node.focus();
  541 |   for (let index = 0; index < 8; index++) await node.press("ArrowRight");
  542 |   await expect(node).toHaveCSS("left", `${initialLeft + 64}px`);
  543 |   await page.getByRole("button", { name: "添加资源", exact: true }).click();
  544 |   await page.getByRole("menuitem", { name: "图片", exact: true }).click();
  545 |   await expect(page.locator(".project-save-state")).toContainText("已保存");
  546 |   await page.reload();
  547 |   await page.getByRole("button", { name: "项目库", exact: true }).click();
  548 |   await page
  549 |     .locator(".project-library-card")
  550 |     .filter({ hasText: "未命名项目" })
  551 |     .click();
  552 |   await expect(node).toHaveCSS("left", `${initialLeft + 64}px`);
  553 |   await page.getByRole("button", { name: "添加资源", exact: true }).click();
  554 |   await page.getByRole("menuitem", { name: "图片", exact: true }).click();
  555 |   const ids = await page
  556 |     .locator("[data-node-id]")
  557 |     .evaluateAll((nodes) =>
  558 |       nodes.map((node) => node.getAttribute("data-node-id")),
  559 |     );
  560 |   expect(new Set(ids).size).toBe(ids.length);
  561 | });
  562 | 
```