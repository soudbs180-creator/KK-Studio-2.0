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

test("模型按来源、供应商、模型逐级选择并保持键盘焦点", async ({
  page,
}, info) => {
  await seed(page);
  await openSeededProject(page);
  const trigger = page.getByRole("button", { name: "模型", exact: true });
  await trigger.click();
  const menu = page.getByRole("menu", { name: "选择模型" });
  await expect(menu.getByRole("tablist")).toHaveCount(0);
  await expect(menu.getByLabel("常用模型参数")).toHaveCount(0);
  for (const source of [
    "Google",
    "Codex",
    "豆包 Doubao",
    "WorkBuddy",
    "API 自定义模型",
  ])
    await expect(
      menu.getByRole("menuitem", { name: new RegExp(`^${source}`) }),
    ).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: /^Google/ })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await menu.getByRole("menuitem", { name: /^Codex/ }).click();
  const codexImage = menu.getByRole("menuitemradio", {
    name: /^图片模型未报告/,
  });
  await expect(codexImage).toHaveAttribute("aria-disabled", "true");
  await expect(codexImage).toHaveAttribute("title", "请先连接 Codex");
  await menu.getByRole("button", { name: "返回上一级", exact: true }).click();
  const defaultModel = menu.getByRole("menuitemradio", { name: /^默认/ });
  await defaultModel.focus();
  await defaultModel.press("End");
  const apiSource = menu.getByRole("menuitem", { name: /^API 自定义模型/ });
  await expect(apiSource).toBeFocused();
  await apiSource.press("Enter");
  await expect(
    menu.getByRole("menuitem", { name: /^Provider A/ }),
  ).toBeFocused();
  await menu.getByRole("menuitem", { name: /^Provider B/ }).click();
  const image = menu.getByRole("menuitemradio", { name: /^image-b/ });
  await expect(image).toBeFocused();
  await menu.screenshot({ path: info.outputPath("source-provider-model.png") });
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
  await expect(menu).toContainText("API 供应商");
  await expect(menu.getByRole("menuitem", { name: /^Codex/ })).toHaveCount(0);
  await expect(menu.getByLabel("生成数量", { exact: true })).toHaveCount(0);
  await expect(menu.getByLabel("隐私模式", { exact: true })).toHaveCount(0);
  await expect(menu.getByRole("region", { name: "生成设置" })).toHaveCount(0);
  await menu.getByRole("button", { name: "切换全部模型", exact: true }).click();
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
