import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";

const root = process.cwd();
const executable = path.join(root, "src-tauri/target/release/kk-studio.exe");
const evidence = path.join(
  root,
  ".tmp/model-capabilities/desktop",
  `run-${Date.now()}-${process.pid}`,
);
const isolated = path.join(evidence, `isolated-${Date.now()}`);
const dataRoot = path.join(isolated, "data");
const profile = path.join(isolated, "webview-profile");
const port = 9358;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await mkdir(dataRoot, { recursive: true });
await mkdir(profile, { recursive: true });
const child = spawn(executable, ["--data-dir", dataRoot], {
  cwd: root,
  windowsHide: true,
  stdio: "ignore",
  env: {
    ...process.env,
    WEBVIEW2_USER_DATA_FOLDER: profile,
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port} --remote-debugging-address=127.0.0.1`,
  },
});
let browser;
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null)
      throw new Error(`Desktop exited: ${child.exitCode}`);
    try {
      ready = (await fetch(`http://127.0.0.1:${port}/json/version`)).ok;
    } catch {
      /* Starting WebView2. */
    }
    if (ready) break;
    await pause(200);
  }
  assert(ready, "isolated Desktop CDP did not start");
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const page = browser.contexts().flatMap((context) => context.pages())[0];
  assert(page, "Desktop page missing");
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.waitForURL("http://tauri.localhost/");
  await expect(
    page.locator('[data-runtime-entry="src/main.tsx"]'),
  ).toHaveAttribute("data-runtime-mode", "production");
  const actualRoot = await page.evaluate(() =>
    window.__TAURI_INTERNALS__.invoke("get_storage_root"),
  );
  assert.equal(path.resolve(actualRoot).toLowerCase(), dataRoot.toLowerCase());
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page.getByRole("button", { name: "模型供应商", exact: true }).click();
  await page
    .getByLabel("提供商", { exact: true })
    .fill("Desktop capability fixture");
  await page
    .getByLabel("接口地址")
    .fill("https://desktop-capabilities.example.test/v1");
  await page.getByLabel("模型名称").fill("image-capability-native");
  // This test exercises local declarations; it never creates a vault credential.
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await page.getByLabel("当前模型用途").selectOption("image");
  await page
    .getByLabel("图片生成能力", { exact: true })
    .selectOption("supported");
  await page
    .getByLabel("参考图编辑能力", { exact: true })
    .selectOption("unsupported");
  await page.getByLabel("参考图数量上限", { exact: true }).fill("0");
  await page.getByLabel("单次任务生成数量上限", { exact: true }).fill("2");
  await page
    .getByRole("button", { name: "保存此模型能力", exact: true })
    .click();
  await expect(
    page.locator(".provider-model-catalog").getByRole("status"),
  ).toContainText("已保存此模型");
  await page
    .getByLabel("参考图编辑能力", { exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(evidence, "settings-native.png") });
  await page.reload();
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page.getByRole("button", { name: "模型供应商", exact: true }).click();
  await expect(page.getByLabel("参考图编辑能力", { exact: true })).toHaveValue(
    "unsupported",
  );
  await expect(page.getByLabel("参考图数量上限", { exact: true })).toHaveValue(
    "0",
  );
  await expect(
    page.getByLabel("单次任务生成数量上限", { exact: true }),
  ).toHaveValue("2");
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await expect(page.getByRole("region", { name: "无限画布" })).toBeVisible();
  await page.getByRole("button", { name: "添加资源", exact: true }).click();
  await page.getByRole("menuitem", { name: "图片", exact: true }).click();
  const item = page.getByTestId(/^canvas-node-added-image-/).first();
  await item.click();
  await item.getByRole("button", { name: "生成数量", exact: true }).click();
  await expect(
    item.getByRole("button", { name: "生成 2 个", exact: true }),
  ).toBeVisible();
  await expect(
    item.getByRole("button", { name: "生成 4 个", exact: true }),
  ).toHaveCount(0);
  await item.getByRole("button", { name: "生成 1 个", exact: true }).click();
  await expect(
    item.getByRole("button", { name: "添加参考图片", exact: true }),
  ).toBeDisabled();
  await item.getByTitle("使用当前模型声明支持的尺寸").click();
  const parameters = item.getByLabel("图片参数选项");
  await expect(parameters).toContainText("参考图编辑：不支持");
  await expect(parameters).toContainText("最多 0 张参考图");
  await page.screenshot({ path: path.join(evidence, "parameters-native.png") });
  await item
    .locator('input[type="file"]')
    .first()
    .setInputFiles(path.join(root, "public/fixtures/demo/blue-hour.png"));
  await expect(item.locator(".uploaded-image")).toBeVisible();
  await item.getByRole("button", { name: "重绘参考图片", exact: true }).click();
  const redraw = page.getByRole("dialog", { name: "重绘参考图片" });
  await redraw.getByLabel("重绘指令").fill("调整背景");
  await expect(
    redraw.getByRole("button", { name: "开始重绘", exact: true }),
  ).toBeDisabled();
  await expect(redraw.getByRole("status")).toContainText("不支持参考图编辑");
  await page.screenshot({
    path: path.join(evidence, "redraw-disabled-native.png"),
  });
  await redraw.getByRole("button", { name: "取消", exact: true }).click();
  await expect(item.locator(".uploaded-image")).toBeVisible();
  await expect
    .poll(async () => {
      const saved = await page.evaluate(() =>
        window.__TAURI_INTERNALS__.invoke("read_creation_snapshot"),
      );
      return saved.snapshot?.projects[0]?.items.some((entry) =>
        Boolean(entry.assetId),
      );
    })
    .toBe(true);
  const saved = await page.evaluate(() =>
    window.__TAURI_INTERNALS__.invoke("read_creation_snapshot"),
  );
  assert.equal(saved.snapshot.projects[0].tasks.length, 0);
  assert.deepEqual(errors, []);
  const runtime = await page.evaluate(() => ({
    url: location.href,
    mode: document
      .querySelector("[data-runtime-mode]")
      ?.getAttribute("data-runtime-mode"),
    entry: document
      .querySelector("[data-runtime-entry]")
      ?.getAttribute("data-runtime-entry"),
    scripts: [...document.scripts].map((script) => script.src).filter(Boolean),
    styles: [...document.styleSheets]
      .map((sheet) => sheet.href)
      .filter(Boolean),
    control: {
      fontSize: getComputedStyle(document.body).fontSize,
    },
  }));
  const executableSha256 = createHash("sha256")
    .update(await readFile(executable))
    .digest("hex");
  const distScripts = [];
  for (const url of runtime.scripts) {
    const file = new URL(url).pathname;
    const expected = await readFile(path.join(root, "dist", file));
    const actual = Buffer.from(
      await page.evaluate(
        async (url) =>
          Array.from(new Uint8Array(await (await fetch(url)).arrayBuffer())),
        url,
      ),
    );
    assert.equal(
      createHash("sha256").update(actual).digest("hex"),
      createHash("sha256").update(expected).digest("hex"),
    );
    distScripts.push({
      file,
      sha256: createHash("sha256").update(actual).digest("hex"),
    });
  }
  await writeFile(
    path.join(evidence, "desktop-acceptance.json"),
    JSON.stringify(
      {
        runtime,
        dataRoot,
        profile,
        executableSha256,
        distScripts,
        errors,
        assertions: [
          "fresh production bundle",
          "isolated native data",
          "declaration reload",
          "count cap",
          "zero reference allowance",
          "unsupported redraw",
          "original archived",
          "no task created",
        ],
      },
      null,
      2,
    ) + "\n",
  );
  process.stdout.write(
    JSON.stringify({
      desktopCapabilities: "PASS",
      runtime,
      executableSha256,
      evidence,
    }) + "\n",
  );
} finally {
  await browser?.close().catch(() => {});
  child.kill();
}
