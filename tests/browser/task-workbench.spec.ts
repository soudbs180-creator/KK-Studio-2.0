import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs/promises";

const endpoint = "https://models.example.test/v1/images/generations";
const pixel =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

async function configure(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "模型", exact: true }).click();
  await page
    .getByRole("menu")
    .getByRole("button", { name: /配置供应商/ })
    .click();
  await page.getByLabel("API Base URL").fill("https://models.example.test/v1");
  await page.getByLabel("API Key").fill("fixture-key");
  await page.getByLabel("默认模型").fill("image-test");
  await page.getByRole("button", { name: "保存供应商" }).click();
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
}
async function submit(page: Page, count = "4") {
  await page.getByLabel("生成数量").selectOption(count);
  await page.getByLabel("创作提示词").fill("带有磨砂材质的白色风扇");
  await page.getByRole("button", { name: "开始创建项目" }).click();
}
async function workbench(page: Page) {
  await page.getByRole("button", { name: "打开任务列表" }).click();
  await page.getByRole("button", { name: "打开任务工作台" }).click();
}

test("审批阻断远程请求，部分成功矩阵单项重试回填且审阅任务保留", async ({
  page,
}) => {
  let requests = 0;
  const preview = (
    await fs.readFile("public/fixtures/demo/blue-hour.png")
  ).toString("base64");
  await page.route(endpoint, async (route) => {
    requests += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data:
          requests === 1
            ? [{ b64_json: pixel }, { b64_json: preview }]
            : [{ b64_json: preview }],
      }),
    });
  });
  await configure(page);
  await submit(page);
  await expect(
    page.getByRole("dialog", { name: "人工审批任务" }),
  ).toBeVisible();
  expect(requests).toBe(0);
  await expect(
    page.getByRole("dialog", { name: "人工审批任务" }),
  ).toContainText("数据保留");
  await page.getByRole("button", { name: "批准并提交" }).click();
  await expect(page.locator(".project-task-partial")).toBeVisible();
  await workbench(page);
  await page.getByRole("tab", { name: "Generate" }).click();
  await expect(page.locator(".batch-cell")).toHaveCount(4);
  await expect(page.locator(".batch-preview")).toHaveCount(2);
  await page.getByRole("button", { name: "单项重试" }).first().click();
  await page.getByRole("button", { name: "批准并提交" }).click();
  await expect(page.locator(".batch-cell.is-succeeded")).toHaveCount(3);
  await expect(page.locator(".task-queue-item")).toHaveCount(2);
  await page.getByRole("tab", { name: "Export" }).click();
  const region = page.getByLabel("评论区域标记");
  await expect(region).toBeVisible();
  const box = (await region.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6);
  await page.mouse.up();
  await page.getByLabel("评论", { exact: true }).fill("降低这一区域的高光");
  await page.getByRole("button", { name: "添加评论", exact: true }).click();
  await page.getByRole("button", { name: "评论转任务", exact: true }).click();
  await page.getByLabel("评论任务分配").selectOption("reviewer");
  await page.getByRole("button", { name: "关闭任务工作台" }).click();
  await workbench(page);
  await page.locator(".task-queue-item").first().click();
  await page.getByRole("tab", { name: "Export" }).click();
  await expect(page.locator(".comment-entry")).toContainText(
    "降低这一区域的高光",
  );
  await expect(page.getByLabel("评论任务分配")).toHaveValue("reviewer");
});

test("提交后暂停进入受理状态不明并保留已归档结果", async ({ page }) => {
  let finish: (() => void) | undefined;
  await page.route(endpoint, async (route) => {
    await new Promise<void>((resolve) => {
      finish = resolve;
    });
    await route
      .fulfill({
        contentType: "application/json",
        body: JSON.stringify({ data: [{ b64_json: pixel }] }),
      })
      .catch(() => {});
  });
  await configure(page);
  await submit(page, "1");
  await page.getByRole("button", { name: "批准并提交" }).click();
  await expect(page.locator(".project-task-running")).toBeVisible();
  await workbench(page);
  await page.getByRole("button", { name: "暂停", exact: true }).click();
  await expect(page.locator(".task-workbench-task-head")).toContainText(
    "受理状态不明",
  );
  await expect(
    page.getByRole("button", { name: "恢复", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "重试剩余", exact: true }),
  ).toHaveCount(0);
  finish?.();
});

test("指定风格参考槽可上传并移除，展开按钮仍可点击", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await page.locator(".image-preview").click();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "添加风格参考图" }).click();
  await (await chooser).setFiles("public/fixtures/demo/blue-hour.png");
  await expect(
    page.locator('.reference-slot[data-slot="风格"] img'),
  ).toBeVisible();
  await expect(
    page.locator('.reference-slot[data-slot="主体"] img'),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "展开提示词", exact: true }).click();
  await expect(page.getByTestId("image-composer")).toHaveClass(/expanded/);
  await page.getByRole("button", { name: /移除风格参考图/ }).click();
  await expect(
    page.locator('.reference-slot[data-slot="风格"] img'),
  ).toHaveCount(0);
});

test("16 项批次在归档 10 项后暂停，剩余受理状态进入未知", async ({ page }) => {
  const counts: number[] = [];
  let release: (() => void) | undefined;
  await page.route(endpoint, async (route) => {
    const count = route.request().postDataJSON().n as number;
    counts.push(count);
    if (counts.length === 2)
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    await route
      .fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          data: Array.from({ length: count }, () => ({ b64_json: pixel })),
        }),
      })
      .catch(() => {});
  });
  await configure(page);
  await submit(page, "16");
  await page.getByRole("button", { name: "批准并提交" }).click();
  await workbench(page);
  await page.getByRole("tab", { name: "Generate" }).click();
  await expect(page.locator(".batch-cell.is-succeeded")).toHaveCount(10);
  await page.getByRole("button", { name: "暂停", exact: true }).click();
  await expect(page.locator(".task-workbench-task-head")).toContainText(
    "受理状态不明",
  );
  await expect(page.locator(".batch-cell.is-succeeded")).toHaveCount(10);
  release?.();
  await expect(page.locator(".batch-cell.is-succeeded")).toHaveCount(10);
  expect(counts).toEqual([10, 6]);
});

test("重复重试被锁定，重试任务再次重试后回填原始输出", async ({ page }) => {
  let requests = 0;
  let release: (() => void) | undefined;
  await page.route(endpoint, async (route) => {
    requests += 1;
    const attempt = requests;
    if (attempt === 2)
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    await route
      .fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          data: attempt < 3 ? [] : [{ b64_json: pixel }],
        }),
      })
      .catch(() => {});
  });
  await configure(page);
  await submit(page, "1");
  await page.getByRole("button", { name: "批准并提交" }).click();
  await expect(page.locator(".project-task-failed")).toBeVisible();
  await workbench(page);
  await page.getByRole("tab", { name: "Generate" }).click();
  await page.getByRole("button", { name: "单项重试", exact: true }).click();
  await page.getByRole("button", { name: "批准并提交" }).click();
  await expect.poll(() => requests).toBe(2);
  await page.getByRole("button", { name: "单项重试", exact: true }).click();
  await expect(page.locator(".task-queue-item")).toHaveCount(2);
  expect(requests).toBe(2);
  release?.();
  await page.locator(".task-queue-item").last().click();
  await expect(page.locator(".task-workbench-task-head")).toContainText("失败");
  await page.getByRole("button", { name: "单项重试", exact: true }).click();
  await page.getByRole("button", { name: "批准并提交" }).click();
  await expect.poll(() => requests).toBe(3);
  await page.locator(".task-queue-item").first().click();
  await expect(page.locator(".batch-cell.is-succeeded")).toHaveCount(1);
  await expect(page.locator(".task-workbench-task-head")).toContainText(
    "已完成",
  );
});

test("相同内容重新导入保持 AI 来源，SHA-256 去重和本地集合持久化", async ({
  page,
}) => {
  const preview = (
    await fs.readFile("public/fixtures/demo/blue-hour.png")
  ).toString("base64");
  await page.route(endpoint, (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ data: [{ b64_json: preview }] }),
    }),
  );
  await configure(page);
  await submit(page, "1");
  await page.getByRole("button", { name: "批准并提交" }).click();
  await expect(page.locator(".project-task-succeeded")).toBeVisible();
  await page.getByRole("button", { name: "文件", exact: true }).click();
  await page
    .locator(".menu-popover")
    .getByRole("button", { name: "资产管理", exact: true })
    .click();
  await page
    .getByTestId("asset-panel")
    .locator("input[type=file]")
    .setInputFiles("public/fixtures/demo/blue-hour.png");
  await expect(page.getByRole("status")).toContainText("已导入 1 项");
  await page.getByLabel("来源筛选").selectOption("provider");
  await expect(page.locator(".asset-card")).toHaveCount(1);
  await page.locator(".asset-card").dblclick();
  await expect(page.locator(".asset-provenance")).toContainText("AI 生成");
  await expect(page.locator(".asset-provenance")).toContainText("image-test");
  await expect(page.locator(".asset-provenance")).toContainText("C2PA");
  await expect(page.locator(".asset-provenance")).toContainText("SynthID");
  await expect(page.locator(".asset-provenance")).toContainText(
    "未知 · 未回传",
  );
  await expect(page.locator(".asset-provenance")).toContainText("2 条");
  await page.getByRole("button", { name: "加入本地集合" }).click();
  const archived = await page.evaluate(
    () =>
      new Promise<{
        count: number;
        ai: boolean;
        prompt?: string;
        connection?: string;
      }>((resolve, reject) => {
        const open = indexedDB.open("kk-studio-assets", 1);
        open.onsuccess = () => {
          const db = open.result;
          const read = db.transaction("blobs").objectStore("blobs").getAll();
          read.onsuccess = () => {
            const rows = read.result;
            db.close();
            resolve({
              count: rows.length,
              ai: rows[0].metadata.isAiGenerated,
              prompt: rows[0].metadata.promptHash,
              connection: rows[0].metadata.provenance.connectionId,
            });
          };
          read.onerror = () => reject(read.error);
        };
        open.onerror = () => reject(open.error);
      }),
  );
  expect(archived.count).toBe(1);
  expect(archived.ai).toBe(true);
  expect(archived.prompt).toMatch(/^[a-f0-9]{64}$/);
  expect(archived.connection).toBeTruthy();
  await page.reload();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await page.getByRole("button", { name: "文件", exact: true }).click();
  await page
    .locator(".menu-popover")
    .getByRole("button", { name: "资产管理", exact: true })
    .click();
  await page.getByLabel("来源筛选").selectOption("collection");
  await expect(page.locator(".asset-card")).toHaveCount(1);
});
