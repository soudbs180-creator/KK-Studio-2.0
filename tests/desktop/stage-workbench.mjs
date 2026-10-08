import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import { emptySnapshot } from "../../src/features/creation/model.ts";
import { stageProject } from "../fixtures/stage-project.ts";

const root = process.cwd();
const executable = path.join(root, "src-tauri/target/release/kk-studio.exe");
const evidence = path.join(root, "test-results/desktop/stage-workbench");
const isolated = path.join(
  root,
  "src-tauri/target/stage-workbench-acceptance",
  String(Date.now()),
);
const dataRoot = path.join(isolated, "data");
const cdp = "http://127.0.0.1:9348";
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const errors = [];
let child,
  browser,
  page,
  launchCount = 0;

await mkdir(path.join(dataRoot, "projects"), { recursive: true });
await mkdir(evidence, { recursive: true });
const project = stageProject();
await writeFile(
  path.join(dataRoot, "projects/creation-v2.json"),
  JSON.stringify({
    ...emptySnapshot(),
    revision: 1,
    activeProjectId: project.id,
    projects: [project],
  }),
);

async function launch() {
  if (
    await fetch(`${cdp}/json/version`)
      .then((response) => response.ok)
      .catch(() => false)
  )
    throw new Error("Desktop test CDP port 9348 is already in use.");
  const profile = path.join(isolated, `profile-${++launchCount}`);
  await mkdir(profile, { recursive: true });
  child = spawn(executable, ["--data-dir", dataRoot], {
    cwd: root,
    windowsHide: true,
    stdio: "ignore",
    env: {
      ...process.env,
      WEBVIEW2_USER_DATA_FOLDER: profile,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:
        "--remote-debugging-port=9348 --remote-debugging-address=127.0.0.1",
    },
  });
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null || child.signalCode !== null)
      throw new Error(`Desktop exited: ${child.exitCode}`);
    ready = await fetch(`${cdp}/json/version`)
      .then((response) => response.ok)
      .catch(() => false);
    if (ready) break;
    await pause(200);
  }
  assert(ready, "Desktop WebView2 CDP did not start");
  browser = await chromium.connectOverCDP(cdp);
  page = browser.contexts().flatMap((context) => context.pages())[0];
  assert(page, "Desktop WebView2 page missing");
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.waitForURL("http://tauri.localhost/");
  await expect(
    page.locator('[data-runtime-entry="src/main.tsx"]'),
  ).toHaveAttribute("data-runtime-mode", "production");
  const actualRoot = await page.evaluate(() =>
    window.__TAURI_INTERNALS__.invoke("get_storage_root"),
  );
  assert.equal(path.resolve(actualRoot).toLowerCase(), dataRoot.toLowerCase());
  await page.getByRole("button", { name: "项目库", exact: true }).click();
  await page
    .locator(".project-library-card")
    .filter({ hasText: project.name })
    .click();
  await page.getByRole("button", { name: "打开任务列表" }).click();
  await page.getByRole("button", { name: "打开任务工作台" }).click();
  await page.getByRole("tab", { name: /^阶段计划/ }).click();
}

async function saved() {
  return page.evaluate(async () => {
    const result = await window.__TAURI_INTERNALS__.invoke(
      "read_creation_snapshot",
    );
    return result.snapshot.projects[0];
  });
}

async function stop() {
  if (child && child.exitCode === null && child.signalCode === null) {
    assert(Number.isInteger(child.pid), "Isolated desktop PID missing");
    execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        `(Get-Process -Id ${child.pid} -ErrorAction Stop).CloseMainWindow() | Out-Null`,
      ],
      { windowsHide: true },
    );
    await expect.poll(() => child.exitCode, { timeout: 10000 }).not.toBeNull();
  }
  await browser?.close().catch(() => {});
  browser = undefined;
  await expect
    .poll(
      () =>
        fetch(`${cdp}/json/version`)
          .then((response) => response.ok)
          .catch(() => false),
      { timeout: 10000 },
    )
    .toBe(false);
}

try {
  await launch();
  await page.getByRole("button", { name: "批准计划", exact: true }).dblclick();
  await expect(
    page.getByRole("region", { name: "阶段计划" }).getByRole("status"),
  ).toBeVisible();
  let current = await saved();
  assert.equal(current.stagePlans[0].revision, 1);
  assert.equal(current.stagePlans[0].stages[0].status, "doing");
  assert.equal(current.tasks.length, 0);
  await page.screenshot({
    path: path.join(evidence, "plan-approved.png"),
    fullPage: true,
  });
  await stop();
  await launch();
  current = await saved();
  assert.equal(current.stagePlans[0].stages[0].status, "doing");
  assert.equal(current.stagePlans[0].revision, 1);
  await page.getByRole("button", { name: /阶段 2：画面结果/ }).click();
  await page.getByRole("button", { name: "返工结果", exact: true }).click();
  await page.getByRole("button", { name: "确认返工", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "阶段计划" }).getByRole("status"),
  ).toBeVisible();
  current = await saved();
  assert.equal(current.stagePlans[0].stages[1].status, "doing");
  assert.equal(current.stagePlans[0].stages[1].workItems[0].status, "queued");
  assert.equal(
    current.stagePlans[0].stages[1].workItems[0].prompt,
    "保留原始产品提示词",
  );
  assert.equal(current.tasks.length, 0);
  await page.screenshot({
    path: path.join(evidence, "result-rework.png"),
    fullPage: true,
  });
  const runtime = await page.evaluate(() => ({
    mode: document
      .querySelector("[data-runtime-mode]")
      ?.getAttribute("data-runtime-mode"),
    entry: document
      .querySelector("[data-runtime-entry]")
      ?.getAttribute("data-runtime-entry"),
    scripts: [...document.scripts].map((script) => script.src).filter(Boolean),
    viewport: { width: innerWidth, height: innerHeight },
  }));
  assert.deepEqual(errors, []);
  const executableSha256 = createHash("sha256")
    .update(await readFile(executable))
    .digest("hex");
  await writeFile(
    path.join(evidence, "acceptance.json"),
    JSON.stringify(
      {
        passed: true,
        timestamp: new Date().toISOString(),
        runtime,
        dataRoot,
        executableSha256,
        launches: launchCount,
        planRevision: current.stagePlans[0].revision,
        errors,
        scope:
          "Local fixture plan approval, result rework, native persistence and process restart; no provider execution.",
      },
      null,
      2,
    ) + "\n",
  );
  process.stdout.write(
    "Desktop stage workbench approval/rework/restart PASS\n",
  );
} finally {
  await stop();
}
