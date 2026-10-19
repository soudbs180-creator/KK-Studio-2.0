import { expect, test } from "@playwright/test";
import {
  CREATION_STORAGE_KEY,
  emptySnapshot,
} from "../../src/features/creation/model";
import { openSettingsSection } from "./helpers";

for (const code of ["SNAPSHOT_UNSUPPORTED", "IO"] as const) {
  test(`本机服务 ${code} 保留浏览器旧数据并暂停写入，不另建浏览器项目库`, async ({
    page,
  }) => {
    const original = emptySnapshot();
    original.revision = 10;
    original.homeDraft.prompt = "浏览器旧数据不得被隐式接管";
    await page.addInitScript(
      ({ key, original }) => {
        localStorage.setItem(key, JSON.stringify(original));
        localStorage.setItem(
          "kk-studio-next:companion:v1",
          JSON.stringify({
            version: 1,
            endpoint: "http://127.0.0.1:4319",
            deviceId: "format-fixture",
            protocolVersion: 1,
            enabled: true,
          }),
        );
      },
      { key: CREATION_STORAGE_KEY, original },
    );
    let reads = 0;
    let writes = 0;
    await page.route("http://127.0.0.1:4319/**", async (route) => {
      const request = route.request();
      const headers = {
        "Access-Control-Allow-Origin":
          request.headers().origin ?? "http://127.0.0.1:1423",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      };
      if (request.method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers });
        return;
      }
      const path = new URL(request.url()).pathname;
      if (path === "/health") {
        await route.fulfill({
          headers,
          json: {
            status: "ok",
            service: "kk-local-companion",
            protocolVersion: 1,
            deviceId: "format-fixture",
          },
        });
        return;
      }
      if (request.method() === "PUT") writes++;
      if (path === "/v1/snapshot") reads++;
      await route.fulfill({
        status: code === "IO" ? 500 : 409,
        headers,
        json: {
          error: code,
          detail: "private-path-and-server-detail-must-not-appear",
        },
      });
    });
    await page.goto("/");
    const notice = page.locator(".creation-storage-notice");
    await expect(notice).toHaveAttribute("role", "alert");
    await expect(notice).toContainText("读取保护");
    if (code === "SNAPSHOT_UNSUPPORTED")
      await expect(notice).toContainText("项目版本较新");
    await page.getByLabel("创作提示词").fill("保留在内存的当前草稿");
    const initialReads = reads;
    await notice
      .getByRole("button", { name: "关闭存储提示", exact: true })
      .click();
    await expect(page.getByLabel("创作提示词")).toHaveValue(
      "保留在内存的当前草稿",
    );
    expect(reads).toBe(initialReads);
    expect(writes).toBe(0);
    await notice
      .getByRole("button", { name: "展开存储提示", exact: true })
      .click();
    await notice.getByRole("button", { name: "重新读取", exact: true }).click();
    await expect.poll(() => reads).toBeGreaterThan(initialReads);
    await expect(notice).toContainText("读取保护");
    await expect(page.getByLabel("创作提示词")).toHaveValue(
      "保留在内存的当前草稿",
    );
    await openSettingsSection(page, "网络");
    const companion = page.getByTestId("companion-settings");
    await expect(companion.locator(".settings-companion-status")).toHaveText(
      code === "SNAPSHOT_UNSUPPORTED" ? "需要更新" : "检查失败",
    );
    await expect(page.locator("body")).not.toContainText(
      "private-path-and-server-detail",
    );
    expect(writes).toBe(0);
    expect(
      await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!),
        CREATION_STORAGE_KEY,
      ),
    ).toEqual(original);
    expect(
      await page.evaluate(async () =>
        (await indexedDB.databases()).map((db) => db.name),
      ),
    ).not.toContain("kk-studio-next");
  });
}
