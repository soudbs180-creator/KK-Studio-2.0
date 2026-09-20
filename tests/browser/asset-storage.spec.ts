import { test, expect } from "@playwright/test";

test("素材库读取失败可见且重试恢复，不冒认空库", async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as Window & { failAssetRead?: boolean };
    state.failAssetRead = true;
    const open = indexedDB.open.bind(indexedDB);
    indexedDB.open = ((...args: Parameters<IDBFactory["open"]>) => {
      if (args[0] === "kk-studio-assets" && state.failAssetRead)
        throw new DOMException("synthetic failure", "UnknownError");
      return open(...args);
    }) as IDBFactory["open"];
  });
  await page.goto("/");
  await page.getByRole("button", { name: "文件", exact: true }).click();
  await page.getByRole("button", { name: "资产管理", exact: true }).click();
  const panel = page.getByTestId("asset-panel");
  await expect(panel.getByRole("alert")).toContainText("本地素材库读取失败");
  await panel
    .getByRole("button", { name: "重新读取素材库", exact: true })
    .click();
  await expect(panel.getByRole("alert")).toContainText("已有文件未修改");
  await page.evaluate(() => {
    (window as Window & { failAssetRead?: boolean }).failAssetRead = false;
  });
  await panel
    .getByRole("button", { name: "重新读取素材库", exact: true })
    .click();
  await expect(panel.getByRole("alert")).toHaveCount(0);
  await expect(
    panel.getByText("正在读取本地素材库…", { exact: false }),
  ).toHaveCount(0);
});
