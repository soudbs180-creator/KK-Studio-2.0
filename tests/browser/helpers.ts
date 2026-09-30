import { expect, type Page } from "@playwright/test";
import {
  CREATION_STORAGE_KEY,
  createProject,
  emptySnapshot,
} from "../../src/features/creation/model";
import { BASE_CANVAS_ITEMS } from "../../src/domain/canvasItems";
import { createProjectCanvas } from "../../src/domain/projectCanvas";
import {
  MODEL_PROVIDER_STORAGE_KEY,
  parseModelProvider,
} from "../../src/domain/modelProvider";

export async function openWorkspace(page: Page): Promise<void> {
  await openSeededProject(page);
}

/** Give Agent tests a real project containing the canonical demo graph. */
export async function openSeededProject(page: Page): Promise<void> {
  await page.goto("/");
  const providerRaw = await page.evaluate(
    (key) => localStorage.getItem(key),
    MODEL_PROVIDER_STORAGE_KEY,
  );
  const model = parseModelProvider(providerRaw).profile.model || "kk-image-2";
  const base = createProject({
    prompt: "",
    model,
    kind: "image",
    attachments: [],
  });
  const items = BASE_CANVAS_ITEMS.map((item) => ({
    ...item,
    model: item.kind === "image" ? model : item.model,
  }));
  const project = {
    ...base,
    name: "Agent 验证项目",
    items,
    canvas: createProjectCanvas(items),
    messages: [],
  };
  const snapshot = {
    ...emptySnapshot(),
    // Home drafts may already have been saved to IndexedDB in this context.
    // The local recovery copy only wins when its revision is newer.
    revision: Date.now(),
    activeProjectId: project.id,
    projects: [project],
  };
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: CREATION_STORAGE_KEY,
    value: JSON.stringify(snapshot),
  });
  await page.reload();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page
    .locator(".project-library-card")
    .filter({ hasText: "Agent 验证项目" })
    .click();
  await expect(page.getByRole("region", { name: "无限画布" })).toBeVisible();
  await expect(page.getByTestId("canvas-node-image")).toBeVisible();
  // The conversation panel is intentionally collapsed on compact screens.
  await expect(page.getByLabel("执行方式")).toBeAttached();
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
