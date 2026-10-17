import { expect, test, type Page } from "@playwright/test";
import { openSeededProject } from "./helpers";
import { PROVIDER_CONNECTIONS_STORAGE_KEY } from "../../src/features/creation/providerRegistry";
import { MODEL_PROVIDER_STORAGE_KEY } from "../../src/domain/modelProvider";
import { GOOGLE_CONNECTION_ID } from "../../src/features/agent/googleAgentConfig";
import {
  GOOGLE_API_BASE,
  GOOGLE_IMAGE_MODEL,
} from "../../src/features/agent/googleInteractions";

const providers = [
  ["provider-a", "Provider A", "image-a", "image"],
  ["provider-b", "Provider B", "image-b", "image"],
  ["provider-media", "Media", "media-video", "video"],
].map(([id, displayName, model, modality]) => ({
  id,
  provider: displayName,
  displayName,
  model,
  kind: "user_byok",
  baseUrl: `https://${id}.example.test/v1`,
  credentialRef: id,
  capabilities: {
    modalities: [modality],
    operations: ["generate"],
    async: false,
  },
  state: "active",
  concurrencyLimit: 1,
  verificationStatus: "unverified",
}));

test("类型筛选后修改置顶保留隐藏的旧family成员及其他渠道精确ID", async ({
  page,
}) => {
  await seed(page);
  const pin = (model: string, connectionId = providers[0].id) =>
    JSON.stringify(["api", connectionId, model]);
  const hiddenIds = [
    pin("exact-hidden-official", "official-unavailable"),
    pin("exact-hidden-local", "local-unavailable"),
    JSON.stringify(["codex", "", "exact-account-model"]),
    pin("exact-removed", "removed"),
  ];
  await page.addInitScript(
    ({ connection, registryKey, initialPins }) => {
      const connections = JSON.parse(localStorage.getItem(registryKey) ?? "[]");
      localStorage.setItem(
        registryKey,
        JSON.stringify(
          connections.map((item: { id: string }) =>
            item.id === connection.id
              ? {
                  ...connection,
                  capabilities: {
                    modalities: ["text", "image"],
                    operations: ["generate"],
                    async: false,
                  },
                }
              : item,
          ),
        ),
      );
      localStorage.setItem(
        "kk-studio:model-catalog:v1",
        JSON.stringify([
          {
            ...connection,
            fetchedAt: 1,
            models: [
              { id: "shared-chat", kind: "text", family: "Shared" },
              { id: "shared-image", kind: "image", family: "Shared" },
              { id: "other-image", kind: "image", family: "Other" },
            ],
          },
        ]),
      );
      localStorage.setItem(
        "kk:model-picker:conversation",
        JSON.stringify({
          page: "api",
          all: true,
          channel: "relay",
          filter: "text",
          pins: { all: initialPins },
        }),
      );
    },
    {
      connection: providers[0],
      registryKey: PROVIDER_CONNECTIONS_STORAGE_KEY,
      initialPins: [pin("Shared"), ...hiddenIds],
    },
  );
  await openSeededProject(page);
  await page.getByRole("button", { name: "模型", exact: true }).click();
  const menu = page.getByRole("menu", { name: "选择模型" });
  const filter = menu.getByLabel("模型类型", { exact: true });
  await expect(
    menu.getByRole("button", { name: /^取消置顶 shared-chat/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await filter.selectOption("image");
  await menu.getByRole("button", { name: /^置顶 other-image/ }).click();
  await filter.selectOption("text");
  await expect(
    menu.getByRole("button", { name: /^取消置顶 shared-chat/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await filter.selectOption("image");
  await expect(
    menu.getByRole("button", { name: /^取消置顶 shared-image/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    menu.getByRole("button", { name: /^取消置顶 other-image/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await menu.getByRole("tab", { name: "官方 API", exact: true }).click();
  await menu.getByRole("tab", { name: "中转 API", exact: true }).click();
  const storedPins = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("kk:model-picker:conversation") ?? "{}")
        .pins.all,
  );
  expect(storedPins).toEqual(
    expect.arrayContaining([
      pin("shared-chat"),
      pin("shared-image"),
      pin("other-image"),
      ...hiddenIds,
    ]),
  );
});

async function seed(page: Page, legacyPin = false) {
  await page.addInitScript(
    ({ providers, registryKey, profileKey, legacyPin }) => {
      localStorage.setItem(registryKey, JSON.stringify(providers));
      localStorage.setItem(
        profileKey,
        JSON.stringify({
          version: 1,
          name: providers[0].provider,
          baseUrl: providers[0].baseUrl,
          model: providers[0].model,
        }),
      );
      const key = "kk:model-picker:canvas-image";
      if (legacyPin && !localStorage.getItem(key))
        localStorage.setItem(
          key,
          JSON.stringify({
            page: "root",
            all: false,
            pins: { image: [JSON.stringify(["api", "provider-b", "image-b"])] },
          }),
        );
    },
    {
      providers,
      registryKey: PROVIDER_CONNECTIONS_STORAGE_KEY,
      profileKey: MODEL_PROVIDER_STORAGE_KEY,
      legacyPin,
    },
  );
}

test("Google 原生连接可以搜索但不能作为通用 API 模型执行", async ({ page }) => {
  await seed(page);
  await page.goto("/");
  await page.evaluate(
    ({ key, connection }) => {
      const current = JSON.parse(localStorage.getItem(key) ?? "[]");
      localStorage.setItem(key, JSON.stringify([...current, connection]));
      window.dispatchEvent(new Event("kk:model-provider-changed"));
    },
    {
      key: PROVIDER_CONNECTIONS_STORAGE_KEY,
      connection: {
        ...providers[0],
        id: GOOGLE_CONNECTION_ID,
        provider: "Gemini",
        displayName: "Google Gemini",
        baseUrl: GOOGLE_API_BASE,
        model: GOOGLE_IMAGE_MODEL,
      },
    },
  );
  const trigger = page.getByRole("button", { name: "模型", exact: true });
  const previousModel = await trigger.getAttribute("title");
  await trigger.click();
  const menu = page.getByRole("menu", { name: "选择模型" });
  await menu.getByRole("tab", { name: "官方 API", exact: true }).click();
  await menu.getByRole("searchbox").fill("Google Gemini");
  const native = menu.getByRole("menuitemradio", {
    name: new RegExp(GOOGLE_IMAGE_MODEL),
  });
  await expect(native).toHaveAttribute("aria-disabled", "true");
  await expect(native).toHaveAttribute(
    "title",
    "请从对话的执行方式选择 Google Gemini",
  );
  await native.focus();
  await native.press("Enter");
  await expect(menu).toBeVisible();
  await expect(trigger).toHaveAttribute("title", previousModel!);
});

test("模型按四渠道、搜索筛选、精确型号选择并保持键盘焦点", async ({
  page,
}, info) => {
  await seed(page);
  await openSeededProject(page);
  const trigger = page.getByRole("button", { name: "模型", exact: true });
  await trigger.click();
  const menu = page.getByRole("menu", { name: "选择模型" });
  await expect(menu.getByRole("tablist", { name: "模型渠道" })).toHaveCount(1);
  await expect(menu.getByLabel("常用模型参数")).toHaveCount(0);
  await expect(menu.getByRole("tab")).toHaveText([
    "中转 API",
    "登录账号",
    "官方 API",
    "本地",
  ]);
  await menu.getByRole("tab", { name: "登录账号", exact: true }).click();
  const codexImage = menu.getByRole("menuitemradio", {
    name: /^Codex 内置生图/,
  });
  await expect(codexImage).toHaveAttribute("aria-disabled", "true");
  await expect(codexImage).toHaveAttribute("title", "请先连接 Codex");
  const account = menu.getByRole("tab", { name: "登录账号", exact: true });
  await account.focus();
  await account.press("ArrowLeft");
  await expect(
    menu.getByRole("tab", { name: "中转 API", exact: true }),
  ).toBeFocused();
  await expect(menu.getByRole("menuitem")).toHaveCount(0);
  await menu.getByLabel("模型类型").selectOption("image");
  const first = menu.getByRole("menuitemradio", { name: /^image-a/ });
  await first.focus();
  await first.press("End");
  const image = menu.getByRole("menuitemradio", { name: /^image-b/ });
  await expect(image).toBeFocused();
  await menu.screenshot({ path: info.outputPath("channel-search-model.png") });
  await image.press("Enter");
  await expect(menu).toBeHidden();
  await expect(trigger).toHaveAttribute("title", "image-b");
  await expect(page.getByLabel("执行方式")).toHaveValue("direct");
});

test("首页模型弹层只选模型，保留全局搜索和旧置顶", async ({ page }) => {
  await seed(page, true);
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "模型", exact: true });
  await trigger.click();
  const menu = page.getByRole("menu", { name: "选择模型" });
  await expect(menu.getByRole("tab")).toHaveCount(4);
  await expect(
    menu.getByRole("menuitemradio", { name: /^Codex 内置生图/ }),
  ).toHaveAttribute("aria-checked", "true");
  await expect(menu.getByLabel("生成数量", { exact: true })).toHaveCount(0);
  await expect(menu.getByLabel("隐私模式", { exact: true })).toHaveCount(0);
  await expect(menu.getByRole("region", { name: "生成设置" })).toHaveCount(0);
  await menu.getByRole("tab", { name: "中转 API", exact: true }).click();
  await expect(
    menu.getByRole("menuitemradio", { name: /media-video/ }),
  ).toHaveCount(0);
  const search = menu.getByRole("searchbox");
  await search.fill("Provider B");
  await expect(menu.getByRole("menuitemradio")).toHaveCount(1);
  const pin = menu.getByRole("button", { name: /^取消置顶 image-b/ });
  await expect(pin).toHaveAttribute("aria-pressed", "true");
  await pin.click();
  await expect(
    menu.getByRole("button", { name: /^置顶 image-b/ }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.reload();
  await trigger.click();
  await expect(
    menu.getByRole("button", { name: /^置顶 image-b/ }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(menu.getByLabel("生成数量", { exact: true })).toHaveCount(0);
  await expect(menu.getByLabel("隐私模式", { exact: true })).toHaveCount(0);
});

test("模型弹层宽度不超过 320 并在短屏幕内滚动", async ({ page }, info) => {
  await seed(page);
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "模型", exact: true });
  const menu = page.getByRole("menu", { name: "选择模型" });
  for (const [width, height] of [
    [390, 480],
    [1099, 720],
    [1920, 1080],
  ]) {
    await page.setViewportSize({ width, height });
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    const box = (await menu.boundingBox())!;
    expect(box.width).toBeLessThanOrEqual(320);
    expect(box.x).toBeGreaterThanOrEqual(7);
    expect(box.x + box.width).toBeLessThanOrEqual(width - 7);
    expect(box.y).toBeGreaterThanOrEqual(7);
    expect(box.y + box.height).toBeLessThanOrEqual(height - 7);
    await menu
      .getByRole("button", { name: "模型接入…", exact: true })
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: info.outputPath(`compact-${width}-${height}.png`),
    });
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
  }
});

test("四渠道连续缩放保持搜索筛选、草稿和精确型号身份", async ({
  page,
}, info) => {
  await seed(page);
  await page.setViewportSize({ width: 390, height: 900 });
  await openSeededProject(page);
  await page.getByRole("button", { name: "打开对话", exact: true }).click();
  await page.setViewportSize({ width: 1920, height: 900 });
  await page.getByLabel("对话内容", { exact: true }).fill("连续缩放保留的草稿");
  await page.evaluate(
    ({ key, sample }) => {
      const current = JSON.parse(localStorage.getItem(key) ?? "[]");
      const official = {
        ...sample,
        id: "official-a",
        channel: "official",
        baseUrl: "https://official.example.test/v1",
        model: "image-official",
      };
      const local = {
        ...sample,
        id: "local-a",
        kind: "local_comfyui",
        baseUrl: "http://127.0.0.1:8188",
        model: "image-local",
      };
      localStorage.setItem(key, JSON.stringify([...current, official, local]));
      window.dispatchEvent(new Event("kk:model-provider-changed"));
    },
    { key: PROVIDER_CONNECTIONS_STORAGE_KEY, sample: providers[0] },
  );
  const trigger = page.getByRole("button", { name: "模型", exact: true });
  await trigger.click();
  const menu = page.getByRole("menu", { name: "选择模型" });
  const search = menu.getByRole("searchbox");
  await menu.getByRole("tab", { name: "中转 API", exact: true }).click();
  await menu.getByLabel("模型类型").selectOption("image");
  await search.fill("image");
  for (const channel of ["官方 API", "本地", "登录账号", "中转 API"]) {
    await menu.getByRole("tab", { name: channel, exact: true }).click();
    await expect(search).toHaveValue("image");
    await expect(menu.getByLabel("模型类型")).toHaveValue("image");
    if (channel === "本地")
      await expect(
        menu.getByRole("menuitemradio", { name: /^image-local/ }),
      ).toHaveAttribute("aria-disabled", "true");
  }
  const geometry = [];
  for (const width of [1920, 1099, 767, 480, 390, 900, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(menu).toBeVisible();
    await expect(search).toHaveValue("image");
    await expect(
      menu.getByRole("tab", { name: "中转 API", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(
      menu.getByRole("menuitemradio", { name: /^image-b/ }),
    ).toBeVisible();
    const bounds = (await menu.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(7);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width - 7);
    expect(bounds.y).toBeGreaterThanOrEqual(7);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(893);
    const rows = await menu.evaluate((element) => {
      const rect = (selector: string) => {
        const node = element.querySelector(selector)!;
        const box = node.getBoundingClientRect();
        return { top: box.top, bottom: box.bottom };
      };
      return {
        channels: rect(".kk-model-channels"),
        search: rect(".kk-model-menu-top"),
        models: rect(".kk-model-menu-list"),
      };
    });
    expect(rows.search.top).toBeGreaterThanOrEqual(rows.channels.bottom);
    expect(rows.models.top).toBeGreaterThanOrEqual(rows.search.bottom);
    geometry.push({ width, bounds, rows });
    if ([390, 1099, 1920].includes(width))
      await menu.screenshot({
        path: info.outputPath(`four-channels-${width}.png`),
      });
  }
  const runtime = await page.evaluate(() => ({
    url: location.href,
    mode: document.querySelector(".app")?.getAttribute("data-runtime-mode"),
    entry: document.querySelector(".app")?.getAttribute("data-runtime-entry"),
    importChain: document.querySelector<HTMLMetaElement>(
      'meta[name="kk-runtime-entry"]',
    )?.content,
    scripts: [...document.scripts].map((script) => script.src).filter(Boolean),
  }));
  expect(runtime.mode).toBe("production");
  expect(runtime.entry).toBe("src/main.tsx");
  expect(runtime.scripts).toHaveLength(1);
  expect(runtime.scripts[0]).toMatch(/\/assets\/index-[\w-]+\.js$/);
  await info.attach("four-channel-runtime", {
    body: JSON.stringify(runtime, null, 2),
    contentType: "application/json",
  });
  await info.attach("four-channel-geometry", {
    body: JSON.stringify(geometry, null, 2),
    contentType: "application/json",
  });
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(page.getByLabel("对话内容", { exact: true })).toHaveValue(
    "连续缩放保留的草稿",
  );
});

test("官方和中转渠道保存重开保留分类及具体连接身份", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page.getByRole("button", { name: "模型接入", exact: true }).click();
  for (const channel of ["official", "relay"] as const) {
    await page
      .getByRole("button", {
        name: channel === "official" ? "API Key（官方）" : "API Key（中转站）",
        exact: true,
      })
      .click();
    await page.getByLabel("提供商", { exact: true }).fill(`Scope ${channel}`);
    await page
      .getByLabel("接口地址")
      .fill(`https://${channel}.example.test/v1`);
    await page
      .getByLabel("API Key", { exact: true })
      .fill(`fixture-${channel}`);
    await page.getByLabel("模型名称").fill(`image-${channel}`);
    await page.getByRole("button", { name: "保存连接", exact: true }).click();
  }
  const before = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "[]"),
    PROVIDER_CONNECTIONS_STORAGE_KEY,
  );
  expect(before.map((item: { channel: string }) => item.channel)).toEqual([
    "official",
    "relay",
  ]);
  expect(new Set(before.map((item: { id: string }) => item.id)).size).toBe(2);
  expect(
    new Set(before.map((item: { credentialRef: string }) => item.credentialRef))
      .size,
  ).toBe(2);
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "模型", exact: true }).click();
  const menu = page.getByRole("menu", { name: "选择模型" });
  for (const channel of ["official", "relay"] as const) {
    await menu
      .getByRole("tab", {
        name: channel === "official" ? "官方 API" : "中转 API",
        exact: true,
      })
      .click();
    await expect(menu.getByRole("menuitemradio")).toHaveCount(1);
    await expect(menu.getByRole("menuitemradio")).toContainText(
      `image-${channel}`,
    );
  }
  await menu.getByRole("menuitemradio", { name: /^image-relay/ }).click();
  await page.reload();
  const trigger = page.getByRole("button", { name: "模型", exact: true });
  await expect(trigger).toHaveAttribute("title", "image-relay");
  await trigger.click();
  await expect(
    menu.getByRole("tab", { name: "中转 API", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    menu.getByRole("menuitemradio", { name: /^image-relay/ }),
  ).toHaveAttribute("aria-checked", "true");
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) ?? "[]"),
      PROVIDER_CONNECTIONS_STORAGE_KEY,
    ),
  ).toEqual(before);
});
