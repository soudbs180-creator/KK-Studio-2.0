import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
const root = process.cwd();
const require = createRequire(path.join(root, "package.json"));
const { chromium, expect } = require("@playwright/test");
const { emptySnapshot } = await import(
  pathToFileURL(path.join(root, "src/features/creation/model.ts"))
);
const { stageProject } = await import(
  pathToFileURL(path.join(root, "tests/fixtures/stage-project.ts"))
);
const id = `${Date.now()}-${randomUUID()}`;
const isolated = path.join(
  root,
  "src-tauri/target/image-selection-acceptance",
  id,
);
const dataRoot = path.join(isolated, "data");
const profile = path.join(isolated, "profile");
const output =
  process.env.KK_IMAGE_SELECTION_EVIDENCE ??
  path.join(root, ".tmp/desktop/image-selection", id);
const executable = path.join(root, "src-tauri/target/release/kk-studio.exe");
const cdp = "http://127.0.0.1:9350";
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const report = {
  startedAt: new Date().toISOString(),
  sourceHead: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  dirtyFiles: execFileSync("git", ["status", "--porcelain"], {
    encoding: "utf8",
  })
    .trim()
    .split(/\r?\n/),
  versions: JSON.parse(
    await fs.readFile(path.join(root, "config/platform-versions.json"), "utf8"),
  ),
  executableSha256: hash(await fs.readFile(executable)),
  bundles: {},
  checks: [],
  pages: [],
  errors: [],
  passed: false,
};
for (const file of (await fs.readdir(path.join(root, "dist/assets"))).filter(
  (name) => /^index-.*\.(js|css)$/.test(name),
))
  report.bundles[`assets/${file}`] = hash(
    await fs.readFile(path.join(root, "dist/assets", file)),
  );
report.sourceHashes = {};
async function sourceFiles(folder) {
  for (const file of await fs.readdir(path.join(root, folder), {
    withFileTypes: true,
  })) {
    const relative = folder + "/" + file.name;
    if (file.isDirectory()) await sourceFiles(relative);
    else if (/\.(ts|tsx|css|rs)$/.test(file.name))
      report.sourceHashes[relative] = hash(
        await fs.readFile(path.join(root, relative)),
      );
  }
}
await sourceFiles("src");
await sourceFiles("src-tauri/src");
for (const file of [
  "config/platform-versions.json",
  "src-tauri/tauri.conf.json",
  "src-tauri/Cargo.toml",
])
  report.sourceHashes[file] = hash(await fs.readFile(path.join(root, file)));
await fs.mkdir(path.join(dataRoot, "projects"), { recursive: true });
await fs.mkdir(profile, { recursive: true });
await fs.mkdir(output, { recursive: true });
const project = stageProject();
await fs.writeFile(
  path.join(dataRoot, "projects/creation-v2.json"),
  JSON.stringify({
    ...emptySnapshot(),
    revision: 1,
    activeProjectId: project.id,
    projects: [project],
  }),
);
let app, browser, page;
const available = () =>
  fetch(`${cdp}/json/version`, { signal: AbortSignal.timeout(1000) })
    .then((r) => r.ok)
    .catch(() => false);
async function audit(selector, name) {
  const target =
    typeof selector === "string" ? page.locator(selector) : selector;
  await expect(target).toBeVisible();
  const metrics = await target.evaluate((element) => {
    const b = element.getBoundingClientRect();
    const visible = (item) => {
      const r = item.getBoundingClientRect();
      return (
        r.width > 0 &&
        r.height > 0 &&
        r.bottom > Math.max(0, b.top) &&
        r.top < Math.min(innerHeight, b.bottom) &&
        getComputedStyle(item).visibility !== "hidden"
      );
    };
    return {
      viewport: { width: innerWidth, height: innerHeight },
      url: location.href,
      text: [...element.querySelectorAll("*")]
        .filter(
          (item) =>
            visible(item) &&
            [...item.childNodes].some(
              (n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim(),
            ),
        )
        .map((item) => ({
          label: item.textContent.trim().slice(0, 65),
          font: parseFloat(getComputedStyle(item).fontSize),
        })),
      controls: [
        ...element.querySelectorAll(
          ".kk-button,.ui-button,.primary-button,.settings-action",
        ),
      ]
        .filter(visible)
        .map((item) => ({
          label: item.getAttribute("aria-label") || item.textContent.trim(),
          height: parseFloat(getComputedStyle(item).height),
        })),
    };
  });
  report.pages.push({ name, ...metrics });
  assert.deepEqual(
    metrics.text.filter((item) => item.font < 12),
    [],
    `${name}: caption minimum`,
  );
  assert.deepEqual(
    metrics.controls.filter(
      (item) => ![24, 32, 40].some((h) => Math.abs(h - item.height) < 1),
    ),
    [],
    `${name}: standard button height`,
  );
  await page.screenshot({ path: path.join(output, `${name}.png`) });
  report.checks.push(name);
}
try {
  assert.equal(await available(), false, "Owned CDP port 9350 must be free");
  app = spawn(executable, ["--data-dir", dataRoot], {
    cwd: root,
    windowsHide: true,
    stdio: "ignore",
    env: {
      ...process.env,
      WEBVIEW2_USER_DATA_FOLDER: profile,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:
        "--remote-debugging-port=9350 --remote-debugging-address=127.0.0.1",
    },
  });
  await expect
    .poll(
      async () => {
        assert.equal(app.exitCode, null, "Owned desktop exited");
        return available();
      },
      { timeout: 30000 },
    )
    .toBe(true);
  browser = await chromium.connectOverCDP(cdp);
  page = browser.contexts().flatMap((context) => context.pages())[0];
  assert(page, "Native WebView page missing");
  page.on("pageerror", (error) => report.errors.push(error.message));
  await page.waitForURL("http://tauri.localhost/");
  await expect(page.locator(".app")).toHaveAttribute(
    "data-runtime-mode",
    "production",
  );
  report.identity = await page.evaluate(async () => ({
    url: location.href,
    viewport: { width: innerWidth, height: innerHeight },
    root: await window.__TAURI_INTERNALS__.invoke("get_storage_root"),
    scripts: [...document.scripts].map((s) => s.src).filter(Boolean),
    styles: [...document.styleSheets].map((s) => s.href).filter(Boolean),
  }));
  assert.equal(
    path.resolve(report.identity.root).toLowerCase(),
    dataRoot.toLowerCase(),
  );
  for (const file of Object.keys(report.bundles))
    assert(
      [...report.identity.scripts, ...report.identity.styles].some((url) =>
        url.endsWith("/" + file),
      ),
      "Native must load this worktree's fresh bundle",
    );
  await expect(
    page.getByText("正在读取本地项目…", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page
    .locator(".project-library-card")
    .filter({ hasText: project.name })
    .click();
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page.getByRole("menuitem", { name: "图片", exact: true }).click();
  const node = page.getByTestId(/^canvas-node-added-image-/).first();
  await node
    .locator('input[type="file"]')
    .first()
    .setInputFiles(path.join(root, "public/fixtures/demo/blue-hour.png"));
  await expect(node.locator(".uploaded-image")).toBeVisible();
  await node.focus();
  await node.press("Escape");
  const actions = page.getByRole("toolbar", { name: /^图片操作：/ });
  await expect(actions).toHaveCount(0);
  await node.locator(".uploaded-image").click();
  await expect(actions).toBeVisible();
  await expect(page.getByRole("dialog", { name: "预览参考图片" })).toHaveCount(
    0,
  );
  const toolbarBox = await actions.boundingBox(),
    imageBox = await node.locator(".image-preview").boundingBox(),
    captionBox = await node.locator(".image-caption").boundingBox();
  assert(
    toolbarBox.y + toolbarBox.height < Math.min(imageBox.y, captionBox.y),
    "Native toolbar must be above the image and filename",
  );
  for (const button of await actions.getByRole("button").all())
    assert(
      Math.abs((await button.boundingBox()).height - 32) < 1,
      "Native toolbar buttons must stay 32px",
    );
  await page.screenshot({ path: path.join(output, "selected-reference.png") });
  report.checks.push("native-single-click-selected-above-image");
  await actions.getByRole("button", { name: "放大查看参考图片" }).click();
  await expect(
    page.getByRole("dialog", { name: "预览参考图片" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "关闭素材预览" }).click();
  await expect(
    actions.getByRole("button", { name: "放大查看参考图片" }),
  ).toBeFocused();
  await actions.getByRole("button", { name: "重绘参考图片" }).click();
  await expect(
    page.getByRole("dialog", { name: "重绘参考图片" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "开始重绘", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("dialog", { name: "重绘参考图片" })
    .getByRole("button", { name: "取消", exact: true })
    .click();
  await actions.getByRole("button", { name: /加入对比/ }).click();
  await expect(
    page.getByRole("region", { name: "图片对比选择" }),
  ).toContainText("1/4");
  await node.focus();
  await node.press("Escape");
  await expect(actions).toHaveCount(0);
  await node.locator(".uploaded-image").dblclick();
  await expect(
    page.getByRole("dialog", { name: "预览参考图片" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "关闭素材预览" }).click();
  report.checks.push("native-preview-redraw-gate-compare-doubleclick-focus");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page.getByRole("button", { name: "模型供应商", exact: true }).click();
  await audit(page.getByRole("dialog", { name: "设置" }), "model-settings");
  await page
    .getByRole("button", { name: "保存", exact: true })
    .scrollIntoViewIfNeeded();
  await audit(page.getByRole("dialog", { name: "设置" }), "model-actions");
  await page.getByRole("radio", { name: /Gemini CLI 账号/ }).check();
  await audit(page.getByRole("dialog", { name: "设置" }), "google-cli");
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page.getByRole("button", { name: "文件", exact: true }).click();
  await page
    .locator(".menu-popover")
    .getByRole("button", { name: "资产管理", exact: true })
    .click();
  await audit(".asset-panel", "asset-library");
  await page.getByRole("tab", { name: "资产", exact: true }).click();
  await audit(".asset-panel", "asset-actions");
  await page.getByRole("button", { name: "关闭资产管理", exact: true }).click();
  await page.getByRole("button", { name: "打开任务列表" }).click();
  await page.getByRole("button", { name: "打开任务工作台" }).click();
  for (const tab of [
    "Queue",
    "Prompt",
    "Generate",
    "Review",
    "Export",
    "Plan",
  ]) {
    await page.getByRole("tab", { name: tab, exact: true }).click();
    await audit(
      '[data-testid="task-workbench"]',
      `workbench-${tab.toLowerCase()}`,
    );
  }
  assert.deepEqual(report.errors, []);
  report.passed = true;
} catch (error) {
  report.failure = String(error);
  if (page && !page.isClosed())
    await page.screenshot({ path: path.join(output, "failure.png") });
  throw error;
} finally {
  try {
    if (app?.exitCode === null) {
      execFileSync(
        "powershell.exe",
        [
          "-NoProfile",
          "-Command",
          `(Get-Process -Id ${app.pid} -ErrorAction Stop).CloseMainWindow() | Out-Null`,
        ],
        { windowsHide: true },
      );
      await expect.poll(() => app.exitCode, { timeout: 10000 }).not.toBeNull();
    }
    await browser?.close();
    await expect.poll(available, { timeout: 10000 }).toBe(false);
    report.cleanupComplete = true;
  } catch (error) {
    report.passed = false;
    report.cleanupFailure = String(error);
    throw error;
  } finally {
    report.finishedAt = new Date().toISOString();
    await fs.writeFile(
      path.join(output, "receipt.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    process.stdout.write(
      JSON.stringify({
        passed: report.passed,
        checks: report.checks.length,
        output,
      }) + "\n",
    );
  }
}
