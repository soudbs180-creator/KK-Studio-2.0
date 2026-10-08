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
const evidence = path.join(root, ".tmp/desktop/stage-workbench");
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
project.stagePlans[0].stages.push({
  ...project.stagePlans[0].stages[1],
  index: 3,
  name: "阶段摘要",
  goal: "审阅阶段摘要",
  workItems: [],
  resultSummary: "待审阅摘要",
});
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
  await page.getByRole("tab", { name: "Plan", exact: true }).click();
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
  await page.getByRole("button", { name: "拒绝计划", exact: true }).click();
  await expect
    .poll(async () => (await saved()).stagePlans[0].stages[0].status)
    .toBe("blocked");
  await page.getByRole("button", { name: "解除阻断", exact: true }).click();
  await expect
    .poll(async () => (await saved()).stagePlans[0].stages[0].status)
    .toBe("doing");
  assert.equal(
    (await saved()).stagePlans[0].stages[0].planApprovedAt,
    undefined,
  );
  await page
    .getByRole("button", { name: "重新提交计划审批", exact: true })
    .dblclick();
  await expect
    .poll(async () => (await saved()).stagePlans[0].stages[0].status)
    .toBe("plan_review");
  assert.equal((await saved()).stagePlans[0].revision, 4);
  await page.getByRole("button", { name: "批准计划", exact: true }).dblclick();
  await expect(
    page.getByRole("region", { name: "阶段计划" }).getByRole("status"),
  ).toBeVisible();
  let current = await saved();
  assert.equal(current.stagePlans[0].revision, 5);
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
  assert.equal(current.stagePlans[0].revision, 5);
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
  // Hold one UI autosave at the fetch transport boundary, then let another writer really
  // update the isolated native repository. Releasing it exercises Rust's CAS
  // conflict and the approval flush already queued behind the first save.
  await page
    .getByRole("button", { name: "关闭任务工作台", exact: true })
    .click();
  const expand = page.getByRole("button", { name: "展开侧边栏", exact: true });
  if (await expand.isVisible()) await expand.click();
  await expect(page.locator(".project-save-state")).toHaveText("已保存");
  await page.evaluate(() => {
    const native = window.__TAURI_INTERNALS__;
    const original = native.invoke.bind(native);
    const originalFetch = window.fetch;
    const boundary = {
      writes: 0,
      original,
      originalFetch,
      externalWrite: false,
      release: undefined,
      first: undefined,
    };
    window.__stageSaveConflict = boundary;
    window.fetch = async (input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      if (
        /\/write_creation_snapshot(?:$|[?#])/.test(url) &&
        !boundary.externalWrite
      ) {
        boundary.writes++;
        if (boundary.writes === 1) {
          boundary.first = JSON.parse(String(init.body));
          await new Promise((resolve) => {
            boundary.release = resolve;
          });
        }
      }
      return originalFetch.call(window, input, init);
    };
  });
  const entry = page
    .locator(".project-entry")
    .filter({ hasText: project.name });
  await entry
    .getByRole("button", { name: "更多项目设置", exact: true })
    .click();
  await entry.getByRole("menuitem", { name: "改名字", exact: true }).click();
  const name = page.getByRole("textbox", { name: "项目名称", exact: true });
  await name.fill("保存冲突时保留的未保存草稿");
  await name.press("Enter");
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(window.__stageSaveConflict.release)),
    )
    .toBe(true);
  assert.equal(
    await page.evaluate(
      () => window.__stageSaveConflict.first.snapshot.projects[0].name,
    ),
    "保存冲突时保留的未保存草稿",
  );
  await page.getByRole("button", { name: "打开任务列表" }).click();
  await page.getByRole("button", { name: "打开任务工作台" }).click();
  await page.getByRole("tab", { name: "Plan", exact: true }).click();
  await page.getByRole("button", { name: /阶段 4：阶段摘要/ }).click();
  await page.evaluate(async () => {
    const boundary = window.__stageSaveConflict;
    const { original } = boundary;
    const loaded = await original("read_creation_snapshot");
    boundary.externalWrite = true;
    try {
      await original("write_creation_snapshot", {
        snapshot: {
          ...loaded.snapshot,
          revision: loaded.snapshot.revision + 1,
        },
        expectedRevision: loaded.snapshot.revision,
      });
    } finally {
      boundary.externalWrite = false;
    }
  });
  await page.getByRole("button", { name: "批准结果", exact: true }).click();
  await expect(page.getByRole("region", { name: "阶段计划" })).toContainText(
    "1 / 4 阶段已完成",
  );
  await page.evaluate(() => window.__stageSaveConflict.release());
  const panel = page.getByRole("region", { name: "阶段计划" });
  await expect(panel).toContainText("项目保存已暂停，本次修改尚未保存");
  await expect(panel.getByRole("status")).toHaveCount(0);
  assert.equal(await page.evaluate(() => window.__stageSaveConflict.writes), 1);
  current = await saved();
  assert.equal(current.stagePlans[0].stages[3].status, "result_review");
  assert.equal(current.name, project.name);
  await page.screenshot({
    path: path.join(evidence, "save-conflict.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "关闭任务工作台", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "下载未保存草稿", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "重新读取", exact: true }).click();
  await expect(page.locator(".project-save-state")).toHaveText("已保存");
  await expect(page.locator(".creation-storage-notice")).toContainText(
    "内存草稿仍可单独下载",
  );
  await expect(
    page.getByRole("button", { name: "下载未保存草稿", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    window.fetch = window.__stageSaveConflict.originalFetch;
  });
  const conflict = {
    nativeCAS: true,
    queuedApprovalSaved: false,
    writes: 1,
    durableStage: current.stagePlans[0].stages[3].status,
    recoveryDraftAvailable: true,
  };
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
        conflict,
        errors,
        scope:
          "Local fixture reject/unblock/resubmit/approve, result rework, native persistence/restart, actual native CAS conflict behind queued approval and retained recovery draft; no provider execution.",
      },
      null,
      2,
    ) + "\n",
  );
  process.stdout.write(
    "Desktop stage workbench approval/rework/restart/native-conflict PASS\n",
  );
} catch (error) {
  if (page) {
    const diagnostic = await page
      .evaluate(async () => ({
        bridge: Object.getOwnPropertyDescriptor(
          window.__TAURI_INTERNALS__,
          "invoke",
        ),
        boundaryWrites: window.__stageSaveConflict?.writes,
        firstPending: Boolean(window.__stageSaveConflict?.release),
        state: document.querySelector(".project-save-state")?.textContent,
        durableName: (
          await window.__TAURI_INTERNALS__.invoke("read_creation_snapshot")
        ).snapshot.projects[0].name,
      }))
      .catch(() => null);
    process.stderr.write(
      `Native test diagnostic: ${JSON.stringify(diagnostic)}\n`,
    );
  }
  throw error;
} finally {
  await stop();
}
