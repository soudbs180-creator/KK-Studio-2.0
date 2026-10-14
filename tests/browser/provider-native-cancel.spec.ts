import { expect, test, type Page } from "@playwright/test";

async function nativeCancellationFixture(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "设置", exact: true });
  await dialog.getByRole("button", { name: "模型接入", exact: true }).click();
  await dialog
    .getByRole("button", { name: "API Key（官方）", exact: true })
    .click();
  const form = dialog.getByRole("region", { name: "官方 API Key 配置" });
  await form
    .getByLabel("接口地址", { exact: true })
    .fill("http://127.0.0.1:1234/v1");
  await form
    .getByLabel("API Key", { exact: true })
    .fill("synthetic-cancel-key");
  await expect(
    form.getByRole("button", { name: "测试连接并刷新模型", exact: true }),
  ).toBeEnabled();
  await page.evaluate(() => {
    const state = { calls: [] as string[], rejectCancel: () => {} };
    Object.assign(window, {
      isTauri: true,
      cancelFixture: state,
      __TAURI_INTERNALS__: {
        invoke: async (command: string) => {
          state.calls.push(command);
          if (command === "provider_models_prepare") return;
          if (command === "provider_models_fetch") return new Promise(() => {});
          if (command === "provider_models_cancel")
            return new Promise((_, reject) => {
              state.rejectCancel = () => reject("host unavailable");
            });
          if (command === "provider_models_release") return true;
          throw new Error(`Unexpected cancellation fixture IPC: ${command}`);
        },
      },
    });
  });
  await form.getByRole("button", { name: "测试连接并刷新模型", exact: true }).click();
  const calls = () =>
    page.evaluate(
      () =>
        (window as Window & { cancelFixture: { calls: string[] } })
          .cancelFixture.calls,
    );
  await expect.poll(calls).toContain("provider_models_fetch");
  return { dialog, form, calls };
}

test("取消按钮等待原生回执，失败时保留错误且不伪报已取消", async ({ page }) => {
  const { dialog, form, calls } = await nativeCancellationFixture(page);
  await form.getByRole("button", { name: "取消测试", exact: true }).click();
  await expect.poll(calls).toContain("provider_models_cancel");
  await expect(
    form.getByText("正在取消连接测试…", { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "CLI 账号", exact: true }),
  ).toBeDisabled();
  await page.evaluate(() =>
    (
      window as Window & { cancelFixture: { rejectCancel: () => void } }
    ).cancelFixture.rejectCancel(),
  );
  await expect(form.getByText(/未能确认原生请求已取消/)).toBeVisible();
  await expect(form.getByText("已取消连接测试。", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    dialog.getByRole("button", { name: "CLI 账号", exact: true }),
  ).toBeEnabled();
  await expect.poll(calls).toContain("provider_models_release");
  await expect(form.getByLabel("接口地址", { exact: true })).toBeEnabled();
  await expect(
    form.getByRole("button", { name: "保存连接", exact: true }),
  ).toBeEnabled();
});

test("检测中编辑保留新草稿，旧原生取消失败独立提示且不覆盖新状态", async ({
  page,
}) => {
  const { dialog, form, calls } = await nativeCancellationFixture(page);
  await form.getByLabel("API Key", { exact: true }).fill("synthetic-next-key");
  await expect.poll(calls).toContain("provider_models_cancel");
  await expect(
    form.getByText("密钥已更改，请重新测试连接。", { exact: true }),
  ).toBeVisible();
  await page.evaluate(() =>
    (
      window as Window & { cancelFixture: { rejectCancel: () => void } }
    ).cancelFixture.rejectCancel(),
  );
  await expect(
    dialog.getByText(/此前的连接测试：未能确认原生请求已取消/),
  ).toBeVisible();
  await expect(form.getByLabel("API Key", { exact: true })).toHaveValue(
    "synthetic-next-key",
  );
  await expect(
    form.getByText("密钥已更改，请重新测试连接。", { exact: true }),
  ).toBeVisible();
  await expect(form.getByText("已取消连接测试。", { exact: true })).toHaveCount(
    0,
  );
  await expect.poll(calls).toContain("provider_models_release");
});
