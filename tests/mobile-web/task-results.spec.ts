import { expect, test, type Locator, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { CreationTask } from "../../packages/creation-contracts/creation.ts";
import {
  emptyMobileSnapshot,
  newMobileDraft,
} from "../../mobile/src/core/mobileModel.ts";
import type { MobileSnapshot } from "../../mobile/src/core/mobileModel.ts";
import { parseSnapshot } from "../../mobile/src/storage/validation.ts";

const fixtures = [
  { name: "Saved image fixture", mime: "image/png", path: "blue-hour.png" },
  {
    name: "Saved video fixture",
    mime: "video/webm",
    path: "blue-hour-motion.webm",
  },
].map((fixture) => {
  const bytes = readFileSync(
    new URL(`../../public/fixtures/demo/${fixture.path}`, import.meta.url),
  );
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  return { ...fixture, bytes, sha256, id: `asset-${sha256.slice(0, 24)}` };
});
const traffic = new WeakMap<Page, { blocked: string[]; errors: string[] }>();

test.beforeEach(async ({ context, page, baseURL }) => {
  test.skip(
    baseURL !== "http://127.0.0.1:1423",
    "fixture writes are restricted to the isolated local browser",
  );
  expect((await context.storageState()).origins).toEqual([]);
  const record = { blocked: [] as string[], errors: [] as string[] };
  traffic.set(page, record);
  page.on("pageerror", (error) => record.errors.push(error.message));
  await context.route("**/*", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (
      url.origin !== baseURL ||
      !["GET", "HEAD"].includes(request.method()) ||
      /^\/(?:mobile\/)?(?:api|v1|gateway|kk-agent)(?:\/|$)/.test(url.pathname)
    ) {
      record.blocked.push(`${request.method()} ${url.origin}${url.pathname}`);
      await route.abort("blockedbyclient");
    } else await route.continue();
  });
  await context.routeWebSocket(/.*/, (socket) => {
    record.blocked.push(`WebSocket ${socket.url()}`);
    socket.close();
  });
});
test.afterEach(async ({ page }) => {
  const record = traffic.get(page);
  if (!record) return;
  await test.info().attach("zero-provider-traffic", {
    body: JSON.stringify(record, null, 2),
    contentType: "application/json",
  });
  expect(record.blocked, "no Provider or unexpected network attempts").toEqual(
    [],
  );
  expect(record.errors, "no uncaught runtime errors").toEqual([]);
});

function savedTask(
  kind: "text" | "image" | "video",
  createdAt: number,
): CreationTask {
  return {
    id: `fixture-${kind}-task`,
    idempotencyKey: `fixture-${kind}-submission`,
    prompt: `Original ${kind} instructions kept below the result`,
    model: `fixture-${kind}`,
    kind,
    status: "succeeded",
    submissionState: "terminal",
    createdAt,
    updatedAt: createdAt,
    attempt: 1,
    attachments: [],
    requestedOutputs: 1,
    completedOutputs: 1,
    privacyMode: "byok_local",
    providerConnectionId: "fixture-connection",
    outputs: [
      {
        index: 0,
        status: "succeeded",
        model: `fixture-${kind}`,
        createdAt,
        ...(kind === "text"
          ? { text: "A saved text answer is the important content" }
          : { assetId: fixtures[kind === "image" ? 0 : 1].id }),
      },
    ],
  };
}
async function readStorage(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{
        snapshot: string;
        originals: { key: IDBValidKey; hash: string }[];
      }>((resolve, reject) => {
        const open = indexedDB.open("kk-mobile-creation-v1", 1);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result,
            transaction = db.transaction(
              ["snapshots", "originals"],
              "readonly",
            );
          const snapshot = transaction
            .objectStore("snapshots")
            .get("local-browser-v1");
          const originals = transaction.objectStore("originals"),
            keys = originals.getAllKeys(),
            bytes = originals.getAll();
          transaction.onerror = () => reject(transaction.error);
          transaction.oncomplete = () => {
            db.close();
            void Promise.all(
              (bytes.result as Uint8Array[]).map(async (value, index) => ({
                key: keys.result[index],
                hash: Array.from(
                  new Uint8Array(
                    await crypto.subtle.digest(
                      "SHA-256",
                      new Uint8Array(value),
                    ),
                  ),
                  (byte) => byte.toString(16).padStart(2, "0"),
                ).join(""),
              })),
            ).then(
              (hashes) =>
                resolve({ snapshot: snapshot.result, originals: hashes }),
              reject,
            );
          };
        };
      }),
  );
}
async function seed(page: Page, corruptImage = false) {
  await page.goto("/mobile/", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("button", { name: "新创作", exact: true }).first(),
  ).toBeVisible();
  const partial: CreationTask = {
    ...savedTask("text", 20),
    id: "fixture-partial-task",
    idempotencyKey: "fixture-partial-submission",
    model: "fixture-partial",
    status: "partial",
    requestedOutputs: 3,
    error: "One output needs confirmation before any retry",
    outputs: [
      {
        index: 0,
        status: "succeeded",
        text: "Retained partial answer",
        model: "fixture-partial",
        createdAt: 20,
      },
      { index: 1, status: "unknown", model: "fixture-partial", createdAt: 20 },
      {
        index: 2,
        status: "failed",
        error: "Known failure remains visible",
        model: "fixture-partial",
        createdAt: 20,
      },
    ],
  };
  const unknown: CreationTask = {
    ...savedTask("image", 10),
    id: "fixture-unknown-task",
    idempotencyKey: "fixture-unknown-submission",
    model: "fixture-unknown",
    status: "unknown",
    submissionState: "unknown",
    completedOutputs: 0,
    prompt: "Unresolved image prompt must remain visible",
    error: "Provider acceptance is uncertain; do not resubmit",
    outputs: [
      { index: 0, status: "unknown", model: "fixture-unknown", createdAt: 10 },
    ],
  };
  const tasks = [
    savedTask("image", 50),
    savedTask("video", 40),
    savedTask("text", 30),
    partial,
    unknown,
  ];
  const snapshot: MobileSnapshot = {
    ...emptyMobileSnapshot(),
    revision: 17,
    activeProjectId: "fixture-project",
    assets: fixtures.map((fixture, index) => ({
      id: fixture.id,
      sha256: fixture.sha256,
      name: fixture.name,
      mime: fixture.mime,
      size: fixture.bytes.length,
      createdAt: 1,
      ...(index === 0 ? { hidden: true } : {}),
      provenance: { source: "import" as const },
    })),
    projects: [
      {
        id: "fixture-project",
        name: "Local result acceptance",
        revision: 3,
        createdAt: 1,
        updatedAt: 50,
        composerDraft: newMobileDraft(1),
        tasks,
        messages: [],
        assetIds: fixtures.map((fixture) => fixture.id),
        canvas: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
        executionReceipts: [
          {
            taskId: "fixture-image-task",
            connectionId: "fixture-connection",
            protocol: "openai-compatible",
            providerRequestId: "fixture-original-receipt",
          },
        ],
      },
    ],
  };
  const payload = JSON.stringify(snapshot);
  parseSnapshot(payload);
  await page.evaluate(
    ({ payload, originals }) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("kk-mobile-creation-v1", 1);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result,
            transaction = db.transaction(
              ["snapshots", "originals"],
              "readwrite",
            );
          transaction.objectStore("snapshots").put(payload, "local-browser-v1");
          for (const original of originals)
            transaction.objectStore("originals").put(
              Uint8Array.from(atob(original.base64), (character) =>
                character.charCodeAt(0),
              ),
              ["local-browser-v1", original.id],
            );
          transaction.onerror = () => reject(transaction.error);
          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
        };
      }),
    {
      payload,
      originals: fixtures.map((fixture, index) => ({
        id: fixture.id,
        base64: (corruptImage && index === 0
          ? Buffer.from([1, 2, 3])
          : fixture.bytes
        ).toString("base64"),
      })),
    },
  );
  await page.goto("/mobile/tasks", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("textbox", { name: "搜索任务或模型", exact: true }),
  ).toBeVisible();
  const baseline = await readStorage(page);
  expect(baseline.snapshot).toBe(payload);
  return baseline;
}
async function search(page: Page, model: string) {
  await page
    .getByRole("textbox", { name: "搜索任务或模型", exact: true })
    .fill(model);
}
async function inside(page: Page, locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  const bounds = await locator.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
}

for (const height of [844, 480]) {
  test.describe(`saved phone results at 390x${height}`, () => {
    test.use({
      viewport: { width: 390, height },
      isMobile: true,
      hasTouch: true,
      userAgent:
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
    });
    test("tasks and history show an existing image; detail puts its prompt below and expands receipts without changing data", async ({
      page,
    }) => {
      const baseline = await seed(page);
      await search(page, "fixture-image");
      const image = page.getByRole("img", {
        name: "Saved image fixture",
        exact: true,
      });
      await expect(image).toBeVisible();
      await inside(page, image);
      await expect(
        page.getByText("Original image instructions kept below the result", {
          exact: true,
        }),
      ).toHaveCount(0);
      await page.getByRole("button", { name: "查看详情", exact: true }).click();
      await expect(image).toBeVisible();
      const prompt = page.getByText(
        "Original image instructions kept below the result",
        { exact: true },
      );
      const order = await prompt.evaluate((element) => {
        const media = document.querySelector(
          '[aria-label="Saved image fixture"]',
        );
        return (
          !!media &&
          !!(
            media.compareDocumentPosition(element) &
            Node.DOCUMENT_POSITION_FOLLOWING
          )
        );
      });
      expect(order).toBe(true);
      await expect(page.getByText(/fixture-original-receipt/)).toHaveCount(0);
      const details = page.getByRole("button", {
        name: "更多详情",
        exact: true,
      });
      await inside(page, details);
      await details.click();
      await expect(page.getByText(/fixture-original-receipt/)).toBeVisible();
      await page.screenshot({
        path: test.info().outputPath("task-result-expanded.png"),
      });
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(image).toBeVisible();
      await expect(
        page.getByRole("button", { name: "更多详情", exact: true }),
      ).toBeVisible();
      await page.goto("/mobile/history", { waitUntil: "domcontentloaded" });
      await search(page, "fixture-image");
      await expect(image).toBeVisible();
      expect(await readStorage(page)).toEqual(baseline);
      await page.screenshot({
        path: test.info().outputPath("task-image-history.png"),
      });
    });
    test("existing video has local native controls without autoplay in task list, detail and chat", async ({
      page,
    }) => {
      const baseline = await seed(page);
      await search(page, "fixture-video");
      for (const route of [
        "list",
        "/mobile/tasks/fixture-video-task",
        "/mobile/",
      ]) {
        if (route !== "list")
          await page.goto(route, { waitUntil: "domcontentloaded" });
        const video = page.locator("video").first();
        await expect(video).toBeVisible();
        await expect
          .poll(() => video.evaluate((element) => element.videoWidth))
          .toBeGreaterThan(0);
        expect(
          await video.evaluate((element) => ({
            controls: element.controls,
            autoplay: element.autoplay,
            paused: element.paused,
            local: element.currentSrc.startsWith("blob:"),
          })),
        ).toEqual({
          controls: true,
          autoplay: false,
          paused: true,
          local: true,
        });
        await inside(page, video);
      }
      await page.screenshot({
        path: test.info().outputPath("task-video-chat.png"),
      });
      expect(await readStorage(page)).toEqual(baseline);
    });
    test("text, partial failures and uncertain tasks retain results and visible safety state after reload", async ({
      page,
    }) => {
      const baseline = await seed(page);
      await search(page, "fixture-text");
      await expect(
        page.getByText("A saved text answer is the important content", {
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByText("Original text instructions kept below the result", {
          exact: true,
        }),
      ).toHaveCount(0);
      await search(page, "fixture-partial");
      for (const value of [
        "Retained partial answer",
        "部分完成",
        "Known failure remains visible",
        "One output needs confirmation before any retry",
      ])
        await expect(page.getByText(value, { exact: true })).toBeVisible();
      await expect(page.getByText(/输出 2 · 待核对/)).toBeVisible();
      await page.getByRole("button", { name: "查看详情", exact: true }).click();
      await expect(page).toHaveURL(/\/mobile\/tasks\/fixture-partial-task$/);
      // Expo Router retains the previous list in a hidden navigation screen.
      const visibleFailure = page
        .getByText("Known failure remains visible", { exact: true })
        .filter({ visible: true });
      await expect(visibleFailure).toHaveCount(1);
      await expect(visibleFailure).toBeVisible();
      await expect(
        page.getByRole("button", { name: "更多详情", exact: true }),
      ).toBeVisible();
      await page.goto("/mobile/tasks/fixture-unknown-task", {
        waitUntil: "domcontentloaded",
      });
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(
        page.getByText("Provider acceptance is uncertain; do not resubmit", {
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByText("Unresolved image prompt must remain visible", {
          exact: true,
        }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: /^安全重试/ })).toHaveCount(
        0,
      );
      await page.getByRole("button", { name: "更多详情", exact: true }).click();
      await expect(
        page.getByRole("button", { name: /^安全重试/ }),
      ).toBeDisabled();
      expect(await readStorage(page)).toEqual(baseline);
      await page.screenshot({
        path: test.info().outputPath("task-unknown-details.png"),
      });
    });
    test("a corrupt local original reports a preview failure without losing the task or changing stored bytes", async ({
      page,
    }) => {
      const baseline = await seed(page, true);
      await search(page, "fixture-image");
      await expect(
        page.getByText(/原件读取、校验或尺寸读取失败/),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "查看详情", exact: true }),
      ).toBeVisible();
      await page.getByRole("button", { name: "查看详情", exact: true }).click();
      await expect(page).toHaveURL(/\/mobile\/tasks\/fixture-image-task$/);
      const visibleOriginalFailure = page
        .getByText(/原件读取、校验或尺寸读取失败/)
        .filter({ visible: true });
      await expect(visibleOriginalFailure).toHaveCount(1);
      await expect(visibleOriginalFailure).toBeVisible();
      await expect(
        page.getByText("Original image instructions kept below the result", {
          exact: true,
        }),
      ).toBeVisible();
      expect(await readStorage(page)).toEqual(baseline);
    });
  });
}
