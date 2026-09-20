import fs from "node:fs/promises";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { chromium, expect } from "@playwright/test";
import { capturePageAlignment } from "./capture-page-alignment.mjs";

const repo = process.cwd();
const desktop = process.argv.includes("--desktop");
const url =
  process.argv.find((arg) => /^http/.test(arg)) ?? "http://127.0.0.1:1421/";
const mode = desktop
  ? "desktop"
  : url.includes(":1423")
    ? "preview"
    : "development";
const evidence = path.join(repo, "docs/evidence/2026-09-21-main-close-002");
await fs.mkdir(path.join(evidence, "screenshots"), { recursive: true });
await fs.mkdir(path.join(evidence, "runtime"), { recursive: true });
const report = { mode, checks: [], pageErrors: [] };
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let browser;
let app;
let cleanupError;
try {
  let page;
  if (desktop) {
    const endpoint = "http://127.0.0.1:9337";
    const occupied = await fetch(`${endpoint}/json/version`)
      .then(() => true)
      .catch(() => false);
    if (occupied) throw new Error("Audit CDP port is occupied");
    const temp = path.join(repo, ".tmp/ui-main-alignment-20260920");
    await fs.mkdir(temp, { recursive: true });
    const data = await fs.mkdtemp(path.join(temp, "native-data-"));
    const profile = await fs.mkdtemp(path.join(temp, "native-profile-"));
    app = spawn(
      path.join(repo, "src-tauri/target/release/kk-studio.exe"),
      ["--data-dir", data],
      {
        cwd: repo,
        windowsHide: true,
        stdio: "ignore",
        env: {
          ...process.env,
          WEBVIEW2_USER_DATA_FOLDER: profile,
          WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:
            "--remote-debugging-port=9337 --remote-debugging-address=127.0.0.1",
        },
      },
    );
    for (let i = 0; i < 150; i++) {
      if (app.exitCode !== null)
        throw new Error(`Desktop exited: ${app.exitCode}`);
      if (
        await fetch(`${endpoint}/json/version`)
          .then(() => true)
          .catch(() => false)
      )
        break;
      await delay(100);
    }
    browser = await chromium.connectOverCDP(endpoint);
    for (let i = 0; i < 100 && !page; i++) {
      page = browser
        .contexts()
        .flatMap((c) => c.pages())
        .find((p) => p.url().includes("tauri.localhost"));
      if (!page) await delay(100);
    }
    if (!page) throw new Error("Desktop page missing");
    await page.waitForLoadState("domcontentloaded");
    const actualRoot = await page.evaluate(() =>
      window.__TAURI_INTERNALS__.invoke("get_storage_root"),
    );
    expect(path.resolve(actualRoot).toLowerCase()).toBe(
      path.resolve(data).toLowerCase(),
    );
    report.isolatedDataRoot = true;
  } else {
    browser = await chromium.launch({ channel: "msedge", headless: true });
    page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.goto(url);
  }
  page.on("pageerror", (error) => report.pageErrors.push(error.message));
  const expectedBundle = (
    await fs.readFile(path.join(repo, "dist/index.html"), "utf8")
  ).match(/assets\/(index-[^" ]+\.js)/)?.[1];
  if (mode !== "development")
    expect(
      await page.locator("script[src*=assets]").getAttribute("src"),
    ).toContain(expectedBundle);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByLabel("创作提示词")).toBeVisible();
  const sort = page.getByRole("button", {
    name: "项目显示与排序",
    exact: true,
  });
  const account = page.getByRole("button", { name: "个人信息", exact: true });
  await sort.click();
  await account.click();
  await expect(page.getByRole("menu", { name: "项目显示与排序" })).toHaveCount(
    0,
  );
  await expect(page.locator(".account-popup")).toBeVisible();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await expect(page.locator(".account-popup")).toHaveCount(0);
  report.checks.push(
    "sidebar popup switches exclusively and closes on navigation",
  );
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  const panel = page.locator(".conversation-panel");
  await expect(panel).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const rects = () =>
    panel
      .locator(
        ".chat-composer button:not([role]), .chat-composer button[aria-haspopup]",
      )
      .evaluateAll((els) =>
        els
          .filter((e) => !e.closest('[role="menu"]'))
          .map((e) => {
            const r = e.getBoundingClientRect();
            return {
              label: e.getAttribute("aria-label") ?? e.textContent,
              x: r.x,
              y: r.y,
              w: r.width,
              h: r.height,
            };
          }),
      );
  const baseline = await rects();
  const triggers = ["模型", "Skill", "插件", "AI权限模式"].map((name) =>
    panel.getByRole("button", { name, exact: true }),
  );
  for (const trigger of triggers) {
    await trigger.click();
    await expect(panel.getByRole("menu")).toHaveCount(1);
    expect(await rects()).toEqual(baseline);
  }
  await panel.getByRole("menu").locator("button").first().focus();
  await page.keyboard.press("Escape");
  await expect(triggers[3]).toBeFocused();
  await expect(panel.getByRole("menu")).toHaveCount(0);
  report.checks.push(
    "four exclusive menus; stable control rectangles; Escape restores focus",
  );
  await triggers[0].click();
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await expect(panel.getByRole("menu")).toHaveCount(0);
  await page.keyboard.press("Escape");
  report.checks.push("toolbar pointer propagation does not block dismissal");
  await page.getByRole("button", { name: "选择画布工具", exact: true }).click();
  await page.getByRole("button", { name: "资产管理", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "资产管理" })).toBeVisible();
  await expect(page.locator(".canvas-tool-menu")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "画布缩放", exact: true }).click();
  await page.locator(".canvas-background").click();
  await expect(page.getByRole("menu", { name: "画布缩放比例" })).toHaveCount(0);
  // Restore the screenshot's original background after exercising the toggle.
  await page.locator(".canvas-background").click();
  report.checks.push(
    "toolbar-to-dialog and navigation actions leave no stale menu",
  );
  report.runtime = await page.evaluate(() => ({
    url: location.href,
    viewport: [innerWidth, innerHeight],
    runtime: document.querySelector("[data-runtime-entry]")?.dataset,
    scripts: [...document.scripts].map((s) => s.src),
    stylesheets: [...document.styleSheets].map((s) => s.href),
  }));
  report.controlRects = baseline;
  await page.screenshot({
    path: path.join(evidence, `screenshots/${mode}-workspace.png`),
  });
  await triggers[0].click();
  await panel.screenshot({
    path: path.join(evidence, `screenshots/${mode}-model-open.png`),
  });
  if (process.argv.includes("--pages")) {
    await page.keyboard.press("Escape");
    report.capturedPageStates = await capturePageAlignment(
      page,
      evidence,
      mode,
    );
  }
  await page.keyboard.press("Escape");

  await page.keyboard.press("Escape");
  const fixture = await fs.readFile(
    path.join(repo, "public/fixtures/demo/blue-hour.png"),
  );
  const seed = await page.evaluate(
    async ({ base64, desktop }) => {
      const binary = atob(base64);
      const base = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) base[i] = binary.charCodeAt(i);
      const rows = [];
      const database = desktop
        ? null
        : await new Promise((resolve, reject) => {
            const request = indexedDB.open("kk-studio-assets", 1);
            request.onupgradeneeded = () =>
              request.result.createObjectStore("blobs");
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
      for (let i = 0; i < 41; i++) {
        const bytes = new Uint8Array(base.length + 4);
        bytes.set(base);
        new DataView(bytes.buffer).setUint32(base.length, i);
        const sha = [
          ...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
        ]
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        const metadata = {
          assetId: "asset-" + sha.slice(0, 24),
          sha256: sha,
          mime: "image/png",
          tags: ["runtime-fixture"],
          source: "provider",
          isAiGenerated: true,
          provenance: {
            provider: "fixture",
            generatedAt: "2026-09-21T00:00:00.000Z",
          },
        };
        if (desktop) {
          let raw = "";
          for (let j = 0; j < bytes.length; j += 32768)
            raw += String.fromCharCode(...bytes.subarray(j, j + 32768));
          await window.__TAURI_INTERNALS__.invoke("asset_store", {
            dataBase64: btoa(raw),
            metadata,
          });
        } else
          await new Promise((resolve, reject) => {
            const tx = database.transaction("blobs", "readwrite");
            tx.objectStore("blobs").put(
              { blob: new Blob([bytes], { type: "image/png" }), metadata },
              metadata.assetId,
            );
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
          });
        rows.push(metadata);
      }
      database?.close();
      if (desktop) {
        const first = await window.__TAURI_INTERNALS__.invoke("asset_list", {
          offset: 0,
          limit: 40,
        });
        if (first.length !== 40 || first.some((r) => "preview" in r))
          throw Error("Native metadata page mismatch");
      }
      return rows.sort((a, b) => a.assetId.localeCompare(b.assetId));
    },
    { base64: fixture.toString("base64"), desktop },
  );
  await page.reload();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "文件", exact: true }).click();
  await page.getByRole("button", { name: "资产管理", exact: true }).click();
  const archivePanel = page.getByTestId("asset-panel");
  await expect(archivePanel.locator(".asset-card")).toHaveCount(49);
  await archivePanel
    .getByRole("button", { name: "加载更多素材", exact: true })
    .click();
  await expect(archivePanel.locator(".asset-card")).toHaveCount(50);
  await archivePanel.getByLabel("搜索文件").fill(seed.at(-1).sha256);
  const thumbnail = archivePanel.locator(".asset-card img:not(.asset-icon)");
  await expect(thumbnail).toHaveAttribute("src", /^data:image\/webp/);
  const thumbnailDimensions = await thumbnail.evaluate((img) => [
    img.naturalWidth,
    img.naturalHeight,
  ]);
  expect(Math.max(...thumbnailDimensions)).toBeLessThanOrEqual(320);
  await archivePanel.screenshot({
    path: path.join(evidence, `screenshots/${mode}-asset-thumbnail.png`),
  });
  await archivePanel.locator(".asset-card").press("Enter");
  const full = archivePanel.locator(
    ".asset-large-preview img:not(.asset-icon)",
  );
  await expect(full).toHaveAttribute("src", /^data:image\/png/);
  const actualHash = await full.evaluate(async (img) =>
    [
      ...new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          Uint8Array.from(atob(img.src.split(",")[1]), (character) =>
            character.charCodeAt(0),
          ),
        ),
      ),
    ]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(""),
  );
  expect(actualHash).toBe(seed.at(-1).sha256);
  await archivePanel
    .getByRole("button", { name: "返回资产", exact: true })
    .click();
  await expect(archivePanel.locator(".asset-card")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(archivePanel).toHaveCount(0);
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await expect(page.locator(".conversation-panel")).toBeVisible();
  await page.getByRole("button", { name: "帮助与快捷键", exact: true }).click();
  await page.getByRole("menuitem", { name: "快捷按键", exact: true }).click();
  await expect(page.locator(".shortcuts-panel")).toHaveCSS(
    "border-top-color",
    "rgb(60, 60, 60)",
  );
  await page.locator(".shortcuts-panel").screenshot({
    path: path.join(evidence, `screenshots/${mode}-shortcuts-current.png`),
  });
  await page.keyboard.press("Escape");
  report.assets = {
    records: 41,
    originalBytesPerRecord: fixture.length + 4,
    thumbnailDimensions,
    originalHashMatches: true,
    metadataPageSize: 40,
  };
  report.checks.push(
    "paged asset metadata, 320px visible preview, full original SHA, keyboard return, shortcuts Figma border",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "个人信息", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  const sidebarToggle = page.locator(".sidebar-toggle");
  await expect(sidebarToggle).toHaveAttribute("aria-expanded", "false");
  await sidebarToggle.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".account-popup")).toBeVisible();
  await page
    .getByRole("button", { name: "创建项目文件夹", exact: true })
    .click();
  await expect(page.locator(".account-popup")).toHaveCount(0);
  await expect(sidebarToggle).toHaveAttribute("aria-expanded", "true");
  await page.mouse.click(375, 470);
  await expect(sidebarToggle).toHaveAttribute("aria-expanded", "false");
  report.checks.push(
    "narrow account popup retains dismissal priority after keyboard expansion",
  );
  report.narrowViewport = {
    width: 390,
    height: 844,
    method: "Playwright device metrics",
  };
  await page.screenshot({
    path: path.join(evidence, `screenshots/${mode}-narrow-dismiss.png`),
  });
  expect(report.pageErrors).toEqual([]);
  report.passed = true;
} finally {
  await fs.writeFile(
    path.join(evidence, `runtime/${mode}.json`),
    JSON.stringify(report, null, 2),
  );
  if (app && app.exitCode === null) {
    execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        `(Get-Process -Id ${app.pid}).CloseMainWindow() | Out-Null`,
      ],
      { windowsHide: true },
    );
    for (let i = 0; i < 80 && app.exitCode === null; i++) await delay(100);
    if (app.exitCode === null)
      cleanupError = new Error(
        `Owned desktop process ${app.pid} did not close`,
      );
  }
  await browser?.close();
}
if (cleanupError) throw cleanupError;
console.log(JSON.stringify(report, null, 2));
