import { expect, test, type Locator, type Page } from "@playwright/test";
import { truncateSync, writeFileSync } from "node:fs";

const videoFixture = "public/fixtures/demo/blue-hour-motion.webm";

async function openVideoNode(page: Page): Promise<Locator> {
  await page.goto("/");
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page.getByRole("menuitem", { name: "视频", exact: true }).click();
  const node = page.getByTestId(/^canvas-node-added-video-/).first();
  await node.click();
  await expect(node.getByRole("button", { name: "上传视频" })).toBeVisible();
  return node;
}

test("视频上传归档为 kk-asset 引用，刷新后恢复本地预览", async ({ page }) => {
  const node = await openVideoNode(page);
  const nodeId = await node.getAttribute("data-node-id");
  expect(nodeId).toBeTruthy();
  await node.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Shift+ArrowDown");
  const position = await node.evaluate((element) => ({
    left: element.style.left,
    top: element.style.top,
  }));
  const input = node.locator(
    'input[type="file"][accept="video/mp4,video/webm"]',
  );
  await input.setInputFiles(videoFixture);
  await expect(node.locator(".video-placeholder video")).toBeVisible();
  expect(
    await node.evaluate((element) => ({
      left: element.style.left,
      top: element.style.top,
    })),
  ).toEqual(position);
  await expect(node.getByRole("status")).toContainText(
    "演示生成不会上传或消费视频原件",
  );
  await expect(node.getByRole("button", { name: "上传视频" })).toHaveAttribute(
    "title",
    /本地预览/,
  );
  await page.waitForFunction((id) => {
    const raw = localStorage.getItem("kk-studio-next:creation:v1");
    if (!raw) return false;
    const snapshot = JSON.parse(raw) as {
      projects?: Array<{ items?: Array<Record<string, unknown>> }>;
    };
    const item = snapshot.projects
      ?.flatMap((project) => project.items ?? [])
      .find((candidate) => candidate.id === id);
    return (
      typeof item?.assetId === "string" &&
      typeof item.preview === "string" &&
      item.preview.startsWith("kk-asset:")
    );
  }, nodeId);
  await page.reload();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  const projectCard = page.locator(".project-library-card").first();
  await expect(projectCard).toBeVisible();
  await projectCard.click();
  const restored = page.locator(`[data-node-id="${nodeId}"]`);
  await expect(restored.locator(".video-placeholder video")).toBeVisible();
  expect(
    await restored.evaluate((element) => ({
      left: element.style.left,
      top: element.style.top,
    })),
  ).toEqual(position);
});

test("视频上传拒绝空文件、超过 100 MB 和非 MP4/WebM 类型", async ({
  page,
}, testInfo) => {
  const node = await openVideoNode(page);
  const input = node.locator(
    'input[type="file"][accept="video/mp4,video/webm"]',
  );
  await input.setInputFiles({
    name: "empty.mp4",
    mimeType: "video/mp4",
    buffer: Buffer.alloc(0),
  });
  await expect(node.getByRole("status")).toContainText("不能为空");
  const largePath = testInfo.outputPath("too-large.mp4");
  writeFileSync(largePath, Buffer.from([0]));
  truncateSync(largePath, 100 * 1024 * 1024 + 1);
  await input.setInputFiles(largePath);
  await expect(node.getByRole("status")).toContainText("100 MB");
  await input.setInputFiles({
    name: "still.png",
    mimeType: "image/png",
    buffer: Buffer.from("not a video"),
  });
  await expect(node.getByRole("status")).toContainText("MP4 或 WebM");
});
