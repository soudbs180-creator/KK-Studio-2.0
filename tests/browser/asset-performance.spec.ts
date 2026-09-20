import { readFileSync } from "node:fs";
import { test, expect, type Page } from "@playwright/test";

const original = readFileSync("public/fixtures/demo/blue-hour.png").toString(
  "base64",
);

async function seedArchive(
  page: Page,
  count: number,
  validImage = true,
  media?: { base64: string; mime: string },
) {
  await page.goto("/");
  const records = await page.evaluate(
    async ({ original, count, validImage, media }) => {
      const decoded = validImage
        ? atob(media?.base64 ?? original)
        : "synthetic invalid image";
      const mime = media?.mime ?? "image/png";
      const base = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i++) base[i] = decoded.charCodeAt(i);
      const rows = [];
      for (let index = 0; index < count; index++) {
        const bytes = new Uint8Array(base.length + (media ? 0 : 4));
        bytes.set(base);
        if (!media) new DataView(bytes.buffer).setUint32(base.length, index);
        const hash = [
          ...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
        ]
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        rows.push({
          blob: new Blob([bytes], { type: mime }),
          metadata: {
            assetId: `asset-${hash.slice(0, 24)}`,
            sha256: hash,
            mime,
            tags: ["large-library"],
            isAiGenerated: true,
            source: "provider",
            provenance: {
              generatedAt: "2026-09-20T00:00:00.000Z",
              provider: "fixture",
            },
            // Legacy records may contain full previews. The list must strip them.
            preview: `data:image/png;base64,${original}`,
          },
        });
      }
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("kk-studio-assets", 1);
        request.onupgradeneeded = () =>
          request.result.createObjectStore("blobs");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction("blobs", "readwrite");
        for (const row of rows)
          transaction.objectStore("blobs").put(row, row.metadata.assetId);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      database.close();
      return rows
        .map((row) => ({ ...row.metadata, preview: undefined }))
        .sort((a, b) => a.assetId.localeCompare(b.assetId));
    },
    { original, count, validImage, media },
  );
  await page.addInitScript(() => {
    const state = window as Window & { originalReads?: number };
    state.originalReads = 0;
    const get = IDBObjectStore.prototype.get;
    IDBObjectStore.prototype.get = function (key) {
      if (this.name === "blobs")
        state.originalReads = (state.originalReads ?? 0) + 1;
      return get.call(this, key);
    };
  });
  await page.reload();
  return records;
}

test("大素材库按页读取元数据、可见缩略图与全库搜索，详情仍读取原件", async ({
  page,
}) => {
  // The fixture intentionally hashes and stores about 280 MiB of originals.
  // Keep the test bounded while allowing slower hosted Windows runners to
  // complete the same integrity path without retrying a partial seed.
  test.setTimeout(180000);
  const rows = await seedArchive(page, 125);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { originalReads: number }).originalReads,
      ),
    )
    .toBe(0);
  await page.getByRole("button", { name: "文件", exact: true }).click();
  await page.getByRole("button", { name: "资产管理", exact: true }).click();
  const panel = page.getByTestId("asset-panel");
  await expect(panel.locator(".asset-card")).toHaveCount(49);
  await panel
    .getByRole("button", { name: "加载更多素材", exact: true })
    .click();
  await expect(panel.locator(".asset-card")).toHaveCount(89);
  await panel.getByLabel("搜索文件").fill(rows.at(-1)!.sha256);
  await expect(panel.locator(".asset-card")).toHaveCount(1);
  await expect(
    panel.getByRole("button", { name: "加载更多素材", exact: true }),
  ).toHaveCount(0);
  const thumbnail = panel.locator(".asset-card img:not(.asset-icon)");
  await expect(thumbnail).toHaveAttribute("src", /^data:image\/webp/);
  expect(
    await thumbnail.evaluate((img: HTMLImageElement) =>
      Math.max(img.naturalWidth, img.naturalHeight),
    ),
  ).toBeLessThanOrEqual(320);
  expect(
    await page.evaluate(
      () => (window as Window & { originalReads: number }).originalReads,
    ),
  ).toBeLessThan(40);
  await panel.locator(".asset-card").press("Enter");
  const full = panel.locator(".asset-large-preview img:not(.asset-icon)");
  await expect(full).toHaveAttribute("src", /^data:image\/png/);
  const fullHash = await full.evaluate(async (img: HTMLImageElement) => {
    const bytes = await (await fetch(img.src)).arrayBuffer();
    return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  });
  expect(fullHash).toBe(rows.at(-1)!.sha256);
  await panel.getByRole("button", { name: "返回资产", exact: true }).click();
  await expect(panel.locator(".asset-card")).toBeFocused();
});

test("SHA正确但无法解码的图片有可见错误与重试", async ({ page }) => {
  await seedArchive(page, 1, false);
  await page.getByRole("button", { name: "文件", exact: true }).click();
  await page.getByRole("button", { name: "资产管理", exact: true }).click();
  const panel = page.getByTestId("asset-panel");
  const card = panel.getByRole("button", {
    name: "选择 AI 结果 1",
    exact: true,
  });
  await card.scrollIntoViewIfNeeded();
  await expect(card).toContainText("预览读取失败");
  await card.dblclick();
  await expect(panel.getByRole("alert")).toContainText("素材无法解码");
  await panel
    .getByRole("button", { name: "重新读取原件", exact: true })
    .click();
  await expect(panel.getByRole("alert")).toContainText("原件已保留");
});

test("详情拒绝被替换为另一素材身份的索引记录", async ({ page }) => {
  const rows = await seedArchive(page, 2);
  await page.getByRole("button", { name: "文件", exact: true }).click();
  await page.getByRole("button", { name: "资产管理", exact: true }).click();
  const panel = page.getByTestId("asset-panel");
  await panel.getByLabel("搜索文件").fill(rows[0].sha256);
  await expect(
    panel.locator(".asset-card img:not(.asset-icon)"),
  ).toHaveAttribute("src", /^data:image\/webp/);
  await page.evaluate(
    async ([target, replacement]) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("kk-studio-assets", 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("blobs", "readwrite");
        const store = tx.objectStore("blobs");
        const read = store.get(replacement);
        read.onsuccess = () => store.put(read.result, target);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    },
    rows.map((row) => row.assetId),
  );
  await panel.locator(".asset-card").press("Enter");
  await expect(panel.getByRole("alert")).toContainText("素材原件读取失败");
  await expect(
    panel.locator(".asset-large-preview img:not(.asset-icon)"),
  ).toHaveCount(0);
});

test("损坏原件显示失败，恢复后可用键盘重试预览与详情", async ({ page }) => {
  const [record] = await seedArchive(page, 1);
  const setOriginal = async (corrupt: boolean) =>
    page.evaluate(
      async ({ id, original, corrupt }) => {
        const bytes = Uint8Array.from(atob(original), (char) =>
          char.charCodeAt(0),
        );
        const restored = new Uint8Array(bytes.length + 4);
        restored.set(bytes);
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open("kk-studio-assets", 1);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction("blobs", "readwrite");
          const store = tx.objectStore("blobs");
          const request = store.get(id);
          request.onsuccess = () =>
            store.put(
              {
                ...request.result,
                blob: new Blob(
                  [corrupt ? new Uint8Array([1, 2, 3]) : restored],
                  { type: "image/png" },
                ),
              },
              id,
            );
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
        db.close();
      },
      { id: record.assetId, original, corrupt },
    );
  await setOriginal(true);
  await page.getByRole("button", { name: "文件", exact: true }).click();
  await page.getByRole("button", { name: "资产管理", exact: true }).click();
  const panel = page.getByTestId("asset-panel");
  const card = panel.getByRole("button", {
    name: "选择 AI 结果 1",
    exact: true,
  });
  await card.scrollIntoViewIfNeeded();
  await expect(card).toContainText("预览读取失败");
  await setOriginal(false);
  await card.press("Enter");
  await expect(card.locator("img:not(.asset-icon)")).toHaveAttribute(
    "src",
    /^data:image\/webp/,
  );
  await setOriginal(true);
  await card.press("Enter");
  await expect(panel.getByRole("alert")).toContainText("素材原件读取失败");
  await expect(
    panel.locator(".asset-large-preview img:not(.asset-icon)"),
  ).toHaveCount(0);
  await setOriginal(false);
  await panel
    .getByRole("button", { name: "重新读取原件", exact: true })
    .click();
  await expect(panel.getByRole("alert")).toHaveCount(0);
  await expect(
    panel.locator(".asset-large-preview img:not(.asset-icon)"),
  ).toHaveAttribute("src", /^data:image\/png/);
});

for (const [kind, file, mime] of [
  ["video", "blue-hour-motion.webm", "video/webm"],
  ["audio", "blue-hour-ambient.wav", "audio/wav"],
]) {
  test(kind + "素材列表不读取原件，详情使用媒体控件", async ({ page }) => {
    const [row] = await seedArchive(page, 1, true, {
      base64: readFileSync("public/fixtures/demo/" + file).toString("base64"),
      mime,
    });
    await page.getByRole("button", { name: "文件", exact: true }).click();
    await page.getByRole("button", { name: "资产管理", exact: true }).click();
    const panel = page.getByTestId("asset-panel");
    await panel.getByLabel("搜索文件").fill(row.sha256);
    await expect(panel.locator(".asset-card")).toHaveCount(1);
    expect(
      await page.evaluate(
        () => (window as Window & { originalReads: number }).originalReads,
      ),
    ).toBe(0);
    await panel.locator(".asset-card").press("Enter");
    const media = panel.locator(".asset-large-preview " + kind);
    await expect(media).toBeVisible();
    await expect(media).toHaveAttribute("controls", "");
    await expect
      .poll(() => media.evaluate((el: HTMLMediaElement) => el.readyState))
      .toBeGreaterThanOrEqual(2);
    await expect(panel.getByRole("alert")).toHaveCount(0);
  });
}
