import { expect, test, type Locator } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { openWorkspace } from "./helpers";
import {
  ACCENTS,
  contrast,
  cssRgb,
  themeTokens,
} from "../helpers/designSystem.ts";

async function paint(locator: Locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      color: style.color,
      bg: style.backgroundColor,
      filter: style.filter,
      radius: style.borderRadius,
      height: style.height,
    };
  });
}

for (const theme of ["dark", "light"]) {
  test(`${theme}: all 8 presets reach actual buttons, fields, switches and focus`, async ({
    page,
  }, testInfo) => {
    await page.goto("/");
    await expect(page.locator(".app")).toHaveAttribute(
      "data-runtime-mode",
      "production",
    );
    await page.getByRole("button", { name: "打开设置", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "设置" });
    await expect
      .poll(() =>
        dialog.locator("img.settings-nav-icon").evaluateAll((icons) =>
          icons.every((icon) => {
            const image = icon as HTMLImageElement;
            return image.complete && image.naturalWidth > 0;
          }),
        ),
      )
      .toBe(true);
    const results = [];
    for (const accent of ACCENTS) {
      const expected = themeTokens(theme, accent);
      await dialog.getByRole("button", { name: "通用", exact: true }).click();
      await dialog.getByLabel("主题", { exact: true }).selectOption(theme);
      const select = dialog.getByLabel("强调色", { exact: true });
      await select.selectOption(accent);
      await expect(page.locator("html")).toHaveAttribute("data-accent", accent);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await select.focus();
      const focus = await select.evaluate((el) => ({
        outline: getComputedStyle(el).outlineColor,
        bg: getComputedStyle(el.closest(".settings-panel")!).backgroundColor,
      }));
      expect(contrast(focus.outline, focus.bg)).toBeGreaterThanOrEqual(3);
      const switchPaint = await paint(
        dialog.getByRole("switch", { name: "浮岛布局", exact: true }),
      );
      const thumbPaint = await paint(
        dialog
          .getByRole("switch", { name: "浮岛布局", exact: true })
          .locator("span"),
      );
      expect(contrast(thumbPaint.bg, switchPaint.bg)).toBeGreaterThanOrEqual(3);
      expect((await paint(select)).height).toBe("32px");
      await dialog
        .getByRole("button", { name: "模型接入", exact: true })
        .click();
      const save = dialog.getByRole("button", {
        name: "保存供应商",
        exact: true,
      });
      await page.mouse.move(0, 0);
      await expect(save).toHaveCSS(
        "background-color",
        cssRgb(expected("--bg-accent")),
      );
      const normal = await paint(save);
      expect(contrast(normal.color, normal.bg)).toBeGreaterThanOrEqual(4.5);
      expect(normal.radius).toBe("10px");
      expect(normal.height).toBe("32px");
      expect(normal.filter).toBe("none");
      await save.hover();
      await expect(save).toHaveCSS(
        "background-color",
        cssRgb(expected("--bg-accent-hover")),
      );
      const hover = await paint(save);
      expect(contrast(hover.color, hover.bg)).toBeGreaterThanOrEqual(4.5);
      expect(hover.bg).not.toBe(normal.bg);
      await page.mouse.down();
      const active = await paint(save);
      expect(contrast(active.color, active.bg)).toBeGreaterThanOrEqual(4.5);
      // Release inside the dialog but away from actions, preserving the real
      // outside-click contract without saving a provider during a paint check.
      const safeArea = (await dialog
        .locator(".settings-page-title")
        .boundingBox())!;
      await page.mouse.move(safeArea.x + 4, safeArea.y + 4);
      await page.mouse.up();
      const field = dialog.locator(".settings-field input").first();
      const fieldPaint = await paint(field);
      const placeholder = await field.evaluate(
        (el) => getComputedStyle(el, "::placeholder").color,
      );
      expect(contrast(placeholder, fieldPaint.bg)).toBeGreaterThanOrEqual(4.5);
      expect(fieldPaint.radius).toBe("10px");
      expect(fieldPaint.height).toBe("32px");
      // Compare the shipped stylesheet with computed state, including alias resolution.
      const resolved = await page.evaluate(() =>
        getComputedStyle(document.documentElement)
          .getPropertyValue("--bg-accent")
          .trim(),
      );
      expect(resolved.toLowerCase()).toBe(
        expected("--bg-accent").toLowerCase(),
      );
      results.push({ accent, normal, hover, active, focus, field: fieldPaint });
    }
    const evidencePath = testInfo.outputPath(`${theme}-computed-colors.json`);
    const runtime = await page.evaluate(() => ({
      url: location.href,
      app: { ...(document.querySelector<HTMLElement>(".app")?.dataset ?? {}) },
      scripts: Array.from(document.scripts, (script) => script.src).filter(
        Boolean,
      ),
      stylesheets: Array.from(document.styleSheets, (sheet) => sheet.href),
      theme: document.documentElement.dataset.theme,
      accent: document.documentElement.dataset.accent,
    }));
    await writeFile(
      evidencePath,
      JSON.stringify({ runtime, colors: results }, null, 2),
    );
    await testInfo.attach(`${theme}-computed-colors.json`, {
      path: evidencePath,
      contentType: "application/json",
    });
    await page.evaluate(() => window.getSelection()?.removeAllRanges());
    await page.screenshot({
      animations: "disabled",
      path: testInfo.outputPath(`${theme}-white-provider.png`),
    });
  });
}

test("accent preference supports keyboard, reload, system theme and modal focus return", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  const opener = page.getByRole("button", { name: "打开设置", exact: true });
  await opener.click();
  const select = page.getByLabel("强调色", { exact: true });
  await select.focus();
  await page.keyboard.press("Alt+ArrowDown");
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(select).toHaveValue("blue");
  await page.getByLabel("主题", { exact: true }).selectOption("system");
  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-accent", "blue");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await opener.click();
  await expect(select).toHaveValue("blue");
});

for (const width of [390, 768, 1920]) {
  test(`settings design system remains usable at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "打开设置", exact: true }).click();
    const select = page.getByLabel("强调色", { exact: true });
    await select.selectOption("pink");
    const box = (await select.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    await expect(select).toBeVisible();
    const overflow = await page
      .locator(".settings-content")
      .evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.screenshot({
      animations: "disabled",
      path: testInfo.outputPath(`settings-${width}.png`),
    });
    await page.getByRole("button", { name: "关闭设置", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "打开设置", exact: true }),
    ).toBeFocused();
  });
}

for (const theme of ["dark", "light"]) {
  test(`${theme}: asset primary and plugin danger consumers keep paired colors in all presets`, async ({
    page,
  }, testInfo) => {
    await openWorkspace(page);
    await page.getByRole("button", { name: "资产管理", exact: true }).click();
    await page.getByRole("tab", { name: "资产", exact: true }).click();
    const create = page.getByRole("button", { name: "创建主体", exact: true });
    for (const accent of ACCENTS) {
      // Binding/persistence is covered above; exercise existing consumers in
      // each root theme state without creating a subject or changing data.
      await page.evaluate(
        ({ theme, accent }) => {
          document.documentElement.dataset.theme = theme;
          document.documentElement.dataset.accent = accent;
        },
        { theme, accent },
      );
      const token = themeTokens(theme, accent);
      await page.mouse.move(0, 0);
      await expect(create).toHaveCSS(
        "background-color",
        cssRgb(token("--bg-accent")),
      );
      await expect(create).toHaveCSS(
        "color",
        cssRgb(token("--text-on-accent")),
      );
      await create.hover();
      await expect(create).toHaveCSS(
        "background-color",
        cssRgb(token("--bg-accent-hover")),
      );
      const hover = await paint(create);
      expect(contrast(hover.color, hover.bg)).toBeGreaterThanOrEqual(4.5);
    }
    await page.screenshot({
      animations: "disabled",
      path: testInfo.outputPath(`${theme}-assets.png`),
    });
    await page
      .getByRole("button", { name: "关闭资产管理", exact: true })
      .click();
    await page.getByRole("button", { name: "打开设置", exact: true }).click();
    await page
      .getByRole("dialog", { name: "设置" })
      .getByRole("button", { name: "插件·技能·伙伴", exact: true })
      .click();
    const uninstall = page
      .getByRole("button", { name: "卸载", exact: true })
      .first();
    for (const accent of ACCENTS) {
      await page.evaluate(
        ({ theme, accent }) => {
          document.documentElement.dataset.theme = theme;
          document.documentElement.dataset.accent = accent;
        },
        { theme, accent },
      );
      const token = themeTokens(theme, accent);
      await uninstall.hover();
      await expect(uninstall).toHaveCSS(
        "background-color",
        cssRgb(token("--ui-danger-surface")),
      );
      await expect(uninstall).toHaveCSS("color", cssRgb(token("--ui-danger")));
      const hover = await paint(uninstall);
      expect(contrast(hover.color, hover.bg)).toBeGreaterThanOrEqual(4.5);
      await page.mouse.down();
      await expect(uninstall).toHaveCSS(
        "background-color",
        cssRgb(token("--ui-danger-surface")),
      );
      const safe = (await page.locator(".settings-page-title").boundingBox())!;
      await page.mouse.move(safe.x + 4, safe.y + 4);
      await page.mouse.up();
    }
    await page.evaluate(() => window.getSelection()?.removeAllRanges());
    await page.screenshot({
      animations: "disabled",
      path: testInfo.outputPath(`${theme}-plugins.png`),
    });
  });
}
