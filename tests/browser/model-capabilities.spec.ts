import { expect, test, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { waitForConversationPanelSettled } from "./helpers";

const api = "https://capabilities.example.test/v1";
const pixel =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

for (const duplicate of [true, false]) {
  test(`原图和连线参考图按归档素材去重：${duplicate ? "同素材可编辑" : "不同素材超限禁用重绘"}`, async ({
    page,
  }, info) => {
    let requests = 0;
    await page.route(`${api}/images/**`, (route) => {
      requests += 1;
      return route.fulfill({ json: { data: [{ b64_json: pixel }] } });
    });
    await configure(page);
    const item = await node(page);
    await item.getByRole("button", { name: "生成数量", exact: true }).click();
    await item.getByRole("button", { name: "生成 1 个", exact: true }).click();
    const original = {
      name: "original.png",
      mimeType: "image/png",
      buffer: Buffer.from(pixel, "base64"),
    };
    await item.locator('input[type="file"]').first().setInputFiles(original);
    await expect(item.locator(".uploaded-image")).toBeVisible();
    const sourceId = (await item.getAttribute("data-testid"))!.replace(
      "canvas-node-",
      "",
    );
    await expect
      .poll(() =>
        page.evaluate((id) => {
          const snapshot = JSON.parse(
            localStorage.getItem("kk-studio-next:creation:v1")!,
          );
          return snapshot.projects
            .find(
              (project: { id: string }) =>
                project.id === snapshot.activeProjectId,
            )
            ?.items.find((entry: { id: string }) => entry.id === id)?.assetId;
        }, sourceId),
      )
      .toBeTruthy();
    // Restore an editable archived node, as a generated or legacy image can be.
    // Upload-only nodes deliberately reject incoming edges in the current UI.
    const restored = await page.evaluate((id) => {
      const key = "kk-studio-next:creation:v1";
      const snapshot = JSON.parse(localStorage.getItem(key)!);
      const project = snapshot.projects.find(
        (entry: { id: string }) => entry.id === snapshot.activeProjectId,
      );
      project.items.find(
        (entry: { id: string }) => entry.id === id,
      ).referenceOnly = false;
      snapshot.revision = Date.now();
      return JSON.stringify(snapshot);
    }, sourceId);
    await page.addInitScript((snapshot) => {
      localStorage.setItem("kk-studio-next:creation:v1", snapshot);
    }, restored);
    await page.reload();
    await page.getByRole("button", { name: "项目库", exact: true }).click();
    await page.locator(".project-library-card").first().click();
    await waitForConversationPanelSettled(page);
    await item.click();
    await item
      .locator('input[type="file"]')
      .nth(1)
      .setInputFiles(
        duplicate ? original : "public/fixtures/demo/blue-hour.png",
      );
    await expect(item.locator(".composer-ref-thumb")).toHaveCount(1);
    await expect
      .poll(() =>
        page.evaluate(
          ({ id, duplicate }) => {
            const snapshot = JSON.parse(
              localStorage.getItem("kk-studio-next:creation:v1")!,
            );
            const project = snapshot.projects.find(
              (entry: { id: string }) => entry.id === snapshot.activeProjectId,
            );
            const source = project.items.find(
              (entry: { id: string }) => entry.id === id,
            );
            const edge = project.canvas.edges.find(
              (entry: { target: string; kind: string }) =>
                entry.target === id && entry.kind !== "result",
            );
            const reference = project.items.find(
              (entry: { id: string }) => entry.id === edge?.source,
            );
            return Boolean(
              source?.assetId &&
              reference?.assetId &&
              (source.assetId === reference.assetId) === duplicate,
            );
          },
          { id: sourceId, duplicate },
        ),
      )
      .toBe(true);
    await settings(page);
    await page.getByLabel("API Key").fill("fixture-key");
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await page.getByLabel("当前模型用途").selectOption("image");
    await page
      .getByLabel("参考图编辑能力", { exact: true })
      .selectOption("supported");
    await page.getByLabel("参考图数量上限", { exact: true }).fill("1");
    await page
      .getByRole("button", { name: "保存此模型能力", exact: true })
      .click();
    await expect(
      page.locator(".provider-model-catalog").getByRole("status"),
    ).toContainText("已保存此模型");
    await expect
      .poll(() =>
        page.evaluate(() => {
          const catalogs = JSON.parse(
            localStorage.getItem("kk-studio:model-catalog:v1")!,
          );
          return catalogs
            .find(
              (entry: { baseUrl: string }) =>
                entry.baseUrl === "https://capabilities.example.test/v1",
            )
            ?.models.find(
              (model: { id: string }) => model.id === "image-capability-a",
            )?.image;
        }),
      )
      .toEqual({ edit: true, maxReferences: 1 });
    await page.getByRole("button", { name: "关闭设置", exact: true }).click();
    await item.getByRole("button", { name: "画布模型", exact: true }).click();
    await page
      .getByRole("searchbox", { name: "搜索模型、厂商或参数" })
      .fill("image-capability-a");
    await page
      .getByRole("menuitemradio", { name: /image-capability-a/ })
      .click();
    await expect(
      item.getByRole("button", { name: "画布模型", exact: true }),
    ).toContainText("image-capability-a");
    await expect(item.locator(".composer-ref-thumb")).toHaveCount(1);
    await expect(item.locator(".uploaded-image")).toBeVisible();
    const prepared = await page.evaluate((id) => {
      const snapshot = JSON.parse(
        localStorage.getItem("kk-studio-next:creation:v1")!,
      );
      const project = snapshot.projects.find(
        (entry: { id: string }) => entry.id === snapshot.activeProjectId,
      );
      const source = project.items.find(
        (entry: { id: string }) => entry.id === id,
      );
      const edges = project.canvas.edges.filter(
        (entry: { target: string; kind: string }) =>
          entry.target === id && entry.kind !== "result",
      );
      const fields = (entry: Record<string, unknown>) => ({
        id: entry.id,
        assetId: entry.assetId,
        model: entry.model,
        generationSource: entry.generationSource,
        providerConnectionId: entry.providerConnectionId,
        referenceOnly: entry.referenceOnly,
      });
      return {
        source: fields(source),
        references: edges.map((edge: { source: string }) =>
          fields(
            project.items.find(
              (entry: { id: string }) => entry.id === edge.source,
            ),
          ),
        ),
        catalogs: JSON.parse(
          localStorage.getItem("kk-studio:model-catalog:v1")!,
        ),
      };
    }, sourceId);
    await info.attach("prepared-reference-capabilities", {
      body: JSON.stringify(prepared, null, 2),
      contentType: "application/json",
    });
    const generate = item.getByRole("button", {
      name: "生成图片",
      exact: true,
    });
    if (duplicate) await expect(generate).toBeEnabled();
    else await expect(generate).toBeDisabled();
    await item.locator(".uploaded-image").click();
    await page
      .getByRole("toolbar")
      .getByRole("button", { name: "重绘参考图片", exact: true })
      .click();
    const redraw = page.getByRole("dialog", { name: "重绘参考图片" });
    const start = redraw.getByRole("button", { name: "开始重绘", exact: true });
    await redraw.getByLabel("重绘指令").fill("保留主体，调整背景");
    if (duplicate) await expect(start).toBeEnabled();
    else {
      await expect(start).toBeDisabled();
      const capabilityStatus = redraw.locator(".local-generation-status");
      await expect(capabilityStatus).toHaveCount(1);
      await expect(capabilityStatus).toHaveAttribute("role", "status");
      await expect(capabilityStatus).toContainText("最多接收 1 张参考图");
    }
    await redraw.getByRole("button", { name: "取消", exact: true }).click();
    await expect(item.locator(".uploaded-image")).toBeVisible();
    expect(requests).toBe(0);
  });
}

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
  const first = page.getByTestId(/^canvas-node-added-image-/).first();
  const item = page.getByTestId((await first.getAttribute("data-testid"))!);
  await item.click();
  return item;
}

test("仅显示元数据更新时刷新分组、型号和别名草稿", async ({ page }) => {
  let updated = false;
  await page.route(`${api}/models`, (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: "image-capability-a",
            capabilities: { modalities: ["image"], sizes: ["1024x1024"] },
            display: {
              family: updated ? "New group" : "Old group",
              variant: updated ? "New variant" : "Old variant",
              aliases: [updated ? "new-alias" : "old-alias"],
            },
          },
        ],
      },
    }),
  );
  await configure(page);
  await page.getByRole("button", { name: "刷新模型列表", exact: true }).click();
  await page.getByText("型号显示与搜索别名", { exact: true }).click();
  await expect(page.getByLabel("模型分组名称", { exact: true })).toHaveValue(
    "Old group",
  );
  await expect(page.getByLabel("型号参数名称", { exact: true })).toHaveValue(
    "Old variant",
  );
  await expect(page.getByLabel("搜索别名", { exact: true })).toHaveValue(
    "old-alias",
  );
  updated = true;
  await page.getByRole("button", { name: "刷新模型列表", exact: true }).click();
  await expect(page.getByLabel("模型分组名称", { exact: true })).toHaveValue(
    "New group",
  );
  await expect(page.getByLabel("型号参数名称", { exact: true })).toHaveValue(
    "New variant",
  );
  await expect(page.getByLabel("搜索别名", { exact: true })).toHaveValue(
    "new-alias",
  );
});

test("供应商刷新通知不覆盖未保存的模型能力草稿", async ({ page }) => {
  await configure(page);
  await page.getByLabel("当前模型用途").selectOption("image");
  await page
    .getByLabel("参考图编辑能力", { exact: true })
    .selectOption("supported");
  await page.getByLabel("参考图数量上限", { exact: true }).fill("1");
  await page.evaluate(() =>
    window.dispatchEvent(new Event("kk:model-provider-changed")),
  );
  await expect(page.getByLabel("当前模型用途")).toHaveValue("image");
  await expect(page.getByLabel("参考图编辑能力", { exact: true })).toHaveValue(
    "supported",
  );
  await expect(page.getByLabel("参考图数量上限", { exact: true })).toHaveValue(
    "1",
  );
  await page
    .getByRole("button", { name: "保存此模型能力", exact: true })
    .click();
  await expect(
    page.locator(".provider-model-catalog").getByRole("status"),
  ).toContainText("已保存此模型");
  expect(
    await page.evaluate(() => {
      const catalogs = JSON.parse(
        localStorage.getItem("kk-studio:model-catalog:v1")!,
      );
      return catalogs
        .find(
          (entry: { baseUrl: string }) =>
            entry.baseUrl === "https://capabilities.example.test/v1",
        )
        ?.models.find(
          (model: { id: string }) => model.id === "image-capability-a",
        )?.image;
    }),
  ).toEqual({ edit: true, maxReferences: 1 });
});

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
  await item.locator(".uploaded-image").click();
  await page
    .getByRole("toolbar")
    .getByRole("button", { name: "重绘参考图片", exact: true })
    .click();
  const redraw = page.getByRole("dialog", { name: "重绘参考图片" });
  await redraw.getByLabel("重绘指令").fill("保留主体，更换背景");
  await expect(
    redraw.getByRole("button", { name: "开始重绘", exact: true }),
  ).toBeDisabled();
  const capabilityStatus = redraw.locator(".local-generation-status");
  await expect(capabilityStatus).toHaveCount(1);
  await expect(capabilityStatus).toHaveAttribute("role", "status");
  await expect(capabilityStatus).toContainText("不支持参考图编辑");
  await redraw.getByRole("button", { name: "取消", exact: true }).click();
  await expect(item.locator(".uploaded-image")).toBeVisible();
  expect(requests).toBe(0);
});

test("报告能力限制数量且 unknown 蒙版保留未声明状态和编辑能力说明", async ({
  page,
}) => {
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
  await expect(parameters).toContainText("局部重绘需要已声明的编辑能力");
  await expect(parameters).toContainText("扩图暂不可用");
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
  await item.locator(".uploaded-image").click();
  await page
    .getByRole("toolbar")
    .getByRole("button", { name: "重绘参考图片", exact: true })
    .click();
  const redraw = page.getByRole("dialog", { name: "重绘参考图片" });
  await redraw.getByLabel("重绘指令").fill("调整背景");
  await expect(
    redraw.getByRole("button", { name: "开始重绘", exact: true }),
  ).toBeEnabled();
});
