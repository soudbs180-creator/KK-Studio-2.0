import { expect, test as base, type Page } from "@playwright/test";
import { startAgentServer } from "../helpers/agentServer";
import { MODEL_PROVIDER_STORAGE_KEY } from "../../src/domain/modelProvider";
import { PROVIDER_CONNECTIONS_STORAGE_KEY } from "../../src/features/creation/providerRegistry";
import { openSettingsSection, selectHomeApiModel } from "./helpers";

const test = base.extend({
  page: async ({ page }, use) => {
    const agent = await startAgentServer("idle");
    try {
      await prepare(page, agent.url);
      await use(page);
    } finally {
      await agent.close();
    }
  },
});

const pixel =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

async function prepare(page: Page, endpoint: string) {
  await page.addInitScript(
    ({ profileKey, registryKey }) => {
      const provider = {
        id: "attachment-routing-api",
        provider: "Attachment fixture",
        displayName: "Attachment fixture",
        model: "attachment-image-test",
        baseUrl: "https://attachment.example.test/v1",
        kind: "user_byok",
        state: "active",
        credentialRef: "synthetic-missing-credential",
        capabilities: {
          modalities: ["image"],
          operations: ["generate"],
          async: false,
        },
        verificationStatus: "unverified",
        concurrencyLimit: 1,
      };
      localStorage.setItem(
        profileKey,
        JSON.stringify({
          version: 1,
          name: provider.provider,
          model: provider.model,
          baseUrl: provider.baseUrl,
        }),
      );
      localStorage.setItem(registryKey, JSON.stringify([provider]));
    },
    {
      profileKey: MODEL_PROVIDER_STORAGE_KEY,
      registryKey: PROVIDER_CONNECTIONS_STORAGE_KEY,
    },
  );
  await page.goto("/");
  await openSettingsSection(page, "模型接入");
  const dialog = page.getByRole("dialog", { name: "设置", exact: true });
  await dialog.getByRole("tab", { name: "CLI 直连 CLI", exact: true }).click();
  await dialog
    .getByRole("button", { name: "Codex CLI / 主 Agent", exact: true })
    .click();
  const card = dialog.locator(".settings-agent-card").filter({
    has: page.getByRole("heading", { name: /Codex 主 Agent/ }),
  });
  await card.getByText("高级连接选项", { exact: true }).click();
  await card.getByLabel("Agent 地址").fill(endpoint);
  await card.getByRole("button", { name: "连接 Agent", exact: true }).click();
  await expect(
    card.getByRole("button", { name: "已连接", exact: true }),
  ).toBeDisabled();
  await dialog.getByRole("button", { name: "关闭设置", exact: true }).click();
}

async function delayReads(page: Page) {
  await page.evaluate(() => {
    const original = FileReader.prototype.readAsDataURL;
    const pending: (() => void)[] = [];
    Object.assign(window, {
      attachmentReadCount: () => pending.length,
      releaseAttachmentReads: () => {
        FileReader.prototype.readAsDataURL = original;
        pending.splice(0).forEach((read) => read());
      },
    });
    FileReader.prototype.readAsDataURL = function (blob) {
      pending.push(() => original.call(this, blob));
    };
  });
}

async function chooseCodex(page: Page) {
  await page.getByRole("button", { name: "模型", exact: true }).click();
  const menu = page.getByRole("menu", { name: "选择模型" });
  await menu.getByRole("tab", { name: "图像生成", exact: true }).click();
  await menu.getByRole("searchbox").fill("Codex");
  await menu.getByRole("menuitemradio", { name: /^Codex 内置生图/ }).click();
}

async function releaseReads(page: Page) {
  await page.evaluate(() =>
    (
      window as unknown as { releaseAttachmentReads: () => void }
    ).releaseAttachmentReads(),
  );
}

for (const source of ["codex", "api"] as const) {
  test(`${source} 附件读取期间编辑并切换来源保留当前草稿，合法图片完整添加`, async ({
    page,
  }) => {
    if (source === "api")
      await selectHomeApiModel(page, "attachment-image-test");
    await page.getByLabel("创作提示词").fill("读取开始前的提示词");
    await delayReads(page);
    await page.locator('.start-composer input[type="file"]').setInputFiles({
      name: "pending.png",
      mimeType: "image/png",
      buffer: Buffer.from(pixel, "base64"),
    });
    await expect
      .poll(() =>
        page.evaluate(() =>
          (
            window as unknown as { attachmentReadCount: () => number }
          ).attachmentReadCount(),
        ),
      )
      .toBe(1);
    await page.getByLabel("创作提示词").fill("读取期间修改的新提示词");
    if (source === "codex")
      await selectHomeApiModel(page, "attachment-image-test");
    else await chooseCodex(page);
    await releaseReads(page);
    await expect(
      page.getByRole("button", { name: "移除素材 pending.png", exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("创作提示词")).toHaveValue(
      "读取期间修改的新提示词",
    );
    await expect(
      page.getByRole("button", { name: "模型", exact: true }),
    ).toContainText(
      source === "codex" ? "attachment-image-test" : "Codex 内置生图",
    );
    await expect(
      page.locator(".start-composer .start-attachment-chip"),
    ).toHaveCount(1);
  });
}

test("读取中切至较小上限的 API 来源明确拒绝超限整批，不截断或改回来源", async ({
  page,
}) => {
  await page.getByLabel("创作提示词").fill("读取前");
  await delayReads(page);
  await page.locator('.start-composer input[type="file"]').setInputFiles(
    Array.from({ length: 5 }, (_, index) => ({
      name: `pending-${index}.png`,
      mimeType: "image/png",
      buffer: Buffer.concat([
        Buffer.from(pixel, "base64"),
        Buffer.from([index]),
      ]),
    })),
  );
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window as unknown as { attachmentReadCount: () => number }
        ).attachmentReadCount(),
      ),
    )
    .toBe(5);
  await page.getByLabel("创作提示词").fill("API 新草稿");
  await selectHomeApiModel(page, "attachment-image-test");
  await releaseReads(page);
  await expect(page.locator(".start-status")).toContainText(
    "最多添加 4 张参考图片，本批图片未添加",
  );
  await expect(
    page.locator(".start-composer .start-attachment-chip"),
  ).toHaveCount(0);
  await expect(page.getByLabel("创作提示词")).toHaveValue("API 新草稿");
  await expect(
    page.getByRole("button", { name: "模型", exact: true }),
  ).toContainText("attachment-image-test");
});

test("询问确认随来源和草稿变化失效，再次创建只确认当前草稿", async ({
  page,
}) => {
  await page.getByLabel("创作提示词").fill("旧 Codex 确认草稿");
  await page.getByRole("button", { name: /当前模式：自动/ }).click();
  await page.getByRole("menuitemradio", { name: "询问", exact: true }).click();
  await page.getByRole("button", { name: "开始创建项目", exact: true }).click();
  const approval = page.getByRole("group", {
    name: "确认创建项目",
    exact: true,
  });
  await expect(approval).toBeVisible();
  await selectHomeApiModel(page, "attachment-image-test");
  await page.getByLabel("创作提示词").fill("新的 API 草稿");
  await expect(approval).toBeHidden();
  await expect(
    page.getByRole("button", { name: "模型", exact: true }),
  ).toContainText("attachment-image-test");
  await chooseCodex(page);
  await page.getByRole("button", { name: "开始创建项目", exact: true }).click();
  await expect(approval).toBeVisible();
  await approval.getByRole("button", { name: "取消", exact: true }).click();
  await expect(page.getByLabel("创作提示词")).toHaveValue("新的 API 草稿");
});
