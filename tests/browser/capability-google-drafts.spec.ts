import { expect, test } from "@playwright/test";
import {
  GOOGLE_BRIDGE_URL_KEY,
  GOOGLE_LOGIN_MODE_KEY,
} from "../../src/features/agent/googleAgentConfig";

const savedBridge = "http://127.0.0.1:1424";
const draftBridge = "http://127.0.0.1:1425";
const draftKey = "google-unsaved-draft-secret";

test("Google 密钥与 CLI 地址草稿跨接入方式保留，关闭后恢复已保存偏好", async ({
  page,
}) => {
  await page.addInitScript(
    ({ modeKey, urlKey, savedBridge }) => {
      localStorage.setItem(modeKey, "cli");
      localStorage.setItem(urlKey, savedBridge);
    },
    {
      modeKey: GOOGLE_LOGIN_MODE_KEY,
      urlKey: GOOGLE_BRIDGE_URL_KEY,
      savedBridge,
    },
  );
  const calls: string[] = [];
  await page.route("https://generativelanguage.googleapis.com/**", (route) => {
    calls.push(route.request().url());
    return route.abort();
  });
  await page.route(`${draftBridge}/**`, (route) => {
    calls.push(route.request().url());
    return route.abort();
  });
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "设置", exact: true });
  await dialog.getByRole("button", { name: "模型接入", exact: true }).click();
  await dialog.getByRole("tab", { name: "官方直连 API", exact: true }).click();
  const key = dialog.getByLabel("Google 密钥", { exact: true });
  await key.fill(draftKey);
  await dialog.getByRole("button", { name: "CLI 账号", exact: true }).click();
  await dialog.getByRole("button", { name: "Gemini CLI", exact: true }).click();
  const bridge = dialog.getByLabel("Gemini CLI 桥地址", { exact: true });
  await expect(bridge).toHaveValue(savedBridge);
  await bridge.fill(draftBridge);
  for (const method of ["API Key（中转站）", "Codex 主 Agent", "OAuth"]) {
    await dialog.getByRole("button", { name: method, exact: true }).click();
    await dialog
      .getByRole("tab", { name: "官方直连 API", exact: true })
      .click();
    await expect(key).toHaveValue(draftKey);
    await dialog.getByRole("button", { name: "CLI 账号", exact: true }).click();
    await dialog
      .getByRole("button", { name: "Gemini CLI", exact: true })
      .click();
    await expect(bridge).toHaveValue(draftBridge);
  }
  expect(calls).toEqual([]);
  const stored = await page.evaluate(
    ({ modeKey, urlKey }) => ({
      all: JSON.stringify(localStorage),
      mode: localStorage.getItem(modeKey),
      bridge: localStorage.getItem(urlKey),
    }),
    { modeKey: GOOGLE_LOGIN_MODE_KEY, urlKey: GOOGLE_BRIDGE_URL_KEY },
  );
  expect(stored.all).not.toContain(draftKey);
  expect(stored.mode).toBe("cli");
  expect(stored.bridge).toBe(savedBridge);
  await dialog.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await dialog.getByRole("button", { name: "模型接入", exact: true }).click();
  await dialog.getByRole("tab", { name: "官方直连 API", exact: true }).click();
  await expect(key).toHaveValue("");
  await dialog.getByRole("button", { name: "CLI 账号", exact: true }).click();
  await dialog.getByRole("button", { name: "Gemini CLI", exact: true }).click();
  await expect(bridge).toHaveValue(savedBridge);
});

test("取消 Google 检测后切换方式不丢草稿，迟到响应不能覆盖新状态", async ({
  page,
}) => {
  let release!: () => void;
  const responseGate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requests = 0;
  await page.route(
    "https://generativelanguage.googleapis.com/**",
    async (route) => {
      requests += 1;
      await responseGate;
      await route
        .fulfill({ json: { models: [{ name: "models/gemini-fixture" }] } })
        .catch(() => {});
    },
  );
  try {
    await page.goto("/");
    await page.getByRole("button", { name: "打开设置", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "设置", exact: true });
    await dialog.getByRole("button", { name: "模型接入", exact: true }).click();
    await dialog
      .getByRole("tab", { name: "官方直连 API", exact: true })
      .click();
    const key = dialog.getByLabel("Google 密钥", { exact: true });
    await key.fill(draftKey);
    await dialog
      .getByRole("button", { name: "测试 Google 连接", exact: true })
      .click();
    await expect.poll(() => requests).toBe(1);
    const cliMethod = dialog.getByRole("button", {
      name: "CLI 账号",
      exact: true,
    });
    await expect(cliMethod).toBeDisabled();
    await dialog.getByRole("button", { name: "取消检测", exact: true }).click();
    await expect(cliMethod).toBeEnabled();
    await cliMethod.click();
    await dialog
      .getByRole("button", { name: "Gemini CLI", exact: true })
      .click();
    await dialog
      .getByLabel("Gemini CLI 桥地址", { exact: true })
      .fill(draftBridge);
    release();
    await dialog
      .getByRole("tab", { name: "官方直连 API", exact: true })
      .click();
    await expect(key).toHaveValue(draftKey);
    await expect(
      dialog.getByRole("button", { name: "测试 Google 连接", exact: true }),
    ).toBeEnabled();
    await expect(
      dialog.getByRole("region", { name: "Google Gemini 配置", exact: true }),
    ).not.toContainText("Google 连接成功");
    expect(
      await page.evaluate(() => JSON.stringify(localStorage)),
    ).not.toContain(draftKey);
  } finally {
    release();
  }
});
