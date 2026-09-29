import { expect, test, type Page } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

type RunningService = {
  process: ChildProcessWithoutNullStreams;
  endpoint: string;
  pairingCode: string;
};

async function startService(): Promise<RunningService> {
  const root = mkdtempSync(join(tmpdir(), "kk-companion-connection-"));
  const child = spawn(
    process.execPath,
    ["src/features/local-service/main.ts", root],
    { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] },
  );
  return new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`本机服务启动超时：${output}`));
    }, 10_000);
    child.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString();
      const endpoint = /listening on (http:\/\/127\.0\.0\.1:\d+)/.exec(
        output,
      )?.[1];
      const pairingCode = /Pairing code: (\S+)/.exec(output)?.[1];
      if (!endpoint || !pairingCode) return;
      clearTimeout(timer);
      resolve({ process: child, endpoint, pairingCode });
    });
    child.stderr.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function openStorageSettings(
  page: Page,
  width: number,
): Promise<ReturnType<Page["getByTestId"]>> {
  await page.setViewportSize({ width, height: width < 500 ? 800 : 1080 });
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "设置", exact: true });
  await dialog.getByRole("button", { name: "储存", exact: true }).click();
  return dialog.getByTestId("companion-settings");
}

async function pairThroughSettings(
  page: Page,
  service: RunningService,
  width: number,
): Promise<ReturnType<Page["getByTestId"]>> {
  const companion = await openStorageSettings(page, width);
  await companion.getByLabel("本机服务地址").fill(service.endpoint);
  await companion.getByLabel("一次性配对码").fill(service.pairingCode);
  await companion.getByRole("button", { name: "连接并配对" }).click();
  await expect(companion.locator(".settings-companion-status")).toHaveText(
    "已连接",
  );
  return companion;
}

async function assertNoSessionSecret(page: Page): Promise<void> {
  const browserStorage = await page.evaluate(() => ({
    local: Object.keys(localStorage),
    localValues: Object.values(localStorage),
    session: Object.keys(sessionStorage),
    cookie: document.cookie,
  }));
  expect(browserStorage.local).toContain("kk-studio-next:companion:v1");
  expect(
    browserStorage.local.some((key) =>
      /token|session|pairing|secret/i.test(key),
    ),
  ).toBe(false);
  expect(
    browserStorage.localValues.some((value) =>
      /kk_companion_session|bearer/i.test(value),
    ),
  ).toBe(false);
  expect(browserStorage.session).toEqual([]);
  expect(browserStorage.cookie).not.toContain("kk_companion_session");
}

test("桌面宽度连接、备份、断开状态可验收且不暴露会话密钥", async ({ page }) => {
  const service = await startService();
  try {
    const companion = await pairThroughSettings(page, service, 1920);
    await assertNoSessionSecret(page);
    await companion.getByRole("button", { name: "检查连接" }).click();
    await expect(companion.locator(".settings-companion-status")).toHaveText(
      "已连接",
    );
    const save = await page.evaluate(async (endpoint) => {
      const snapshot = {
        version: 2,
        revision: 1,
        activeProjectId: null,
        projects: [],
        homeDraft: {},
      };
      const response = await fetch(`${endpoint}/v1/snapshot`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedRevision: null, snapshot }),
      });
      return response.status;
    }, service.endpoint);
    expect(save).toBe(200);
    await companion.getByRole("button", { name: "创建备份" }).click();
    await expect(page.locator(".settings-feedback")).toContainText(
      "本机备份已生成",
    );
    await companion.getByRole("button", { name: "断开" }).click();
    await expect(companion.locator(".settings-companion-status")).toHaveText(
      "未连接",
    );
    await expect(page.locator(".settings-feedback")).toContainText(
      "本机伴随服务已断开",
    );
  } finally {
    service.process.kill();
  }
});

test("窄屏连接失败时显示服务离线而不报告已保存", async ({ page }) => {
  const service = await startService();
  try {
    const companion = await pairThroughSettings(page, service, 390);
    service.process.kill();
    await companion.getByRole("button", { name: "检查连接" }).click();
    await expect(companion.locator(".settings-companion-status")).toHaveText(
      "服务离线",
    );
    await expect(companion.locator("[role=alert]")).toContainText(
      "本机服务未运行",
    );
    await expect(page.locator(".settings-feedback")).not.toContainText(
      "已保存",
    );
  } finally {
    if (!service.process.killed) service.process.kill();
  }
});
