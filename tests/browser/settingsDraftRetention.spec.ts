import { expect, test, type Page } from "@playwright/test";
import { BROWSER_STORAGE_KEYS } from "../../src/runtime/storage-contract";
import { startAgentServer } from "../helpers/agentServer";
import { openSettingsSection, selectSettingsSection } from "./helpers";

const endpoint = "https://settings-drafts.example.test/v1";
const accounts = ["a", "b"].map((id) => ({
  id: `draft-account-${id}`,
  provider: "Draft fixture",
  displayName: `Draft account ${id.toUpperCase()}`,
  kind: "user_byok",
  baseUrl: endpoint,
  credentialRef: `draft_credential_${id}`,
  model: "draft-image-a",
  capabilities: {
    modalities: ["image"],
    operations: ["generate"],
    async: false,
  },
  state: "active",
  concurrencyLimit: 1,
}));

async function openDrafts(page: Page) {
  await page.addInitScript(
    ({ keys, accounts }) => {
      localStorage.setItem(keys.providerConnections, JSON.stringify(accounts));
      localStorage.setItem(
        keys.modelProvider,
        JSON.stringify({
          version: 1,
          connectionId: accounts[0].id,
          name: accounts[0].provider,
          baseUrl: accounts[0].baseUrl,
          model: accounts[0].model,
        }),
      );
      localStorage.setItem(
        "kk-studio:model-catalog:v1",
        JSON.stringify(
          accounts.map((account) => ({
            id: account.id,
            baseUrl: account.baseUrl,
            credentialRef: account.credentialRef,
            fetchedAt: 1,
            models: ["a", "b"].map((model) => ({
              id: `draft-image-${model}`,
              kind: "image",
              sizes: ["1024x1024"],
              image: { generate: true, maxReferences: 1 },
              family: `${account.displayName} ${model}`,
              variant: "Original variant",
              aliases: ["original-alias"],
              source: "reported",
            })),
          })),
        ),
      );
    },
    { keys: BROWSER_STORAGE_KEYS, accounts },
  );
  const requests: string[] = [];
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "127.0.0.1" && ["1421", "1423"].includes(url.port))
      return route.continue();
    requests.push(route.request().url());
    return route.abort();
  });
  await page.goto("/");
  await openSettingsSection(page, "模型接入");
  const dialog = page.getByRole("dialog", { name: "设置", exact: true });
  await dialog
    .getByRole("button", { name: "API Key（官方）", exact: true })
    .click();
  const catalog = dialog.locator(".provider-model-catalog");
  await catalog.getByText("型号显示与搜索别名", { exact: true }).click();
  return { dialog, catalog, requests };
}

async function changeCatalog(page: Page, family: string) {
  await page.evaluate((family) => {
    const key = "kk-studio:model-catalog:v1";
    const catalogs = JSON.parse(localStorage.getItem(key) ?? "[]");
    for (const catalog of catalogs)
      for (const model of catalog.models) {
        model.family = `${family} ${model.id}`;
        model.sizes = ["2048x2048"];
        model.image = { generate: false, maxReferences: 4 };
      }
    localStorage.setItem(key, JSON.stringify(catalogs));
    window.dispatchEvent(new Event("kk:model-provider-changed"));
  }, family);
}

test("切换型号保留每个型号未保存的尺寸、显示和图片能力草稿", async ({
  page,
}) => {
  const { catalog, requests } = await openDrafts(page);
  await catalog.getByLabel("支持的图片尺寸", { exact: true }).fill("1536x1024");
  await catalog
    .getByLabel("模型分组名称", { exact: true })
    .fill("Unsaved family A");
  await catalog
    .getByLabel("型号参数名称", { exact: true })
    .fill("Unsaved variant A");
  await catalog.getByLabel("搜索别名", { exact: true }).fill("draft-alias-a");
  await catalog
    .getByLabel("参考图编辑能力", { exact: true })
    .selectOption("supported");
  await catalog.getByLabel("参考图数量上限", { exact: true }).fill("3");
  await catalog
    .getByLabel("已发现的模型", { exact: true })
    .selectOption("draft-image-b");
  await expect(catalog.getByLabel("模型分组名称", { exact: true })).toHaveValue(
    "Draft account A b",
  );
  await catalog
    .getByLabel("模型分组名称", { exact: true })
    .fill("Unsaved family B");
  await catalog
    .getByLabel("当前模型用途", { exact: true })
    .selectOption("text");
  await catalog
    .getByLabel("已发现的模型", { exact: true })
    .selectOption("draft-image-a");
  await expect(
    catalog.getByLabel("支持的图片尺寸", { exact: true }),
  ).toHaveValue("1536x1024");
  await expect(catalog.getByLabel("模型分组名称", { exact: true })).toHaveValue(
    "Unsaved family A",
  );
  await expect(catalog.getByLabel("型号参数名称", { exact: true })).toHaveValue(
    "Unsaved variant A",
  );
  await expect(catalog.getByLabel("搜索别名", { exact: true })).toHaveValue(
    "draft-alias-a",
  );
  await expect(
    catalog.getByLabel("参考图编辑能力", { exact: true }),
  ).toHaveValue("supported");
  await expect(
    catalog.getByLabel("参考图数量上限", { exact: true }),
  ).toHaveValue("3");
  await catalog
    .getByLabel("已发现的模型", { exact: true })
    .selectOption("draft-image-b");
  await expect(catalog.getByLabel("模型分组名称", { exact: true })).toHaveValue(
    "Unsaved family B",
  );
  await expect(catalog.getByLabel("当前模型用途", { exact: true })).toHaveValue(
    "text",
  );
  expect(requests).toEqual([]);
});

test("同地址不同账号的型号能力草稿不会互相覆盖", async ({ page }) => {
  const { dialog, catalog, requests } = await openDrafts(page);
  await catalog
    .getByLabel("模型分组名称", { exact: true })
    .fill("Account A draft");
  await dialog
    .getByRole("listitem")
    .filter({ hasText: "Draft account B" })
    .click();
  await expect(catalog.getByLabel("模型分组名称", { exact: true })).toHaveValue(
    "Draft account B a",
  );
  await catalog
    .getByLabel("模型分组名称", { exact: true })
    .fill("Account B draft");
  await dialog
    .getByRole("listitem")
    .filter({ hasText: "Draft account A" })
    .click();
  await expect(catalog.getByLabel("模型分组名称", { exact: true })).toHaveValue(
    "Account A draft",
  );
  await dialog
    .getByRole("listitem")
    .filter({ hasText: "Draft account B" })
    .click();
  await expect(catalog.getByLabel("模型分组名称", { exact: true })).toHaveValue(
    "Account B draft",
  );
  expect(requests).toEqual([]);
});

test("目录更新保留 dirty 草稿，未改动和保存后的字段采用最新目录", async ({
  page,
}) => {
  const { catalog, requests } = await openDrafts(page);
  // 连续选择不让出当前事件任务，覆盖型号标识与字段尚未同步的窗口。
  await catalog
    .getByLabel("已发现的模型", { exact: true })
    .evaluate((select: HTMLSelectElement) => {
      for (const model of ["draft-image-b", "draft-image-a"]) {
        select.value = model;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
  await catalog
    .getByLabel("模型分组名称", { exact: true })
    .fill("Dirty family");
  await changeCatalog(page, "Updated");
  await expect(catalog.getByLabel("模型分组名称", { exact: true })).toHaveValue(
    "Dirty family",
  );
  await expect(
    catalog.getByLabel("支持的图片尺寸", { exact: true }),
  ).toHaveValue("1024x1024");
  await catalog
    .getByLabel("已发现的模型", { exact: true })
    .selectOption("draft-image-b");
  await expect(catalog.getByLabel("模型分组名称", { exact: true })).toHaveValue(
    "Updated draft-image-b",
  );
  await expect(
    catalog.getByLabel("支持的图片尺寸", { exact: true }),
  ).toHaveValue("2048x2048");
  await catalog
    .getByLabel("已发现的模型", { exact: true })
    .selectOption("draft-image-a");
  await expect(catalog.getByLabel("模型分组名称", { exact: true })).toHaveValue(
    "Dirty family",
  );
  await catalog
    .getByRole("button", { name: "保存此模型能力", exact: true })
    .click();
  await expect(catalog.getByRole("status")).toContainText("已保存此模型");
  await changeCatalog(page, "After save");
  await expect(catalog.getByLabel("模型分组名称", { exact: true })).toHaveValue(
    "After save draft-image-a",
  );
  await expect(catalog.getByLabel("图片生成能力", { exact: true })).toHaveValue(
    "unsupported",
  );
  expect(requests).toEqual([]);
});

test("型号首尾空格不创建第二份草稿或目录记录", async ({ page }) => {
  const { dialog, catalog, requests } = await openDrafts(page);
  await catalog
    .getByLabel("模型分组名称", { exact: true })
    .fill("Trimmed draft");
  await dialog.getByLabel("模型名称", { exact: true }).fill(" draft-image-a ");
  await expect(catalog.getByLabel("模型分组名称", { exact: true })).toHaveValue(
    "Trimmed draft",
  );
  await expect(catalog.getByLabel("已发现的模型", { exact: true })).toHaveValue(
    "draft-image-a",
  );
  await catalog
    .getByRole("button", { name: "保存此模型能力", exact: true })
    .click();
  await expect(catalog.getByRole("status")).toContainText("已保存此模型");
  const models = await page.evaluate(() => {
    const catalogs = JSON.parse(
      localStorage.getItem("kk-studio:model-catalog:v1") ?? "[]",
    );
    return catalogs.find(
      (item: { id: string }) => item.id === "draft-account-a",
    ).models;
  });
  expect(
    models.filter((item: { id: string }) => item.id.trim() === "draft-image-a"),
  ).toEqual([
    expect.objectContaining({ id: "draft-image-a", family: "Trimmed draft" }),
  ]);
  expect(requests).toEqual([]);
});

test("接入方式切换后首个可编辑时刻替换提供商不会被迟到草稿打断", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 1080 });
  const { dialog, requests } = await openDrafts(page);
  const provider = dialog.getByLabel("提供商", { exact: true });
  await provider.fill("Official draft");
  const selection = provider.evaluate(
    (input: HTMLInputElement) =>
      new Promise<{ value: string; start: number | null; end: number | null }>(
        (resolve) => {
          const access = input.closest(".model-access-settings")!;
          const observer = new MutationObserver(() => {
            if (
              access.getAttribute("data-navigation") !== "detail" ||
              access
                .querySelector('[aria-pressed="true"]')
                ?.textContent?.trim() !== "API Key（中转站）" ||
              !input.getClientRects().length ||
              input.matches(":disabled")
            )
              return;
            observer.disconnect();
            input.focus();
            input.select();
            resolve({
              value: input.value,
              start: input.selectionStart,
              end: input.selectionEnd,
            });
          });
          observer.observe(access, {
            subtree: true,
            attributes: true,
            attributeFilter: ["data-navigation", "aria-pressed", "hidden"],
          });
        },
      ),
  );
  await dialog
    .getByRole("button", { name: "返回接入方式", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "API Key（中转站）", exact: true })
    .click();
  const selected = await selection;
  expect(selected.start).toBe(0);
  expect(selected.end).toBe(selected.value.length);
  // Model a short pause between selecting visible text and typing its replacement.
  await page.waitForTimeout(32);
  await page.keyboard.insertText("Relay draft");
  await expect(provider).toHaveValue("Relay draft");
  expect(requests).toEqual([]);
});

for (const width of [1920, 390]) {
  test(`分类和官方/中转/CLI切换保留会话草稿且不外发或持久化凭据 ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1080 });
    const { dialog, catalog, requests } = await openDrafts(page);
    const chooseMethod = async (name: string) => {
      const back = dialog.getByRole("button", {
        name: "返回接入方式",
        exact: true,
      });
      if (width < 768 && (await back.isVisible())) await back.click();
      await dialog.getByRole("button", { name, exact: true }).click();
    };
    await dialog.getByLabel("提供商", { exact: true }).fill("Official draft");
    await catalog
      .getByLabel("当前模型用途", { exact: true })
      .selectOption("image");
    await catalog
      .getByLabel("模型分组名称", { exact: true })
      .fill("Category capability draft");
    await dialog
      .getByLabel("API Key", { exact: true })
      .fill("fixture-official-secret");
    await dialog
      .getByLabel("Google 密钥", { exact: true })
      .fill("fixture-google-secret");
    await chooseMethod("API Key（中转站）");
    await dialog.getByLabel("提供商", { exact: true }).fill("Relay draft");
    await dialog
      .getByLabel("API Key", { exact: true })
      .fill("fixture-relay-secret");
    await chooseMethod("CLI 账号");
    await dialog
      .getByLabel("Gemini CLI 桥地址", { exact: true })
      .fill("http://127.0.0.1:19991");
    await selectSettingsSection(page, "通用");
    await expect(dialog.getByLabel("API Key", { exact: true })).toBeHidden();
    await selectSettingsSection(page, "模型接入");
    await chooseMethod("CLI 账号");
    await expect(
      dialog.getByLabel("Gemini CLI 桥地址", { exact: true }),
    ).toHaveValue("http://127.0.0.1:19991");
    await chooseMethod("API Key（官方）");
    await expect(dialog.getByLabel("提供商", { exact: true })).toHaveValue(
      "Official draft",
    );
    await expect(dialog.getByLabel("API Key", { exact: true })).toHaveValue(
      "fixture-official-secret",
    );
    await expect(dialog.getByLabel("Google 密钥", { exact: true })).toHaveValue(
      "fixture-google-secret",
    );
    await expect(
      catalog.getByLabel("模型分组名称", { exact: true }),
    ).toHaveValue("Category capability draft");
    await chooseMethod("API Key（中转站）");
    await expect(dialog.getByLabel("提供商", { exact: true })).toHaveValue(
      "Relay draft",
    );
    await expect(dialog.getByLabel("API Key", { exact: true })).toHaveValue(
      "fixture-relay-secret",
    );
    const stored = await page.evaluate(() => JSON.stringify(localStorage));
    for (const secret of [
      "fixture-official-secret",
      "fixture-relay-secret",
      "fixture-google-secret",
    ])
      expect(stored).not.toContain(secret);
    expect(requests).toEqual([]);
  });
}

test("CodeBuddy 路径草稿跨 CLI 工具、接入方式和设置分类保留，不自动提交", async ({
  page,
}) => {
  const agent = await startAgentServer("idle");
  const configRequests: string[] = [];
  try {
    await page.route(`${agent.url}/agent/codebuddy/**`, (route) => {
      configRequests.push(
        `${route.request().method()} ${new URL(route.request().url()).pathname}`,
      );
      return route.fulfill({
        json: { ok: true, configured: true, cliPath: "C:/Saved/codebuddy" },
      });
    });
    await page.goto("/");
    await openSettingsSection(page, "模型接入");
    const dialog = page.getByRole("dialog", { name: "设置", exact: true });
    await dialog.getByText("高级连接选项", { exact: true }).click();
    await dialog.getByLabel("Agent 地址", { exact: true }).fill(agent.url);
    await dialog
      .getByLabel("连接 Token", { exact: true })
      .fill("fixture-agent-draft-secret");
    await dialog
      .getByRole("button", { name: "连接 Agent", exact: true })
      .click();
    await expect(
      dialog.getByRole("button", { name: "已连接", exact: true }),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "CLI 账号", exact: true }).click();
    await dialog
      .getByRole("button", { name: "CodeBuddy CLI", exact: true })
      .click();
    const cliPath = dialog.getByLabel("CodeBuddy CLI 路径", { exact: true });
    await expect(cliPath).toHaveValue("C:/Saved/codebuddy");
    const initialReads = [...configRequests];
    expect(initialReads.length).toBeGreaterThan(0);
    expect(
      initialReads.every(
        (request) => request === "GET /agent/codebuddy/config",
      ),
    ).toBe(true);
    await cliPath.fill("C:/Drafts/codebuddy-unsaved");
    await dialog
      .getByRole("button", { name: "Gemini CLI", exact: true })
      .click();
    await expect(cliPath).toBeHidden();
    await dialog
      .getByRole("button", { name: "CodeBuddy CLI", exact: true })
      .click();
    await expect(cliPath).toHaveValue("C:/Drafts/codebuddy-unsaved");
    await dialog
      .getByRole("button", { name: "API Key（官方）", exact: true })
      .click();
    await dialog.getByRole("button", { name: "CLI 账号", exact: true }).click();
    await expect(cliPath).toHaveValue("C:/Drafts/codebuddy-unsaved");
    await selectSettingsSection(page, "通用");
    await selectSettingsSection(page, "模型接入");
    await expect(cliPath).toHaveValue("C:/Drafts/codebuddy-unsaved");
    expect(configRequests).toEqual(initialReads);
    expect(
      await page.evaluate(() => JSON.stringify(localStorage)),
    ).not.toContain("fixture-agent-draft-secret");
    expect(
      await page.evaluate(() => JSON.stringify(localStorage)),
    ).not.toContain("C:/Drafts/codebuddy-unsaved");
  } finally {
    await agent.close();
  }
});
