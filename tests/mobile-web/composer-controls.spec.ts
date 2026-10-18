import { expect, test, type Locator, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import type { CreationDraft } from "../../packages/creation-contracts/creation.ts";
import type { MobileSnapshot } from "../../mobile/src/core/mobileModel.ts";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
  "base64",
);
const traffic = new WeakMap<Page, { blocked: string[]; errors: string[] }>();
const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });
const modelButton = (page: Page) =>
  page.getByRole("button", { name: /^(选择模型|当前模型：.*，选择模型)$/ });

test.beforeEach(async ({ context, page, baseURL }) => {
  test.skip(
    baseURL !== "http://127.0.0.1:1423",
    "control fixtures may only write to an isolated local browser",
  );
  expect((await context.storageState()).origins).toEqual([]);
  const record = { blocked: [] as string[], errors: [] as string[] };
  traffic.set(page, record);
  page.on("pageerror", (error) => record.errors.push(error.message));
  await context.route("**/*", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (
      url.origin !== "http://127.0.0.1:1423" ||
      !["GET", "HEAD"].includes(request.method()) ||
      /^\/(?:mobile\/)?(?:api|v1|gateway|kk-agent)(?:\/|$)/.test(url.pathname)
    ) {
      record.blocked.push(`${request.method()} ${url.origin}${url.pathname}`);
      await route.abort("blockedbyclient");
    } else await route.continue();
  });
  await context.routeWebSocket(/.*/, (socket) => {
    record.blocked.push(`WebSocket ${socket.url()}`);
    socket.close();
  });
  // Exercise the unsupported browser path without accessing a microphone or
  // a browser-owned remote recognition service. Speech callbacks have their own suite.
  await page.addInitScript(() => {
    for (const name of ["SpeechRecognition", "webkitSpeechRecognition"])
      Object.defineProperty(window, name, {
        configurable: true,
        value: undefined,
      });
  });
});

test.afterEach(async ({ page }) => {
  const record = traffic.get(page);
  if (!record) return;
  await test.info().attach("no-provider-or-external-attempts", {
    body: JSON.stringify(record, null, 2),
    contentType: "application/json",
  });
  expect(record.blocked, "blocked attempts still fail the test").toEqual([]);
  expect(record.errors, "no uncaught browser errors").toEqual([]);
});

async function snapshot(page: Page): Promise<MobileSnapshot> {
  const payload = await page.evaluate(
    () =>
      new Promise<string>((resolve, reject) => {
        const open = indexedDB.open("kk-mobile-creation-v1", 1);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result,
            transaction = db.transaction("snapshots", "readonly");
          const read = transaction
            .objectStore("snapshots")
            .get("local-browser-v1");
          transaction.onerror = () => reject(transaction.error);
          transaction.oncomplete = () => {
            db.close();
            resolve(read.result);
          };
        };
      }),
  );
  return JSON.parse(payload) as MobileSnapshot;
}
function draft(value: MobileSnapshot): CreationDraft {
  const project = value.projects.find(
    (item) => item.id === value.activeProjectId,
  );
  expect(project, "the current local project exists").toBeDefined();
  return project!.composerDraft;
}
async function expectDraft(page: Page, value: Partial<CreationDraft>) {
  await expect
    .poll(async () => draft(await snapshot(page)))
    .toMatchObject(value);
}
async function openCreation(page: Page) {
  await page.goto("/mobile/", { waitUntil: "domcontentloaded" });
  await button(page, "新创作").first().tap();
  await expect(
    page.getByRole("textbox", { name: "创作输入", exact: true }),
  ).toBeVisible();
  expect((await snapshot(page)).projects).toHaveLength(1);
}
async function closePanel(page: Page) {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveCount(1);
  await dialog.getByRole("button", { name: "关闭面板", exact: true }).tap();
  await expect(dialog).toHaveCount(0);
}
async function touchable(page: Page, target: Locator, enabled = true) {
  await expect(target).toBeVisible();
  await target.scrollIntoViewIfNeeded();
  const box = await target.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const hit = document.elementFromPoint(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    return {
      x: bounds.x,
      y: bounds.y,
      right: bounds.right,
      bottom: bounds.bottom,
      width: bounds.width,
      height: bounds.height,
      hit: !!hit && element.contains(hit),
    };
  });
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.right).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(box.bottom).toBeLessThanOrEqual(page.viewportSize()!.height);
  if (enabled)
    expect(box.hit, "the visible button receives its center tap").toBe(true);
}
async function addConnection(
  page: Page,
  name: string,
  baseUrl: string,
  model: string,
) {
  await modelButton(page).tap();
  await button(page, "管理连接").tap();
  await button(page, "＋ 添加").tap();
  await page.getByRole("textbox", { name: "连接名称", exact: true }).fill(name);
  await page
    .getByRole("textbox", { name: "HTTPS API 地址", exact: true })
    .fill(baseUrl);
  await page
    .getByRole("textbox", { name: "API Key / Gateway 应用令牌", exact: true })
    .fill("fixture-no-api-access");
  await page.getByRole("switch", { name: "启用图片端点", exact: true }).tap();
  await page
    .getByRole("textbox", { name: "服务端支持的最大数量（1–4）", exact: true })
    .fill("3");
  await button(page, "保存连接").tap();
  await expect(page).toHaveURL(/\/mobile\/connections$/);
  await button(page, "返回").tap();
  await modelButton(page).tap();
  await button(page, name).tap();
  await page
    .getByRole("textbox", { name: "或手动填写模型 ID", exact: true })
    .fill(model);
  await button(page, "使用填写的模型").tap();
  await expectDraft(page, { model });
  expect(JSON.stringify(await snapshot(page))).not.toContain(
    "fixture-no-api-access",
  );
}
async function upload(
  page: Page,
  name: string,
  mimeType: string,
  bytes: Buffer,
  image: boolean,
) {
  await button(page, "上传").tap();
  const picked = page.waitForEvent("filechooser");
  await button(page, image ? "从设备上传图片" : "从设备上传文件").tap();
  await (await picked).setFiles({ name, mimeType, buffer: bytes });
  await expect(button(page, `移除参考：${name}`)).toBeVisible();
  await expect
    .poll(async () =>
      draft(await snapshot(page)).attachments.map((item) => item.name),
    )
    .toContain(name);
}
async function originalHash(page: Page, assetId: string) {
  return page.evaluate(
    (assetId) =>
      new Promise<{ size: number; sha256: string }>((resolve, reject) => {
        const open = indexedDB.open("kk-mobile-creation-v1", 1);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result,
            transaction = db.transaction("originals", "readonly");
          const read = transaction
            .objectStore("originals")
            .get(["local-browser-v1", assetId]);
          transaction.onerror = () => reject(transaction.error);
          transaction.oncomplete = () => {
            db.close();
            const bytes = read.result as Uint8Array;
            void crypto.subtle.digest("SHA-256", new Uint8Array(bytes)).then(
              (hash) =>
                resolve({
                  size: bytes.length,
                  sha256: Array.from(new Uint8Array(hash), (byte) =>
                    byte.toString(16).padStart(2, "0"),
                  ).join(""),
                }),
              reject,
            );
          };
        };
      }),
    assetId,
  );
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 390, height: 480 },
  { width: 320, height: 640 },
]) {
  test.describe(`phone composer at ${viewport.width}x${viewport.height}`, () => {
    test.use({
      viewport,
      isMobile: true,
      hasTouch: true,
      userAgent:
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
    });

    test("six initial controls are touchable, cancel safely and use a single round send surface", async ({
      page,
    }) => {
      await openCreation(page);
      const before = await snapshot(page);
      const controls = [
        button(page, "上传"),
        modelButton(page),
        button(page, "参数选项"),
        button(page, "扩展选择"),
        button(page, "开启语音输入"),
        button(page, "发送"),
      ];
      for (const [index, control] of controls.entries())
        await touchable(page, control, index !== 5);
      const geometry = await Promise.all(
        controls.map((control) =>
          control.evaluate((element) => {
            const style = getComputedStyle(element),
              bounds = element.getBoundingClientRect();
            return {
              width: bounds.width,
              height: bounds.height,
              radius: Number.parseFloat(style.borderTopLeftRadius),
              y: bounds.y,
            };
          }),
        ),
      );
      const size = viewport.width < 360 ? 44 : 48;
      expect(geometry).toEqual(
        Array.from({ length: 6 }, () => ({
          width: size,
          height: size,
          radius: size / 2,
          y: geometry[0].y,
        })),
      );
      await expect(button(page, "发送")).toBeDisabled();
      await button(page, "上传").tap();
      for (const name of ["从设备上传图片", "从设备上传文件", "引用素材"])
        await touchable(page, button(page, name));
      await button(page, "引用素材").tap();
      await expect(
        page.getByText("还没有素材，先在素材库导入。", { exact: true }),
      ).toBeVisible();
      await closePanel(page);
      await page.getByRole("textbox", { name: "创作输入", exact: true }).tap();
      await modelButton(page).tap();
      await expect(button(page, "管理连接")).toBeVisible();
      await closePanel(page);
      await button(page, "参数选项").tap();
      for (const name of ["文字对话", "图片生成", "视频生成"])
        await touchable(page, button(page, name), name !== "视频生成");
      await expect(button(page, "视频生成")).toBeDisabled();
      await closePanel(page);
      await button(page, "扩展选择").tap();
      await expect(button(page, "管理创作库")).toBeVisible();
      await closePanel(page);
      await button(page, "开启语音输入").tap();
      await expect(
        page.getByText("当前浏览器不支持语音识别，请使用键盘输入。", {
          exact: true,
        }),
      ).toBeVisible();
      expect(await snapshot(page)).toEqual(before);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(viewport.width);
      await page.screenshot({
        path: test.info().outputPath("six-phone-controls.png"),
      });
    });

    test("device image and file uploads keep draft references and original hashes across refresh", async ({
      page,
    }) => {
      await openCreation(page);
      const prompt = "Keep this unsent prompt while importing local references";
      await page
        .getByRole("textbox", { name: "创作输入", exact: true })
        .fill(prompt);
      await expectDraft(page, { prompt });
      const document = Buffer.from(
        "A local reference document, never sent to any provider.",
        "utf8",
      );
      await upload(page, "fixture-reference.png", "image/png", png, true);
      await upload(
        page,
        "fixture-reference.txt",
        "text/plain",
        document,
        false,
      );
      const saved = await snapshot(page);
      expect(saved.projects[0].tasks).toHaveLength(0);
      expect(draft(saved).attachments).toHaveLength(2);
      const expected = [png, document].map((bytes) => ({
        size: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      }));
      const assets = ["fixture-reference.png", "fixture-reference.txt"].map(
        (name) => saved.assets.find((item) => item.name === name)!,
      );
      for (const [index, asset] of assets.entries()) {
        expect(asset).toMatchObject(expected[index]);
        expect(await originalHash(page, asset.id)).toEqual(expected[index]);
      }
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(
        page.getByRole("textbox", { name: "创作输入", exact: true }),
      ).toHaveValue(prompt);
      for (const [index, asset] of assets.entries()) {
        await expect(button(page, `移除参考：${asset.name}`)).toBeVisible();
        expect(await originalHash(page, asset.id)).toEqual(expected[index]);
      }
      expect(await snapshot(page)).toEqual(saved);
      await page.screenshot({
        path: test.info().outputPath("phone-local-upload-restored.png"),
      });
    });

    test("model and counts persist while unsent image size resets on type, model or refresh", async ({
      page,
    }) => {
      await openCreation(page);
      await addConnection(
        page,
        "No-size fixture",
        "https://fixture.invalid/v1",
        "fixture-image-model",
      );
      await button(page, "切换模型：fixture-image-model").tap();
      await expect(button(page, "管理连接")).toBeVisible();
      await closePanel(page);
      await button(page, "参数选项").tap();
      await button(page, "图片生成").tap();
      await expect(
        page.getByText("该连接未声明指定尺寸，使用服务默认值。", {
          exact: true,
        }),
      ).toBeVisible();
      await expect(button(page, "1536x1024")).toHaveCount(0);
      await button(page, "自适应（服务默认）").tap();
      await button(page, "增加图片数量").tap();
      await button(page, "增加图片数量").tap();
      await expect(button(page, "增加图片数量")).toBeDisabled();
      await expectDraft(page, { kind: "image", outputCount: 3 });
      expect(draft(await snapshot(page))).not.toHaveProperty("imageSize");
      await closePanel(page);
      await addConnection(
        page,
        "Declared 12ai fixture",
        "https://new.12ai.org/v1",
        "gpt-image-2",
      );
      await button(page, "参数选项").tap();
      await touchable(page, button(page, "1536x1024"));
      await button(page, "1536x1024").tap();
      await expect(button(page, "1536x1024")).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(draft(await snapshot(page))).not.toHaveProperty("imageSize");
      await button(page, "文字对话").tap();
      await expectDraft(page, { kind: "text" });
      await button(page, "图片生成").tap();
      await expect(button(page, "自适应（服务默认）")).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await button(page, "1536x1024").tap();
      await closePanel(page);
      await button(page, "切换模型：gpt-image-2").tap();
      await page
        .getByRole("textbox", { name: "或手动填写模型 ID", exact: true })
        .fill("gpt-image-1");
      await button(page, "使用填写的模型").tap();
      await expectDraft(page, { model: "gpt-image-1", outputCount: 3 });
      await button(page, "参数选项").tap();
      await expect(button(page, "自适应（服务默认）")).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await button(page, "1536x1024").tap();
      await closePanel(page);
      const beforeRefresh = await snapshot(page);
      expect(draft(beforeRefresh)).not.toHaveProperty("imageSize");
      await page.reload({ waitUntil: "domcontentloaded" });
      await button(page, "参数选项").tap();
      await expect(button(page, "自适应（服务默认）")).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect(button(page, "1536x1024")).toHaveAttribute(
        "aria-pressed",
        "false",
      );
      expect(await snapshot(page)).toEqual(beforeRefresh);
      await expectDraft(page, {
        kind: "image",
        model: "gpt-image-1",
        outputCount: 3,
      });
      await button(page, "视频生成").tap();
      await expectDraft(page, { kind: "video", outputCount: 1 });
      await button(page, "图片生成").tap();
      await expectDraft(page, { kind: "image", outputCount: 1 });
      await closePanel(page);
      const after = await snapshot(page);
      expect(after.projects[0].tasks).toHaveLength(0);
      await page.screenshot({
        path: test.info().outputPath("phone-model-parameters.png"),
      });
    });

    test("an extension created in the real library previews, cancels unchanged and explicitly appends to the existing draft", async ({
      page,
    }) => {
      await openCreation(page);
      const original = "Preserve my current unsent idea",
        name = "Phone framing Skill",
        instruction =
          "Keep the main subject centered and retain the original colors.";
      await page
        .getByRole("textbox", { name: "创作输入", exact: true })
        .fill(original);
      await expectDraft(page, { prompt: original });
      await button(page, "扩展选择").tap();
      await button(page, "管理创作库").tap();
      await button(page, "＋").tap();
      await button(page, "Skill 指令").tap();
      await page
        .getByRole("textbox", { name: "名称（最多 200 字符）", exact: true })
        .fill(name);
      await page.getByRole("textbox", { name: /^内容（/ }).fill(instruction);
      await button(page, "保存条目").tap();
      await expect(page).toHaveURL(/\/mobile\/library$/);
      const saved = await snapshot(page);
      expect(saved.library).toHaveLength(1);
      expect(saved.library![0]).toMatchObject({
        kind: "skill-instruction",
        name,
        content: instruction,
      });
      await page.goto("/mobile/", { waitUntil: "domcontentloaded" });
      await button(page, "扩展选择").tap();
      await touchable(page, button(page, name));
      await button(page, name).tap();
      await expect(page.getByText(instruction, { exact: true })).toBeVisible();
      await button(page, "应用到当前草稿").tap();
      await expect(
        page.getByText("预览草稿更新", { exact: true }),
      ).toBeVisible();
      await closePanel(page);
      expect(await snapshot(page)).toEqual(saved);
      await button(page, "应用到当前草稿").tap();
      await button(page, "追加文字").tap();
      await touchable(page, button(page, "确认应用到草稿"));
      await button(page, "确认应用到草稿").tap();
      const appended = `${original}\n\nSkill 指令：Phone framing Skill\n${instruction}`;
      await expect(
        page.getByRole("textbox", { name: "创作输入", exact: true }),
      ).toHaveValue(appended);
      await expectDraft(page, { prompt: appended });
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(
        page.getByRole("textbox", { name: "创作输入", exact: true }),
      ).toHaveValue(appended);
      const after = await snapshot(page);
      expect(after.projects).toHaveLength(1);
      expect(after.projects[0].tasks).toHaveLength(0);
      expect(after.library).toEqual(saved.library);
      await page.screenshot({
        path: test.info().outputPath("phone-extension-applied.png"),
      });
    });
  });
}
