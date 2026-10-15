import { expect, test } from "@playwright/test";
import { BROWSER_STORAGE_KEYS } from "../../src/runtime/storage-contract";
import { credentialId } from "../../src/features/creation/providerCredentials";

const opaqueConnection = {
  id: "existing-provider-account",
  provider: "Opaque provider",
  kind: "user_byok",
  displayName: "Existing opaque account",
  baseUrl: "https://identity.example.test/v1",
  credentialRef: "vault_account_original",
  model: "image-test",
  capabilities: {
    modalities: ["image"],
    operations: ["generate"],
    async: false,
  },
  state: "active",
  concurrencyLimit: 2,
};

test("隐藏或免密的提供商不读取凭据，切回 API Key 才读取精确引用", async ({
  page,
}) => {
  const name = "keyless-vault-read-guard";
  const baseUrl = "http://127.0.0.1:11434/v1";
  const ref = credentialId(baseUrl, name);
  await page.addInitScript(
    ({ key, profile }) => {
      localStorage.setItem(key, JSON.stringify(profile));
    },
    {
      key: BROWSER_STORAGE_KEYS.modelProvider,
      profile: {
        version: 1,
        name,
        baseUrl,
        model: "qwen2.5:0.5b",
        protocol: "openai-compatible",
        authMode: "none",
      },
    },
  );
  await page.goto("/");
  await page.evaluate(() => {
    const state = window as Window & { __vaultReadGuard?: string[] };
    state.__vaultReadGuard = [];
    Object.assign(window, {
      __TAURI_INTERNALS__: {
        invoke: async (command: string, args: { providerId?: string }) => {
          if (command === "credential_get") {
            state.__vaultReadGuard!.push(args.providerId!);
            return "fixture-secret-used-only-in-memory";
          }
          if (command === "window_appearance_get")
            return { supported: false, enabled: false, reason: "fixture" };
          if (command === "asset_list") return [];
          return { available: false, running: false };
        },
      },
    });
  });
  const reads = () =>
    page.evaluate(
      (ref) =>
        (
          window as Window & { __vaultReadGuard: string[] }
        ).__vaultReadGuard.filter((id) => id === ref).length,
      ref,
    );
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "设置", exact: true });
  await dialog.getByRole("button", { name: "模型接入", exact: true }).click();
  await expect(
    dialog.getByRole("region", { name: "Codex 主 Agent 接入" }),
  ).toBeVisible();
  expect(await reads()).toBe(0);
  await dialog
    .getByRole("button", { name: "API Key（官方）", exact: true })
    .click();
  const profile = dialog.getByRole("region", { name: "官方 API Key 配置" });
  await expect(
    profile.getByRole("combobox", { name: "认证方式", exact: true }),
  ).toHaveValue("none");
  await expect(
    profile.getByRole("button", { name: "清除密钥", exact: true }),
  ).toHaveCount(0);
  expect(await reads()).toBe(0);
  await profile
    .getByRole("combobox", { name: "认证方式", exact: true })
    .selectOption("api-key");
  await expect.poll(reads).toBe(1);
  await expect(
    profile.getByRole("button", { name: "清除密钥", exact: true }),
  ).toBeVisible();
  await profile
    .getByLabel("API Key", { exact: true })
    .fill("unsaved-fixture-secret");
  await profile
    .getByRole("combobox", { name: "认证方式", exact: true })
    .selectOption("none");
  await expect(
    profile.getByRole("button", { name: "清除密钥", exact: true }),
  ).toHaveCount(0);
  expect(await reads()).toBe(1);
});

test("Codex 主 Agent 在模型接入，手动字段折叠且状态真实", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "设置" });
  await dialog.getByRole("button", { name: "模型接入", exact: true }).click();
  const codex = dialog.getByRole("region", { name: "Codex 主 Agent 接入" });
  await expect(
    codex.getByRole("heading", { name: /Codex 主 Agent/ }),
  ).toContainText("未连接");
  await expect(codex.getByLabel("Agent 地址")).not.toBeVisible();
  await codex.getByText("高级连接选项", { exact: true }).click();
  await expect(codex.getByLabel("Agent 地址")).toBeEditable();
  await expect(codex.getByLabel("权限模式")).toHaveValue("request");
  await dialog.getByRole("button", { name: "OAuth", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "开始授权" })).toBeDisabled();
  await expect(
    dialog.getByRole("region", { name: "OAuth 配置" }),
  ).toContainText("授权桥接尚未接入");
});

test("官方和中转站草稿隔离，切换不保存密钥或发起连接", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page.getByRole("button", { name: "模型接入", exact: true }).click();
  await page
    .getByRole("button", { name: "API Key（官方）", exact: true })
    .click();
  const profile = page.getByRole("region", { name: "官方 API Key 配置" });
  await profile.getByLabel("提供商", { exact: true }).fill("Official draft");
  await profile
    .getByLabel("API Key", { exact: true })
    .fill("test-official-draft-secret");
  await page
    .getByRole("button", { name: "API Key（中转站）", exact: true })
    .click();
  const relay = page.getByRole("region", { name: "中转站 API Key 配置" });
  await expect(relay.getByLabel("API Key", { exact: true })).toHaveValue("");
  await relay.getByLabel("提供商", { exact: true }).fill("Relay draft");
  await relay
    .getByLabel("API Key", { exact: true })
    .fill("test-relay-draft-secret");
  await page
    .getByRole("button", { name: "API Key（官方）", exact: true })
    .click();
  await expect(profile.getByLabel("提供商", { exact: true })).toHaveValue(
    "Official draft",
  );
  await expect(profile.getByLabel("API Key", { exact: true })).toHaveValue(
    "test-official-draft-secret",
  );
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "draft-secret",
  );
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page.getByRole("button", { name: "模型接入", exact: true }).click();
  await page
    .getByRole("button", { name: "API Key（官方）", exact: true })
    .click();
  await expect(profile.getByLabel("API Key", { exact: true })).toHaveValue("");
});

test("选择连接供编辑不会改变已保存的生效账号", async ({ page }) => {
  const accountB = {
    ...opaqueConnection,
    id: "draft-provider-account",
    displayName: "Draft account B",
    credentialRef: "vault_account_draft",
  };
  const savedProfile = {
    version: 1,
    name: opaqueConnection.provider,
    baseUrl: opaqueConnection.baseUrl,
    model: opaqueConnection.model,
    connectionId: opaqueConnection.id,
  };
  await page.addInitScript(
    ({ keys, accounts, saved }) => {
      localStorage.setItem(keys.providerConnections, JSON.stringify(accounts));
      localStorage.setItem(keys.modelProvider, JSON.stringify(saved));
    },
    {
      keys: BROWSER_STORAGE_KEYS,
      accounts: [opaqueConnection, accountB],
      saved: savedProfile,
    },
  );
  let requests = 0;
  await page.route(`${opaqueConnection.baseUrl}/models`, (route) => {
    requests += 1;
    return route.abort();
  });
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "设置" });
  await dialog.getByRole("button", { name: "模型接入", exact: true }).click();
  await dialog
    .getByRole("button", { name: "API Key（官方）", exact: true })
    .click();
  const profile = dialog.getByRole("region", { name: "官方 API Key 配置" });
  const registryBefore = await page.evaluate(
    (key) => localStorage.getItem(key),
    BROWSER_STORAGE_KEYS.providerConnections,
  );
  const rowB = profile
    .getByRole("listitem")
    .filter({ hasText: accountB.displayName });
  await rowB.click();
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) ?? "{}"),
      BROWSER_STORAGE_KEYS.modelProvider,
    ),
  ).toEqual(savedProfile);
  expect(
    await page.evaluate(
      (key) => localStorage.getItem(key),
      BROWSER_STORAGE_KEYS.providerConnections,
    ),
  ).toBe(registryBefore);
  expect(requests).toBe(0);
  await expect(rowB.getByText("正在编辑", { exact: true })).toBeVisible();
  await expect(
    profile.getByText("已选中连接供编辑；保存后生效。", { exact: true }),
  ).toBeVisible();
});

test("获取模型目录不会验证生成能力或改写保存配置", async ({ page }) => {
  const account = { ...opaqueConnection, verificationStatus: "unverified" };
  const savedProfile = {
    version: 1,
    name: account.provider,
    baseUrl: account.baseUrl,
    model: account.model,
    connectionId: account.id,
  };
  await page.addInitScript(
    ({ keys, saved, profile }) => {
      localStorage.setItem(keys.providerConnections, JSON.stringify([saved]));
      localStorage.setItem(keys.modelProvider, JSON.stringify(profile));
    },
    { keys: BROWSER_STORAGE_KEYS, saved: account, profile: savedProfile },
  );
  let authorization = "";
  await page.route(`${account.baseUrl}/models`, (route) => {
    authorization = route.request().headers().authorization ?? "";
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ data: [{ id: "discovered-image-model" }] }),
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "设置" });
  await dialog.getByRole("button", { name: "模型接入", exact: true }).click();
  await dialog
    .getByRole("button", { name: "API Key（官方）", exact: true })
    .click();
  const profile = dialog.getByRole("region", { name: "官方 API Key 配置" });
  await profile
    .getByLabel("API Key", { exact: true })
    .fill("fixture-discovery-key");
  await profile
    .getByRole("button", { name: "测试连接并刷新模型", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        JSON.parse(localStorage.getItem("kk-studio:model-catalog:v1") ?? "[]"),
      ),
    )
    .toEqual([
      expect.objectContaining({
        id: account.id,
        models: [
          expect.objectContaining({
            id: "discovered-image-model",
            kind: "unknown",
          }),
        ],
      }),
    ]);
  const stored = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "[]"),
    BROWSER_STORAGE_KEYS.providerConnections,
  );
  expect(authorization).toBe("Bearer fixture-discovery-key");
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "fixture-discovery-key",
  );
  expect(stored).toEqual([account]);
  expect(stored[0].lastSuccessfulGenerationAt).toBeUndefined();
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) ?? "{}"),
      BROWSER_STORAGE_KEYS.modelProvider,
    ),
  ).toEqual(savedProfile);
  await expect(
    profile.getByText("模型列表已获取", { exact: true }),
  ).toBeVisible();
  await expect(
    profile.getByText("已获取 1 个模型；生成能力仍需实际验证。", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(profile.getByText("未验证生成", { exact: true })).toBeVisible();
});

test("官方与中转站切换保留已有连接的 opaque 引用、保存身份和会话密钥", async ({
  page,
}) => {
  await page.addInitScript(
    ({ keys, saved }) => {
      localStorage.setItem(keys.providerConnections, JSON.stringify([saved]));
      localStorage.setItem(
        keys.modelProvider,
        JSON.stringify({
          version: 1,
          name: saved.provider,
          baseUrl: saved.baseUrl,
          model: saved.model,
        }),
      );
    },
    { keys: BROWSER_STORAGE_KEYS, saved: opaqueConnection },
  );
  let authorization = "";
  let requests = 0;
  await page.route(`${opaqueConnection.baseUrl}/models`, async (route) => {
    requests++;
    authorization = route.request().headers().authorization ?? "";
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ data: [{ id: "image-test" }] }),
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "设置" });
  await dialog.getByRole("button", { name: "模型接入", exact: true }).click();
  await dialog
    .getByRole("button", { name: "API Key（官方）", exact: true })
    .click();
  const profile = dialog.getByRole("region", { name: "官方 API Key 配置" });
  await expect(
    profile
      .getByRole("listitem")
      .filter({ hasText: "Existing opaque account" }),
  ).toContainText("正在编辑");
  await profile
    .getByLabel("API Key", { exact: true })
    .fill("fixture-opaque-key");
  await dialog
    .getByRole("button", { name: "API Key（中转站）", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "API Key（官方）", exact: true })
    .click();
  await expect(
    profile
      .getByRole("listitem")
      .filter({ hasText: "Existing opaque account" }),
  ).toContainText("正在编辑");
  await profile.getByRole("button", { name: "保存连接", exact: true }).click();
  await expect(
    profile.getByText(
      "连接信息已保存。API Key 不会写入浏览器存储或项目快照。",
      { exact: true },
    ),
  ).toBeVisible();
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "[]"),
    BROWSER_STORAGE_KEYS.providerConnections,
  );
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({
    id: opaqueConnection.id,
    credentialRef: opaqueConnection.credentialRef,
  });
  await profile.getByLabel("API Key", { exact: true }).fill("");
  await profile
    .getByRole("button", { name: "测试连接并刷新模型", exact: true })
    .click();
  await expect.poll(() => authorization).toBe("Bearer fixture-opaque-key");
  await expect(
    profile.getByText(/已获取 1 个模型；生成能力仍需实际验证/),
  ).toBeVisible();
  await profile.getByRole("button", { name: "清除密钥", exact: true }).click();
  await expect(
    profile.getByText("已清除当前供应商的密钥。", { exact: true }),
  ).toBeVisible();
  const requestsBeforeMissingKey = requests;
  await profile
    .getByRole("button", { name: "测试连接并刷新模型", exact: true })
    .click();
  await expect(profile).toContainText("原绑定连接缺少密钥，请配置后重试。");
  expect(requests).toBe(requestsBeforeMissingKey);
  expect(authorization).toBe("Bearer fixture-opaque-key");
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "fixture-opaque-key",
  );
  await profile.getByLabel("模型名称", { exact: true }).fill("gpt-6-astra");
  await profile.getByRole("button", { name: "保存连接", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key) ?? "[]")[0],
        BROWSER_STORAGE_KEYS.providerConnections,
      ),
    )
    .toMatchObject({
      id: opaqueConnection.id,
      credentialRef: opaqueConnection.credentialRef,
      model: "gpt-6-astra",
      capabilities: { modalities: ["text"] },
    });
});

test("同地址同模型多账号重开设置保留所选身份，保存和清除只影响当前账号", async ({
  page,
}) => {
  const accountB = {
    ...opaqueConnection,
    id: "second-provider-account",
    displayName: "Second opaque account",
    credentialRef: "vault_account_second",
  };
  await page.addInitScript(
    ({ keys, accounts }) => {
      if (!localStorage.getItem(keys.providerConnections))
        localStorage.setItem(
          keys.providerConnections,
          JSON.stringify(accounts),
        );
    },
    { keys: BROWSER_STORAGE_KEYS, accounts: [opaqueConnection, accountB] },
  );
  let authorization = "";
  let requests = 0;
  await page.route(`${opaqueConnection.baseUrl}/models`, async (route) => {
    requests++;
    authorization = route.request().headers().authorization ?? "";
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ data: [{ id: "image-test" }] }),
    });
  });
  await page.goto("/");
  const dialog = page.getByRole("dialog", { name: "设置" });
  const profile = dialog.getByRole("region", { name: "官方 API Key 配置" });
  const open = async () => {
    await page.getByRole("button", { name: "打开设置", exact: true }).click();
    await dialog.getByRole("button", { name: "模型接入", exact: true }).click();
    await dialog
      .getByRole("button", { name: "API Key（官方）", exact: true })
      .click();
  };
  const saveKey = async (value: string) => {
    await profile.getByLabel("API Key", { exact: true }).fill(value);
    await profile
      .getByRole("button", { name: "保存连接", exact: true })
      .click();
    await expect(
      profile.getByText(
        "连接信息已保存。API Key 不会写入浏览器存储或项目快照。",
        { exact: true },
      ),
    ).toBeVisible();
  };
  const testKey = async (value: string) => {
    await profile.getByLabel("API Key", { exact: true }).fill("");
    await profile
      .getByRole("button", { name: "测试连接并刷新模型", exact: true })
      .click();
    await expect.poll(() => authorization).toBe(value);
    await expect(
      profile.getByText(/已获取 1 个模型；生成能力仍需实际验证/),
    ).toBeVisible();
  };
  await open();
  await profile
    .getByRole("listitem")
    .filter({ hasText: opaqueConnection.displayName })
    .click();
  await saveKey("fixture-account-a");
  await profile
    .getByRole("listitem")
    .filter({ hasText: accountB.displayName })
    .click();
  await saveKey("fixture-account-b");
  await dialog.getByRole("button", { name: "关闭设置", exact: true }).click();
  await open();
  await expect(
    profile.getByRole("listitem").filter({ hasText: accountB.displayName }),
  ).toContainText("正在编辑");
  await expect(
    profile
      .getByRole("listitem")
      .filter({ hasText: opaqueConnection.displayName }),
  ).not.toContainText("正在编辑");
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) ?? "{}").connectionId,
      BROWSER_STORAGE_KEYS.modelProvider,
    ),
  ).toBe(accountB.id);
  await testKey("Bearer fixture-account-b");
  await saveKey("fixture-account-b-updated");
  await testKey("Bearer fixture-account-b-updated");
  await profile.getByRole("button", { name: "清除密钥", exact: true }).click();
  await expect(
    profile.getByText("已清除当前供应商的密钥。", { exact: true }),
  ).toBeVisible();
  const requestsBeforeMissingKey = requests;
  await profile
    .getByRole("button", { name: "测试连接并刷新模型", exact: true })
    .click();
  await expect(profile).toContainText("原绑定连接缺少密钥，请配置后重试。");
  expect(requests).toBe(requestsBeforeMissingKey);
  expect(authorization).toBe("Bearer fixture-account-b-updated");
  await profile
    .getByRole("listitem")
    .filter({ hasText: opaqueConnection.displayName })
    .click();
  await testKey("Bearer fixture-account-a");
  await profile
    .getByRole("listitem")
    .filter({ hasText: accountB.displayName })
    .click();
  await profile.getByLabel("提供商", { exact: true }).fill("Temporary edit");
  await profile.getByLabel("提供商", { exact: true }).fill(accountB.provider);
  await profile
    .getByLabel("API Key", { exact: true })
    .fill("fixture-must-not-replace-identity");
  await profile.getByRole("button", { name: "保存连接", exact: true }).click();
  await expect(profile).toContainText("此配置未明确选择账号");
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "[]"),
    BROWSER_STORAGE_KEYS.providerConnections,
  );
  expect(saved).toHaveLength(2);
  for (const account of [opaqueConnection, accountB])
    expect(
      saved.find((item: { id: string }) => item.id === account.id),
    ).toMatchObject({ id: account.id, credentialRef: account.credentialRef });
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "fixture-account-",
  );
});

test("旧配置同地址多账号没有明确身份时，保存测试清除均要求先选择账号", async ({
  page,
}) => {
  const ref = credentialId(opaqueConnection.baseUrl, opaqueConnection.provider);
  const derived = {
    ...opaqueConnection,
    id: `byok-${ref}`,
    credentialRef: ref,
    displayName: "Legacy derived account",
  };
  await page.addInitScript(
    ({ keys, accounts }) => {
      localStorage.setItem(keys.providerConnections, JSON.stringify(accounts));
      localStorage.setItem(
        "kk-studio:model-catalog:v1",
        JSON.stringify([
          {
            id: accounts[0].id,
            baseUrl: accounts[0].baseUrl,
            credentialRef: accounts[0].credentialRef,
            fetchedAt: Date.now(),
            models: [
              {
                id: accounts[0].model,
                kind: "image",
                sizes: ["1024x1024"],
                source: "manual",
              },
            ],
          },
        ]),
      );
      localStorage.setItem(
        keys.modelProvider,
        JSON.stringify({
          version: 1,
          name: accounts[0].provider,
          baseUrl: accounts[0].baseUrl,
          model: accounts[0].model,
        }),
      );
    },
    { keys: BROWSER_STORAGE_KEYS, accounts: [derived, opaqueConnection] },
  );
  let requests = 0;
  await page.route(`${opaqueConnection.baseUrl}/models`, (route) => {
    requests += 1;
    return route.abort();
  });
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "设置" });
  await dialog.getByRole("button", { name: "模型接入", exact: true }).click();
  await dialog
    .getByRole("button", { name: "API Key（官方）", exact: true })
    .click();
  const profile = dialog.getByRole("region", { name: "官方 API Key 配置" });
  const catalogBefore = await page.evaluate(() =>
    localStorage.getItem("kk-studio:model-catalog:v1"),
  );
  await expect(
    profile.getByRole("button", { name: "保存此模型能力", exact: true }),
  ).toBeDisabled();
  await expect(profile).toContainText("请先在已登记连接中选择账号");
  for (const account of [derived, opaqueConnection])
    await expect(
      profile.getByRole("listitem").filter({ hasText: account.displayName }),
    ).not.toContainText("正在编辑");
  await profile
    .getByLabel("API Key", { exact: true })
    .fill("fixture-ambiguous-key");
  for (const action of ["保存连接", "测试连接并刷新模型", "清除密钥"]) {
    await profile.getByRole("button", { name: action, exact: true }).click();
    await expect(profile).toContainText("此配置未明确选择账号");
  }
  expect(requests).toBe(0);
  expect(
    await page.evaluate(() =>
      localStorage.getItem("kk-studio:model-catalog:v1"),
    ),
  ).toBe(catalogBefore);
  const snapshot = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "[]"),
    BROWSER_STORAGE_KEYS.providerConnections,
  );
  expect(
    snapshot.map((item: { id: string; credentialRef: string }) => ({
      id: item.id,
      credentialRef: item.credentialRef,
    })),
  ).toEqual(
    [derived, opaqueConnection].map(({ id, credentialRef }) => ({
      id,
      credentialRef,
    })),
  );
  await profile
    .getByRole("listitem")
    .filter({ hasText: opaqueConnection.displayName })
    .click();
  await profile.getByRole("button", { name: "保存连接", exact: true }).click();
  await expect(profile).toContainText("连接信息已保存");
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) ?? "{}").connectionId,
      BROWSER_STORAGE_KEYS.modelProvider,
    ),
  ).toBe(opaqueConnection.id);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "fixture-ambiguous-key",
  );
});

test("API 测试锁定切页，取消后离开且迟到目录不覆盖草稿", async ({ page }) => {
  let received = false;
  let aborted = false;
  let release: (() => void) | undefined;
  let complete: (() => void) | undefined;
  const completed = new Promise<void>((resolve) => {
    complete = resolve;
  });
  page.on("requestfailed", (request) => {
    if (request.url() === "https://delayed.example.test/v1/models")
      aborted = true;
  });
  await page.route("https://delayed.example.test/v1/models", async (route) => {
    received = true;
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    try {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ data: [{ id: "late-model-must-not-persist" }] }),
      });
    } finally {
      complete?.();
    }
  });
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "设置" });
  await dialog.getByRole("button", { name: "模型接入", exact: true }).click();
  await dialog
    .getByRole("button", { name: "API Key（官方）", exact: true })
    .click();
  const profile = dialog.getByRole("region", { name: "官方 API Key 配置" });
  await profile
    .getByLabel("接口地址", { exact: true })
    .fill("https://delayed.example.test/v1");
  await profile
    .getByLabel("API Key", { exact: true })
    .fill("fixture-delayed-key");
  await profile
    .getByRole("button", { name: "测试连接并刷新模型", exact: true })
    .click();
  await expect.poll(() => received).toBe(true);
  try {
    const cli = dialog.getByRole("button", { name: "CLI 账号", exact: true });
    await expect(cli).toBeDisabled();
    await expect(
      dialog.getByRole("button", { name: "关闭设置", exact: true }),
    ).toBeDisabled();
    for (const category of await dialog
      .getByRole("navigation", { name: "设置分类" })
      .getByRole("button")
      .all())
      await expect(category).toBeDisabled();
    await profile
      .getByRole("button", { name: "取消测试", exact: true })
      .click();
    await expect(
      profile.getByText("已取消连接测试。", { exact: true }),
    ).toBeVisible();
    await expect(cli).toBeEnabled();
    await cli.click();
  } finally {
    release?.();
  }
  await completed;
  await expect.poll(() => aborted).toBe(true);
  await dialog
    .getByRole("button", { name: "API Key（官方）", exact: true })
    .click();
  await expect(
    profile.getByText("已取消连接测试。", { exact: true }),
  ).toBeVisible();
  await expect(profile.getByLabel("接口地址", { exact: true })).toHaveValue(
    "https://delayed.example.test/v1",
  );
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "late-model-must-not-persist",
  );
});

test("原生凭据保存等待期间禁止切换接入方式，完成后恢复选择", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "设置" });
  await dialog.getByRole("button", { name: "模型接入", exact: true }).click();
  await dialog
    .getByRole("button", { name: "API Key（官方）", exact: true })
    .click();
  const profile = dialog.getByRole("region", { name: "官方 API Key 配置" });
  const save = profile.getByRole("button", { name: "保存连接", exact: true });
  // Finish the initial production credential read before installing native IO.
  await expect(save).toBeEnabled();
  await page.evaluate(() => {
    const state = window as Window & {
      __testCredentialStarted?: boolean;
      __testReleaseCredential?: () => void;
      __testCredentialSaved?: boolean;
      __testNativeRevision?: number | null;
      __testNativeConnections?: unknown[];
    };
    const vault = new Map<string, string>();
    let connections: unknown[] | null = null;
    let revision: number | null = null;
    Object.assign(window, {
      __TAURI_INTERNALS__: {
        invoke: async (command: string, args: Record<string, unknown> = {}) => {
          if (command === "credential_get")
            return vault.get(String(args.providerId)) ?? null;
          if (command === "read_provider_config")
            return connections === null
              ? { status: "missing", revision: null, connections: [] }
              : {
                  status: "loaded",
                  revision,
                  connections: structuredClone(connections),
                };
          if (command === "commit_provider_connection") {
            if (
              args.expectedRevision !== revision ||
              !Array.isArray(args.connections)
            )
              throw new Error("synthetic native transaction conflict");
            state.__testCredentialStarted = true;
            await new Promise<void>((resolve) => {
              state.__testReleaseCredential = resolve;
            });
            connections = structuredClone(args.connections);
            revision = (revision ?? 0) + 1;
            const providerId = String(args.providerId);
            if (typeof args.secret === "string" && args.secret)
              vault.set(providerId, args.secret);
            if (args.clearSecret) vault.delete(providerId);
            state.__testCredentialSaved =
              vault.get(providerId) === "fixture-native-key";
            state.__testNativeRevision = revision;
            state.__testNativeConnections = structuredClone(connections);
            return {
              revision,
              credentialState: args.clearSecret
                ? "missing"
                : args.secret
                  ? "saved"
                  : "unchanged",
            };
          }
          throw new Error(`Unexpected synthetic native IPC: ${command}`);
        },
      },
    });
  });
  await profile
    .getByLabel("提供商", { exact: true })
    .fill("Delayed native save");
  await expect(save).toBeEnabled();
  await profile
    .getByLabel("接口地址", { exact: true })
    .fill("https://saving.example.test/v1");
  await expect(save).toBeEnabled();
  await profile
    .getByLabel("API Key", { exact: true })
    .fill("fixture-native-key");
  await save.click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean(
          (window as Window & { __testCredentialStarted?: boolean })
            .__testCredentialStarted,
        ),
      ),
    )
    .toBe(true);
  const methods = dialog
    .getByRole("group", { name: "接入方式" })
    .getByRole("button");
  try {
    for (const method of await methods.all())
      await expect(method).toBeDisabled();
  } finally {
    await page.evaluate(() =>
      (
        window as Window & { __testReleaseCredential?: () => void }
      ).__testReleaseCredential?.(),
    );
  }
  await expect(
    profile.getByText(
      "连接信息已保存。API Key 不会写入浏览器存储或项目快照。",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(profile.getByLabel("API Key", { exact: true })).toHaveValue("");
  await expect(profile.getByLabel("API Key", { exact: true })).toHaveAttribute(
    "placeholder",
    "已配置；重新输入可替换",
  );
  const committed = await page.evaluate(() => {
    const state = window as Window & {
      __testCredentialSaved?: boolean;
      __testNativeRevision?: number | null;
      __testNativeConnections?: unknown[];
    };
    return {
      saved: state.__testCredentialSaved,
      revision: state.__testNativeRevision,
      connections: state.__testNativeConnections,
    };
  });
  expect(committed.saved).toBe(true);
  expect(committed.revision).toBe(1);
  expect(committed.connections).toHaveLength(1);
  expect(committed.connections?.[0]).toMatchObject({
    provider: "Delayed native save",
    baseUrl: "https://saving.example.test/v1",
  });
  expect(JSON.stringify(committed.connections)).not.toContain(
    "fixture-native-key",
  );
  for (const method of await methods.all()) await expect(method).toBeEnabled();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "fixture-native-key",
  );
});
