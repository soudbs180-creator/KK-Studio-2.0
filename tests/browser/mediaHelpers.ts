import { expect, type Page, type Locator } from "@playwright/test";
import { selectSettingsSection } from "./helpers";

/** Synthetic endpoints only; no fixture request reaches a paid service. */
export async function configureMediaNode(
  page: Page,
  source: Locator,
  kind: "video" | "audio",
) {
  const model = kind === "video" ? "veo-3.1-generate-preview" : "tts-1";
  const base =
    kind === "video" ? "https://api.12ai.org/v1" : "http://127.0.0.1:19438/v1";
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await selectSettingsSection(page, "模型接入");
  await page.getByRole("tab", { name: "官方直连 API", exact: true }).click();
  await page.getByLabel("接口地址").fill(base);
  await page.getByLabel("API Key", { exact: true }).fill("fixture-media-key");
  await page.getByLabel("模型名称").fill(model);
  await page.getByRole("button", { name: "保存连接", exact: true }).click();
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await source.focus();
  await source.press("Enter");
  await page
    .getByTestId(`${kind}-composer`)
    .getByRole("button", { name: "画布模型", exact: true })
    .click();
  const menu = page.getByRole("menu", { name: "选择模型" });
  await menu.getByRole("searchbox").fill(model);
  await menu
    .getByRole("menuitemradio")
    .filter({ hasText: model })
    .first()
    .click();
}

export async function approveMediaTask(page: Page) {
  await page.getByRole("button", { name: "批准并提交", exact: true }).click();
}

export async function fixtureVideo(page: Page, wait?: Promise<void>) {
  const requests: Array<{ method: string; body?: Record<string, unknown> }> =
    [];
  await page.route("https://api.12ai.org/v1/task/**", async (route) => {
    const request = route.request();
    expect(request.headers()["authorization"]).toBe("Bearer fixture-media-key");
    const post = request.method() === "POST";
    requests.push({
      method: request.method(),
      body: post ? request.postDataJSON() : undefined,
    });
    if (!post && wait) await wait;
    await route.fulfill({
      contentType: "application/json",
      json: post
        ? { id: "fixture-video-job", status: "queued" }
        : {
            id: "fixture-video-job",
            status: "completed",
            outputs: ["https://img.12ai.org/videos/fixture.webm"],
          },
    });
  });
  await page.route(
    "https://img.12ai.org/videos/fixture.webm",
    async (route) => {
      expect(route.request().headers()["authorization"]).toBeUndefined();
      await route.fulfill({
        path: "public/fixtures/demo/blue-hour-motion.webm",
        contentType: "video/webm",
      });
    },
  );
  return requests;
}
