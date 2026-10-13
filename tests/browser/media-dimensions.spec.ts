import { expect, test } from "@playwright/test";
import { openWorkspace, waitForConversationPanelSettled } from "./helpers";

test("图片原始尺寸写入项目快照并在刷新后保持画布比例", async ({ page }) => {
  await openWorkspace(page);
  const node = page.getByTestId("canvas-node-image");
  const nodeId = await node.getAttribute("data-node-id");
  expect(nodeId).toBeTruthy();
  await node
    .locator('input[type="file"]')
    .first()
    .setInputFiles("public/fixtures/demo/blue-hour.png");
  await expect(node.locator(".uploaded-image")).toBeVisible();

  const dimensions = await node
    .locator(".uploaded-image")
    .evaluate((image) => ({
      width: image.naturalWidth,
      height: image.naturalHeight,
    }));
  expect(dimensions.width).toBeGreaterThan(1);
  expect(dimensions.height).toBeGreaterThan(1);
  await expect
    .poll(() =>
      page.evaluate((id) => {
        const snapshot = JSON.parse(
          localStorage.getItem("kk-studio-next:creation:v1") ?? "{}",
        );
        const project = snapshot.projects?.find(
          (entry: { id: string }) => entry.id === snapshot.activeProjectId,
        );
        const item = project?.items?.find(
          (entry: { id: string }) => entry.id === id,
        );
        return [item?.mediaWidth, item?.mediaHeight];
      }, nodeId),
    )
    .toEqual([dimensions.width, dimensions.height]);

  const beforeReload = await node
    .locator(".image-creation")
    .evaluate((element) =>
      getComputedStyle(element).getPropertyValue("--media-height"),
    );
  await page.reload();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page
    .locator(".project-library-card")
    .filter({ hasText: "Agent 验证项目" })
    .click();
  await waitForConversationPanelSettled(page);
  const restored = page.locator(`[data-node-id="${nodeId}"]`);
  await expect(restored.locator(".uploaded-image")).toBeVisible();
  const afterReload = await restored
    .locator(".image-creation")
    .evaluate((element) =>
      getComputedStyle(element).getPropertyValue("--media-height"),
    );
  expect(afterReload).toBe(beforeReload);
});
