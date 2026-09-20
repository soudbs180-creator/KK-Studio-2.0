import { expect, test, type Page } from "@playwright/test";
import { openWorkspace } from "./helpers";

type PackageSummary = {
  checksum: string;
  projectIds: string[];
  assetIds: string[];
};
type NativeCall = { command: string; args: Record<string, unknown> };
type PackageTestWindow = Window & {
  packageTest: {
    calls: NativeCall[];
    completeImport?: () => void;
    failImport?: () => void;
  };
};

async function installNativePackageMock(
  page: Page,
  options: { preflightError?: string } = {},
): Promise<void> {
  // Finish real Web initialization before enabling only the package IPC seam.
  // This keeps snapshot persistence and unrelated desktop APIs outside this mock.
  await openWorkspace(page);
  await expect(page.locator(".project-save-state")).toHaveText("已保存");
  await page.evaluate((options) => {
    const summary: PackageSummary = {
      checksum: "a".repeat(64),
      projectIds: ["restored-project"],
      assetIds: ["asset-" + "b".repeat(24)],
    };
    const state: PackageTestWindow["packageTest"] = { calls: [] };
    Object.assign(window, {
      packageTest: state,
      __TAURI_INTERNALS__: {
        invoke: async (command: string, args: Record<string, unknown> = {}) => {
          state.calls.push({ command, args });
          if (command === "plugin:dialog|save") return null;
          if (command === "plugin:dialog|open") {
            const dialog = args.options as { directory?: boolean };
            return dialog.directory
              ? "C:/KK-Studio-Test/RestoreParent/"
              : "C:/KK-Studio-Test/backup.kkproject";
          }
          if (command === "preflight_project_package") {
            if (options.preflightError) throw new Error(options.preflightError);
            return summary;
          }
          if (command === "import_project_package") {
            return new Promise<PackageSummary>((resolve, reject) => {
              state.completeImport = () => resolve(summary);
              state.failImport = () =>
                reject(new Error("io: 恢复原件校验失败，当前项目未改动。"));
            });
          }
          if (command === "open_restored_project_package") return;
          throw new Error(`Unexpected package IPC: ${command}`);
        },
      },
    });
  }, options);
}

async function openPackageSettings(page: Page) {
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "设置", exact: true });
  await dialog.getByRole("button", { name: "储存", exact: true }).click();
  const section = dialog.getByRole("region", { name: "项目包备份与恢复" });
  await expect(section).toBeVisible();
  return section;
}

async function nativeCalls(page: Page): Promise<NativeCall[]> {
  return page.evaluate(
    () => (window as unknown as PackageTestWindow).packageTest.calls,
  );
}

test("Web 项目包入口禁用并解释 Desktop 支持范围", async ({ page }) => {
  await page.goto("/");
  const section = await openPackageSettings(page);
  await expect(section).toContainText(
    "项目包操作目前仅支持 Desktop；Web 文件导入导出尚未接入。",
  );
  await expect(
    section.getByRole("button", { name: "导出项目包" }),
  ).toBeDisabled();
  await expect(
    section.getByRole("button", { name: "选择项目包" }),
  ).toBeDisabled();
  await expect(
    section.getByRole("button", { name: "打开恢复副本" }),
  ).toHaveCount(0);
});

test("Desktop 取消导出文件选择不会调用项目包写入", async ({ page }) => {
  await installNativePackageMock(page);
  const section = await openPackageSettings(page);
  await section.getByRole("button", { name: "导出项目包" }).click();
  await expect(section.getByRole("status")).toHaveText(
    "已取消导出，项目未改动。",
  );
  await expect(section).toHaveAttribute("aria-busy", "false");
  await expect(
    section.getByRole("button", { name: "导出项目包" }),
  ).toBeEnabled();
  expect((await nativeCalls(page)).map((call) => call.command)).toEqual([
    "plugin:dialog|save",
  ]);
});

test("项目包预检失败显示错误且不允许恢复", async ({ page }) => {
  await installNativePackageMock(page, {
    preflightError: "checksum-mismatch: 项目包清单校验失败。",
  });
  const section = await openPackageSettings(page);
  await section.getByRole("button", { name: "选择项目包" }).click();
  await expect(section.getByRole("alert")).toHaveText("项目包清单校验失败。");
  await expect(
    section.getByRole("button", { name: "恢复到新目录" }),
  ).toHaveCount(0);
  await expect(
    section.getByRole("button", { name: "打开恢复副本" }),
  ).toHaveCount(0);
  await expect(
    section.getByRole("button", { name: "选择项目包" }),
  ).toBeEnabled();
  expect((await nativeCalls(page)).map((call) => call.command)).toEqual([
    "plugin:dialog|open",
    "preflight_project_package",
  ]);
});

test("原生恢复完成前不报告成功，完成后可明确打开独立副本", async ({ page }) => {
  await installNativePackageMock(page);
  const original = await page.evaluate(() =>
    localStorage.getItem("kk-studio-next:creation:v1"),
  );
  const section = await openPackageSettings(page);
  await section.getByRole("button", { name: "选择项目包" }).click();
  await expect(section.getByRole("status")).toHaveText(
    "检查通过：1 个项目、1 个原件。请选择独立恢复位置。",
  );
  await expect(
    section.getByRole("button", { name: "打开恢复副本" }),
  ).toHaveCount(0);
  expect(
    (await nativeCalls(page)).some(
      (call) => call.command === "import_project_package",
    ),
  ).toBe(false);

  await section.getByRole("button", { name: "恢复到新目录" }).click();
  await expect(section.getByRole("status")).toHaveText(
    "正在恢复到独立新目录并校验原件…",
  );
  await expect(section).toHaveAttribute("aria-busy", "true");
  await expect(
    section.getByRole("button", { name: "恢复到新目录" }),
  ).toBeDisabled();
  await expect(
    section.getByRole("button", { name: "选择项目包" }),
  ).toBeDisabled();
  await expect(
    section.getByRole("button", { name: "打开恢复副本" }),
  ).toHaveCount(0);
  await expect(section.getByRole("status")).not.toContainText("已恢复");
  await expect
    .poll(
      async () =>
        (await nativeCalls(page)).filter(
          (call) => call.command === "import_project_package",
        ).length,
    )
    .toBe(1);
  const imported = (await nativeCalls(page)).find(
    (call) => call.command === "import_project_package",
  )!;
  expect(imported.args.source).toBe("C:/KK-Studio-Test/backup.kkproject");
  expect(imported.args.targetRoot).toMatch(
    /^C:\/KK-Studio-Test\/RestoreParent\/KK-Studio-restored-\d+$/,
  );

  await page.evaluate(() => {
    (window as unknown as PackageTestWindow).packageTest.completeImport!();
  });
  await expect(section.getByRole("status")).toHaveText(
    "已恢复 1 个项目、1 个原件。当前项目保持打开，可在新窗口打开恢复副本。",
  );
  await expect(
    section.getByRole("button", { name: "恢复到新目录" }),
  ).toHaveCount(0);
  await expect(
    section.getByRole("button", { name: "打开恢复副本" }),
  ).toBeEnabled();
  expect(
    (await nativeCalls(page)).some(
      (call) => call.command === "open_restored_project_package",
    ),
  ).toBe(false);
  await section.getByRole("button", { name: "打开恢复副本" }).click();
  await expect(section.getByRole("status")).toHaveText(
    "已启动恢复副本窗口，当前窗口仍保留原项目。",
  );
  expect(
    (await nativeCalls(page)).find(
      (call) => call.command === "open_restored_project_package",
    )?.args,
  ).toEqual({ targetRoot: imported.args.targetRoot });
  expect(
    await page.evaluate(() =>
      localStorage.getItem("kk-studio-next:creation:v1"),
    ),
  ).toBe(original);
});

test("恢复失败保留重试入口并且不会出现成功或打开按钮", async ({ page }) => {
  await installNativePackageMock(page);
  const section = await openPackageSettings(page);
  await section.getByRole("button", { name: "选择项目包" }).click();
  await section.getByRole("button", { name: "恢复到新目录" }).click();
  await expect(section.getByRole("status")).toHaveText(
    "正在恢复到独立新目录并校验原件…",
  );
  await expect
    .poll(async () =>
      (await nativeCalls(page)).some(
        (call) => call.command === "import_project_package",
      ),
    )
    .toBe(true);
  await page.evaluate(() => {
    (window as unknown as PackageTestWindow).packageTest.failImport!();
  });
  await expect(section.getByRole("alert")).toHaveText(
    "恢复原件校验失败，当前项目未改动。",
  );
  await expect(section).toHaveAttribute("aria-busy", "false");
  await expect(
    section.getByRole("button", { name: "恢复到新目录" }),
  ).toBeEnabled();
  await expect(
    section.getByRole("button", { name: "打开恢复副本" }),
  ).toHaveCount(0);
  expect(
    (await nativeCalls(page)).some(
      (call) => call.command === "open_restored_project_package",
    ),
  ).toBe(false);
});
