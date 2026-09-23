import { expect, type Page } from "@playwright/test";

export async function openWorkspace(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await expect(page.getByRole("region", { name: "无限画布" })).toBeVisible();
  await waitForConversationPanelSettled(page);
}

export async function waitForConversationPanelSettled(
  page: Page,
): Promise<void> {
  await expect
    .poll(
      () =>
        page.locator(".conversation-panel").evaluate((panel) => {
          const animation = panel
            .getAnimations()
            .find(
              (item) =>
                "animationName" in item &&
                (item as CSSAnimation).animationName ===
                  "conversation-panel-enter",
            );
          return !animation || animation.playState === "finished";
        }),
      // CI runners can start the compact conversation transition after the
      // first layout frame. Give the real animation a bounded settling window
      // instead of turning a scheduling delay into a flaky product failure.
      { timeout: 5000 },
    )
    .toBe(true);
}

export async function showCanvasNavigation(page: Page): Promise<void> {
  // Wide frames keep navigation beside an open conversation. If a compact
  // conversation overlay owns the canvas, use the real close action before
  // testing controls that are intentionally hidden in that state.
  if (await page.locator(".canvas-top-right").isHidden()) {
    await page.getByRole("button", { name: "收起对话", exact: true }).click();
  }
  await expect(page.getByRole("group", { name: "画布导航" })).toBeVisible();
}
