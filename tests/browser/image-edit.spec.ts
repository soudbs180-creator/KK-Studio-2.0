import { expect, test, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";

async function canvasImageAction(page: Page, name: string) {
  const node = page.locator(".canvas-node-image").first();
  await node.locator(".uploaded-image").click();
  const toolbar = page.getByRole("toolbar", { name: /^图片操作：/ });
  await expect(toolbar).toBeVisible();
  await expect(node.getByRole("button", { name, exact: true })).toHaveCount(0);
  if (name === "放大查看参考图片") {
    await expect
      .poll(async () => {
        const [bar, card] = await Promise.all([
          toolbar.boundingBox(),
          node.locator(".image-preview").boundingBox(),
        ]);
        return Boolean(bar && card && bar.y + bar.height <= card.y + 1);
      })
      .toBe(true);
  }
  await toolbar.getByRole("button", { name, exact: true }).click();
}

async function editUiEvidence(page: Page, file: string) {
  const state = await page.evaluate(async () => ({
    url: location.href,
    route: location.pathname,
    mode: document
      .querySelector("[data-runtime-mode]")
      ?.getAttribute("data-runtime-mode"),
    entry: document
      .querySelector("[data-runtime-entry]")
      ?.getAttribute("data-runtime-entry"),
    viewport: { width: innerWidth, height: innerHeight },
    regionCount: document.querySelector('[data-testid="edit-region-count"]')
      ?.textContent,
    layers: [...document.querySelectorAll(".image-edit-viewport canvas")].map(
      (c) => ({
        width: (c as HTMLCanvasElement).width,
        height: (c as HTMLCanvasElement).height,
      }),
    ),
    clear: [
      ...document.querySelectorAll<HTMLButtonElement>(
        '.image-edit-toolbar button[aria-label="清空编辑区域"]',
      ),
    ].map((b) => ({
      disabled: b.disabled,
      height: b.getBoundingClientRect().height,
      fontSize: getComputedStyle(b).fontSize,
    })),
    scripts: await Promise.all(
      [...document.scripts]
        .filter((s) => s.src)
        .map(async (s) => ({
          url: s.src,
          sha256: Array.from(
            new Uint8Array(
              await crypto.subtle.digest(
                "SHA-256",
                await (await fetch(s.src)).arrayBuffer(),
              ),
            ),
          )
            .map((v) => v.toString(16).padStart(2, "0"))
            .join(""),
        })),
    ),
    styles: [...document.styleSheets].map((s) => s.href).filter(Boolean),
  }));
  await writeFile(file, JSON.stringify(state, null, 2) + "\n");
}

async function activeEditProject(page: Page) {
  return page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("kk-studio-next:creation:v1")!)
        .projects[0],
  );
}
async function rectangles(
  page: Page,
  dialog: ReturnType<Page["locator"]>,
  count: number,
) {
  await dialog.getByRole("button", { name: "框选区域", exact: true }).click();
  const image = (await dialog.locator("canvas.image-original").boundingBox())!;
  for (let i = 0; i < count; i++) {
    const x = (
      count === 2
        ? [0.12, 0.82]
        : count === 3
          ? [0.08, 0.45, 0.82]
          : [0.06, 0.29, 0.57, 0.85]
    )[i];
    await page.mouse.move(
      image.x + image.width * x,
      image.y + image.height * 0.42,
    );
    await page.mouse.down();
    await page.mouse.move(
      image.x + image.width * (x + 0.05),
      image.y + image.height * 0.48,
    );
    await page.mouse.up();
  }
  await expect(dialog.getByTestId("edit-region-count")).toHaveText(
    `${count} 个编辑区域`,
  );
}

test("declining the first crop approval cancels every queued crop and preserves the draft", async ({
  page,
}) => {
  await configureEdit(page, true);
  let requests = 0;
  await page.route(
    "https://models.example.test/v1/images/edits",
    async (route) => {
      requests++;
      await route.abort();
    },
  );
  const dialog = await editor(page, true);
  await rectangles(page, dialog, 2);
  await dialog.getByRole("textbox", { name: "重绘指令" }).fill("改为玻璃材质");
  await dialog.getByRole("button", { name: "开始重绘", exact: true }).click();
  await page
    .getByRole("dialog", { name: "人工审批任务" })
    .getByRole("button", { name: "取消任务", exact: true })
    .click();
  await expect
    .poll(async () =>
      (await activeEditProject(page)).tasks.map(
        (task: { status: string }) => task.status,
      ),
    )
    .toEqual(["cancelled", "cancelled"]);
  await expect(
    dialog.getByRole("button", { name: "开始重绘", exact: true }),
  ).toBeEnabled();
  expect(requests).toBe(0);
  await expect(dialog.getByTestId("edit-region-count")).toHaveText(
    "2 个编辑区域",
  );
});

test("three crops retain partial success, allow a region retry and keep the original and unrelated pixels", async ({
  page,
}) => {
  await configureEdit(page, true);
  let requests = 0;
  const output = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 32;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(0, 0, 32, 32);
    return c.toDataURL().split(",")[1];
  });
  await page.route(
    "https://models.example.test/v1/images/edits",
    async (route) => {
      requests++;
      // Hold the retried output so an older success cannot satisfy its wait.
      if (requests === 4)
        await new Promise((resolve) => setTimeout(resolve, 750));
      if (requests === 2)
        await route.fulfill({
          status: 400,
          json: { error: { message: "fixture invalid crop" } },
        });
      else await route.fulfill({ json: { data: [{ b64_json: output }] } });
    },
  );
  const dialog = await editor(page, true);
  await rectangles(page, dialog, 3);
  await dialog.getByRole("textbox", { name: "重绘指令" }).fill("区域改为红色");
  await dialog.getByRole("button", { name: "开始重绘", exact: true }).click();
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: "批准并提交" }).click();
  await expect
    .poll(async () =>
      (await activeEditProject(page)).tasks.map(
        (t: { status: string }) => t.status,
      ),
    )
    .toEqual(["succeeded", "failed", "succeeded"]);
  await expect(
    dialog.getByRole("button", { name: "重试该区域", exact: true }),
  ).toHaveCount(1);
  const originalTaskIds = new Set(
    (await activeEditProject(page)).tasks.map(
      (task: { id: string }) => task.id,
    ),
  );
  await dialog.getByRole("button", { name: "重试该区域", exact: true }).click();
  await page.getByRole("button", { name: "批准并提交" }).click();
  await expect
    .poll(async () => (await activeEditProject(page)).tasks.length)
    .toBe(4);
  const retryTasks = (await activeEditProject(page)).tasks.filter(
    (task: { id: string }) => !originalTaskIds.has(task.id),
  );
  expect(retryTasks).toHaveLength(1);
  const retryTaskId = retryTasks[0].id;
  await expect
    .poll(
      async () =>
        (await activeEditProject(page)).tasks.find(
          (task: { id: string }) => task.id === retryTaskId,
        )?.status,
    )
    .toBe("succeeded");
  const project = await activeEditProject(page),
    tasks = project.tasks;
  expect(tasks).toHaveLength(4);
  expect(tasks.at(-1).id).toBe(retryTaskId);
  expect(
    new Set(
      tasks.map((t: { imageEdit: { groupId: string } }) => t.imageEdit.groupId),
    ).size,
  ).toBe(1);
  expect(requests).toBe(4);
  const original = await archivedPixels(page, tasks[0].imageEdit.sourceAssetId),
    result = await archivedPixels(page, tasks.at(-1).outputs[0].assetId);
  expect(
    project.items.find(
      (item: { assetId: string }) =>
        item.assetId === tasks[0].imageEdit.sourceAssetId,
    ),
  ).toBeTruthy();
  const mask = new Set<number>();
  for (const region of tasks[0].imageEdit.document.regions)
    for (const [y, x, end] of region.runs)
      for (let p = x; p < end; p++) mask.add(y * original.width + p);
  let red = 0;
  for (let p = 0; p < original.width * original.height; p++) {
    if (!mask.has(p))
      expect(result.pixels.slice(p * 4, p * 4 + 4)).toEqual(
        original.pixels.slice(p * 4, p * 4 + 4),
      );
    else if (result.pixels[p * 4] > original.pixels[p * 4]) red++;
  }
  expect(red).toBe(mask.size);
});

test("four independent regions send one full image mask and reject an unmappable return safely", async ({
  page,
}) => {
  await configureEdit(page, true);
  let requests = 0;
  const square =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
  await page.route(
    "https://models.example.test/v1/images/edits",
    async (route) => {
      requests++;
      await route.fulfill({ json: { data: [{ b64_json: square }] } });
    },
  );
  const dialog = await editor(page, true);
  await rectangles(page, dialog, 4);
  await dialog.getByRole("textbox", { name: "重绘指令" }).fill("区域改为红色");
  await dialog.getByRole("button", { name: "开始重绘", exact: true }).click();
  await page.getByRole("button", { name: "批准并提交" }).click();
  await expect
    .poll(async () => (await activeEditProject(page)).tasks.at(-1)?.status)
    .toBe("failed");
  const project = await activeEditProject(page),
    task = project.tasks.at(-1);
  expect(project.tasks).toHaveLength(1);
  expect(task.imageEdit.crop).toMatchObject({
    x: 0,
    y: 0,
    width: 100,
    height: 80,
  });
  expect(task.imageSize).toBeUndefined();
  expect(task.outputs[0].error).toContain("无法可靠映射");
  expect(project.items).toHaveLength(1);
  expect(requests).toBe(1);
});

test("confirmed color instructions send with an empty composer and native union retains a labeled annotation", async ({
  page,
}) => {
  await configureEdit(page, true);
  let requests = 0;
  await page.route(
    "https://models.example.test/v1/images/edits",
    async (route) => {
      requests++;
      await route.fulfill({
        json: {
          data: [
            {
              b64_json:
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
            },
          ],
        },
      });
    },
  );
  const dialog = await editor(page, true);
  await dialog.getByRole("button", { name: "色块区域", exact: true }).click();
  for (const [x, y, instruction] of [
    [50, 40, "改成水流"],
    [71, 29, "改为金属"],
  ] as const) {
    const box = (await dialog.locator("canvas.image-original").boundingBox())!;
    await page.mouse.click(
      box.x + (box.width * x) / 100,
      box.y + (box.height * y) / 80,
    );
    await dialog
      .getByRole("textbox", { name: "色块修改意见" })
      .fill(instruction);
    await dialog.getByRole("button", { name: "确认", exact: true }).click();
  }
  await expect(
    dialog.locator(".image-edit-tags").getByRole("button"),
  ).toHaveCount(2);
  await expect(dialog.getByRole("textbox", { name: "重绘指令" })).toHaveValue(
    "",
  );
  await dialog.getByRole("button", { name: "开始重绘", exact: true }).click();
  await page.getByRole("button", { name: "批准并提交" }).click();
  await expect
    .poll(async () => (await activeEditProject(page)).tasks.at(-1)?.status)
    .toBe("succeeded");
  const task = (await activeEditProject(page)).tasks.at(-1);
  expect(task.attachments).toHaveLength(2);
  expect(task.imageEdit.nativeMask).toBe(true);
  expect(task.prompt).toContain("红色-A：改成水流");
  expect(task.prompt).toContain("红色-B：改为金属");
  expect(requests).toBe(1);
});

async function editor(page: Page, configured = false, separateColors = false) {
  if (!configured) await page.goto("/");
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page.getByRole("menuitem", { name: "图片", exact: true }).click();
  const node = page.locator(".canvas-node-image").first();
  const fixture = configured
    ? await page.evaluate((separateColors) => {
        const c = document.createElement("canvas");
        c.width = 100;
        c.height = 80;
        const ctx = c.getContext("2d")!;
        const gradient = ctx.createLinearGradient(0, 0, 100, 80);
        gradient.addColorStop(0, "#dddddd");
        gradient.addColorStop(1, "#999999");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 100, 80);
        ctx.fillStyle = "#2255aa";
        if (separateColors) {
          for (const [x, y] of [
            [20, 18],
            [68, 18],
            [20, 58],
            [68, 58],
          ])
            ctx.fillRect(x, y, 8, 8);
        } else {
          ctx.fillRect(35, 25, 30, 30);
          ctx.fillStyle = "#55bb44";
          ctx.fillRect(67, 25, 8, 8);
        }
        return c.toDataURL().split(",")[1];
      }, separateColors)
    : undefined;
  await node
    .locator('input[type="file"]')
    .first()
    .setInputFiles(
      fixture
        ? {
            name: "mask-fixture.png",
            mimeType: "image/png",
            buffer: Buffer.from(fixture, "base64"),
          }
        : "public/fixtures/demo/blue-hour.png",
    );
  await expect(node.locator(".uploaded-image")).toBeVisible();
  await canvasImageAction(page, "重绘参考图片");
  return page.getByRole("dialog", { name: "重绘参考图片" });
}

test("saved mixed masks can be cleared, undone and redone before whole-image editing", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1099, height: 900 });
  await configureEdit(page, false);
  const dialog = await editor(page, true);
  await rectangles(page, dialog, 1);
  await dialog.getByRole("button", { name: "画笔区域", exact: true }).click();
  let box = (await dialog.locator("canvas.image-original").boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.65);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.65);
  await page.mouse.up();
  await dialog.getByRole("button", { name: "色块区域", exact: true }).click();
  box = (await dialog.locator("canvas.image-original").boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await dialog
    .getByRole("textbox", { name: "色块修改意见" })
    .fill("区域修改意见");
  await dialog.getByRole("button", { name: "确认", exact: true }).click();
  await dialog.getByRole("textbox", { name: "重绘指令" }).fill("全图改为红色");
  await expect
    .poll(
      async () =>
        (await activeEditProject(page)).items[0].imageEditDraft?.regions.length,
    )
    .toBe(3);
  await expect
    .poll(async () => (await activeEditProject(page)).items[0].imageEditPrompt)
    .toBe("全图改为红色");
  const original = (await activeEditProject(page)).items[0];
  await dialog.getByRole("button", { name: "取消", exact: true }).click();
  await expect(dialog).toBeHidden();
  await canvasImageAction(page, "重绘参考图片");
  await expect(dialog.getByTestId("edit-region-count")).toHaveText(
    "3 个编辑区域",
  );
  await expect(
    dialog.getByRole("button", { name: "撤销编辑", exact: true }),
  ).toBeDisabled();
  const clear = dialog.getByRole("button", {
    name: "清空编辑区域",
    exact: true,
  });
  await expect(clear).toBeVisible();
  await dialog.getByRole("button", { name: "复位图片", exact: true }).click();
  await expect(dialog.getByTestId("edit-region-count")).toHaveText(
    "3 个编辑区域",
  );
  await clear.click();
  await expect
    .poll(
      async () =>
        (await activeEditProject(page)).items[0].imageEditDraft?.regions.length,
    )
    .toBe(0);
  await expect(clear).toBeDisabled();
  await expect(dialog.getByRole("textbox", { name: "重绘指令" })).toHaveValue(
    "全图改为红色",
  );
  await dialog.getByRole("button", { name: "撤销编辑", exact: true }).click();
  await expect
    .poll(async () => (await activeEditProject(page)).items[0].imageEditDraft)
    .toEqual(original.imageEditDraft);
  await dialog.getByRole("button", { name: "重做编辑", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await activeEditProject(page)).items[0].imageEditDraft?.regions.length,
    )
    .toBe(0);
  const cleared = (await activeEditProject(page)).items[0];
  expect(cleared.assetId).toBe(original.assetId);
  expect(cleared.imageEditDraft.colorCounters).toEqual(
    original.imageEditDraft.colorCounters,
  );
  await page.screenshot({ path: info.outputPath("cleared-mask-editor.png") });
  await editUiEvidence(page, info.outputPath("cleared-mask-editor.json"));
  const output = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 100;
    c.height = 80;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(0, 0, 100, 80);
    return c.toDataURL().split(",")[1];
  });
  let requests = 0;
  await page.route(
    "https://models.example.test/v1/images/edits",
    async (route) => {
      requests++;
      expect(
        route.request().postDataBuffer()!.toString("latin1"),
      ).not.toContain('name="mask"');
      await route.fulfill({ json: { data: [{ b64_json: output }] } });
    },
  );
  await dialog.getByRole("button", { name: "开始重绘", exact: true }).click();
  await page.getByRole("button", { name: "批准并提交" }).click();
  await expect
    .poll(async () => (await activeEditProject(page)).tasks.at(-1)?.status)
    .toBe("succeeded");
  const task = (await activeEditProject(page)).tasks.at(-1);
  expect(task.imageEdit).toBeUndefined();
  expect(task.imageEditContext.originalAssetId).toBe(original.assetId);
  expect(requests).toBe(1);
  await dialog.getByRole("button", { name: "取消", exact: true }).click();
  await expect(page.locator(".project-save-state")).toContainText("已保存");
  await page.reload();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.locator(".project-library-card").first().click();
  await canvasImageAction(page, "重绘参考图片");
  await expect(dialog.getByTestId("edit-region-count")).toHaveText(
    "0 个编辑区域",
  );
  expect(
    (await activeEditProject(page)).items[0].imageEditDraft.colorCounters,
  ).toEqual(original.imageEditDraft.colorCounters);
});

for (const count of [2, 4])
  test(`empty composer compiles ${count} color instructions once and keeps crop opinions separate`, async ({
    page,
  }, info) => {
    await configureEdit(page, true);
    const dialog = await editor(page, true, true);
    await dialog.getByRole("button", { name: "色块区域", exact: true }).click();
    const instructions = Array.from(
      { length: count },
      (_, i) => `唯一意见${i}：${"保持质感".repeat(136)}`,
    );
    for (let i = 0; i < count; i++) {
      const box = (await dialog
        .locator("canvas.image-original")
        .boundingBox())!;
      const [x, y] = [
        [24, 22],
        [72, 22],
        [24, 62],
        [72, 62],
      ][i];
      await page.mouse.click(
        box.x + (box.width * x) / 100,
        box.y + (box.height * y) / 80,
      );
      await dialog
        .getByRole("textbox", { name: "色块修改意见" })
        .fill(instructions[i]);
      await dialog.getByRole("button", { name: "确认", exact: true }).click();
    }
    await expect(dialog.getByRole("textbox", { name: "重绘指令" })).toHaveValue(
      "",
    );
    const output = await page.evaluate((full) => {
      const c = document.createElement("canvas");
      c.width = full ? 100 : 32;
      c.height = full ? 80 : 32;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#ff0000";
      ctx.fillRect(0, 0, c.width, c.height);
      return c.toDataURL().split(",")[1];
    }, count === 4);
    let requests = 0;
    await page.route(
      "https://models.example.test/v1/images/edits",
      async (route) => {
        requests++;
        await route.fulfill({ json: { data: [{ b64_json: output }] } });
      },
    );
    await dialog.getByRole("button", { name: "开始重绘", exact: true }).click();
    const taskCount = count === 4 ? 1 : 2;
    for (let i = 0; i < taskCount; i++)
      await page
        .getByRole("button", { name: "批准并提交" })
        .click({ timeout: 5000 });
    await expect
      .poll(async () =>
        (await activeEditProject(page)).tasks.map(
          (t: { status: string }) => t.status,
        ),
      )
      .toEqual(Array(taskCount).fill("succeeded"));
    const tasks = (await activeEditProject(page)).tasks;
    expect(requests).toBe(taskCount);
    for (const [i, task] of tasks.entries()) {
      expect(task.prompt.length).toBeLessThanOrEqual(4000);
      for (const [j, text] of instructions.entries())
        expect(task.prompt.split(text).length - 1).toBe(
          count === 4 || i === j ? 1 : 0,
        );
    }
    await page.screenshot({
      path: info.outputPath(`color-only-${count}-success.png`),
    });
    await editUiEvidence(
      page,
      info.outputPath(`color-only-${count}-success.json`),
    );
  });
test("unified image tools keep original coordinates across zoom, reset and undo/redo", async ({
  page,
}, info) => {
  const dialog = await editor(page);
  await expect(
    dialog.getByRole("button", { name: "框选区域", exact: true }),
  ).toBeVisible();
  const viewport = dialog.getByRole("region", { name: "图片编辑画布" });
  await expect(viewport.locator("canvas.image-original")).toBeVisible();
  await dialog.getByRole("button", { name: "框选区域", exact: true }).click();
  const box = (await viewport.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6);
  await page.mouse.up();
  await expect(dialog.getByTestId("edit-region-count")).toHaveText(
    "1 个编辑区域",
  );
  await expect
    .poll(
      async () =>
        (await activeEditProject(page)).items.find(
          (i: { imageEditDraft?: { regions: unknown[] } }) => i.imageEditDraft,
        )?.imageEditDraft?.regions.length,
    )
    .toBe(1);
  const before = await page.evaluate(
    () =>
      JSON.parse(
        localStorage.getItem("kk-studio-next:creation:v1")!,
      ).projects[0].items.find(
        (i: { imageEditDraft?: unknown }) => i.imageEditDraft,
      )?.imageEditDraft,
  );
  await page.mouse.wheel(0, -250);
  await dialog.getByRole("button", { name: "复位图片", exact: true }).click();
  await expect(dialog.getByTestId("edit-region-count")).toHaveText(
    "1 个编辑区域",
  );
  await dialog.getByRole("button", { name: "撤销编辑", exact: true }).click();
  await expect(dialog.getByTestId("edit-region-count")).toHaveText(
    "0 个编辑区域",
  );
  await expect
    .poll(
      async () =>
        (await activeEditProject(page)).items.find(
          (i: { imageEditDraft?: { regions: unknown[] } }) => i.imageEditDraft,
        )?.imageEditDraft?.regions.length,
    )
    .toBe(0);
  await dialog.getByRole("button", { name: "重做编辑", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await activeEditProject(page)).items.find(
          (i: { imageEditDraft?: { regions: unknown[] } }) => i.imageEditDraft,
        )?.imageEditDraft?.regions.length,
    )
    .toBe(1);
  const after = await page.evaluate(
    () =>
      JSON.parse(
        localStorage.getItem("kk-studio-next:creation:v1")!,
      ).projects[0].items.find(
        (i: { imageEditDraft?: unknown }) => i.imageEditDraft,
      )?.imageEditDraft,
  );
  // Missing counters and an empty record have the same meaning. History keeps
  // counters monotonic, while dimensions, region IDs and every run stay exact.
  expect({ ...after, colorCounters: after.colorCounters ?? {} }).toEqual({
    ...before,
    colorCounters: before.colorCounters ?? {},
  });
  await expect(
    dialog.getByRole("button", { name: "开始重绘", exact: true }),
  ).toBeDisabled();
  await page.screenshot({ path: info.outputPath("mask-editor.png") });
});

async function configureEdit(page: Page, native: boolean) {
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page.getByRole("button", { name: "模型供应商", exact: true }).click();
  await page.getByLabel("接口地址").fill("https://models.example.test/v1");
  await page.getByLabel("API Key").fill("fixture-key");
  await page.getByLabel("模型名称").fill("image-test");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page.evaluate((native) => {
    const connections = JSON.parse(
      localStorage.getItem("kk-studio-next:provider-connections:v1")!,
    );
    localStorage.setItem(
      "kk-studio:model-catalog:v1",
      JSON.stringify(
        connections.map(
          (c: { id: string; baseUrl: string; credentialRef: string }) => ({
            ...c,
            fetchedAt: Date.now(),
            models: [
              {
                id: "image-test",
                kind: "image",
                sizes: ["1024x1024", "2048x2048"],
                image: {
                  generate: true,
                  edit: !native,
                  inpaint: native,
                  maxReferences: 6,
                },
                source: "manual",
              },
            ],
          }),
        ),
      ),
    );
    window.dispatchEvent(new Event("kk:model-provider-changed"));
  }, native);
}

async function archivedPixels(page: Page, assetId: string) {
  return page.evaluate(async (id) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("kk-studio-assets", 1);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const row = await new Promise<{ blob: Blob }>((resolve, reject) => {
      const r = db.transaction("blobs").objectStore("blobs").get(id);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    db.close();
    const bitmap = await createImageBitmap(row.blob),
      canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    return {
      width: canvas.width,
      height: canvas.height,
      pixels: Array.from(
        ctx.getImageData(0, 0, canvas.width, canvas.height).data,
      ),
    };
  }, assetId);
}

for (const native of [true, false])
  test(`${native ? "native PNG mask" : "annotated reference fallback"} sends a square edit and protects every outside pixel`, async ({
    page,
  }) => {
    await configureEdit(page, native);
    let body: Buffer | undefined;
    const output = await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = c.height = 32;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#ff0000";
      ctx.fillRect(0, 0, 32, 32);
      return c.toDataURL().split(",")[1];
    });
    await page.route(
      "https://models.example.test/v1/images/edits",
      async (route) => {
        body = route.request().postDataBuffer()!;
        await route.fulfill({ json: { data: [{ b64_json: output }] } });
      },
    );
    const dialog = await editor(page, true);
    const viewport = dialog.getByRole("region", { name: "图片编辑画布" });
    await dialog.getByRole("button", { name: "框选区域", exact: true }).click();
    const box = (await viewport.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.43, box.y + box.height * 0.43);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.57, box.y + box.height * 0.57);
    await page.mouse.up();
    await expect(dialog.getByTestId("edit-region-count")).toHaveText(
      "1 个编辑区域",
    );
    await dialog
      .getByRole("textbox", { name: "重绘指令" })
      .fill("把选区改为红色");
    await dialog.getByRole("button", { name: "开始重绘", exact: true }).click();
    await page
      .getByRole("button", { name: "批准并提交" })
      .click({ timeout: 5000 });
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            JSON.parse(
              localStorage.getItem("kk-studio-next:creation:v1")!,
            ).projects[0].tasks.at(-1)?.status,
        ),
      )
      .toBe("succeeded");
    const task = await page.evaluate(() =>
      JSON.parse(
        localStorage.getItem("kk-studio-next:creation:v1")!,
      ).projects[0].tasks.at(-1),
    );
    expect(task.imageSize).toBe("1024x1024");
    expect(task.imageEdit.nativeMask).toBe(native);
    expect(body!.toString("latin1").includes('name="mask"')).toBe(native);
    expect(task.attachments).toHaveLength(native ? 1 : 2);
    const before = await archivedPixels(page, task.imageEdit.sourceAssetId),
      after = await archivedPixels(page, task.outputs[0].assetId);
    expect([after.width, after.height]).toEqual([before.width, before.height]);
    const selected = new Set<number>();
    for (const region of task.imageEdit.document.regions)
      for (const [y, start, end] of region.runs)
        for (let x = start; x < end; x++) selected.add(y * before.width + x);
    let changed = 0;
    for (let p = 0; p < before.width * before.height; p++) {
      if (!selected.has(p)) {
        for (let c = 0; c < 4; c++)
          if (before.pixels[p * 4 + c] !== after.pixels[p * 4 + c])
            throw new Error(`outside pixel changed at ${p}`);
      } else if (before.pixels[p * 4] !== after.pixels[p * 4]) changed++;
    }
    expect(changed).toBeGreaterThan(0);
  });

test("archived image previews expose the shared lightbox and edit actions", async ({
  page,
}) => {
  const dialog = await editor(page);
  await dialog.getByRole("button", { name: "取消", exact: true }).click();
  await canvasImageAction(page, "放大查看参考图片");
  const lightbox = page.getByRole("dialog", { name: /预览/ });
  await expect(
    lightbox.getByRole("button", { name: "重绘当前图片", exact: true }),
  ).toBeVisible();
  await lightbox
    .getByRole("button", { name: "重绘当前图片", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "框选区域", exact: true }),
  ).toBeVisible();
});
for (const color of [false, true])
  test(`a second touch cancels a pending ${color ? "color fill" : "brush"} and never creates an accidental mask`, async ({
    page,
  }) => {
    await page.goto("/");
    const dialog = await editor(page, true);
    await dialog
      .getByRole("button", {
        name: color ? "色块区域" : "画笔区域",
        exact: true,
      })
      .click();
    const viewport = dialog.getByRole("region", { name: "图片编辑画布" });
    await viewport.evaluate((element) => {
      const r = element.getBoundingClientRect(),
        image = element
          .querySelector("canvas.image-original")!
          .getBoundingClientRect();
      const event = (type: string, id: number, x: number, y: number) =>
        element.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            pointerId: id,
            pointerType: "touch",
            clientX: r.x + x,
            clientY: r.y + y,
            button: 0,
          }),
        );
      const x = image.x - r.x + image.width / 2,
        y = image.y - r.y + image.height / 2;
      event("pointerdown", 1, x, y);
      event("pointermove", 1, x + 5, y + 5);
      event("pointerdown", 2, x + 30, y + 30);
      event("pointermove", 2, x + 50, y + 50);
      event("pointerup", 2, x + 50, y + 50);
      event("pointerup", 1, x + 5, y + 5);
    });
    await expect(dialog.getByTestId("edit-region-count")).toHaveText(
      "0 个编辑区域",
    );
  });

test("narrow image editor keeps its draggable toolbar within the canvas and persists edits after closing", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const dialog = await editor(page);
  const viewport = dialog.getByRole("region", { name: "图片编辑画布" });
  await dialog.getByRole("button", { name: "框选区域", exact: true }).click();
  const image = (await dialog.locator("canvas.image-original").boundingBox())!;
  await page.mouse.move(
    image.x + image.width * 0.3,
    image.y + image.height * 0.3,
  );
  await page.mouse.down();
  await page.mouse.move(
    image.x + image.width * 0.5,
    image.y + image.height * 0.5,
  );
  await page.mouse.up();
  const toolbar = dialog.locator(".image-edit-toolbar"),
    grip = dialog.getByRole("button", { name: "拖动编辑工具栏" });
  const handle = (await grip.boundingBox())!;
  await page.mouse.move(
    handle.x + handle.width / 2,
    handle.y + handle.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(2000, -1000);
  await page.mouse.up();
  const bounds = (await viewport.boundingBox())!,
    tools = (await toolbar.boundingBox())!;
  expect(tools.x).toBeGreaterThanOrEqual(bounds.x);
  expect(tools.y).toBeGreaterThanOrEqual(bounds.y);
  expect(tools.x + tools.width).toBeLessThanOrEqual(
    bounds.x + bounds.width + 1,
  );
  expect(tools.y + tools.height).toBeLessThanOrEqual(
    bounds.y + bounds.height + 1,
  );
  await page.screenshot({ path: info.outputPath("mask-editor-narrow.png") });
  await dialog.getByRole("button", { name: "取消", exact: true }).click();
  await canvasImageAction(page, "重绘参考图片");
  await expect(dialog.getByTestId("edit-region-count")).toHaveText(
    "1 个编辑区域",
  );
  await expect(page.locator(".project-save-state")).toContainText("已保存");
  await page.reload();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.locator(".project-library-card").first().click();
  await canvasImageAction(page, "重绘参考图片");
  await expect(dialog.getByTestId("edit-region-count")).toHaveText(
    "1 个编辑区域",
  );
});
