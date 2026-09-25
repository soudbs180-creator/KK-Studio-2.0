import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { type Page } from "@playwright/test";
import type { CreationSnapshot } from "../../src/features/creation/model";
type StorageTestWindow = Window & {
  storageTest: {
    reads: number;
    writes: number | unknown[];
    saved: CreationSnapshot | null;
  };
};

async function stored(page: Page) {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem("kk-studio-next:creation:v1") ?? "null"),
  );
}

test("读取失败后的重试和编辑不会写入空项目", async ({ page }) => {
  await page.addInitScript(() => {
    const state = { reads: 0, writes: [] as unknown[] };
    Object.assign(window, {
      storageTest: state,
      __TAURI_INTERNALS__: {
        invoke: async (command: string, args: { snapshot?: unknown }) => {
          if (command === "read_creation_snapshot") {
            state.reads++;
            throw new Error("corrupt: 项目与备份均损坏，未覆盖原件");
          }
          if (command === "write_creation_snapshot") {
            state.writes.push(args.snapshot);
            return;
          }
          if (command === "credential_get") return null;
          throw new Error(`Unexpected IPC: ${command}`);
        },
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: /重新读取|重试保存/ }).click();
  await page.getByLabel("创作提示词").fill("保留我的未保存草稿");
  await expect(page.getByRole("alert")).toContainText(/读取|保护/);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as StorageTestWindow).storageTest.reads,
      ),
    )
    .toBeGreaterThan(1);
  expect(
    await page.evaluate(
      () => (window as unknown as StorageTestWindow).storageTest.writes,
    ),
  ).toEqual([]);
  expect(
    await page.evaluate(() =>
      localStorage.getItem("kk-studio-next:creation:v1"),
    ),
  ).toBeNull();
  await page.reload();
  await expect(page.getByRole("alert")).toContainText(/读取|保护/);
  expect(
    await page.evaluate(
      () => (window as unknown as StorageTestWindow).storageTest.writes,
    ),
  ).toEqual([]);
});

test("写入失败重试成功后清除过期错误并保留内容", async ({ page }) => {
  await page.addInitScript(() => {
    const state = { writes: 0, saved: null as unknown };
    Object.assign(window, {
      storageTest: state,
      __TAURI_INTERNALS__: {
        invoke: async (command: string, args: { snapshot?: unknown }) => {
          if (command === "read_creation_snapshot")
            return { status: "missing", snapshot: null };
          if (command === "write_creation_snapshot") {
            state.writes++;
            if (state.writes === 1) throw new Error("io: synthetic disk full");
            state.saved = args.snapshot;
            return;
          }
          if (command === "credential_get") return null;
          throw new Error(`Unexpected IPC: ${command}`);
        },
      },
    });
  });
  await page.goto("/");
  await page.getByLabel("创作提示词").fill("写盘失败后保留的内容");
  await expect(page.getByRole("alert")).toContainText("保存失败");
  await page.getByRole("button", { name: "重试保存", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as StorageTestWindow).storageTest.saved?.homeDraft
            .prompt,
      ),
    )
    .toBe("写盘失败后保留的内容");
  await expect(page.locator(".creation-storage-notice")).toHaveCount(0);
  await expect(page.getByLabel("创作提示词")).toHaveValue(
    "写盘失败后保留的内容",
  );
});

test("同 revision 的不同草稿不能被误标为已保存", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("创作提示词").fill("耐久原件");
  await expect
    .poll(async () => (await stored(page))?.homeDraft.prompt)
    .toBe("耐久原件");
  await page.evaluate(() => {
    const durable = JSON.parse(
      localStorage.getItem("kk-studio-next:creation:v1")!,
    );
    sessionStorage.setItem(
      "kk-studio-next:creation:v1:pending",
      JSON.stringify({
        baseRevision: durable.revision,
        snapshot: {
          ...durable,
          homeDraft: { ...durable.homeDraft, prompt: "不同内容的同版本草稿" },
        },
      }),
    );
  });
  await page.reload();
  await expect(page.getByRole("alert")).toContainText(/冲突|版本/);
  expect((await stored(page)).homeDraft.prompt).toBe("耐久原件");
});

test("重新读取同一项目后搜索与改名使用新原件", async ({ page }) => {
  await page.addInitScript(() => {
    const snapshot = (remote: boolean) => ({
      version: 2,
      revision: remote ? 5 : 1,
      activeProjectId: "same-project",
      homeDraft: {},
      projects: [
        {
          id: "same-project",
          name: "同一项目",
          likedIds: ["image"],
          items: [
            {
              id: "image",
              kind: "image",
              title: remote ? "远端新名称" : "旧名称",
              description: remote ? "远端描述" : "旧描述",
              prompt: remote ? "远端草稿" : "旧草稿",
            },
            ...(remote
              ? [
                  {
                    id: "added-text-remote",
                    kind: "text",
                    title: "另一窗口新增",
                    description: "保留",
                  },
                ]
              : []),
          ],
        },
      ],
    });
    const state = { conflict: false, saved: null as unknown };
    Object.assign(window, {
      storageTest: state,
      __TAURI_INTERNALS__: {
        invoke: async (command: string, args: { snapshot?: unknown }) => {
          if (command === "read_creation_snapshot")
            return {
              status: "loaded",
              snapshot: state.saved ?? snapshot(state.conflict),
            };
          if (command === "credential_get") return null;
          if (command === "write_creation_snapshot") {
            if (!state.conflict) {
              state.conflict = true;
              throw new Error("conflict: another window");
            }
            state.saved = args.snapshot;
            return;
          }
          throw new Error(`Unexpected IPC: ${command}`);
        },
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.getByRole("button", { name: /同一项目/ }).click();
  await expect(page.getByRole("alert")).toContainText("读取保护");
  await page.getByRole("button", { name: "重新读取", exact: true }).click();
  await expect(page.getByTestId("canvas-node-added-text-remote")).toBeVisible();
  await page
    .getByRole("button", { name: "打开喜欢与收藏", exact: true })
    .click();
  const likes = page.locator(".saved-likes");
  await expect(likes).toContainText("远端新名称");
  await likes.getByRole("button", { name: "编辑", exact: true }).click();
  await likes.getByLabel("喜欢名称").fill("本次改名");
  await likes.getByRole("button", { name: "保存名称", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as StorageTestWindow).storageTest.saved
            ?.projects[0].items[0].title,
      ),
    )
    .toBe("本次改名");
  const items = await page.evaluate(
    () =>
      (window as unknown as StorageTestWindow).storageTest.saved!.projects[0]
        .items,
  );
  expect(items).toHaveLength(2);
  expect(items[0].prompt).toBe("远端草稿");
});

test("A/B 项目的连线、视口和位置在切换及刷新后保持隔离", async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "yes");
    localStorage.setItem(
      "kk-studio-next:creation:v1",
      JSON.stringify({
        version: 2,
        revision: 1,
        activeProjectId: null,
        homeDraft: {},
        projects: ["A", "B"].map((id) => ({
          id,
          name: `项目 ${id}`,
          items: [
            {
              id: "image",
              kind: "image",
              title: "图片创建卡片",
              description: "",
            },
            {
              id: "video1",
              kind: "video",
              title: "视频卡片 1",
              description: "",
            },
          ],
        })),
      }),
    );
  });
  await page.goto("/");
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.getByRole("button", { name: /项目 A/ }).click();
  const node = page.locator('[data-node-id="image"]');
  await node.focus();
  await node.press("ArrowRight");
  const edge = page.getByRole("button", {
    name: "连接 图片创建卡片 → 视频卡片 1",
    exact: true,
  });
  await edge.focus();
  await edge.press("Delete");
  await expect(edge).toHaveCount(0);
  const canvas = page.getByTestId("infinite-canvas");
  await canvas.focus();
  await canvas.press("Control+-");
  await expect(page.locator(".project-save-state")).toContainText("已保存");
  const a = (await stored(page)).projects.find(
    (project: { id: string }) => project.id === "A",
  ).canvas;
  expect(a.positions.image.x).toBe(90);
  expect(a.edges).toEqual([]);
  expect(a.viewport.scale).toBeLessThan(1);
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.getByRole("button", { name: /项目 B/ }).click();
  await expect(node).toHaveCSS("left", "82px");
  await expect(edge).toHaveCount(1);
  await node.focus();
  await node.press("ArrowDown");
  await expect(page.locator(".project-save-state")).toContainText("已保存");
  await page.reload();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.getByRole("button", { name: /项目 A/ }).click();
  await expect(node).toHaveCSS("left", "90px");
  await expect(edge).toHaveCount(0);
  const transform = await page
    .getByTestId("canvas-stage")
    .evaluate((element) => {
      const matrix = new DOMMatrix(getComputedStyle(element).transform);
      return { scale: matrix.a, x: matrix.e, y: matrix.f };
    });
  expect(transform.scale).toBeCloseTo(a.viewport.scale, 5);
  expect(transform.x).toBeCloseTo(a.viewport.x, 3);
  expect(transform.y).toBeCloseTo(a.viewport.y, 3);
  const b = (await stored(page)).projects.find(
    (project: { id: string }) => project.id === "B",
  ).canvas;
  expect(b.positions.image).toEqual({ x: 82, y: 115 });
  expect(b.edges).toHaveLength(1);
  expect(b.viewport.scale).toBe(1);
});

test("两个窗口并发保存时保留先提交的原件和冲突草稿", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.getByLabel("创作提示词").fill("initial");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("kk-studio-next:creation:v1") ?? "{}")
            .homeDraft?.prompt,
      ),
    )
    .toBe("initial");
  const second = await context.newPage();
  await second.goto("/");
  await expect(second.getByLabel("创作提示词")).toHaveValue("initial");
  await page.getByLabel("创作提示词").fill("first window saved");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("kk-studio-next:creation:v1") ?? "{}")
            .homeDraft?.prompt,
      ),
    )
    .toBe("first window saved");
  await second.getByLabel("创作提示词").fill("second window unsaved");
  await expect(second.getByRole("alert")).toContainText(/其他窗口|另一窗口/);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("kk-studio-next:creation:v1")!)
          .homeDraft.prompt,
    ),
  ).toBe("first window saved");
  const download = second.waitForEvent("download");
  await second.getByRole("button", { name: "下载未保存草稿" }).click();
  const downloaded = JSON.parse(
    await readFile((await (await download).path())!, "utf8"),
  );
  expect(downloaded.homeDraft.prompt).toBe("second window unsaved");
  await second.getByRole("button", { name: "重新读取", exact: true }).click();
  await expect(second.getByLabel("创作提示词")).toHaveValue(
    "first window saved",
  );
});

test("画布参数不会在重开项目后回到默认值", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page.getByRole("button", { name: "模型接入", exact: true }).click();
  await page.getByLabel("API Base URL").fill("https://models.example.test/v1");
  await page.getByLabel("默认模型").fill("image-test");
  await page.getByRole("button", { name: "保存供应商", exact: true }).click();
  await page.getByLabel("当前模型用途").selectOption("image");
  await page.getByLabel("支持的图片尺寸").fill("1024x1024, 1536x1024");
  await page
    .getByRole("button", { name: "保存此模型能力", exact: true })
    .click();
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await expect(page.locator(".canvas-node")).toHaveCount(0);
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page.getByRole("menuitem", { name: "图片", exact: true }).click();
  const node = page.locator("[data-testid^='canvas-node-added-image-']");
  await node.focus();
  await node.press("Enter");
  await node.getByTitle("使用当前模型声明支持的尺寸").click();
  await node
    .getByRole("button", { name: "1536x1024 · 3:2", exact: true })
    .click();
  await node.press("Escape");
  await expect(page.locator(".project-save-state")).toContainText("已保存");
  await page.reload();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page
    .getByRole("button", { name: /未命名项目/ })
    .last()
    .click();
  await node.focus();
  await node.press("Enter");
  await expect(
    node.getByRole("button", { name: "1536x1024 · 3:2" }),
  ).toBeVisible();
});

test("画布位置与新增身份在保存重开后保持", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await expect(page.locator(".canvas-node")).toHaveCount(0);
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page.getByRole("menuitem", { name: "图片", exact: true }).click();
  const node = page
    .locator("[data-testid^='canvas-node-added-image-']")
    .first();
  const initialLeft = parseFloat(
    await node.evaluate((element) => getComputedStyle(element).left),
  );
  await node.focus();
  for (let index = 0; index < 8; index++) await node.press("ArrowRight");
  await expect(node).toHaveCSS("left", `${initialLeft + 64}px`);
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page.getByRole("menuitem", { name: "图片", exact: true }).click();
  await expect(page.locator(".project-save-state")).toContainText("已保存");
  await page.reload();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page
    .getByRole("button", { name: /未命名项目/ })
    .last()
    .click();
  await expect(node).toHaveCSS("left", `${initialLeft + 64}px`);
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page.getByRole("menuitem", { name: "图片", exact: true }).click();
  const ids = await page
    .locator("[data-node-id]")
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-node-id")),
    );
  expect(new Set(ids).size).toBe(ids.length);
});
