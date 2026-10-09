import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";

const root = process.cwd();
const executable =
  process.env.KK_PROJECT_DRAG_EXE ??
  path.join(root, "src-tauri/target/release/kk-studio.exe");
const evidence = path.resolve(
  process.env.KK_PROJECT_DRAG_OUTPUT ??
    path.join(root, ".tmp/project-drag", `native-${Date.now()}`),
);
const dataRoot = path.join(evidence, "data");
const profile = path.join(evidence, "webview");
const cdp = "http://127.0.0.1:9375";
const report = {
  mode: "Tauri release",
  executable,
  sha256: createHash("sha256")
    .update(await readFile(executable))
    .digest("hex"),
  checks: [],
  passed: false,
};
const available = () =>
  fetch(`${cdp}/json/version`, { signal: AbortSignal.timeout(1000) })
    .then((r) => r.ok)
    .catch(() => false);
assert.equal(await available(), false, "Owned test port must be free");
await mkdir(dataRoot, { recursive: true });
await mkdir(profile, { recursive: true });
const child = spawn(executable, ["--data-dir", dataRoot], {
  cwd: root,
  windowsHide: true,
  stdio: "ignore",
  env: {
    ...process.env,
    WEBVIEW2_USER_DATA_FOLDER: profile,
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:
      "--remote-debugging-port=9375 --remote-debugging-address=127.0.0.1",
  },
});
let browser;
let page;
try {
  await expect.poll(available, { timeout: 30000 }).toBe(true);
  browser = await chromium.connectOverCDP(cdp);
  page = browser.contexts().flatMap((context) => context.pages())[0];
  assert(page, "Desktop page missing");
  page.setDefaultTimeout(15000);
  await page.waitForURL("http://tauri.localhost/");
  await expect(page.locator(".app")).toHaveAttribute(
    "data-runtime-mode",
    "production",
  );
  report.runtime = await page.evaluate(() => ({
    url: location.href,
    mode: document.querySelector(".app")?.dataset.runtimeMode,
    entry: document.querySelector(".app")?.dataset.runtimeEntry,
    scripts: [...document.scripts].map((script) => script.src),
    devicePixelRatio,
    viewport: { width: innerWidth, height: innerHeight },
  }));
  const actualDataRoot = await page.evaluate(() =>
    window.__TAURI_INTERNALS__.invoke("get_storage_root"),
  );
  assert.equal(
    path.resolve(actualDataRoot).toLowerCase(),
    dataRoot.toLowerCase(),
  );
  const expand = page.getByRole("button", { name: "展开侧边栏", exact: true });
  if (await expand.isVisible()) await expand.click();
  const sidebar = page.getByRole("complementary", { name: "工作台侧栏" });
  const ungrouped = sidebar.locator(".project-groups section").nth(1);
  await expect(sidebar.locator(".project-entry")).toHaveCount(0);
  await page.evaluate(() => {
    window.__projectDragEvents = [];
    for (const type of [
      "dragstart",
      "pointerdown",
      "pointerup",
      "dragenter",
      "dragover",
      "drop",
      "dragend",
    ])
      document.addEventListener(
        type,
        (event) => {
          window.__projectDragEvents.push({
            type,
            target:
              event.target instanceof Element ? event.target.className : "",
            x: event.clientX,
            y: event.clientY,
          });
        },
        true,
      );
  });
  async function create(title) {
    await sidebar.getByRole("button", { name: "创建未分组项目" }).click();
    const input = ungrouped.getByRole("textbox", { name: "项目名称" });
    await input.fill(title);
    await input.press("Enter");
    return ungrouped.locator(".project-entry", { hasText: title });
  }
  async function drag(source, target, moved = true) {
    const from = await source.boundingBox();
    const to = await target.boundingBox();
    assert(from && to, "Drag source and target must be visible");
    await expect(source).toHaveAttribute("draggable", "true");
    const beforeEvents = await page.evaluate(
      () => window.__projectDragEvents.length,
    );
    const runPointer = (args) =>
      new Promise((resolve, reject) => {
        execFile(
          "powershell.exe",
          [
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            path.join(root, "tests/desktop/sidebar-project-drag.ps1"),
            ...args,
          ],
          { windowsHide: true },
          (error, stdout) =>
            error
              ? reject(error)
              : resolve(stdout.trim() ? JSON.parse(stdout) : null),
        );
      });
    const previous = await runPointer([
      "-ProcessId",
      String(child.pid),
      "-SourceX",
      String(Math.round(from.x + 60)),
      "-SourceY",
      String(Math.round(from.y + 14)),
      "-TargetX",
      String(Math.round(to.x + to.width / 2)),
      "-TargetY",
      String(Math.round(to.y + to.height / 2)),
    ]);
    try {
      // Keep the physical cursor at the target until WebView2 has consumed
      // mouse-up; restoring it earlier can redirect a delayed OLE drop.
      await expect
        .poll(() =>
          page.evaluate(
            (start) =>
              window.__projectDragEvents
                .slice(start)
                .some((event) => event.type === "dragover"),
            beforeEvents,
          ),
        )
        .toBe(true);
      await expect(source).toHaveCount(moved ? 0 : 1);
    } finally {
      await runPointer([
        "-Restore",
        "-CursorX",
        String(previous.cursorX),
        "-CursorY",
        String(previous.cursorY),
        "-PreviousWindow",
        String(previous.previousWindow),
      ]);
    }
  }
  if (process.env.KK_PROJECT_DRAG_CASE === "folder") {
    await sidebar.getByRole("button", { name: "创建项目文件夹" }).click();
    const source = await create("桌面标题投放");
    const folder = sidebar.locator(".project-folder-group");
    await drag(source, folder.locator(".folder-heading-toggle"));
    await expect(
      folder.locator(".project-nested-entry .project-link"),
    ).toHaveText("桌面标题投放");
    report.checks.push("existing folder heading");
  } else {
    const source = await create("桌面空组收纳");
    await expect(sidebar.locator(".project-folder-group")).toHaveCount(0);
    await drag(source, sidebar.locator(".project-groups-title"));
    const folder = sidebar.locator(".project-folder-group");
    await expect(folder).toHaveCount(1);
    await expect(folder.locator(".folder-heading-toggle")).toHaveText(
      "桌面空组收纳",
    );
    report.checks.push("empty section creates folder");
    await folder.locator(".folder-heading-toggle").click();
    const second = await create("桌面已有文件夹");
    await drag(second, folder.locator(".folder-heading-toggle"));
    await expect(folder.locator(".folder-heading-toggle")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await expect(
      folder.locator(".project-nested-entry .project-link"),
    ).toHaveCount(2);
    report.checks.push("closed folder heading accepts and expands");
    const third = await create("桌面内容区子项");
    await drag(third, folder.locator(".project-nested-entry").first());
    await expect(folder).toHaveCount(1);
    await expect(
      folder.locator(".project-nested-entry .project-link"),
    ).toHaveCount(3);
    report.checks.push("folder contents accept without duplicate folder");
    const cancelled = await create("桌面保留未分组");
    await drag(cancelled, sidebar.locator(".primary-nav"), false);
    await expect(
      folder.locator(".project-nested-entry .project-link"),
    ).toHaveCount(3);
    report.checks.push("drop outside grouping preserves the ungrouped project");
  }
  await page.screenshot({ path: path.join(evidence, "grouped.png") });
  report.runtime = await page.evaluate(() => ({
    url: location.href,
    mode: document.querySelector(".app")?.dataset.runtimeMode,
    entry: document.querySelector(".app")?.dataset.runtimeEntry,
    scripts: [...document.scripts].map((script) => script.src),
    folders: document.querySelectorAll(".project-folder-group").length,
    children: document.querySelectorAll(".project-nested-entry .project-entry")
      .length,
  }));
  report.dragEvents = await page.evaluate(() => window.__projectDragEvents);
  await page.getByRole("button", { name: "关闭窗口", exact: true }).click();
  await expect.poll(() => child.exitCode, { timeout: 10000 }).toBe(0);
  report.passed = true;
  console.log(`PASS Desktop sidebar drag: ${evidence}`);
} catch (error) {
  report.error = String(error);
  await page
    ?.screenshot({ path: path.join(evidence, "failure.png") })
    .catch(() => {});
  throw error;
} finally {
  report.dragEvents ??= await page
    ?.evaluate(() => window.__projectDragEvents)
    .catch(() => []);
  await writeFile(
    path.join(evidence, "receipt.json"),
    JSON.stringify(report, null, 2),
  );
  if (browser) await browser.close().catch(() => {});
  if (child.exitCode === null) child.kill();
}
