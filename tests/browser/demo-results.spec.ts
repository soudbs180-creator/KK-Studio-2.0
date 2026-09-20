import { expect, test } from "@playwright/test";
import { openWorkspace } from "./helpers";

/** Non-image demo media remains available through a normal node while image
 * generation is reserved for a configured provider-backed connection. */
test("普通节点生成本地结果，不显示独立示范入口", async ({ page }) => {
  await openWorkspace(page);
  await expect(
    page.getByRole("button", { name: "示范素材", exact: true }),
  ).toHaveCount(0);

  for (const [kind, label] of [
    ["video", "视频"],
    ["audio", "音频"],
    ["text", "文案"],
  ] as const) {
    const menuLabel = kind === "text" ? "文本" : label;
    await page.getByRole("button", { name: "添加资源", exact: true }).click();
    await page.getByRole("menuitem", { name: menuLabel, exact: true }).click();
    const source = page
      .locator(`.canvas-node[data-node-id^="added-${kind}-"]`)
      .first();
    await expect(source).toBeVisible();
    await source.getByLabel(`${label}提示词`).fill(`测试${label}生成`);
    await source
      .getByRole("button", { name: `生成${label}`, exact: true })
      .click();
    await expect(
      page.locator(
        `.demo-result-node[data-source="demo"][data-kind="${kind}"]`,
      ),
    ).toHaveCount(kind === "video" ? 8 : 1);
    if (kind !== "video")
      await expect(source.getByText("前端草稿", { exact: true })).toBeVisible();
  }
});

test("普通视频生成的本地素材加载失败时提供可重试状态", async ({ page }) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page.getByRole("menuitem", { name: "视频", exact: true }).click();
  const source = page
    .locator('.canvas-node[data-node-id^="added-video-"]')
    .first();
  await source.getByLabel("视频提示词").fill("加载失败测试");
  await page.route("**/fixtures/demo/blue-hour-motion.webm", (route) =>
    route.abort(),
  );
  await source.getByRole("button", { name: "生成视频", exact: true }).click();
  await expect(source.locator(".local-generation-status")).toContainText(
    "本地测试素材加载失败，请重试。",
  );
  await expect(
    page.locator(".demo-result-node[data-source=demo][data-kind=video]"),
  ).toHaveCount(0);
});
