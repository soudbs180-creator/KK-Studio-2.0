import { writeFile } from "node:fs/promises";
import { test, expect, type Page } from "@playwright/test";
import {
  CREATION_STORAGE_KEY,
  createProject,
  emptySnapshot,
  projectChatView,
  serializeCreationSnapshot,
} from "../../src/features/creation/index.ts";
import { BASE_CANVAS_ITEMS } from "../../src/domain/canvasItems";
import { headlessEdgeLaunchOptions } from "../../scripts/testing/headless-edge-options.mjs";
import { createProjectCanvas } from "../../src/domain/projectCanvas";
import { waitForConversationPanelSettled } from "./helpers";

test.use({
  launchOptions: {
    ...headlessEdgeLaunchOptions,
    args: [...headlessEdgeLaunchOptions.args, "--disable-gpu"],
  },
});

async function openParityWorkspace(page: Page) {
  await page.goto("/");
  await expect(page.getByLabel("创作提示词")).toBeVisible();
  await expect(page.locator(".creation-storage-notice")).toHaveCount(0);
  const base = createProject({
    prompt: "",
    model: "kk-image-2",
    kind: "image",
    attachments: [],
  });
  const project = {
    ...base,
    id: "p8-parity-project",
    name: "P8 固定项目",
    createdAt: 1,
    updatedAt: 1,
    items: BASE_CANVAS_ITEMS,
    canvas: createProjectCanvas(BASE_CANVAS_ITEMS),
  };
  const snapshot = serializeCreationSnapshot({
    ...emptySnapshot(),
    version: 3,
    revision: 1,
    activeProjectId: project.id,
    projects: [projectChatView(project)],
  });
  await page.evaluate(
    async ({ key, snapshot }) => {
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("kk-studio-next", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction("creation", "readwrite");
          tx.objectStore("creation").put(snapshot, "snapshot");
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error);
          };
        };
      });
      localStorage.setItem(key, JSON.stringify(snapshot));
    },
    { key: CREATION_STORAGE_KEY, snapshot },
  );
  await page.reload();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page
    .locator(".project-library-card")
    .filter({ hasText: project.name })
    .click();
  await expect(page.getByTestId("infinite-canvas")).toBeVisible();
  await expect(page.locator(".creation-storage-notice")).toHaveCount(0);
  await waitForConversationPanelSettled(page);
}

for (const width of [1920, 390])
  test(`P8 composition parity ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 844 });
    await openParityWorkspace(page);
    async function capture(label: string) {
      await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise<void>((r) =>
          requestAnimationFrame(() => requestAnimationFrame(() => r())),
        );
      });
      const dom = await page.locator(".app").evaluate((el, key) => {
        const snapshot = JSON.parse(localStorage.getItem(key) ?? "null");
        const projectId = snapshot?.activeProjectId;
        const normalize = (value: string) =>
          projectId ? value.replaceAll(projectId, "PROJECT") : value;
        const walk = (node: Node): unknown =>
          node instanceof Element
            ? {
                tag: node.tagName,
                attrs: [...node.attributes]
                  .map((a) => [a.name, normalize(a.value)])
                  .sort(),
                children: [...node.childNodes].map(walk),
              }
            : node.nodeType === Node.TEXT_NODE
              ? normalize(node.textContent ?? "")
              : null;
        return walk(el);
      }, CREATION_STORAGE_KEY);
      await info.attach(`${label}-dom`, {
        body: JSON.stringify(dom),
        contentType: "application/json",
      });
      let previous: Buffer | undefined;
      let stable: Buffer | undefined;
      for (let attempt = 0; attempt < 5; attempt++) {
        const current = await page.screenshot({
          animations: "disabled",
          caret: "hide",
        });
        if (previous?.equals(current)) {
          stable = current;
          break;
        }
        previous = current;
        await page.evaluate(
          () =>
            new Promise<void>((r) =>
              requestAnimationFrame(() => requestAnimationFrame(() => r())),
            ),
        );
      }
      expect(
        stable,
        "two consecutive renders must match exactly before comparing builds",
      ).toBeDefined();
      await writeFile(info.outputPath(`${label}.png`), stable!);
    }
    await expect(page.getByTestId("infinite-canvas")).toBeVisible();
    await capture("workspace");
    await page.keyboard.press("Control+,");
    await expect(
      page.getByRole("dialog", { name: "设置", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".settings-general-rows")).toBeVisible();
    await capture("settings");
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("dialog", { name: "设置", exact: true }),
    ).toHaveCount(0);
  });
