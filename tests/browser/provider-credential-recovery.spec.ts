import { expect, test, type Page } from "@playwright/test";
import { DEFAULT_MODEL_PROVIDER } from "../../src/domain/modelProvider";
import { credentialId } from "../../src/features/creation/providerCredentials";

type CredentialFixtureWindow = Window & {
  credentialFixture: {
    readFailure: boolean;
    writeFailure: boolean;
    secret: string;
    credentialWrites: number;
    commitAttempts: number;
    connections: unknown[];
  };
};

async function fixture(page: Page, readFailure = false) {
  await page.addInitScript(
    ({ readFailure, providerId }) => {
      const state = {
        readFailure,
        writeFailure: false,
        secret: "synthetic-original",
        credentialWrites: 0,
        commitAttempts: 0,
        vault: { [providerId]: "synthetic-original" } as Record<string, string>,
        connections: [] as unknown[],
        revision: 1,
      };
      Object.assign(window, {
        credentialFixture: state,
        __TAURI_INTERNALS__: {
          metadata: {
            currentWindow: { label: "main" },
            currentWebview: { label: "main" },
          },
          transformCallback: () => 1,
          unregisterCallback: () => undefined,
          invoke: async (
            command: string,
            args: Record<string, unknown> = {},
          ) => {
            if (command === "read_provider_config")
              return {
                status: "loaded",
                revision: state.revision,
                connections: state.connections,
              };
            if (command === "write_provider_config") {
              if (
                state.writeFailure ||
                args.expectedRevision !== state.revision
              )
                throw new Error("conflict: synthetic concurrent write");
              state.connections = structuredClone(
                args.connections as unknown[],
              );
              return ++state.revision;
            }
            if (command === "commit_provider_connection") {
              state.commitAttempts++;
              if (
                state.writeFailure ||
                args.expectedRevision !== state.revision
              )
                throw new Error("conflict: synthetic concurrent write");
              state.connections = structuredClone(
                args.connections as unknown[],
              );
              if (args.secret) {
                state.vault[String(args.providerId)] = String(args.secret);
                if (args.providerId === providerId)
                  state.secret = String(args.secret);
                state.credentialWrites++;
              }
              if (args.clearSecret) {
                delete state.vault[String(args.providerId)];
                if (args.providerId === providerId) state.secret = "";
              }
              return {
                revision: ++state.revision,
                credentialState: args.clearSecret
                  ? "missing"
                  : args.secret
                    ? "saved"
                    : "unchanged",
              };
            }
            if (command === "credential_get") {
              if (state.readFailure)
                throw new Error("synthetic vault unavailable");
              return state.vault[String(args.providerId)] ?? null;
            }
            if (command === "credential_set") {
              state.vault[String(args.providerId)] = String(args.secret);
              if (args.providerId === providerId)
                state.secret = String(args.secret);
              state.credentialWrites++;
              return true;
            }
            if (command === "read_creation_snapshot")
              return { status: "missing", snapshot: null };
            if (command === "task_host_list" || command === "asset_list")
              return [];
            if (command === "plugin:window|is_maximized") return false;
            if (command === "plugin:event|listen") return 1;
            if (command === "plugin:event|unlisten") return;
            throw new Error(`Unexpected synthetic IPC: ${command}`);
          },
        },
      });
    },
    {
      readFailure,
      providerId: credentialId(
        DEFAULT_MODEL_PROVIDER.baseUrl,
        DEFAULT_MODEL_PROVIDER.name,
      ),
    },
  );
}

async function openApi(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page.getByRole("button", { name: "模型接入", exact: true }).click();
  await page
    .getByRole("button", { name: "API Key（官方）", exact: true })
    .click();
  return page.getByRole("region", { name: "官方 API Key 配置" });
}

test("vault read failure can recover without retyping or exposing the saved key", async ({
  page,
}) => {
  await fixture(page, true);
  const profile = await openApi(page);
  await expect(
    profile.getByRole("alert").filter({ hasText: "无法读取系统凭据" }),
  ).toBeVisible();
  await expect(profile.getByLabel("API Key", { exact: true })).toHaveValue("");
  await page.evaluate(() => {
    (window as CredentialFixtureWindow).credentialFixture.readFailure = false;
  });
  await profile
    .getByRole("button", { name: "重试读取密钥", exact: true })
    .click();
  await expect(profile.getByLabel("API Key", { exact: true })).toHaveAttribute(
    "placeholder",
    "已配置；重新输入可替换",
  );
  await expect(profile.getByLabel("API Key", { exact: true })).toHaveValue("");
  expect(
    await page.evaluate(
      () =>
        (window as CredentialFixtureWindow).credentialFixture.credentialWrites,
    ),
  ).toBe(0);
});

test("ordinary API native conflict does not replace the existing key or publish unsaved metadata", async ({
  page,
}) => {
  await fixture(page);
  const profile = await openApi(page);
  await expect(profile.getByLabel("API Key", { exact: true })).toHaveAttribute(
    "placeholder",
    "已配置；重新输入可替换",
  );
  await profile
    .getByLabel("模型名称", { exact: true })
    .fill("synthetic-image-model");
  await profile
    .getByLabel("API Key", { exact: true })
    .fill("synthetic-replacement");
  await page.evaluate(() => {
    (window as CredentialFixtureWindow).credentialFixture.writeFailure = true;
  });
  await profile.getByRole("button", { name: "保存", exact: true }).click();
  await expect(
    profile.getByRole("status").filter({ hasText: "无法保存" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as CredentialFixtureWindow).credentialFixture.secret,
    ),
  ).toBe("synthetic-original");
  expect(
    await page.evaluate(() =>
      localStorage.getItem("kk-studio-next:model-provider:v1"),
    ),
  ).toBeNull();
  expect(
    await page.evaluate(() =>
      JSON.parse(
        localStorage.getItem("kk-studio-next:provider-connections:v1") ?? "[]",
      ),
    ),
  ).toEqual([]);
  expect(
    await page.evaluate(
      () =>
        (window as CredentialFixtureWindow).credentialFixture.credentialWrites,
    ),
  ).toBe(0);
  expect(
    await page.evaluate(
      () =>
        (window as CredentialFixtureWindow).credentialFixture.commitAttempts,
    ),
  ).toBe(1);
  await expect(profile.getByLabel("API Key", { exact: true })).toHaveValue(
    "synthetic-replacement",
  );
  await page.evaluate(() => {
    (window as CredentialFixtureWindow).credentialFixture.writeFailure = false;
  });
  await profile.getByRole("button", { name: "保存", exact: true }).click();
  await expect(
    profile.getByRole("status").filter({ hasText: "连接信息已保存" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as CredentialFixtureWindow).credentialFixture.secret,
    ),
  ).toBe("synthetic-replacement");
  await expect(profile.getByLabel("API Key", { exact: true })).toHaveValue("");
  expect(
    await page.evaluate(() =>
      Object.values(localStorage).some((value) =>
        value.includes("synthetic-replacement"),
      ),
    ),
  ).toBe(false);
});
