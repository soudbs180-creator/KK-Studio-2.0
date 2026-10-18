import { expect, test, type Locator, type Page } from "@playwright/test";

const phoneUA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36";
const traffic = new WeakMap<Page, { blocked: string[]; errors: string[] }>();
test.beforeEach(async ({ context, page, baseURL }) => {
  const record = { blocked: [] as string[], errors: [] as string[] };
  traffic.set(page, record);
  expect((await context.storageState()).origins).toEqual([]);
  page.on("pageerror", (error) => record.errors.push(error.message));
  await context.route("**/*", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (
      url.origin !== baseURL ||
      !["GET", "HEAD"].includes(request.method()) ||
      /^\/(?:mobile\/)?(?:api|v1|kk-agent|gateway)(?:\/|$)/.test(url.pathname)
    ) {
      record.blocked.push(`${request.method()} ${url.origin}${url.pathname}`);
      await route.abort("blockedbyclient");
    } else await route.continue();
  });
  await context.routeWebSocket(/.*/, (socket) => {
    record.blocked.push(`WebSocket ${socket.url()}`);
    socket.close();
  });
});
test.afterEach(async ({ page }) => {
  await test.info().attach("network-and-runtime", {
    body: JSON.stringify(traffic.get(page), null, 2),
    contentType: "application/json",
  });
  expect(
    traffic.get(page)!.blocked,
    "no spontaneous external, API, POST or WebSocket requests",
  ).toEqual([]);
  expect(traffic.get(page)!.errors, "no uncaught runtime errors").toEqual([]);
});

async function insideAndTouchable(page: Page, locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  const bounds = await locator.evaluate((element) => {
    const box = element.getBoundingClientRect(),
      hit = document.elementFromPoint(
        box.x + box.width / 2,
        box.y + box.height / 2,
      );
    return {
      width: box.width,
      height: box.height,
      x: box.x,
      right: box.right,
      y: box.y,
      bottom: box.bottom,
      hit: !!hit && element.contains(hit),
    };
  });
  expect(bounds.width).toBeGreaterThanOrEqual(44);
  expect(bounds.height).toBeGreaterThanOrEqual(44);
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.right).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.bottom).toBeLessThanOrEqual(page.viewportSize()!.height);
  expect(bounds.hit).toBe(true);
}
async function phoneReady(page: Page) {
  await expect(page).toHaveURL(/\/mobile\//);
  await expect(
    page.getByRole("button", { name: "打开菜单", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".app")).toHaveCount(0);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(page.viewportSize()!.width);
}
async function newCreation(page: Page) {
  await page
    .getByRole("button", { name: "新创作", exact: true })
    .first()
    .click();
  await expect(page.getByText("你想创造什么？", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "创作输入", exact: true }),
  ).toBeVisible();
}

for (const profile of [
  {
    name: "phone portrait",
    viewport: { width: 390, height: 844 },
    userAgent: phoneUA,
    isMobile: true,
    hasTouch: true,
  },
  {
    name: "phone short screen",
    viewport: { width: 390, height: 480 },
    userAgent: phoneUA,
    isMobile: true,
    hasTouch: true,
  },
  {
    name: "desktop browser at phone width",
    viewport: { width: 390, height: 844 },
  },
  {
    name: "phone landscape",
    viewport: { width: 844, height: 390 },
    userAgent: phoneUA,
    isMobile: true,
    hasTouch: true,
  },
]) {
  const { name, ...options } = profile;
  test.describe(name, () => {
    test.use(options);
    test("automatically loads the independent phone UI and usable creation controls", async ({
      page,
    }) => {
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await phoneReady(page);
      await newCreation(page);
      await insideAndTouchable(
        page,
        page.getByRole("button", { name: "打开菜单", exact: true }),
      );
      await page.getByRole("button", { name: "打开菜单", exact: true }).click();
      for (const label of ["项目", "素材", "设置"])
        await insideAndTouchable(
          page,
          page.getByRole("button", { name: label, exact: true }),
        );
      await page.screenshot({
        path: test.info().outputPath("phone-drawer.png"),
      });
      await page.getByRole("button", { name: "关闭面板", exact: true }).click();
      await insideAndTouchable(
        page,
        page.getByRole("textbox", { name: "创作输入", exact: true }),
      );
      await page.screenshot({
        path: test.info().outputPath("phone-creation.png"),
      });
    });

    test("empty text composer keeps model and adjacent controls usable after input blur", async ({
      page,
    }) => {
      await page.goto("/mobile/", { waitUntil: "domcontentloaded" });
      await phoneReady(page);
      await newCreation(page);
      const input = page.getByRole("textbox", {
        name: "创作输入",
        exact: true,
      });
      const model = page.getByRole("button", { name: "选择模型", exact: true });
      const touch = "hasTouch" in options && options.hasTouch;
      await expect(model).toHaveCount(0);
      await input.click();
      await insideAndTouchable(page, model);
      if (touch) await model.tap();
      else await model.click();
      await expect(page.getByText("连接与模型", { exact: true })).toBeVisible();
      await expect(
        page.getByText("还没有连接。", { exact: true }),
      ).toBeVisible();
      await page.screenshot({
        path: test.info().outputPath("empty-composer-model-picker.png"),
      });
      await page.getByRole("button", { name: "关闭面板", exact: true }).click();
      await expect(model).toBeVisible();
      await expect(input).toHaveValue("");
      await input.click();
      const add = page.getByRole("button", { name: "添加到创作", exact: true });
      if (touch) await add.tap();
      else await add.click();
      await expect(page.getByText("添加到创作", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "关闭面板", exact: true }).click();
      await input.click();
      const expand = page.getByRole("button", {
        name: "展开输入",
        exact: true,
      });
      if (touch) await expand.tap();
      else await expand.click();
      await expect(
        page.getByRole("button", { name: "收起输入", exact: true }),
      ).toBeVisible();
      await model.focus();
      await model.press("Enter");
      await expect(page.getByText("连接与模型", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "关闭面板", exact: true }).click();
      await input.fill(
        "Unsent composer draft survives model selection and reload",
      );
      await model.click();
      await page.getByRole("button", { name: "关闭面板", exact: true }).click();
      await expect(input).toHaveValue(
        "Unsent composer draft survives model selection and reload",
      );
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(input).toHaveValue(
        "Unsent composer draft survives model selection and reload",
      );
      await expect(
        page.getByRole("button", { name: "发送", exact: true }),
      ).toBeDisabled();
      await newCreation(page);
      await expect(input).toHaveValue("");
      await expect(model).toHaveCount(0);
    });
  });
}

test.describe("wide browser", () => {
  test.use({ viewport: { width: 1920, height: 1080 } });
  test("keeps the desktop entry", async ({ page, baseURL }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(`${baseURL}/`);
    await expect(page.locator(".app")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "打开菜单", exact: true }),
    ).toHaveCount(0);
  });
});

test.describe("phone browser flows", () => {
  test.use({ userAgent: phoneUA, isMobile: true, hasTouch: true });
  test("honors the explicit desktop entry without hiding existing desktop data access", async ({
    page,
    baseURL,
  }) => {
    await page.goto("/?view=desktop", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(`${baseURL}/?view=desktop`);
    await expect(page.locator(".app")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "打开菜单", exact: true }),
    ).toHaveCount(0);
  });

  test("drawer routes, persisted draft, optional login and direct settings reload retain local creation", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await phoneReady(page);
    await newCreation(page);
    const input = page.getByRole("textbox", { name: "创作输入", exact: true });
    const draft = "KK Mobile local draft survives reload and optional login";
    await input.fill(draft);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            new Promise<string[]>((resolve, reject) => {
              const open = indexedDB.open("kk-mobile-creation-v1");
              open.onerror = () => reject(open.error);
              open.onsuccess = () => {
                const db = open.result,
                  transaction = db.transaction("snapshots", "readonly"),
                  read = transaction
                    .objectStore("snapshots")
                    .get("local-browser-v1");
                read.onsuccess = () =>
                  resolve(
                    JSON.parse(read.result).projects.map(
                      (project: { composerDraft: { prompt: string } }) =>
                        project.composerDraft.prompt,
                    ),
                  );
                read.onerror = () => reject(read.error);
                transaction.oncomplete = () => db.close();
              };
            }),
        ),
      )
      .toContain(draft);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(input).toHaveValue(draft);
    for (const [label, path, control] of [
      ["项目", "/mobile/projects", "创建项目"],
      ["素材", "/mobile/materials", "导入图片"],
      ["设置", "/mobile/settings", "连接账号（可选）"],
    ]) {
      await page.getByRole("button", { name: "打开菜单", exact: true }).click();
      await insideAndTouchable(
        page,
        page.getByRole("button", { name: label, exact: true }),
      );
      await page.getByRole("button", { name: label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await insideAndTouchable(
        page,
        page.getByRole("button", { name: control, exact: true }),
      );
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(390);
      await page.screenshot({
        path: test.info().outputPath(`route-${label}.png`),
      });
      if (label !== "设置") {
        await page.getByRole("button", { name: "返回", exact: true }).click();
        await expect(input).toHaveValue(draft);
      }
    }
    await expect(
      page.getByText("仅此浏览器，无需登录", { exact: false }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "连接账号（可选）", exact: true })
      .click();
    await expect(
      page.getByRole("textbox", { name: "邮箱", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "继续本机创作", exact: true })
      .click();
    await expect(input).toHaveValue(draft);
    await page.goto("/mobile/settings", { waitUntil: "domcontentloaded" });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/mobile\/settings$/);
    await expect(
      page.getByText("仅此浏览器，无需登录", { exact: false }),
    ).toBeVisible();
    await expect(page.locator(".app")).toHaveCount(0);
    await page.getByRole("button", { name: "返回", exact: true }).click();
    await expect(input).toHaveValue(draft);
  });

  test("cold direct settings deep links and reload stay on the independent phone settings page", async ({
    page,
  }) => {
    await page.goto("/mobile/settings", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/mobile\/settings$/);
    await expect(
      page.getByText("仅此浏览器，无需登录", { exact: false }),
    ).toBeVisible();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/mobile\/settings$/);
    await expect(
      page.getByText("仅此浏览器，无需登录", { exact: false }),
    ).toBeVisible();
    await expect(page.locator(".app")).toHaveCount(0);
  });

  test("missing mobile bundles and static files return real 404 responses", async ({
    page,
  }) => {
    await page.goto("/mobile/", { waitUntil: "domcontentloaded" });
    await phoneReady(page);
    const responses = await page.evaluate(async () =>
      Promise.all(
        [
          "/mobile/_expo/static/js/web/does-not-exist-qa.js",
          "/mobile/assets/does-not-exist-qa.css",
          "/assets/does-not-exist-qa.js",
        ].map(async (path) => {
          const response = await fetch(path);
          return {
            path,
            status: response.status,
            type: response.headers.get("content-type"),
            body: await response.text(),
          };
        }),
      ),
    );
    for (const response of responses) {
      expect(response.status, response.path).toBe(404);
      expect(response.body).not.toContain("/mobile/_expo/");
      expect(response.body).not.toMatch(
        /<script\b[^>]*\bsrc=["']\/assets\/index-/i,
      );
    }
  });
});
