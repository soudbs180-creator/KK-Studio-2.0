import { expect, test } from "@playwright/test";
import { fixtureVideo, approveMediaTask } from "./mediaHelpers";

for (const kind of ["video", "audio"] as const) {
  test(`首页选择 ${kind} 后以合法默认参数提交真实任务入口并归档`, async ({
    page,
  }) => {
    const model = kind === "video" ? "veo-3.1-generate-preview" : "tts-1";
    const baseUrl =
      kind === "video"
        ? "https://api.12ai.org/v1"
        : "http://127.0.0.1:19439/v1";
    const requests = kind === "video" ? await fixtureVideo(page) : [];
    let speechRequests = 0;
    if (kind === "audio")
      await page.route(`${baseUrl}/audio/speech`, async (route) => {
        speechRequests++;
        expect(route.request().postDataJSON()).toMatchObject({
          model,
          voice: "alloy",
          response_format: "mp3",
          speed: 1,
        });
        await route.fulfill({
          contentType: "audio/mpeg",
          path: "tests/fixtures/media/silence.mp3",
        });
      });
    await page.goto("/");
    await page.getByRole("button", { name: "模型", exact: true }).click();
    await page
      .getByRole("menu")
      .getByRole("button", { name: "模型接入…", exact: true })
      .click();
    await page.getByRole("tab", { name: "官方直连 API", exact: true }).click();
    await page.getByLabel("接口地址").fill(baseUrl);
    await page.getByLabel("API Key", { exact: true }).fill("fixture-media-key");
    await page.getByLabel("模型名称").fill(model);
    await page.getByRole("button", { name: "保存连接", exact: true }).click();
    await page.getByRole("button", { name: "关闭设置", exact: true }).click();
    await page.getByRole("button", { name: "模型", exact: true }).click();
    const menu = page.getByRole("menu", { name: "选择模型" });
    await menu.getByRole("searchbox").fill(model);
    await menu
      .getByRole("menuitemradio")
      .filter({ hasText: model })
      .first()
      .click();
    await page.getByLabel("创作提示词").fill("A quiet scene");
    await page
      .getByRole("button", { name: "开始创建项目", exact: true })
      .click();
    if (kind === "video") {
      await expect(
        page.getByRole("dialog", { name: "人工审批任务" }),
      ).toBeVisible();
      expect(requests.filter((r) => r.method === "POST")).toHaveLength(0);
      await approveMediaTask(page);
    }
    const savedTask = () =>
      page.evaluate(() => {
        const snapshot = JSON.parse(
          localStorage.getItem("kk-studio-next:creation:v1")!,
        );
        return snapshot.projects.find(
          (p: { id: string }) => p.id === snapshot.activeProjectId,
        )?.tasks[0];
      });
    await expect
      .poll(async () => (await savedTask())?.status)
      .toBe("succeeded");
    expect((await savedTask()).media.kind).toBe(kind);
    expect((await savedTask()).outputs[0].assetId).toBeTruthy();
    expect(
      kind === "audio"
        ? speechRequests
        : requests.filter((r) => r.method === "POST").length,
    ).toBe(1);
  });
}
