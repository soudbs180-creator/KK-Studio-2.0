import { expect, test, type Page } from "@playwright/test";
import {
  createProject,
  createTask,
  emptySnapshot,
  type CreationSnapshot,
} from "../../src/features/creation/model";

const endpoint = "https://models.example.test/v1/images/generations";
const resultUrl = "https://models.example.test/result.png";
const pixel =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

async function submit(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "模型", exact: true }).click();
  await page
    .getByRole("menu")
    .getByRole("button", { name: "模型接入…", exact: true })
    .click();
  await page
    .getByRole("button", { name: "API Key（官方）", exact: true })
    .click();
  await page.getByLabel("接口地址").fill("https://models.example.test/v1");
  await page.getByLabel("API Key", { exact: true }).fill("fixture-key");
  await page.getByLabel("模型名称").fill("image-test");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page.getByLabel("创作提示词").fill("生成保存状态 fixture");
  await page.getByRole("button", { name: "开始创建项目" }).click();
  await page.getByRole("button", { name: "批准并提交" }).click();
}

test("Web returned image stays saving until archival, then survives reload", async ({
  page,
}, testInfo) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(endpoint, (route) =>
    route.fulfill({ json: { data: [{ url: resultUrl }] } }),
  );
  await page.route(resultUrl, async (route) => {
    await pending;
    await route.fulfill({
      contentType: "image/png",
      body: Buffer.from(pixel, "base64"),
    });
  });
  await submit(page);
  const progress = page.locator(".project-task-running");
  await expect(progress).toContainText("结果已返回");
  await expect(page.locator(".project-save-state")).not.toContainText("已保存");
  for (const width of [390, 1099, 1920]) {
    await page.setViewportSize({ width, height: 1080 });
    if (width === 1099) {
      await page.getByRole("button", { name: "打开对话", exact: true }).click();
      await expect(page.locator(".workspace")).toHaveClass(/chat-mobile/);
    }
    await expect(page.locator(".canvas-hud")).toBeVisible();
    await expect(progress).toBeVisible();
    await expect
      .poll(async () => {
        const box = await page.locator(".project-task-status").boundingBox();
        return box ? box.x + box.width : Infinity;
      })
      .toBeLessThanOrEqual(width);
    const bounds = await page.locator(".project-task-status").boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    const informationHit = await page
      .locator(".project-save-state")
      .evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const target = document.elementFromPoint(
          rect.x + rect.width / 2,
          rect.y + rect.height / 2,
        );
        return {
          found: Boolean(target),
          blockedByHud: Boolean(target?.closest(".canvas-hud")),
        };
      });
    expect(informationHit).toEqual({ found: true, blockedByHud: false });
    const cancelHit = await progress
      .getByRole("button", { name: "取消", exact: true })
      .evaluate((button) => {
        const rect = button.getBoundingClientRect();
        return button.contains(
          document.elementFromPoint(
            rect.x + rect.width / 2,
            rect.y + rect.height / 2,
          ),
        );
      });
    expect(cancelHit).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`saving-${width}.png`) });
    if (width === 1099) {
      await page.getByRole("button", { name: "收起对话", exact: true }).click();
      await expect(page.locator(".workspace")).not.toHaveClass(/chat-mobile/);
    }
  }
  release();
  await expect(page.locator(".project-task-succeeded")).toContainText(
    "结果已保存到本机",
  );
  await expect(page.locator(".project-save-state")).toHaveText("已保存");
  await expect(
    page.locator('.demo-result-node[data-source="provider"]'),
  ).toHaveCount(1);
  await page.reload();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page
    .locator(".project-library-card")
    .filter({ hasText: "生成保存状态 fixture" })
    .click();
  await expect(page.locator(".project-task-succeeded")).toContainText(
    "结果已保存到本机",
  );
  await expect(
    page.locator('.demo-result-node[data-source="provider"]'),
  ).toHaveCount(1);
});

test("Web archival failure exposes its reason and does not offer an ordinary retry", async ({
  page,
}) => {
  let requests = 0;
  await page.route(endpoint, (route) => {
    requests++;
    return route.fulfill({ json: { data: [{ b64_json: "invalid!!" }] } });
  });
  await submit(page);
  const progress = page.locator(".project-task-unknown");
  await expect(progress).toContainText("本地素材归档失败");
  await expect(progress).toContainText("核对素材库");
  await expect(progress).not.toContainText("结果已保存");
  await expect(
    progress.getByRole("button", { name: "重试", exact: true }),
  ).toHaveCount(0);
  expect(requests).toBe(1);
});

test("Web final snapshot write failure preserves generation success and retries only the save", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = { fail: true };
    Object.assign(window, { generationSaveTest: state });
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (
      value: unknown,
      key?: IDBValidKey,
    ) {
      const snapshot = value as {
        projects?: Array<{ tasks?: Array<{ status: string }> }>;
      };
      if (
        this.transaction.db.name === "kk-studio-next" &&
        key === "snapshot" &&
        state.fail &&
        snapshot.projects?.some((project) =>
          project.tasks?.some((task) => task.status === "succeeded"),
        )
      )
        throw new DOMException(
          "fixture final save denied",
          "QuotaExceededError",
        );
      return original.call(this, value, key);
    };
  });
  let requests = 0;
  await page.route(endpoint, (route) => {
    requests++;
    return route.fulfill({ json: { data: [{ b64_json: pixel }] } });
  });
  await submit(page);
  await expect(page.getByRole("alert")).toContainText("保存失败");
  const progress = page.locator(".project-task-succeeded");
  await expect(progress).toContainText("保存需核对");
  await expect(page.locator(".project-save-state")).toContainText("保存失败");
  await expect(
    progress.getByRole("button", { name: "重试", exact: true }),
  ).toHaveCount(0);
  await page.evaluate(() => {
    // Debounced saves must not recover before the real retry click.
    document.addEventListener(
      "click",
      (event) => {
        if (
          event.target instanceof Element &&
          event.target.closest("button")?.textContent?.trim() === "重试保存"
        )
          (
            window as Window & { generationSaveTest: { fail: boolean } }
          ).generationSaveTest.fail = false;
      },
      { capture: true, once: true },
    );
  });
  await page.getByRole("button", { name: "重试保存", exact: true }).click();
  await expect(progress).toContainText("结果已保存到本机");
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(requests).toBe(1);
});

test("native recovered text distinguishes an archived receipt from a failed project save", async ({
  page,
}) => {
  const project = createProject({
    prompt: "原生保存状态 fixture",
    model: "text-test",
    kind: "text",
    attachments: [],
    privacyMode: "byok_local",
  });
  const task = createTask(project);
  task.status = "running";
  task.submissionState = "submitted";
  project.tasks = [task];
  const snapshot = {
    ...emptySnapshot(),
    revision: 1,
    activeProjectId: project.id,
    projects: [project],
  };
  let durable: CreationSnapshot = snapshot;
  let fail = true;
  await page.exposeBinding(
    "generationNativeInvoke",
    async (
      _source,
      command: string,
      args: { snapshot?: CreationSnapshot } = {},
    ) => {
      if (command === "read_creation_snapshot")
        return { status: "loaded", snapshot: durable };
      if (command === "write_creation_snapshot") {
        if (fail) throw new Error("io: fixture native save denied");
        durable = structuredClone(args.snapshot!);
        return;
      }
      if (command === "task_host_list")
        return [
          {
            taskId: task.id,
            idempotencyKey: task.idempotencyKey,
            status: "succeeded",
            outputIndices: [0],
            outputs: [
              { index: 0, status: "succeeded", text: "原生已完成文本" },
            ],
            updatedAt: 42,
          },
        ];
      if (command === "credential_get") return null;
      if (command === "read_provider_config")
        return { status: "missing", revision: null, connections: [] };
      if (command === "asset_list") return [];
      if (
        command.startsWith("plugin:event|") ||
        command.startsWith("plugin:window|")
      )
        return 1;
      throw new Error(`Unexpected fixture IPC: ${command}`);
    },
  );
  await page.addInitScript(() => {
    Object.assign(window, {
      __TAURI_INTERNALS__: {
        invoke: (command: string, args?: Record<string, unknown>) =>
          (
            window as Window & {
              generationNativeInvoke: (
                command: string,
                args?: Record<string, unknown>,
              ) => Promise<unknown>;
            }
          ).generationNativeInvoke(command, args),
        transformCallback: () => 1,
        unregisterCallback: () => undefined,
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page
    .locator(".project-library-card")
    .filter({ hasText: "原生保存状态 fixture" })
    .click();
  await expect(page.getByRole("alert")).toContainText("保存失败");
  await expect(page.locator(".project-task-succeeded")).toContainText(
    "保存需核对",
  );
  await expect(page.locator(".project-task-succeeded")).not.toContainText(
    "结果已保存",
  );
  fail = false;
  await page.getByRole("button", { name: "重试保存", exact: true }).click();
  await expect(page.locator(".project-task-succeeded")).toContainText(
    "结果已保存到本机",
  );
  await page.reload();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page
    .locator(".project-library-card")
    .filter({ hasText: "原生保存状态 fixture" })
    .click();
  await expect(page.locator(".project-task-succeeded")).toContainText(
    "结果已保存到本机",
  );
});
