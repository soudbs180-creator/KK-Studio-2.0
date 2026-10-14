import { expect, test, type Locator, type Page } from "@playwright/test";
import { build } from "esbuild";
import { createRequire } from "node:module";
import type { CanvasCollectionItem } from "../../src/domain/canvasItems";
import { createProjectCanvas } from "../../src/domain/projectCanvas";
import {
  CREATION_STORAGE_KEY,
  createProject,
  createTask,
  emptySnapshot,
  type CreationSnapshot,
  type CreationTask,
} from "../../src/features/creation/model";
import { decodeSnapshot } from "../../src/features/creation/snapshotCodec";
import { expandSidebar, openWorkspace } from "./helpers";

const projectName = "旧卡片动作夹具";
const legacyStates = [
  ["image", "pending"],
  ["image", "error"],
  ["video", "ready"],
  ["video", "pending"],
  ["video", "error"],
  ["text", "ready"],
  ["audio", "ready"],
] as const;

function legacyItem(
  kind: CanvasCollectionItem["kind"],
  state: NonNullable<CanvasCollectionItem["generationStatus"]>,
): CanvasCollectionItem {
  return {
    id: `added-legacy-${kind}-${state}`,
    title: `旧${kind}-${state}`,
    description: "旧项目恢复夹具",
    kind,
    prompt: "保留的旧草稿",
    model: "legacy-model-id",
    generationStatus: state,
    generationIndex: 0,
    preview:
      kind === "image" && state === "error"
        ? "/fixtures/demo/blue-hour.png"
        : undefined,
    result:
      state === "ready"
        ? {
            id: `legacy-result-${kind}`,
            kind,
            title: `旧${kind}结果`,
            description: "固定本地恢复夹具",
            source: kind === "text" ? "provider" : "demo",
            ...(kind === "video" && {
              src: "/fixtures/demo/blue-hour-motion.webm",
              poster: "/fixtures/demo/blue-hour.png",
            }),
            ...(kind === "audio" && {
              src: "/fixtures/demo/blue-hour-ambient.wav",
            }),
            ...(kind === "text" && { text: "旧文本结果：完整保留" }),
          }
        : undefined,
  };
}

async function snapshot(page: Page): Promise<CreationSnapshot> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    CREATION_STORAGE_KEY,
  );
}

async function activeProject(page: Page) {
  const state = await snapshot(page);
  return state.projects.find(
    (project) => project.id === state.activeProjectId,
  )!;
}

async function reopen(page: Page): Promise<void> {
  await page.reload();
  if ((page.viewportSize()?.width ?? 1920) >= 768) await expandSidebar(page);
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page
    .locator(".project-library-card")
    .filter({ hasText: projectName })
    .click();
  const close = page.getByRole("button", { name: "收起对话", exact: true });
  if (await close.isVisible()) await close.click();
}

async function seed(page: Page, item: CanvasCollectionItem): Promise<void> {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "项目库", exact: true }),
  ).toBeVisible();
  const project = {
    ...createProject({
      prompt: "",
      model: "legacy-model-id",
      kind: item.kind,
      attachments: [],
    }),
    name: projectName,
    items: [item],
    canvas: createProjectCanvas([item]),
    messages: [],
    tasks: [],
  };
  const value = decodeSnapshot({
    ...emptySnapshot(),
    revision: Date.now(),
    activeProjectId: project.id,
    projects: [project],
  });
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: CREATION_STORAGE_KEY, value },
  );
  await reopen(page);
}

async function select(
  page: Page,
  item: CanvasCollectionItem,
  hasContent = true,
): Promise<Locator> {
  const node = page.getByTestId(`canvas-node-${item.id}`);
  await node.focus();
  await node.press("Enter");
  const toolbar = page.getByRole("toolbar", {
    name: `${item.kind === "image" ? "图片" : "卡片"}操作：${item.title}`,
    exact: true,
  });
  if (hasContent) await expect(toolbar).toBeVisible();
  await expect(page.locator(".image-selection-toolbar")).toHaveCount(
    hasContent ? 1 : 0,
  );
  return toolbar;
}

for (const width of [390, 1099, 1920]) {
  for (const [kind, state] of legacyStates) {
    test(`旧${kind} ${state}按实际内容展示动作且可撤销删除 ${width}`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
      const submissions: string[] = [];
      page.on("request", (request) => {
        if (
          request.method() === "POST" &&
          /\/images\/(?:generations|edits)|\/chat\/completions|\/agent\/codex\/turn/.test(
            request.url(),
          )
        )
          submissions.push(request.url());
      });
      const item = legacyItem(kind, state);
      await seed(page, item);
      const node = page.getByTestId(`canvas-node-${item.id}`);
      const hasContent = Boolean(item.result || item.preview);
      let toolbar = await select(page, item, hasContent);
      await expect(
        node.getByRole("button", { name: `删除${item.title}`, exact: true }),
      ).toHaveCount(0);
      if (hasContent)
        await expect(
          toolbar.getByRole("button", {
            name: `删除${item.title}`,
            exact: true,
          }),
        ).toHaveAttribute("title", /归档原件保留/);
      if (!item.result) {
        await expect(node.locator(".demo-pending-spinner")).toHaveCount(0);
        await expect(
          node.getByRole("button", { name: /^试用.*示范$/ }),
        ).toHaveCount(0);
      }
      if (kind === "image") {
        for (const action of hasContent ? ["预览", "重绘"] : []) {
          const button = toolbar.getByRole("button", {
            name: action + item.title,
            exact: true,
          });
          await expect(button).toBeDisabled();
          await expect(button).toHaveAttribute("title", /结果卡片.*核对/);
          await expect(button).toHaveAttribute(
            "aria-description",
            /结果卡片.*核对/,
          );
        }
        await expect(node).toContainText("图片结果尚未恢复");
        await expect(
          node.getByRole("button", { name: "试用图片示范", exact: true }),
        ).toHaveCount(0);
        await expect(
          page.getByRole("button", { name: "生成图片", exact: true }),
        ).toHaveCount(0);
      }
      if (kind === "image" && hasContent) {
        await toolbar
          .getByRole("button", { name: `喜欢${item.title}`, exact: true })
          .click();
        await toolbar
          .getByRole("button", { name: "编辑标签", exact: true })
          .click();
        const editor = page.getByRole("dialog", {
          name: "编辑标签",
          exact: true,
        });
        await editor.getByRole("button", { name: "人物", exact: true }).click();
        await editor
          .getByRole("button", { name: "关闭标签编辑", exact: true })
          .click();
        await expect
          .poll(async () => {
            const current = await activeProject(page);
            return {
              liked: current.likedIds.includes(item.id),
              tags: current.items[0].tags,
            };
          })
          .toEqual({ liked: true, tags: ["人物"] });
        await reopen(page);
        toolbar = await select(page, item, hasContent);
        await expect(
          toolbar.getByRole("button", {
            name: `取消喜欢${item.title}`,
            exact: true,
          }),
        ).toHaveAttribute("aria-pressed", "true");
        expect((await activeProject(page)).items[0]).toMatchObject({
          prompt: item.prompt,
          model: item.model,
          generationStatus: state,
          generationIndex: 0,
          tags: ["人物"],
        });
      }
      const before = await activeProject(page);
      await page.screenshot({
        path: info.outputPath(`${kind}-${state}-${width}.png`),
        animations: "disabled",
      });
      if (hasContent)
        await toolbar
          .getByRole("button", { name: `删除${item.title}`, exact: true })
          .click();
      else {
        await node.focus();
        await node.press("Shift+F10");
        const menu = page.getByRole("menu", {
          name: `卡片菜单：${item.title}`,
          exact: true,
        });
        await expect(menu).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(menu).toHaveCount(0);
        await expect(node).toBeFocused();
        if (width === 1920) await node.click({ button: "right" });
        else await node.press("Shift+F10");
        await menu
          .getByRole("menuitem", { name: `删除${item.title}`, exact: true })
          .click();
      }
      await expect(node).toHaveCount(0);
      await expect(page.locator(".image-selection-toolbar")).toHaveCount(0);
      await expect
        .poll(async () => (await activeProject(page)).items.length)
        .toBe(0);
      const canvas = page.getByTestId("infinite-canvas");
      await canvas.focus();
      await canvas.press("Control+Z");
      await expect(node).toBeVisible();
      await expect
        .poll(async () => {
          const restored = await activeProject(page);
          return {
            items: restored.items,
            positions: restored.canvas.positions,
            edges: restored.canvas.edges,
          };
        })
        .toEqual({
          items: before.items,
          positions: before.canvas.positions,
          edges: before.canvas.edges,
        });
      await canvas.press("Control+Shift+Z");
      await expect(node).toHaveCount(0);
      expect(submissions).toEqual([]);
    });
  }
}

for (const width of [390, 1920]) {
  for (const title of ["Markdown", "HTML"]) {
    test(`${title}专属动作只在选中顶部出现并保留编辑预览 ${width}`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
      await openWorkspace(page);
      await page.getByRole("button", { name: "添加资源", exact: true }).click();
      await page.getByRole("menuitem", { name: title, exact: true }).click();
      const type = title === "HTML" ? "html:render" : "markdown:doc";
      const content =
        title === "HTML"
          ? "<p>保留 HTML 正文</p>"
          : "# 保留 Markdown 正文\n\n**完整内容**";
      const node = page.locator(`[data-plugin-type="${type}"]`);
      const frame = page.locator(
        `[data-canvas-node]:has([data-plugin-type="${type}"])`,
      );
      const toolbar = page.getByRole("toolbar", {
        name: `卡片操作：${title}`,
        exact: true,
      });
      await expect(toolbar).toHaveCount(0);
      await expect(node.locator(".plugin-node-toolbar")).toHaveCount(0);
      await node.getByTitle(`编辑 ${title} 源码`, { exact: true }).click();
      await expect(toolbar).toHaveCount(0);
      await node.locator("textarea").fill(content);
      await expect(toolbar).toBeVisible();
      await toolbar.getByTitle("预览渲染结果", { exact: true }).click();
      if (title === "HTML")
        await expect(node.locator("iframe")).toHaveAttribute("srcdoc", content);
      else
        await expect(node.getByRole("heading", { level: 1 })).toHaveText(
          "保留 Markdown 正文",
        );
      await page.keyboard.press("Escape");
      await expect(toolbar).toHaveCount(0);
      await frame.focus();
      await frame.press("Enter");
      await expect(toolbar).toBeVisible();
      const canvas = page.getByTestId("infinite-canvas");
      await canvas.focus();
      for (let step = 0; step < 4; step++) await canvas.press("Control+-");
      const edit = toolbar.getByTitle(`编辑 ${title} 源码`, { exact: true });
      await expect
        .poll(() =>
          edit.evaluate((element) => {
            const box = element.getBoundingClientRect();
            return {
              height: Math.round(box.height),
              hit: element.contains(
                document.elementFromPoint(
                  box.x + box.width / 2,
                  box.y + box.height / 2,
                ),
              ),
            };
          }),
        )
        .toEqual({ height: 32, hit: true });
      await edit.click();
      await expect(node.locator("textarea")).toHaveValue(content);
      await node.locator("textarea").fill("   ");
      await expect(toolbar).toHaveCount(0);
      await node.getByTitle("预览渲染结果", { exact: true }).click();
      await node.getByTitle(`编辑 ${title} 源码`, { exact: true }).click();
      await expect(node.locator("textarea")).toHaveValue("   ");
      await node.locator("textarea").fill(content);
      await expect(toolbar).toBeVisible();
      await page.screenshot({
        path: info.outputPath(`${title}-${width}.png`),
        animations: "disabled",
      });
    });
  }
}

test("缺失插件仍有可用的选中公共工具栏", async ({ page }) => {
  const item: CanvasCollectionItem = {
    id: "added-legacy-plugin",
    title: "旧插件",
    description: "插件恢复夹具",
    kind: "text",
    plugin: {
      type: "missing-legacy:doc",
      width: 360,
      height: 300,
      metadata: { content: "保留正文" },
    },
  };
  await seed(page, item);
  await expect(page.getByTestId(`canvas-node-${item.id}`)).toContainText(
    "插件未加载",
  );
  const toolbar = await select(page, item);
  await expect(
    toolbar.getByRole("button", { name: "喜欢旧插件", exact: true }),
  ).toBeVisible();
  await expect(
    toolbar.getByRole("button", { name: "编辑标签", exact: true }),
  ).toBeVisible();
  await toolbar
    .getByRole("button", { name: "删除旧插件", exact: true })
    .click();
  await expect(page.getByTestId(`canvas-node-${item.id}`)).toHaveCount(0);
});

for (const [kind, prompt, content, hasContent] of [
  ["text", "", undefined, false],
  ["text", "已保存的文案草稿", undefined, false],
  ["audio", "音频提示词不等于实际音频", undefined, false],
  ["plugin", "", "", false],
  ["plugin", "", "   ", false],
] as const) {
  test(`${kind}草稿和插件控制字段按真实正文分类 ${hasContent ? "有内容" : "空白"} ${content ?? prompt}`, async ({
    page,
  }) => {
    const item: CanvasCollectionItem = {
      id: "legacy-card-without-added-prefix",
      title: "旧空态卡片",
      description: "内容状态夹具",
      kind: kind === "plugin" ? "text" : kind,
      prompt,
      ...(kind === "plugin" && {
        plugin: {
          type: "missing-legacy:note",
          metadata: { content, editing: true, pluginColor: "#aabbcc" },
        },
      }),
    };
    await seed(page, item);
    const node = page.getByTestId(`canvas-node-${item.id}`);
    await select(page, item, hasContent);
    // Frame deletion is intentionally independent of generated ids and toolbar visibility.
    await node.focus();
    await node.press("Delete");
    await expect(node).toHaveCount(0);
    const canvas = page.getByTestId("infinite-canvas");
    await canvas.focus();
    await canvas.press("Control+Z");
    await expect(node).toBeVisible();
    expect((await activeProject(page)).items).toEqual([item]);
    await node.focus();
    await node.press("Backspace");
    await expect(node).toHaveCount(0);
  });
}

test("旧视频原件恢复失败后只提供重新上传且不显示内容工具栏", async ({
  page,
}) => {
  const assetId = `asset-${"0".repeat(24)}`;
  const item: CanvasCollectionItem = {
    id: "legacy-missing-video-original",
    title: "旧视频原件",
    description: "缺失原件恢复夹具",
    kind: "video",
    assetId,
    preview: `kk-asset:${assetId}`,
    prompt: "保留视频草稿",
  };
  await seed(page, item);
  await select(page, item, false);
  const node = page.getByTestId(`canvas-node-${item.id}`);
  await expect(
    node.getByRole("button", { name: "上传视频", exact: true }),
  ).toBeVisible();
  await expect(node.locator("video")).toHaveCount(0);
  await expect(page.locator(".image-selection-toolbar")).toHaveCount(0);
  await expect(page.getByTestId("video-composer")).toContainText(
    "原件无法恢复",
  );
  expect((await activeProject(page)).items[0]).toMatchObject({
    assetId,
    prompt: item.prompt,
  });
});

for (const kind of ["image", "video", "audio"] as const) {
  test(`损坏${kind}结果显示恢复说明且有效封面不冒充媒体可用`, async ({
    page,
  }, info) => {
    const extension =
      kind === "image" ? "png" : kind === "video" ? "webm" : "wav";
    const missing = `/fixtures/demo/missing-result-${kind}.${extension}`;
    await page.route(`**${missing}`, (route) =>
      route.fulfill({ status: 404, body: "missing media" }),
    );
    const item: CanvasCollectionItem = {
      ...legacyItem(kind, "ready"),
      result: { ...legacyItem(kind, "ready").result!, src: missing },
    };
    await seed(page, item);
    const node = page.getByTestId(`canvas-node-${item.id}`);
    await select(page, item, false);
    await expect(node.locator(".demo-badge")).toHaveText("预览不可用");
    await expect(node.getByRole("status")).toContainText(
      "任务记录核对并恢复原件",
    );
    await expect(node.getByRole("status")).toBeVisible();
    await expect(page.locator(".image-selection-toolbar")).toHaveCount(0);
    await expect(node.getByRole("button", { name: /^上传/ })).toHaveCount(0);
    if (kind === "video") {
      await expect(node.locator("video")).toHaveAttribute(
        "poster",
        "/fixtures/demo/blue-hour.png",
      );
    }
    if (kind !== "image")
      await expect(
        node.getByRole("button", { name: `预览${item.title}`, exact: true }),
      ).toBeDisabled();
    expect((await activeProject(page)).items[0].result).toEqual(item.result);
    await page.screenshot({
      path: info.outputPath(`unavailable-${kind}.png`),
      animations: "disabled",
    });
    await node.focus();
    await node.press("Delete");
    await expect(node).toHaveCount(0);
    const canvas = page.getByTestId("infinite-canvas");
    await canvas.focus();
    await canvas.press("Control+Z");
    await expect(node).toBeVisible();
    expect((await activeProject(page)).items[0].result).toEqual(item.result);
  });
}

async function archivedHash(page: Page, assetId: string): Promise<string> {
  return page.evaluate(async (id) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open("kk-studio-assets", 1);
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    const blob = await new Promise<Blob>((resolve, reject) => {
      const read = db.transaction("blobs").objectStore("blobs").get(id);
      read.onsuccess = () => resolve(read.result.blob);
      read.onerror = () => reject(read.error);
    });
    db.close();
    const digest = await crypto.subtle.digest(
      "SHA-256",
      await blob.arrayBuffer(),
    );
    return [...new Uint8Array(digest)]
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
  }, assetId);
}

test("旧视频结果顶部删除可撤销且归档原件不变", async ({ page }) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page.getByRole("menuitem", { name: "视频", exact: true }).click();
  const uploaded = page.getByTestId(/^canvas-node-added-video-/).last();
  const id = (await uploaded.getAttribute("data-node-id"))!;
  await uploaded
    .locator('input[accept="video/mp4,video/webm"]')
    .setInputFiles("public/fixtures/demo/blue-hour-motion.webm");
  await expect(uploaded.locator("video")).toBeVisible();
  await expect
    .poll(
      async () =>
        (await activeProject(page)).items.find((item) => item.id === id)
          ?.assetId,
    )
    .toBeTruthy();
  const value = await snapshot(page);
  const project = value.projects.find(
    (entry) => entry.id === value.activeProjectId,
  )!;
  const original = project.items.find((item) => item.id === id)!;
  const item: CanvasCollectionItem = {
    ...original,
    generationIndex: 0,
    generationStatus: "ready",
    result: legacyItem("video", "ready").result,
  };
  const source = project.items.find((entry) => entry.kind === "image")!;
  project.name = projectName;
  project.items = [source, item];
  project.canvas = createProjectCanvas(project.items);
  project.canvas.edges = [
    {
      id: "legacy-result-edge",
      source: source.id,
      target: item.id,
      kind: "result",
    },
  ];
  value.revision = Math.max(value.revision + 1, Date.now());
  const checked = decodeSnapshot(value);
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: CREATION_STORAGE_KEY, value: checked },
  );
  await reopen(page);
  const toolbar = await select(page, item);
  const before = await activeProject(page);
  const hash = await archivedHash(page, item.assetId!);
  await toolbar
    .getByRole("button", { name: `删除${item.title}`, exact: true })
    .click();
  await expect(page.getByTestId(`canvas-node-${id}`)).toHaveCount(0);
  expect(await archivedHash(page, item.assetId!)).toBe(hash);
  const canvas = page.getByTestId("infinite-canvas");
  await canvas.focus();
  await canvas.press("Control+Z");
  await expect(page.getByTestId(`canvas-node-${id}`)).toBeVisible();
  await expect
    .poll(async () => {
      const restored = await activeProject(page);
      return {
        items: restored.items,
        positions: restored.canvas.positions,
        edges: restored.canvas.edges,
      };
    })
    .toEqual({
      items: before.items,
      positions: before.canvas.positions,
      edges: before.canvas.edges,
    });
  expect(await archivedHash(page, item.assetId!)).toBe(hash);
  await canvas.press("Control+Shift+Z");
  await expect(page.getByTestId(`canvas-node-${id}`)).toHaveCount(0);
  expect(await archivedHash(page, item.assetId!)).toBe(hash);
});

test("codec上下文区分同卡任务、别卡任务和本地视频实际执行者", async () => {
  // Render the real component with runtime context, without reload recovery
  // converting every queued/running fixture into an interrupted task.
  const bundled = await build({
    stdin: {
      resolveDir: process.cwd(),
      loader: "tsx",
      contents: `
        import React from "react";
        import { renderToStaticMarkup } from "react-dom/server";
        import DemoResultNode from "./src/components/nodes/DemoResultNode";
        import { CanvasImageCommandContext } from "./src/features/creation/CanvasImageCommand";
        export const renderFixture = (item, tasks, generationActive = false) => renderToStaticMarkup(
          React.createElement(CanvasImageCommandContext.Provider, {
            value: { tasks, model: "", models: [], submit: async () => undefined, cancel() {} },
          }, React.createElement(DemoResultNode, { item, editing: { generationActive }, onChange() {}, onDelete() {}, onResult() {} })),
        );
      `,
    },
    bundle: true,
    platform: "node",
    format: "cjs",
    packages: "external",
    loader: { ".css": "empty" },
    write: false,
    logLevel: "silent",
  });
  const fixtureModule = {
    exports: {} as {
      renderFixture: (
        item: CanvasCollectionItem,
        tasks: CreationTask[],
        generationActive?: boolean,
      ) => string;
    },
  };
  new Function("require", "module", "exports", bundled.outputFiles[0].text)(
    createRequire(import.meta.url),
    fixtureModule,
    fixtureModule.exports,
  );
  for (const [status, matching, expected] of [
    ["queued", true, "等待生成"],
    ["running", true, "正在生成"],
    ["running", false, "图片结果尚未恢复"],
    [undefined, false, "图片结果尚未恢复"],
  ] as const) {
    const item = legacyItem("image", "pending");
    const other = {
      ...item,
      id: "added-other-image",
      generationIndex: undefined,
    };
    const project = createProject({
      prompt: "活动状态上下文夹具",
      model: item.model!,
      kind: "image",
      attachments: [],
    });
    project.items = [item, other];
    project.canvas = createProjectCanvas(project.items);
    project.tasks = status
      ? [
          {
            ...createTask(project),
            status,
            sourceItemId: matching ? item.id : other.id,
          },
        ]
      : [];
    const checked = decodeSnapshot({
      ...emptySnapshot(),
      revision: 1,
      activeProjectId: project.id,
      projects: [project],
    }).projects[0];
    const html = fixtureModule.exports.renderFixture(
      checked.items[0],
      checked.tasks,
    );
    expect(html).toContain(expected);
    if (status && matching) {
      expect(html).not.toContain("未恢复");
      expect(html).not.toContain("重新提交");
      expect(html).toContain("任务记录查看进度");
    } else expect(html).not.toContain("demo-pending-spinner");
    expect(html).not.toContain("试用图片示范");
    expect(checked.items[0]).toMatchObject({
      generationStatus: "pending",
      generationIndex: 0,
    });
  }
  for (const generationActive of [false, true]) {
    const item = legacyItem("video", "pending");
    const project = {
      ...createProject({
        prompt: "本地视频上下文",
        model: "legacy",
        kind: "video",
        attachments: [],
      }),
      items: [item],
      canvas: createProjectCanvas([item]),
      tasks: [],
    };
    const checked = decodeSnapshot({
      ...emptySnapshot(),
      revision: 1,
      activeProjectId: project.id,
      projects: [project],
    }).projects[0];
    const html = fixtureModule.exports.renderFixture(
      checked.items[0],
      [],
      generationActive,
    );
    if (generationActive) {
      expect(html).toContain("demo-pending-spinner");
      expect(html).toContain("来源卡片取消");
      expect(html).not.toContain("未恢复");
    } else {
      expect(html).toContain("视频结果尚未恢复");
      expect(html).not.toContain("demo-pending-spinner");
    }
    expect(html).not.toContain("试用视频示范");
  }
});
