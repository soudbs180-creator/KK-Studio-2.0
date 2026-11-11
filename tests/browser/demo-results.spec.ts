import { expect, test } from "@playwright/test";
import { openWorkspace } from "./helpers";
import {
  configureMediaNode,
  approveMediaTask,
  fixtureVideo,
} from "./mediaHelpers";

for (const [kind, label] of [
  ["video", "视频"],
  ["audio", "音频"],
  ["text", "文案"],
] as const) {
  test(`${label}未配置时保留草稿并引导设置，绝不加载演示结果`, async ({
    page,
  }) => {
    await openWorkspace(page);
    let demos = 0;
    await page.route("**/fixtures/demo/**", (route) => {
      demos++;
      return route.abort();
    });
    await page.getByRole("button", { name: "添加资源", exact: true }).click();
    await page
      .getByRole("menuitem", {
        name: kind === "text" ? "文本" : label,
        exact: true,
      })
      .click();
    const source = page
      .locator(`.canvas-node[data-node-id^="added-${kind}-"]`)
      .first();
    const prompt = source.getByLabel(`${label}提示词`);
    await prompt.fill(`未配置${label}的草稿`);
    await expect(
      source.getByRole("button", { name: `生成${label}`, exact: true }),
    ).toBeDisabled();
    await expect(
      source.getByRole("button", { name: "前往模型设置" }),
    ).toBeVisible();
    await expect(prompt).toHaveValue(`未配置${label}的草稿`);
    await expect(
      page.locator('.demo-result-node[data-source="demo"]'),
    ).toHaveCount(0);
    expect(demos).toBe(0);
  });
}

test("视频经真实产品提交和轮询协议归档，重载不重复提交", async ({ page }) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page.getByRole("menuitem", { name: "视频", exact: true }).click();
  const source = page
    .locator('.canvas-node[data-node-id^="added-video-"]')
    .first();
  const requests = await fixtureVideo(page);
  await configureMediaNode(page, source, "video");
  await source.getByLabel("视频提示词").fill("飞鸟掠过河面");
  await source.getByRole("button", { name: "生成视频", exact: true }).click();
  await approveMediaTask(page);
  const result = page.locator(
    '.demo-result-node[data-source="provider"][data-kind="video"]',
  );
  await expect(result).toHaveCount(1);
  await expect(page.locator(".project-save-state")).toContainText("已保存");
  expect(requests.filter((r) => r.method === "POST")).toHaveLength(1);
  expect(requests[0].body).toEqual({
    model: "veo-3.1-generate-preview",
    input: {
      prompt: "飞鸟掠过河面",
      n: 1,
      duration: 4,
      aspect_ratio: "16:9",
      resolution: "720p",
      audio: false,
    },
  });
  await page.reload();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.locator(".project-library-card").first().click();
  await expect(result).toHaveCount(1);
  expect(requests.filter((r) => r.method === "POST")).toHaveLength(1);
  await page.screenshot({
    path: test.info().outputPath("multimodal-video-archive.png"),
  });
});

test("语音使用speech协议，失败不会返回演示音频", async ({ page }) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page.getByRole("menuitem", { name: "音频", exact: true }).click();
  const source = page
    .locator('.canvas-node[data-node-id^="added-audio-"]')
    .first();
  await configureMediaNode(page, source, "audio");
  let requests = 0;
  await page.route("http://127.0.0.1:19438/v1/audio/speech", async (route) => {
    requests++;
    expect(route.request().postDataJSON()).toEqual({
      model: "tts-1",
      input: "你好，欢迎使用",
      voice: "alloy",
      response_format: "mp3",
      speed: 1,
    });
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      json: { error: { message: "synthetic rejected speech" } },
    });
  });
  await source.getByLabel("音频提示词").fill("你好，欢迎使用");
  await source.getByRole("button", { name: "生成音频", exact: true }).click();
  await expect(source.locator(".local-generation-status")).toContainText(
    /语音.*HTTP 400/,
  );
  await expect(
    page.locator('.demo-result-node[data-source="demo"][data-kind="audio"]'),
  ).toHaveCount(0);
  expect(requests).toBe(1);
});
