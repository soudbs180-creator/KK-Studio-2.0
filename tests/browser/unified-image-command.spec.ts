import { expect, test, type Page, type Route } from "@playwright/test";
import { readFileSync } from "node:fs";
import { waitForConversationPanelSettled } from "./helpers";
import type { ProviderConnection } from "../../src/domain/providerConnections";

const generationsEndpoint = "https://models.example.test/v1/images/generations";
const editsEndpoint = "https://models.example.test/v1/images/edits";
const providerKey = "kk-studio-next:provider-connections:v1";
const creationKey = "kk-studio-next:creation:v1";
const pixel =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const referencePath = "public/fixtures/demo/blue-hour.png";

async function openWorkspace(page: Page): Promise<void> {
  // Browser credentials intentionally live in memory; stay in the same document.
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await expect(page.getByRole("region", { name: "无限画布" })).toBeVisible();
  await waitForConversationPanelSettled(page);
}

async function configure(page: Page, model = "image-test"): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page.getByRole("button", { name: "模型接入", exact: true }).click();
  await page.getByLabel("API Base URL").fill("https://models.example.test/v1");
  await page.getByLabel("API Key").fill("fixture-key");
  await page.getByLabel("默认模型").fill(model);
  await page.getByRole("button", { name: "保存供应商" }).click();
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
}

async function selectImageNode(page: Page) {
  // A new project is intentionally empty; create the source through the UI.
  await expect(page.locator(".canvas-node-image")).toHaveCount(0);
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page.getByRole("menuitem", { name: "图片", exact: true }).click();
  const node = page.locator(".canvas-node-image").first();
  await node.click();
  await expect(node.getByLabel("图片提示词")).toBeVisible();
  return node;
}

async function selectAddedImageNode(page: Page) {
  const node = page.getByTestId(/^canvas-node-added-image-/).first();
  await node.click();
  await expect(node.getByLabel("图片提示词")).toBeVisible();
  return node;
}

async function chooseOneOutput(
  node: ReturnType<Page["locator"]>,
): Promise<void> {
  const count = node.getByRole("button", { name: "生成数量", exact: true });
  if (await count.count()) {
    await count.click();
    await node.getByRole("button", { name: "生成 1 个", exact: true }).click();
  }
}

async function snapshot(page: Page): Promise<{
  projects: Array<{
    id: string;
    items: Array<Record<string, unknown>>;
    tasks: Array<Record<string, unknown>>;
    canvas: { edges: Array<Record<string, unknown>> };
  }>;
  activeProjectId: string | null;
}> {
  return page.evaluate((key) => {
    const value = JSON.parse(localStorage.getItem(key) ?? "{}");
    return value as {
      projects: Array<{
        id: string;
        items: Array<Record<string, unknown>>;
        tasks: Array<Record<string, unknown>>;
        canvas: { edges: Array<Record<string, unknown>> };
      }>;
      activeProjectId: string | null;
    };
  }, creationKey);
}

async function activeProject(page: Page) {
  const state = await snapshot(page);
  return state.projects.find(
    (project) => project.id === state.activeProjectId,
  )!;
}

async function patchProvider(
  page: Page,
  patch: Partial<ProviderConnection>,
): Promise<void> {
  await page.evaluate(
    ({ key, patch }) => {
      const current = JSON.parse(
        localStorage.getItem(key) ?? "[]",
      ) as ProviderConnection[];
      localStorage.setItem(
        key,
        JSON.stringify(current.map((item) => ({ ...item, ...patch }))),
      );
    },
    { key: providerKey, patch },
  );
}

async function routeImageResult(route: Route): Promise<void> {
  await route.fulfill({
    json: {
      data: [{ b64_json: pixel }],
    },
  });
}

test("active project canvas uses the provider command for a non-root source and archives a linked result", async ({
  page,
}) => {
  await configure(page);
  await page.route(generationsEndpoint, routeImageResult);
  let editRequestBody: Buffer | undefined;
  await page.route(editsEndpoint, async (route) => {
    editRequestBody = route.request().postDataBuffer() ?? undefined;
    await routeImageResult(route);
  });
  await openWorkspace(page);
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page.getByRole("menuitem", { name: "图片", exact: true }).click();
  const source = await selectAddedImageNode(page);
  const sourceItemId = await source.getAttribute("data-node-id");
  const prompt = "非根节点的真实图片生成";
  await source.getByLabel("图片提示词").fill(prompt);
  await chooseOneOutput(source);
  await source.getByRole("button", { name: "生成图片", exact: true }).click();

  await page.getByRole("button", { name: "批准并提交" }).click();

  await expect
    .poll(async () => (await activeProject(page)).tasks.at(-1)?.status)
    .toBe("succeeded");
  const project = await activeProject(page);
  const task = project.tasks.at(-1)!;
  expect(task.sourceItemId).toBe(sourceItemId);
  const resultId = task.resultItemId as string;
  const result = project.items.find((item) => item.id === resultId)!;
  expect(result.result).toMatchObject({ source: "provider" });
  expect(result.assetId).toMatch(/^asset-[a-f0-9]{24}$/i);
  expect(
    project.canvas.edges.some(
      (edge) =>
        edge.source === sourceItemId &&
        edge.target === resultId &&
        edge.kind === "result",
    ),
  ).toBe(true);

  const archived = await page.evaluate(async (assetId) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("kk-studio-assets", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return await new Promise<unknown>((resolve, reject) => {
      const request = db.transaction("blobs").objectStore("blobs").get(assetId);
      request.onsuccess = () => {
        db.close();
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }, result.assetId as string);
  expect(archived).toMatchObject({ metadata: { assetId: result.assetId } });

  const resultNode = page.getByTestId(`canvas-node-${resultId}`);
  await resultNode.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("image-composer")).toBeVisible();
  await expect(
    page.getByTestId("image-composer").getByRole("button", {
      name: "生成图片",
      exact: true,
    }),
  ).toBeVisible();
  const resultComposer = page.getByTestId("image-composer");
  for (const expanded of [false, true]) {
    if (expanded)
      await resultComposer.getByRole("button", { name: "展开提示词" }).click();
    const geometry = await resultComposer.evaluate((element) => {
      const refs = element
        .querySelector(".reference-slots")!
        .getBoundingClientRect();
      const input = element.querySelector("textarea")!.getBoundingClientRect();
      const controls = element
        .querySelector(".creation-controls")!
        .getBoundingClientRect();
      return {
        referenceBottom: refs.bottom,
        inputTop: input.top,
        inputBottom: input.bottom,
        controlsTop: controls.top,
        controlsBottom: controls.bottom,
        viewport: innerHeight,
      };
    });
    expect(geometry.inputTop).toBeGreaterThan(geometry.referenceBottom);
    expect(geometry.inputBottom).toBeLessThan(geometry.controlsTop);
    expect(geometry.controlsBottom).toBeLessThan(geometry.viewport);
  }
  await resultComposer.getByRole("button", { name: "收起提示词" }).click();
  await resultComposer.getByLabel("图片提示词").fill("继续编辑已生成图片");
  await chooseOneOutput(resultComposer);
  await resultComposer
    .getByRole("button", { name: "生成图片", exact: true })
    .click();
  await page.getByRole("button", { name: "批准并提交" }).click();
  await expect
    .poll(async () => (await activeProject(page)).tasks.length)
    .toBe(2);
  await expect
    .poll(async () => (await activeProject(page)).tasks.at(-1)?.status)
    .toBe("succeeded");
  const editedProject = await activeProject(page);
  const editedTask = editedProject.tasks.at(-1)!;
  expect(editedTask.sourceItemId).toBe(resultId);
  expect(editedTask.attachments as Array<Record<string, unknown>>).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ assetId: result.assetId }),
    ]),
  );
  expect(editRequestBody).toBeDefined();
});

test("provider image cancellation cannot publish a late success", async ({
  page,
}) => {
  await configure(page);
  let release: (() => Promise<void>) | undefined;
  await page.route(
    generationsEndpoint,
    (route) =>
      new Promise<void>((resolve) => {
        release = async () => {
          try {
            await routeImageResult(route);
          } catch {
            // Cancellation may abort the intercepted request before the late
            // fixture response is released; that is the behavior under test.
          } finally {
            resolve();
          }
        };
      }),
  );
  await openWorkspace(page);
  const source = await selectImageNode(page);
  await source.getByLabel("图片提示词").fill("取消后不得写入结果");
  await chooseOneOutput(source);
  await source.getByRole("button", { name: "生成图片", exact: true }).click();
  await page.getByRole("button", { name: "批准并提交" }).click();
  await expect(
    page.getByRole("button", { name: "取消图片生成" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "取消图片生成" }).click();
  // A request that reached the Provider cannot be proven not to have been
  // accepted after the client aborts it, so it is fenced as unknown.
  await expect
    .poll(async () => (await activeProject(page)).tasks.at(-1)?.status)
    .toBe("unknown");
  await release?.();
  await page.waitForTimeout(100);
  const project = await activeProject(page);
  expect(project.items.some((item) => item.result?.source === "provider")).toBe(
    false,
  );
});

for (const state of ["cooldown", "quarantined"] as const) {
  test(`canvas ${state} rejects submission while preserving the draft`, async ({
    page,
  }) => {
    await configure(page);
    let requests = 0;
    await page.route(generationsEndpoint, async (route) => {
      requests += 1;
      await routeImageResult(route);
    });
    await openWorkspace(page);
    await patchProvider(
      page,
      state === "cooldown"
        ? { state, cooldownUntil: Date.now() + 60 * 60 * 1000 }
        : { state, cooldownUntil: undefined },
    );
    const source = await selectImageNode(page);
    const prompt = `${state} 时保留草稿`;
    await source.getByLabel("图片提示词").fill(prompt);
    await chooseOneOutput(source);
    await source.getByRole("button", { name: "生成图片", exact: true }).click();
    await expect(source.locator("[role=status]")).toContainText(
      state === "cooldown" ? "冷却" : "隔离",
    );
    await expect(source.getByLabel("图片提示词")).toHaveValue(prompt);
    expect(requests).toBe(0);
    expect((await activeProject(page)).tasks).toHaveLength(0);
  });
}

test("uploaded image redraw uses edits with the archived reference bytes", async ({
  page,
}) => {
  // This flow archives and reloads a 2.35 MB original before serializing a
  // multipart request. Give slow CI disks/CPUs a bounded I/O budget while
  // retaining the real image and the complete request-byte assertion.
  test.slow();
  await configure(page);
  let editBody: Buffer | undefined;
  await page.route(editsEndpoint, async (route) => {
    editBody = route.request().postDataBuffer() ?? undefined;
    await routeImageResult(route);
  });
  await openWorkspace(page);
  const source = await selectImageNode(page);
  await source
    .locator('input[type="file"]')
    .first()
    .setInputFiles(referencePath);
  await expect(source.locator(".uploaded-image")).toBeVisible({
    timeout: 15000,
  });
  await source.getByRole("button", { name: "重绘参考图片" }).click();
  const dialog = page.getByRole("dialog", { name: "重绘参考图片" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("重绘指令").fill("保留主体并改成蓝调夜景");
  await dialog.getByRole("button", { name: "开始重绘", exact: true }).click();
  await page.getByRole("button", { name: "批准并提交" }).click();
  // The route is registered before submission, so it also captures a request
  // sent during click(). Start the I/O budget after actionability has settled.
  await expect.poll(() => editBody, { timeout: 15000 }).toBeDefined();
  const referenceBytes = readFileSync(referencePath);
  expect(editBody!.includes(referenceBytes)).toBe(true);
  expect(editBody!.toString("utf8")).toContain("image");
  await expect
    .poll(async () => (await activeProject(page)).tasks.at(-1)?.status, {
      timeout: 15000,
    })
    .toBe("succeeded");
});

test("unconfigured canvas generation opens provider settings and keeps the prompt", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  const source = await selectImageNode(page);
  const prompt = "未配置时仍保留这段提示词";
  await source.getByLabel("图片提示词").fill(prompt);
  await chooseOneOutput(source);
  await source.getByRole("button", { name: "生成图片", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "设置" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "模型接入", exact: true }),
  ).toBeVisible();
  await expect(source.getByLabel("图片提示词")).toHaveValue(prompt);
});

test("declining canvas approval clears only its source status and sends no request", async ({
  page,
}) => {
  await configure(page);
  let requests = 0;
  await page.route(generationsEndpoint, async (route) => {
    requests++;
    await routeImageResult(route);
  });
  await openWorkspace(page);
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page.getByRole("menuitem", { name: "图片", exact: true }).click();
  const source = await selectAddedImageNode(page);
  const sourceId = await source.getAttribute("data-node-id");
  await source.getByLabel("图片提示词").fill("取消审批后保留草稿");
  await chooseOneOutput(source);
  await source.getByRole("button", { name: "生成图片", exact: true }).click();
  await page
    .getByRole("dialog", { name: "人工审批任务" })
    .getByRole("button", { name: "取消任务", exact: true })
    .click();
  await expect
    .poll(async () => (await activeProject(page)).tasks.at(-1)?.status)
    .toBe("cancelled");
  const project = await activeProject(page);
  expect(
    project.items.find((item) => item.id === sourceId)?.generationStatus,
  ).toBeUndefined();
  expect(
    project.items.find((item) => item.id === "image")?.generationStatus,
  ).toBeUndefined();
  await expect(source.getByLabel("图片提示词")).toHaveValue(
    "取消审批后保留草稿",
  );
  expect(requests).toBe(0);
});

test("actual long model identifiers remain readable without covering canvas controls", async ({
  page,
}) => {
  const model =
    "image-provider-model-with-a-long-custom-deployment-identifier-v2026";
  await configure(page, model);
  await openWorkspace(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const source = await selectImageNode(page);
  const button = source.locator(".model-button");
  await expect(button).toHaveAttribute("title", model);
  await expect(button.locator(".model-name")).toHaveText(model);
  expect(
    await button
      .locator(".model-name")
      .evaluate((element) => element.scrollWidth > element.clientWidth),
  ).toBe(true);
  const bounds = await button.boundingBox();
  const params = await source.locator(".image-params").boundingBox();
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(params!.x);
  await button.click();
  await source.getByRole("button", { name: "切换全部模型" }).click();
  await expect(
    source.getByRole("menuitemradio", { name: model, exact: false }),
  ).toContainText(model);
  await page.keyboard.press("Escape");
  await expect(source.getByRole("menu", { name: "选择模型" })).toHaveCount(0);
});
