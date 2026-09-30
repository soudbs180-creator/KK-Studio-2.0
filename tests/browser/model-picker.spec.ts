import { test, expect } from "@playwright/test";
import { openSeededProject } from "./helpers";
const pixel =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
test("模型前缀分组、参数选择和模糊搜索保留实际厂商 ID", async ({
  page,
}, info) => {
  const sent: Record<string, unknown>[] = [];
  await page.route("https://variants.example/v1/models", (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: "aurora-1-2k-low",
            capabilities: { modalities: ["image"], sizes: ["1920x1080"] },
          },
          {
            id: "aurora-1-2k-high",
            capabilities: { modalities: ["image"], sizes: ["1920x1080"] },
          },
          {
            id: "aurora-1-4k-high",
            capabilities: { modalities: ["image"], sizes: ["3840x2160"] },
          },
        ],
      },
    }),
  );
  await page.route(
    "https://variants.example/v1/images/generations",
    (route) => {
      sent.push(route.request().postDataJSON());
      return route.fulfill({ json: { data: [{ b64_json: pixel }] } });
    },
  );
  await openSeededProject(page);
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page.getByRole("button", { name: "模型接入", exact: true }).click();
  await page.getByLabel("供应商名称", { exact: true }).fill("星河 API");
  await page.getByLabel("API Base URL").fill("https://variants.example/v1");
  await page.getByLabel("API Key").fill("fixture-key");
  await page.getByLabel("默认模型").fill("aurora-1-2k-low");
  await page.getByRole("button", { name: "保存供应商", exact: true }).click();
  await page.getByRole("button", { name: "刷新模型列表", exact: true }).click();
  await expect(page.getByLabel("已发现的模型")).toContainText(
    "aurora-1-4k-high",
  );
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page.getByRole("button", { name: "模型", exact: true }).click();
  const menu = page.getByRole("menu", { name: "选择模型" });
  const search = menu.getByRole("searchbox", { name: "搜索模型、厂商或参数" });
  await search.fill("auorra");
  await expect(
    menu.getByRole("menuitemradio", { name: /aurora-1/ }),
  ).toHaveCount(1);
  await expect(menu).toContainText("可能匹配");
  await search.fill("8k");
  await expect(menu.getByRole("menuitemradio")).toHaveCount(0);
  await search.fill("9:16");
  await expect(menu.getByRole("menuitemradio")).toHaveCount(0);
  await search.fill("星河 ４Ｋ １６：９");
  await menu.getByRole("menuitemradio", { name: /aurora-1/ }).click();
  await expect(
    page.getByRole("button", { name: "模型", exact: true }),
  ).toHaveText("aurora-1");
  const panel = page.locator(".conversation-panel");
  await expect(panel.getByLabel("型号参数")).toHaveValue("aurora-1-4k-high");
  await panel.getByLabel("型号参数").selectOption("aurora-1-2k-high");
  // Variants, references and a growing prompt must share the same flow.
  const composer = panel.locator(".chat-composer");
  await composer.locator('input[type="file"]').setInputFiles(
    Array.from({ length: 4 }, (_, i) => ({
      name: `型号参考-${i}.png`,
      mimeType: "image/png",
      buffer: Buffer.from(pixel, "base64"),
    })),
  );
  await expect(composer.locator(".start-attachment-chip")).toHaveCount(4);
  for (const [width, height] of [
    [390, 844],
    [834, 1112],
    [1440, 900],
    [1440, 480],
  ]) {
    await page.setViewportSize({ width, height });
    if (
      await page
        .getByRole("button", { name: "打开对话", exact: true })
        .isVisible()
    )
      await page.getByRole("button", { name: "打开对话", exact: true }).click();
    await panel
      .getByLabel("对话内容", { exact: true })
      .fill("输入内容与型号参数分别排列\n".repeat(5));
    const attachments = (await composer
      .locator(".start-attachment-row")
      .boundingBox())!;
    const variants = (await composer
      .locator(".kk-model-variants")
      .boundingBox())!;
    const actions = (await composer
      .locator(".composer-toolbar")
      .boundingBox())!;
    expect(variants.y).toBeGreaterThanOrEqual(
      attachments.y + attachments.height + 7,
    );
    expect(actions.y).toBeGreaterThanOrEqual(variants.y + variants.height + 7);
    await panel.getByLabel("型号参数").selectOption("aurora-1-4k-high");
    await expect(panel.getByLabel("型号参数")).toHaveValue("aurora-1-4k-high");
    const send = composer.getByRole("button", {
      name: "发送消息",
      exact: true,
    });
    await send.scrollIntoViewIfNeeded();
    expect(
      await send.evaluate((el) => {
        const box = el.getBoundingClientRect();
        return el.contains(
          document.elementFromPoint(
            box.x + box.width / 2,
            box.y + box.height / 2,
          ),
        );
      }),
    ).toBe(true);
    await page.screenshot({
      path: `docs/changes/2026-09-23-input-contract/evidence/${width}-${height}-variants.png`,
    });
  }
  while (await composer.locator(".start-attachment-chip button").count())
    await composer.locator(".start-attachment-chip button").first().click();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await panel.getByLabel("型号参数").selectOption("aurora-1-2k-high");
  await panel.getByLabel("对话内容").fill("蓝色产品图");
  await panel.getByRole("button", { name: "发送消息", exact: true }).click();
  await page.getByRole("button", { name: "批准并提交", exact: true }).click();
  await expect.poll(() => sent.length).toBe(1);
  expect(sent[0].model).toBe("aurora-1-2k-high");
  expect(sent[0].quality).toBeUndefined();
  const source = page.getByTestId("canvas-node-image");
  await source.focus();
  await source.press("Enter");
  await source.getByTitle("使用当前模型声明支持的尺寸").click();
  const params = source.getByLabel("图片参数选项");
  await params
    .getByRole("button", { name: "1920x1080 · 16:9", exact: true })
    .click();
  await params.getByLabel("型号参数").selectOption("aurora-1-4k-high");
  await expect(
    params.getByRole("button", { name: "自适应", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    params.getByRole("button", { name: "3840x2160 · 16:9", exact: true }),
  ).toBeVisible();
  await expect(
    params.getByRole("button", { name: "1920x1080 · 16:9", exact: true }),
  ).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("model-variants-search.png") });
});
test("分级菜单保留页面、返回、全部和置顶；同名模型使用明确选择的 API 账号", async ({
  page,
}) => {
  const sent: string[] = [];
  await page.route("https://*.example/v1/models", (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: "image-same",
            capabilities: {
              modalities: ["image"],
              sizes: ["1024x1024", "1536x1024"],
            },
          },
          { id: "brand-new-model" },
        ],
      },
    }),
  );
  await page.route("https://*.example/v1/images/generations", (route) => {
    sent.push(route.request().url());
    expect(route.request().headers().authorization).toBe("Bearer fixture-B");
    return route.fulfill({ json: { data: [{ b64_json: pixel }] } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "模型", exact: true }).click();
  await page
    .getByRole("menu")
    .getByRole("button", { name: /配置供应商/ })
    .click();
  for (const name of ["A", "B"]) {
    await page.getByLabel("供应商名称", { exact: true }).fill(name);
    await page
      .getByLabel("API Base URL")
      .fill(`https://${name.toLowerCase()}.example/v1`);
    await page.getByLabel("API Key").fill("fixture-" + name);
    await page.getByLabel("默认模型").fill("image-same");
    await page.getByRole("button", { name: "保存供应商", exact: true }).click();
    await page
      .getByRole("button", { name: "刷新模型列表", exact: true })
      .click();
    await expect(page.getByLabel("已发现的模型")).toContainText(
      "brand-new-model",
    );
  }
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  const trigger = page.getByRole("button", { name: "模型", exact: true });
  await trigger.click();
  const menu = page.getByRole("menu", { name: "选择模型" });
  await expect(menu.getByRole("menuitem", { name: /豆包/ })).toBeDisabled();
  await expect(menu.getByRole("menuitemradio", { name: /默认/ })).toBeVisible();
  await menu.getByRole("menuitem", { name: /API 自定义模型/ }).click();
  await menu.getByRole("menuitem", { name: /B ›/ }).click();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(menu.locator(".kk-model-menu-head strong")).toHaveText("B");
  await expect(
    menu.getByRole("menuitemradio", { name: /brand-new-model/ }),
  ).toBeDisabled();
  await menu
    .getByRole("button", { name: "置顶 image-same", exact: true })
    .click();
  await expect(
    menu.getByRole("button", { name: "取消置顶 image-same", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await menu.getByRole("button", { name: "返回上一级" }).click();
  await expect(menu.locator(".kk-model-menu-head strong")).toHaveText(
    "API 供应商",
  );
  await menu.getByRole("button", { name: "切换全部模型" }).click();
  await expect(
    menu.getByRole("menuitemradio", { name: /image-same/ }),
  ).toHaveCount(2);
  await menu.getByRole("button", { name: "切换分级模型" }).click();
  await menu.getByRole("menuitem", { name: /B ›/ }).click();
  await menu.getByRole("menuitemradio", { name: /image-same/ }).click();
  await expect(page.getByLabel("执行方式")).toHaveValue("direct");
  await page.getByLabel("对话内容").fill("使用 B 账号生成蓝色产品图");
  await page.getByRole("button", { name: "发送消息", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "人工审批任务" }),
  ).toContainText("https://b.example/v1");
  await page.getByRole("button", { name: "批准并提交", exact: true }).click();
  await expect(
    page.locator('.demo-result-node[data-source="provider"]'),
  ).toHaveCount(1);
  expect(sent).toEqual(["https://b.example/v1/images/generations"]);
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page.getByRole("menuitem", { name: "图片", exact: true }).click();
  await page
    .locator("[data-testid^='canvas-node-added-image-']")
    .click({ position: { x: 250, y: 180 } });
  await page.getByTitle("使用当前模型声明支持的尺寸").click();
  const parameters = page.getByLabel("图片参数选项");
  await expect(
    parameters.getByRole("button", { name: "1536x1024 · 3:2", exact: true }),
  ).toBeVisible();
  await expect(
    parameters.getByRole("button", { name: "4K", exact: true }),
  ).toHaveCount(0);
  await parameters
    .getByRole("button", { name: "1536x1024 · 3:2", exact: true })
    .click();
  await page.screenshot({
    path: "docs/changes/2026-09-22-codex-default-agent/model-parameters.png",
  });
});
