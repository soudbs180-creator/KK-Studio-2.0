import { expect, test } from "@playwright/test";
import { openSettingsSection } from "./helpers";

test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

test("记忆关闭保存失败保留真实开关，解除故障后关闭与重载一致", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (localStorage.getItem("kk.memory.settings") === null)
      localStorage.setItem(
        "kk.memory.settings",
        JSON.stringify({ enabled: true }),
      );
    const state = window as Window & { failMemoryWrite?: boolean };
    state.failMemoryWrite = true;
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (state.failMemoryWrite && key === "kk.memory.settings")
        throw new DOMException("fixture storage denied", "QuotaExceededError");
      write.call(this, key, value);
    };
  });
  await page.goto("/");
  await openSettingsSection(page, "记忆");
  const dialog = page.getByRole("dialog", { name: "设置", exact: true });
  const toggle = dialog.getByRole("switch", {
    name: "记忆服务开关",
    exact: true,
  });
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await toggle.tap();
  await expect(dialog.getByRole("alert")).toContainText("当前仍为开启");
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("kk.memory.settings")!).enabled,
    ),
  ).toBe(true);
  await page.evaluate(() => {
    (window as Window & { failMemoryWrite?: boolean }).failMemoryWrite = false;
  });
  await toggle.tap();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await page.reload();
  await openSettingsSection(page, "记忆");
  await expect(toggle).toHaveAttribute("aria-checked", "false");
});

test("插件停用保存失败保留运行态和原记录，重试成功后重载仍停用", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (localStorage.getItem("canvas-plugins") === null)
      localStorage.setItem(
        "canvas-plugins",
        JSON.stringify([
          {
            id: "persist-fixture",
            name: "Persist fixture",
            version: "1",
            url: "https://example.test/persist.js",
            enabled: true,
            source: `export default {
          id:'persist-fixture',name:'Persist fixture',version:'1',
          nodes:[{type:'persist-fixture:card',title:'Fixture',icon:'',defaultSize:{width:100,height:100},Content:()=>null}],
          setup(){window.__persistPluginActive+=1;return ()=>{window.__persistPluginActive-=1;}}
        }`,
          },
        ]),
      );
    const state = window as Window & {
      failPluginWrite?: boolean;
      __persistPluginActive?: number;
    };
    state.failPluginWrite = false;
    state.__persistPluginActive = 0;
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (state.failPluginWrite && key === "canvas-plugins")
        throw new DOMException("fixture storage denied", "QuotaExceededError");
      write.call(this, key, value);
    };
  });
  await page.goto("/");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { __persistPluginActive?: number })
            .__persistPluginActive,
      ),
    )
    .toBe(1);
  await openSettingsSection(page, "扩展");
  const dialog = page.getByRole("dialog", { name: "设置", exact: true });
  await dialog.getByRole("tab", { name: /^MCP(?: 工具)?$/, exact: true }).tap();
  const before = await page.evaluate(() =>
    localStorage.getItem("canvas-plugins"),
  );
  await page.evaluate(() => {
    (window as Window & { failPluginWrite?: boolean }).failPluginWrite = true;
  });
  await dialog
    .getByRole("switch", { name: "停用 Persist fixture", exact: true })
    .tap();
  await expect(dialog.getByRole("alert")).toContainText("插件设置未保存");
  await expect(
    dialog.getByRole("switch", { name: "停用 Persist fixture", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
  expect(
    await page.evaluate(() => localStorage.getItem("canvas-plugins")),
  ).toBe(before);
  expect(
    await page.evaluate(
      () =>
        (window as Window & { __persistPluginActive?: number })
          .__persistPluginActive,
    ),
  ).toBe(1);
  await page.evaluate(() => {
    (window as Window & { failPluginWrite?: boolean }).failPluginWrite = false;
  });
  await dialog
    .getByRole("switch", { name: "停用 Persist fixture", exact: true })
    .tap();
  await expect(
    dialog.getByRole("switch", { name: "启用 Persist fixture", exact: true }),
  ).toHaveAttribute("aria-checked", "false");
  expect(
    await page.evaluate(
      () =>
        (window as Window & { __persistPluginActive?: number })
          .__persistPluginActive,
    ),
  ).toBe(0);
  await page.reload();
  await openSettingsSection(page, "扩展");
  await dialog.getByRole("tab", { name: /^MCP(?: 工具)?$/, exact: true }).tap();
  await expect(
    dialog.getByRole("switch", { name: "启用 Persist fixture", exact: true }),
  ).toHaveAttribute("aria-checked", "false");
});

test("损坏插件记录不导致设置崩溃，也不被随包插件覆盖", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("canvas-plugins", "[null]"),
  );
  await page.goto("/");
  await openSettingsSection(page, "扩展");
  const dialog = page.getByRole("dialog", { name: "设置", exact: true });
  await dialog.getByRole("tab", { name: /^MCP(?: 工具)?$/, exact: true }).tap();
  await expect(dialog.getByRole("alert")).toContainText("原记录保留");
  expect(
    await page.evaluate(() => localStorage.getItem("canvas-plugins")),
  ).toBe("[null]");
});
