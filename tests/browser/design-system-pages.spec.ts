import { expect, test, type Page, type Locator } from "@playwright/test";
import {
  ACCENTS,
  contrast,
  cssRgb,
  themeTokens,
} from "../helpers/designSystem.ts";

const pages = ["项目库", "Skill", "ComfyUI 工作流"];

test("sidebar SVG marks remain distinguishable in both themes", async ({
  page,
}) => {
  await page.goto("/");
  for (const theme of ["dark", "light"]) {
    await appearance(page, theme, "default");
    for (const selector of [
      ".sidebar-icon-archive img",
      ".sidebar-icon-skill img",
      ".sidebar-icon-workflow img",
      ".sidebar .brand [data-brand-logo]",
    ]) {
      const pixels = await page.locator(selector).evaluate(async (element) => {
        const img = element as HTMLImageElement;
        await img.decode();
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth * 4;
        canvas.height = img.naturalHeight * 4;
        const ctx = canvas.getContext("2d")!;
        ctx.filter = getComputedStyle(img).filter;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const counts = new Map<string, number>();
        for (let i = 0; i < rgba.length; i += 4) {
          if (rgba[i + 3] < 128) continue;
          const rgb = `rgb(${rgba[i]}, ${rgba[i + 1]}, ${rgba[i + 2]})`;
          counts.set(rgb, (counts.get(rgb) ?? 0) + rgba[i + 3]);
        }
        return {
          mark: [...counts].sort((a, b) => b[1] - a[1])[0]?.[0],
          bg: getComputedStyle(img.closest(".sidebar")!).backgroundColor,
        };
      });
      expect(pixels.mark).toBeTruthy();
      expect
        .soft(contrast(pixels.mark!, pixels.bg), `${theme} ${selector}`)
        .toBeGreaterThanOrEqual(3);
    }
  }
});

async function navigate(page: Page, name: string) {
  if (await page.locator(".sidebar.is-narrow.is-collapsed").count()) {
    await page.getByRole("button", { name: "展开侧边栏", exact: true }).click();
  }
  await page
    .locator(".sidebar")
    .getByRole("button", { name, exact: true })
    .click();
  await expect(page.locator(".catalog-page")).toBeVisible();
  // Narrow navigation is an overlay. Dismiss it through the public Escape
  // interaction before operating the underlying page.
  if (await page.locator(".sidebar.is-narrow:not(.is-collapsed)").count()) {
    await page.keyboard.press("Escape");
    await expect(page.locator(".sidebar")).toHaveClass(/is-collapsed/);
  }
}

for (const width of [390, 1920]) {
  test(`settings sections keep shared fields and reachable content at ${width}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : 844 });
    await page.goto("/");
    await page.emulateMedia({ reducedMotion: "reduce" });
    const opener = page.getByRole("button", { name: "打开设置", exact: true });
    await opener.click();
    const dialog = page.getByRole("dialog", { name: "设置" });
    for (const theme of ["dark", "light"]) {
      await appearance(page, theme, "default");
      for (const section of [
        "账号管理",
        "储存",
        "网络",
        "记忆",
        "模型供应商",
        "Skill",
        "MCP",
        "插件",
        "Comfy UI",
        "高级",
        "软件更新",
      ]) {
        await dialog
          .locator(".settings-nav")
          .getByRole("button", { name: section, exact: true })
          .click();
        const content = dialog.locator(".settings-content");
        await expect(content.locator("h2")).toHaveText(section);
        expect(
          await content.evaluate((el) => el.scrollWidth - el.clientWidth),
          `${theme}/${section} horizontal overflow`,
        ).toBeLessThanOrEqual(1);
        const fieldErrors = await content
          .locator('input:not([type="file"]):not([type="checkbox"]), select')
          .evaluateAll((elements) =>
            elements
              .filter((el) => el.getClientRects().length)
              .flatMap((el) => {
                const css = getComputedStyle(el);
                const expectedHeight =
                  innerWidth < 768
                    ? "44px"
                    : innerWidth <= 1200
                      ? "40px"
                      : "32px";
                return css.height === expectedHeight &&
                  css.borderRadius === "10px"
                  ? []
                  : [
                      {
                        label:
                          el.getAttribute("aria-label") ??
                          el.closest("label")?.textContent,
                        height: css.height,
                        radius: css.borderRadius,
                      },
                    ];
              }),
          );
        expect(fieldErrors, `${theme}/${section} shared fields`).toEqual([]);
        if (section === "MCP") {
          await expect(dialog.locator(".settings-mcp-add")).toHaveCSS(
            "border-radius",
            "28px",
          );
        }
        if (section === "插件") {
          await expect(dialog.locator(".plugin-manager-row").first()).toHaveCSS(
            "border-radius",
            "28px",
          );
          await page.screenshot({
            path: info.outputPath(`settings-plugins-${theme}-${width}.png`),
            animations: "disabled",
          });
        }
      }
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
  });
}
async function appearance(page: Page, theme: string, accent: string) {
  await page.evaluate(
    ({ theme, accent }) => {
      document.documentElement.dataset.theme = theme;
      document.documentElement.dataset.accent = accent;
    },
    { theme, accent },
  );
}
async function colors(control: Locator) {
  return control.evaluate((element) => {
    const style = getComputedStyle(element);
    let parent: Element | null = element;
    let background = style.backgroundColor;
    while (parent && /rgba\([^)]*,\s*0\)/.test(background)) {
      parent = parent.parentElement;
      if (parent) background = getComputedStyle(parent).backgroundColor;
    }
    return { text: style.color, background };
  });
}

for (const theme of ["dark", "light"]) {
  test(`${theme}: catalog contract reaches real pages and all accent consumers`, async ({
    page,
  }, info) => {
    test.setTimeout(60000);
    await page.goto("/");
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const name of pages) {
      await navigate(page, name);
      const section = page.locator(".catalog-page");
      await expect.soft(section.locator("h1")).toHaveCSS("font-size", "24px");
      await expect
        .soft(section.locator(".catalog-page-search"))
        .toHaveCSS("height", "32px");
      await expect
        .soft(section.locator(".catalog-page-search"))
        .toHaveCSS("border-radius", "10px");
      const cards = section.locator(
        ".catalog-card, .project-library-card, .project-library-action",
      );
      expect(await cards.count()).toBeGreaterThan(0);
      await expect.soft(cards.first()).toHaveCSS("border-radius", "28px");
      for (const accent of ACCENTS) {
        await page.mouse.move(0, 0);
        await appearance(page, theme, accent);
        const token = themeTokens(theme, accent);
        const primary = section
          .locator(".catalog-page-actions .primary-button")
          .first();
        await expect(primary).toHaveCSS(
          "background-color",
          cssRgb(token("--bg-accent")),
        );
        await expect(primary).toHaveCSS(
          "color",
          cssRgb(token("--text-on-accent")),
        );
        await primary.hover();
        await expect(primary).toHaveCSS(
          "background-color",
          cssRgb(token("--bg-accent-hover")),
        );
        const painted = await colors(primary);
        expect(
          contrast(painted.text, painted.background),
        ).toBeGreaterThanOrEqual(4.5);
        const search = section.locator(".catalog-page-search input");
        await search.focus();
        const field = await colors(search);
        expect(contrast(field.text, field.background)).toBeGreaterThanOrEqual(
          4.5,
        );
        await expect(section.locator(".catalog-page-search")).toHaveCSS(
          "background-color",
          cssRgb(token("--bg-input")),
        );
        if (name === "Skill") {
          const filter = section.locator(".catalog-categories button").first();
          const selected = await filter.evaluate((el) => ({
            border: getComputedStyle(el).borderColor,
            shadow: getComputedStyle(el).boxShadow,
          }));
          expect(
            contrast(selected.border, token("--bg-app")),
            `${theme}/${accent} selected boundary`,
          ).toBeGreaterThanOrEqual(3);
          expect(selected.shadow).toContain("inset");
        }
      }
      if (name === "Skill") {
        const filter = section.locator(".catalog-categories button").first();
        await expect.soft(filter).toHaveAttribute("aria-pressed", "true");
        await expect.soft(filter).toHaveCSS("border-radius", "999px");
        await expect
          .soft(filter)
          .toHaveCSS(
            "background-color",
            cssRgb(themeTokens(theme, "white")("--bg-accent-soft")),
          );
      }
      await page.screenshot({
        path: info.outputPath(`${theme}-${name}.png`),
        animations: "disabled",
      });
    }
  });
}

for (const width of [390, 768, 1920]) {
  test(`catalog search and actions remain reachable at ${width}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : 844 });
    await page.goto("/");
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const name of pages) {
      await navigate(page, name);
      const section = page.locator(".catalog-page");
      const search = section.locator(".catalog-page-search input");
      await search.fill("没有匹配的很长中文名称-with-a-long-identifier");
      await search.fill("");
      expect(
        await section.evaluate((el) => el.scrollWidth - el.clientWidth),
      ).toBeLessThanOrEqual(1);
      for (const action of await section
        .locator(".catalog-page-actions button")
        .all()) {
        const box = (await action.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
      }
      await page.screenshot({
        path: info.outputPath(`${width}-${name}.png`),
        animations: "disabled",
      });
    }
  });
}

for (const width of [390, 1920]) {
  test(`Skill editor fields, save, cancel and focus at ${width}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : 844 });
    await page.goto("/");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await navigate(page, "Skill");
    const opener = page.getByRole("button", {
      name: "新建本地 Skill",
      exact: true,
    });
    await opener.click();
    const dialog = page.getByRole("dialog", { name: "编辑本地 Skill" });
    await expect.soft(dialog).toHaveCSS("border-radius", "20px");
    for (const input of await dialog.locator("input").all()) {
      await expect.soft(input).toHaveCSS("height", "32px");
      await expect.soft(input).toHaveCSS("border-radius", "10px");
    }
    await dialog
      .getByLabel("ID", { exact: true })
      .fill(`design-system-${width}`);
    await dialog
      .getByLabel("名称", { exact: true })
      .fill("设计系统测试：长中文名称与英文-identifier");
    await dialog
      .getByLabel("描述", { exact: true })
      .fill("验证本地编辑和保存，不调用外部服务");
    const longCategory = "W".repeat(80);
    await dialog.getByLabel("分类", { exact: true }).fill(longCategory);
    await dialog
      .getByLabel("指令文本", { exact: true })
      .fill("保留输入，检查焦点和取消行为。");
    await dialog
      .getByRole("button", { name: "保存 Skill", exact: true })
      .scrollIntoViewIfNeeded();
    expect(
      await dialog.evaluate((el) => el.scrollWidth - el.clientWidth),
    ).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: info.outputPath(`skill-editor-${width}.png`),
      animations: "disabled",
    });
    await dialog
      .getByRole("button", { name: "保存 Skill", exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
    await opener.click();
    await dialog.getByLabel("名称", { exact: true }).fill("取消的草稿");
    await dialog.getByRole("button", { name: "取消", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
    await opener.click();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
    await page.reload();
    await navigate(page, "Skill");
    const category = page
      .getByRole("group", { name: "Skill分类", exact: true })
      .getByRole("button", { name: longCategory, exact: true });
    await category.scrollIntoViewIfNeeded();
    await expect(category).toBeVisible();
    const categoryBox = (await category.boundingBox())!;
    expect(categoryBox.x + categoryBox.width).toBeLessThanOrEqual(width + 1);
    expect(
      await page
        .locator(".catalog-page")
        .evaluate((el) => el.scrollWidth - el.clientWidth),
    ).toBeLessThanOrEqual(1);
    await category.click();
    await expect(category).toHaveAttribute("aria-pressed", "true");
    await page
      .getByRole("group", { name: "Skill分类", exact: true })
      .getByRole("button", { name: "全部", exact: true })
      .click();
    await expect(
      page.locator(".catalog-card").filter({
        hasText: "设计系统测试：长中文名称与英文-identifier",
      }),
    ).toBeVisible();
    await expect(
      page.locator(".catalog-card").filter({ hasText: "取消的草稿" }),
    ).toHaveCount(0);
  });
}
