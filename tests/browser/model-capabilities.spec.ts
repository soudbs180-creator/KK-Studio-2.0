import { expect, test, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { waitForConversationPanelSettled } from "./helpers";

const api = "https://capabilities.example.test/v1";
const pixel =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

async function settings(page: Page) {
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page.getByRole("button", { name: "模型供应商", exact: true }).click();
}
async function configure(page: Page) {
  await page.goto("/");
  await settings(page);
  await page.getByLabel("提供商", { exact: true }).fill("Capability fixture");
  await page.getByLabel("接口地址").fill(api);
  await page.getByLabel("API Key").fill("fixture-key");
  await page.getByLabel("模型名称").fill("image-capability-a");
  await page.getByRole("button", { name: "保存", exact: true }).click();
}
async function node(page: Page) {
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await waitForConversationPanelSettled(page);
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page.getByRole("menuitem", { name: "图片", exact: true }).click();
  const item = page.getByTestId(/^canvas-node-added-image-/).first();
  await item.click();
  return item;
}

test("手动三态声明保存恢复并切模型，不把未知变成支持", async ({
  page,
}, info) => {
  await page.route(`${api}/models`, (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: "image-capability-a",
            capabilities: { modalities: ["image"], sizes: ["1024x1024"] },
          },
          { id: "image-capability-b", capabilities: { modalities: ["image"] } },
        ],
      },
    }),
  );
  await configure(page);
  await page.getByRole("button", { name: "刷新模型列表", exact: true }).click();
  await expect(page.getByLabel("已发现的模型")).toContainText(
    "image-capability-b",
  );
  await page
    .getByLabel("图片生成能力", { exact: true })
    .selectOption("supported");
  await page
    .getByLabel("参考图编辑能力", { exact: true })
    .selectOption("unsupported");
  await page.getByLabel("参考图数量上限", { exact: true }).fill("0");
  await page.getByLabel("单次任务生成数量上限", { exact: true }).fill("2");
  await page
    .getByRole("button", { name: "保存此模型能力", exact: true })
    .click();
  await expect(
    page.locator(".provider-model-catalog").getByRole("status"),
  ).toContainText("已保存此模型");
  for (const width of [390, 1099, 1920]) {
    await page.setViewportSize({ width, height: 1080 });
    await page
      .getByLabel("参考图编辑能力", { exact: true })
      .scrollIntoViewIfNeeded();
    await expect(
      page.getByLabel("参考图编辑能力", { exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`capabilities-settings-${width}.png`),
    });
    const runtime = await page.evaluate(() => {
      const control = document.querySelector<HTMLSelectElement>(
        '[aria-label="参考图编辑能力"]',
      )!;
      const style = getComputedStyle(control);
      const root = document.querySelector<HTMLElement>("[data-runtime-mode]")!;
      return {
        url: location.href,
        mode: root.dataset.runtimeMode,
        entry: root.dataset.runtimeEntry,
        scripts: [...document.scripts]
          .map((script) => script.src)
          .filter(Boolean),
        styles: [...document.styleSheets]
          .map((sheet) => sheet.href)
          .filter(Boolean),
        declaration: { edit: control.value },
        control: {
          fontSize: style.fontSize,
          height: style.height,
          color: style.color,
          background: style.backgroundColor,
        },
      };
    });
    expect(Number.parseFloat(runtime.control.fontSize)).toBeGreaterThanOrEqual(
      12,
    );
    await writeFile(
      info.outputPath(`capabilities-runtime-${width}.json`),
      JSON.stringify(runtime, null, 2) + "\n",
    );
  }
  await page.reload();
  await settings(page);
  await expect(page.getByLabel("参考图编辑能力", { exact: true })).toHaveValue(
    "unsupported",
  );
  await expect(page.getByLabel("参考图数量上限", { exact: true })).toHaveValue(
    "0",
  );
  await expect(
    page.getByLabel("单次任务生成数量上限", { exact: true }),
  ).toHaveValue("2");
  await page.getByLabel("已发现的模型").selectOption("image-capability-b");
  await expect(page.getByLabel("参考图编辑能力", { exact: true })).toHaveValue(
    "unknown",
  );
  await expect(page.getByLabel("参考图数量上限", { exact: true })).toHaveValue(
    "",
  );
  await page.getByLabel("已发现的模型").selectOption("image-capability-a");
  await expect(page.getByLabel("参考图编辑能力", { exact: true })).toHaveValue(
    "unsupported",
  );
});

test("明确编辑限制禁用重绘和参考图并保留原图，不发送请求", async ({ page }) => {
  let requests = 0;
  await page.route(`${api}/images/**`, (route) => {
    requests += 1;
    return route.fulfill({ json: { data: [{ b64_json: pixel }] } });
  });
  await configure(page);
  await page.getByLabel("当前模型用途").selectOption("image");
  await page
    .getByLabel("图片生成能力", { exact: true })
    .selectOption("supported");
  await page
    .getByLabel("参考图编辑能力", { exact: true })
    .selectOption("unsupported");
  await page.getByLabel("单次任务生成数量上限", { exact: true }).fill("2");
  await page
    .getByRole("button", { name: "保存此模型能力", exact: true })
    .click();
  const item = await node(page);
  await item.getByRole("button", { name: "生成数量", exact: true }).click();
  await expect(
    item.getByRole("button", { name: "生成 2 个", exact: true }),
  ).toBeVisible();
  await expect(
    item.getByRole("button", { name: "生成 4 个", exact: true }),
  ).toHaveCount(0);
  await item.getByRole("button", { name: "生成 1 个", exact: true }).click();
  await expect(
    item.getByRole("button", { name: "添加参考图片", exact: true }),
  ).toBeDisabled();
  await item
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: "original.png",
      mimeType: "image/png",
      buffer: Buffer.from(pixel, "base64"),
    });
  await expect(item.locator(".uploaded-image")).toBeVisible();
  await item.getByRole("button", { name: "重绘参考图片", exact: true }).click();
  const redraw = page.getByRole("dialog", { name: "重绘参考图片" });
  await redraw.getByLabel("重绘指令").fill("保留主体，更换背景");
  await expect(
    redraw.getByRole("button", { name: "开始重绘", exact: true }),
  ).toBeDisabled();
  await expect(redraw.getByRole("status")).toContainText("不支持参考图编辑");
  await redraw.getByRole("button", { name: "取消", exact: true }).click();
  await expect(item.locator(".uploaded-image")).toBeVisible();
  expect(requests).toBe(0);
});

test("报告能力限制数量且 unknown 蒙版只显示未接通说明", async ({ page }) => {
  await page.route(`${api}/models`, (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: "image-capability-a",
            capabilities: {
              modalities: ["image"],
              sizes: ["1024x1024"],
              image: {
                generate: true,
                edit: true,
                maxReferences: 1,
                maxGenerationCount: 1,
              },
            },
          },
        ],
      },
    }),
  );
  await configure(page);
  await page.getByRole("button", { name: "刷新模型列表", exact: true }).click();
  await expect(page.getByLabel("参考图编辑能力", { exact: true })).toHaveValue(
    "supported",
  );
  await expect(
    page.getByLabel("蒙版局部编辑能力", { exact: true }),
  ).toHaveValue("unknown");
  const item = await node(page);
  await item.getByRole("button", { name: "生成数量", exact: true }).click();
  await expect(
    item.getByRole("button", { name: "生成 1 个", exact: true }),
  ).toBeVisible();
  await expect(
    item.getByRole("button", { name: "生成 2 个", exact: true }),
  ).toHaveCount(0);
  await item.getByRole("button", { name: "生成 1 个", exact: true }).click();
  await item.getByTitle("使用当前模型声明支持的尺寸").click();
  const parameters = item.getByLabel("图片参数选项");
  await expect(parameters).toContainText("参考图编辑：支持");
  await expect(parameters).toContainText("蒙版与扩图执行尚未接通");
  await expect(parameters).toContainText("最多 1 张参考图");
});

test("单张重绘使用自己的数量，不被原节点超限草稿阻止", async ({ page }) => {
  await configure(page);
  const item = await node(page);
  await item.getByRole("button", { name: "生成数量", exact: true }).click();
  await item.getByRole("button", { name: "生成 8 个", exact: true }).click();
  await settings(page);
  await page.getByLabel("当前模型用途").selectOption("image");
  await page
    .getByLabel("参考图编辑能力", { exact: true })
    .selectOption("supported");
  await page.getByLabel("单次任务生成数量上限", { exact: true }).fill("1");
  await page
    .getByRole("button", { name: "保存此模型能力", exact: true })
    .click();
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await item
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: "original.png",
      mimeType: "image/png",
      buffer: Buffer.from(pixel, "base64"),
    });
  await item.getByRole("button", { name: "重绘参考图片", exact: true }).click();
  const redraw = page.getByRole("dialog", { name: "重绘参考图片" });
  await redraw.getByLabel("重绘指令").fill("调整背景");
  await expect(
    redraw.getByRole("button", { name: "开始重绘", exact: true }),
  ).toBeEnabled();
});
