import { expect, test, type Locator, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFileSync as readFixture } from "node:fs";
import type { CreationSnapshot } from "../../src/features/creation/model";
import { openWorkspace } from "./helpers";

const creationKey = "kk-studio-next:creation:v1";
const videoPath = "public/fixtures/demo/blue-hour-motion.webm";

async function project(page: Page) {
  return page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key)!) as CreationSnapshot;
    return state.projects.find((entry) => entry.id === state.activeProjectId)!;
  }, creationKey);
}

async function addVideo(page: Page) {
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page.getByRole("menuitem", { name: "视频", exact: true }).click();
  const added = page.getByTestId(/^canvas-node-added-video-/).last();
  const testId = (await added.getAttribute("data-testid"))!;
  return page.getByTestId(testId);
}

async function oneOutput(editor: Locator) {
  await editor.getByRole("button", { name: "生成数量", exact: true }).click();
  const option = editor.getByRole("button", { name: "生成 1 个", exact: true });
  await option.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      option.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const hit = document.elementFromPoint(
          box.x + box.width / 2,
          box.y + box.height / 2,
        );
        return element === hit || Boolean(hit && element.contains(hit));
      }),
    )
    .toBe(true);
  await option.click();
  await expect(
    editor.getByRole("group", { name: "生成数量选项", exact: true }),
  ).toBeVisible();
}

async function archivedHash(page: Page, assetId: string) {
  return page.evaluate(async (id) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("kk-studio-assets", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const record = await new Promise<{ blob: Blob }>((resolve, reject) => {
      const read = db.transaction("blobs").objectStore("blobs").get(id);
      read.onsuccess = () => resolve(read.result);
      read.onerror = () => reject(read.error);
    });
    db.close();
    const digest = await crypto.subtle.digest(
      "SHA-256",
      await record.blob.arrayBuffer(),
    );
    return [...new Uint8Array(digest)]
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
  }, assetId);
}

test("成功视频演示撤销重做不复活无执行者的等待卡片", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openWorkspace(page);
  await addVideo(page);
  const editor = page.getByTestId("video-composer");
  await editor.getByLabel("视频提示词").fill("成功演示历史");
  await oneOutput(editor);
  await editor.getByRole("button", { name: "生成视频", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await project(page)).items.filter(
          (item) => item.generationStatus === "ready",
        ).length,
    )
    .toBe(1);
  await page.getByTestId("infinite-canvas").focus();
  await page.keyboard.press("Control+Z");
  await expect
    .poll(
      async () =>
        (await project(page)).items.filter(
          (item) => item.generationStatus === "pending",
        ).length,
    )
    .toBe(0);
  await expect(
    page.locator('.demo-result-node[data-generation-state="pending"]'),
  ).toHaveCount(0);
  await page.keyboard.press("Control+Shift+Z");
  await expect
    .poll(
      async () =>
        (await project(page)).items.filter(
          (item) => item.generationStatus === "ready",
        ).length,
    )
    .toBe(1);
  await expect(
    page.locator('.demo-result-node[data-generation-state="pending"]'),
  ).toHaveCount(0);
});

for (const deletion of ["toolbar", "keyboard"]) {
  test(`视频本地演示源${deletion}删除收尾等待卡片并保留原件`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openWorkspace(page);
    const source = await addVideo(page);
    const sourceId = (await source.getAttribute("data-node-id"))!;
    await source.locator('input[type="file"]').last().setInputFiles(videoPath);
    await expect(source.locator(".video-placeholder video")).toBeVisible();
    await expect
      .poll(
        async () =>
          (await project(page)).items.find((item) => item.id === sourceId)
            ?.assetId,
      )
      .toBeTruthy();
    const before = await project(page);
    const assetId = before.items.find((item) => item.id === sourceId)!.assetId!;
    const original = createHash("sha256")
      .update(readFixture(videoPath))
      .digest("hex");
    expect(await archivedHash(page, assetId)).toBe(original);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let requested = false;
    let responded = false;
    await page.route(
      "**/fixtures/demo/blue-hour-motion.webm",
      async (route) => {
        requested = true;
        await gate;
        await route.fulfill({ path: videoPath, contentType: "video/webm" });
        responded = true;
      },
    );
    try {
      const editor = page.getByTestId("video-composer");
      await editor.getByLabel("视频提示词").fill("本地演示等待中的草稿");
      await oneOutput(editor);
      await editor
        .getByRole("button", { name: "生成视频", exact: true })
        .click();
      await expect.poll(() => requested).toBe(true);
      await expect(
        page.locator('.demo-result-node[data-generation-state="pending"]'),
      ).toHaveCount(1);
      await expect
        .poll(
          async () =>
            (await project(page)).items.filter(
              (item) => item.generationStatus === "pending",
            ).length,
        )
        .toBe(1);
      const pending = (await project(page)).items
        .filter((item) => item.generationStatus === "pending")
        .map((item) => item.id);
      expect(pending).toHaveLength(1);
      await source.focus();
      await page.keyboard.press("Enter");
      if (deletion === "toolbar") {
        await page
          .getByRole("button", { name: "画布缩放", exact: true })
          .click();
        await page.getByRole("menuitem", { name: "适应视图" }).click();
        await source.focus();
        await page.keyboard.press("Enter");
        await test.info().attach("source-toolbar-geometry", {
          contentType: "application/json",
          body: JSON.stringify(
            await page.evaluate(() => ({
              canvas: document
                .querySelector(".infinite-canvas")
                ?.getBoundingClientRect()
                .toJSON(),
              usable: (
                document.querySelector(".infinite-canvas") as HTMLElement
              )?.style.getPropertyValue("--canvas-usable-width"),
              cards: [...document.querySelectorAll(".canvas-node")].map(
                (node) => ({
                  id: node.getAttribute("data-node-id"),
                  selected: node.getAttribute("data-selected"),
                  rect: node.getBoundingClientRect().toJSON(),
                }),
              ),
              toolbars: [
                ...document.querySelectorAll(".image-selection-toolbar"),
              ].map((node) => ({
                label: node.getAttribute("aria-label"),
                style: node.getAttribute("style"),
                rect: node.getBoundingClientRect().toJSON(),
              })),
            })),
          ),
        });
        await page
          .getByRole("toolbar", { name: /^卡片操作：/ })
          .getByRole("button", { name: /^删除/ })
          .click();
      } else {
        await source.focus();
        await page.keyboard.press("Delete");
      }
      await expect(source).toHaveCount(0);
      await expect(
        page.locator('.demo-result-node[data-generation-state="pending"]'),
      ).toHaveCount(0);
      await expect(page.getByTestId(`canvas-node-${pending[0]}`)).toContainText(
        "已取消生成",
      );
      release();
      await expect.poll(() => responded).toBe(true);
      await expect
        .poll(async () =>
          (await project(page)).items
            .filter((item) => pending.includes(item.id))
            .map((item) => ({
              state: item.generationStatus,
              result: Boolean(item.result),
            })),
        )
        .toEqual([{ state: "error", result: false }]);
      expect(await archivedHash(page, assetId)).toBe(original);
      const after = await project(page);
      for (const item of before.items.filter((item) => item.id !== sourceId))
        expect(after.canvas.positions[item.id]).toEqual(
          before.canvas.positions[item.id],
        );
      await page.getByTestId("infinite-canvas").focus();
      await page.keyboard.press("Control+Z");
      await expect(source).toHaveCount(1);
      await expect(source.locator(".video-placeholder video")).toBeVisible();
      await expect(page.getByTestId(`canvas-node-${pending[0]}`)).toContainText(
        "已取消生成",
      );
      await expect(
        page.locator('.demo-result-node[data-generation-state="pending"]'),
      ).toHaveCount(0);
      await expect
        .poll(
          async () =>
            (await project(page)).items.find((item) => item.id === sourceId)
              ?.assetId,
        )
        .toBe(assetId);
      await page.keyboard.press("Control+Shift+Z");
      await expect(source).toHaveCount(0);
      await expect(page.getByTestId(`canvas-node-${pending[0]}`)).toContainText(
        "已取消生成",
      );
      await expect(
        page.locator('.demo-result-node[data-generation-state="pending"]'),
      ).toHaveCount(0);
      expect(await archivedHash(page, assetId)).toBe(original);
      await expect
        .poll(async () =>
          (await project(page)).items.some((item) => item.id === sourceId),
        )
        .toBe(false);
      await page.reload();
      await page.getByRole("button", { name: "项目库", exact: true }).click();
      await page
        .locator(".project-library-card")
        .filter({ hasText: "Agent 验证项目" })
        .click();
      await expect(page.getByTestId(`canvas-node-${pending[0]}`)).toContainText(
        "已取消生成",
      );
      await expect(
        page.locator('.demo-result-node[data-generation-state="pending"]'),
      ).toHaveCount(0);
      expect(await archivedHash(page, assetId)).toBe(original);
    } finally {
      release();
    }
  });
}

test("本地视频运行中仅锁当前节点输入和参数，取消恢复同一草稿", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openWorkspace(page);
  const source = await addVideo(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/fixtures/demo/blue-hour-motion.webm", async (route) => {
    await gate;
    await route.fulfill({ path: videoPath, contentType: "video/webm" });
  });
  try {
    const editor = page.getByTestId("video-composer");
    const prompt = editor.getByLabel("视频提示词");
    await prompt.fill("取消后继续编辑这份草稿");
    await oneOutput(editor);
    await editor.getByRole("button", { name: "生成视频", exact: true }).click();
    await expect(
      editor.getByRole("button", { name: "取消本地演示" }),
    ).toBeEnabled();
    await expect(prompt).toBeDisabled();
    for (const label of ["画布模型", "视频参数", "生成数量", "视频声音"])
      await expect(
        editor.getByRole("button", { name: label, exact: true }),
      ).toBeDisabled();
    await page.getByTestId("canvas-node-image").focus();
    await page.keyboard.press("Enter");
    await page
      .getByTestId("image-composer")
      .getByLabel("图片提示词")
      .fill("其它节点没有被冻结");
    await source.focus();
    await page.keyboard.press("Enter");
    await expect(prompt).toHaveValue("取消后继续编辑这份草稿");
    await editor.getByRole("button", { name: "取消本地演示" }).click();
    await expect(prompt).toBeEnabled();
    await expect(prompt).toHaveValue("取消后继续编辑这份草稿");
    for (const label of ["画布模型", "视频参数", "生成数量", "视频声音"])
      await expect(
        editor.getByRole("button", { name: label, exact: true }),
      ).toBeEnabled();
    await expect(
      page.locator('.demo-result-node[data-generation-state="pending"]'),
    ).toHaveCount(0);
  } finally {
    release();
  }
});

test("图片Provider本地fixture运行中锁输入和参数，保留取消", async ({
  page,
}) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page.getByRole("button", { name: "模型接入", exact: true }).click();
  await page
    .getByRole("button", { name: "API Key（官方）", exact: true })
    .click();
  await page.getByLabel("接口地址").fill("https://models.example.test/v1");
  await page.getByLabel("API Key", { exact: true }).fill("fixture-key");
  await page.getByLabel("模型名称").fill("kk-image-2");
  await page.getByRole("button", { name: "保存连接", exact: true }).click();
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let posts = 0;
  let responded = false;
  await page.route(
    "https://models.example.test/v1/images/generations",
    async (route) => {
      posts++;
      await gate;
      await route.fulfill({
        json: {
          data: [
            {
              b64_json: readFixture(
                "public/fixtures/demo/blue-hour.png",
              ).toString("base64"),
            },
          ],
        },
      });
      responded = true;
    },
  );
  try {
    await page.getByTestId("canvas-node-image").focus();
    await page.keyboard.press("Enter");
    const editor = page.getByTestId("image-composer");
    await editor.getByLabel("图片提示词").fill("本地Provider fixture草稿");
    await oneOutput(editor);
    await editor.getByRole("button", { name: "生成图片", exact: true }).click();
    await page.getByRole("button", { name: "批准并提交", exact: true }).click();
    await expect.poll(() => posts).toBe(1);
    await expect(editor.getByLabel("图片提示词")).toBeDisabled();
    await expect(
      editor.getByRole("button", { name: "画布模型", exact: true }),
    ).toBeDisabled();
    await expect(
      editor.locator('[data-control="params"] > button'),
    ).toBeDisabled();
    await expect(
      editor.getByRole("button", { name: "生成数量", exact: true }),
    ).toBeDisabled();
    await expect(
      editor.getByRole("button", { name: "取消图片生成", exact: true }),
    ).toBeEnabled();
    await editor
      .getByRole("button", { name: "取消图片生成", exact: true })
      .click();
    await expect(editor.getByLabel("图片提示词")).toBeEnabled();
    await expect(editor.getByLabel("图片提示词")).toHaveValue(
      "本地Provider fixture草稿",
    );
    // Reaching the Provider fences accepted-state uncertainty; abort is not remote rollback.
    await expect
      .poll(async () => (await project(page)).tasks.at(-1)?.status)
      .toBe("unknown");
    await expect(editor.getByRole("status")).toContainText("不会普通重试");
    release();
    await expect.poll(() => responded).toBe(true);
    const saved = await project(page);
    const task = saved.tasks.at(-1)!;
    expect(task.status).toBe("unknown");
    expect(task.submissionState).toBe("unknown");
    expect(saved.items.some((item) => item.result?.source === "provider")).toBe(
      false,
    );
    await page
      .getByRole("button", { name: "打开任务列表", exact: true })
      .click();
    await page
      .getByRole("button", { name: `查看任务 ${task.id}`, exact: true })
      .click();
    const detail = page.getByRole("dialog", { name: "任务详情", exact: true });
    await expect(detail).toContainText("供应商可能已受理");
    await expect(
      detail.getByRole("button", { name: "重试任务", exact: true }),
    ).toHaveCount(0);
    expect(posts).toBe(1);
  } finally {
    release();
  }
});

test("L和G作用于画布，输入和IME不触发，快捷键帮助准确", async ({ page }) => {
  await openWorkspace(page);
  const canvas = page.getByTestId("infinite-canvas");
  const snap = () =>
    page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("kk-canvas-ui-preferences-v1")!)
          .snapEnabled as boolean,
    );
  await canvas.focus();
  await page.keyboard.press("l");
  await expect(page.getByRole("region", { name: "画布图层" })).toBeVisible();
  await canvas.focus();
  await page.keyboard.press("l");
  await expect(page.getByRole("region", { name: "画布图层" })).toHaveCount(0);
  const before = await snap();
  await canvas.focus();
  await page.keyboard.press("g");
  await expect.poll(snap).toBe(!before);
  await canvas.dispatchEvent("keydown", { key: "g", isComposing: true });
  await canvas.dispatchEvent("keydown", { key: "l", isComposing: true });
  expect(await snap()).toBe(!before);
  await expect(page.getByRole("region", { name: "画布图层" })).toHaveCount(0);
  await page.getByTestId("canvas-node-image").focus();
  await page.keyboard.press("Enter");
  const prompt = page.getByLabel("图片提示词");
  await prompt.fill("");
  await prompt.pressSequentially("lg");
  await expect(prompt).toHaveValue("lg");
  expect(await snap()).toBe(!before);
  await expect(page.getByRole("region", { name: "画布图层" })).toHaveCount(0);
  await page
    .getByRole("toolbar", { name: /^图片操作：/ })
    .getByRole("button", { name: "编辑标签", exact: true })
    .click();
  const tags = page.getByRole("dialog", { name: "编辑标签", exact: true });
  await tags.getByRole("button", { name: "收藏", exact: true }).focus();
  await page.keyboard.press("g");
  await page.keyboard.press("l");
  expect(await snap()).toBe(!before);
  await expect(page.getByRole("region", { name: "画布图层" })).toHaveCount(0);
  await tags.getByRole("button", { name: "关闭标签编辑", exact: true }).click();
  await page.getByRole("button", { name: "帮助与快捷键", exact: true }).click();
  await page.getByRole("menuitem", { name: "快捷按键", exact: true }).click();
  await page.getByRole("tab", { name: "画布", exact: true }).click();
  for (const name of ["撤销", "重做"])
    await expect(
      page.locator(".shortcut-row").filter({ hasText: name }),
    ).not.toHaveAttribute("title", "此操作尚未接入当前前端");
});

test("手机视频参数菜单打开时一次点击演示真正开始并可取消", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openWorkspace(page);
  await addVideo(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requested = false;
  await page.route("**/fixtures/demo/blue-hour-motion.webm", async (route) => {
    requested = true;
    await gate;
    await route.fulfill({ path: videoPath, contentType: "video/webm" });
  });
  try {
    const editor = page.getByTestId("video-composer");
    await editor.getByLabel("视频提示词").fill("参数菜单不吞第一次生成点击");
    await oneOutput(editor);
    await editor.getByRole("button", { name: "视频参数", exact: true }).click();
    await expect(editor.locator(".parameter-menu")).toBeVisible();
    const action = editor.getByRole("button", {
      name: "生成视频",
      exact: true,
    });
    await action.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        action.evaluate((element) => {
          const box = element.getBoundingClientRect();
          const hit = document.elementFromPoint(
            box.x + box.width / 2,
            box.y + box.height / 2,
          );
          return element === hit || Boolean(hit && element.contains(hit));
        }),
      )
      .toBe(true);
    await action.click();
    await expect.poll(() => requested).toBe(true);
    await expect(
      editor.getByRole("button", { name: "取消本地演示", exact: true }),
    ).toBeEnabled();
    await expect(editor.locator(".parameter-menu")).toHaveCount(0);
    await expect(
      page.locator('.demo-result-node[data-generation-state="pending"]'),
    ).toHaveCount(1);
    await editor
      .getByRole("button", { name: "取消本地演示", exact: true })
      .click();
    await expect(
      page.locator('.demo-result-node[data-generation-state="pending"]'),
    ).toHaveCount(0);
  } finally {
    release();
  }
});
