import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import {
  ACCENTS,
  contrast,
  cssRgb,
  themeTokens,
} from "../helpers/designSystem.ts";

test("Figma controls retain readable disabled colors and paired compact typography", async ({
  page,
}, info) => {
  await page.goto("/");
  for (const theme of ["dark", "light"]) {
    await page
      .getByRole("combobox", { name: "主题", exact: true })
      .selectOption(theme);
    const compact = page.getByRole("button", {
      name: "次动作示例",
      exact: true,
    });
    await expect(compact).toHaveCSS("font-size", "12px");
    await expect(compact).toHaveCSS("line-height", "16px");
    await expect(compact).toHaveCSS("height", "32px");
    const legacy = page.getByRole("button", {
      name: "兼容禁用动作示例",
      exact: true,
    });
    await expect(legacy).toHaveCSS("font-size", "12px");
    await expect(legacy).toHaveCSS("line-height", "16px");
    await expect(legacy).toHaveCSS("opacity", "1");
    await expect(legacy).toHaveCSS("pointer-events", "auto");
    await expect(legacy).toHaveAttribute("title", "未连接服务");
    const input = page.getByRole("textbox", {
      name: "输入框示例",
      exact: true,
    });
    await expect(input).toHaveCSS("height", "32px");
    await expect(input).toHaveCSS("font-size", "12px");
    await expect(input).toHaveCSS("line-height", "16px");
    const primary = page.getByRole("button", {
      name: "主动作示例",
      exact: true,
    });
    await expect(primary).toHaveCSS("font-size", "16px");
    await expect(primary).toHaveCSS("line-height", "24px");
    await expect(primary).toHaveCSS("height", "40px");
    const disabled = page.getByRole("button", {
      name: "禁用动作示例",
      exact: true,
    });
    await expect(disabled).toHaveCSS("opacity", "1");
    await expect(disabled).toHaveCSS("border-top-width", "1px");
    await expect(disabled).toHaveCSS(
      "color",
      cssRgb(themeTokens(theme, "default")("--kk-text-tertiary")),
    );
    await expect(disabled).toHaveCSS(
      "background-color",
      cssRgb(themeTokens(theme, "default")("--kk-bg-card")),
    );
    const colors = await disabled.evaluate((element) => {
      const style = getComputedStyle(element);
      return { text: style.color, background: style.backgroundColor };
    });
    expect(contrast(colors.text, colors.background)).toBeGreaterThanOrEqual(3);
    if (theme === "light")
      await expect(primary).toHaveCSS("color", "rgb(242, 242, 242)");
    await page.screenshot({
      path: info.outputPath(`controls-${theme}.png`),
      fullPage: true,
    });
  }
});

test("shared state samples cover default, hover, active, selected, disabled and focus", async ({
  page,
}, info) => {
  await page.goto("/");
  const control = page.getByRole("button", {
    name: "选择状态示例",
    exact: true,
  });
  for (const theme of ["dark", "light"]) {
    await page
      .getByRole("combobox", { name: "主题", exact: true })
      .selectOption(theme);
    const token = themeTokens(theme, "default");
    await page.mouse.move(0, 0);
    await expect(control).toHaveAttribute("aria-pressed", "false");
    await expect(control).toHaveCSS(
      "background-color",
      cssRgb(token("--kk-bg-card")),
    );
    await control.hover();
    await expect(control).toHaveCSS(
      "background-color",
      cssRgb(token("--kk-bg-elevated")),
    );
    await page.mouse.down();
    await expect(control).toHaveCSS(
      "background-color",
      cssRgb(token("--kk-neutral-selected")),
    );
    await page.mouse.up();
    await page.mouse.move(0, 0);
    await expect(control).toHaveAttribute("aria-pressed", "true");
    await expect(control).toHaveCSS(
      "background-color",
      cssRgb(token("--kk-neutral-selected")),
    );
    const colors = await control.evaluate((element) => ({
      background: getComputedStyle(element).backgroundColor,
      text: getComputedStyle(element).color,
    }));
    expect(contrast(colors.text, colors.background)).toBeGreaterThanOrEqual(
      4.5,
    );
    await control.click();
    await expect(control).toHaveAttribute("aria-pressed", "false");
    await control.focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    await expect(control).toHaveCSS("outline-style", "solid");
    await expect(control).toHaveCSS(
      "outline-color",
      cssRgb(token("--kk-focus-ring")),
    );
  }
  const disabled = page.getByRole("switch", {
    name: "禁用开关示例",
    exact: true,
  });
  await expect(disabled).toBeDisabled();
  await expect(disabled).toHaveAttribute("aria-disabled", "true");
  await expect(disabled).toHaveAccessibleDescription(/未连接服务/);
  await page.screenshot({
    path: info.outputPath("shared-states.png"),
    fullPage: true,
  });
});

test("continuous resize retains preview choices, input, selection and switch edge geometry", async ({
  page,
}, info) => {
  await page.goto("/");
  await page
    .getByRole("combobox", { name: "主题", exact: true })
    .selectOption("light");
  await page
    .getByRole("combobox", { name: "强调色", exact: true })
    .selectOption("purple");
  await page
    .getByRole("combobox", { name: "密度", exact: true })
    .selectOption("compact");
  const input = page.getByRole("textbox", { name: "输入框示例", exact: true });
  await input.fill("保留草稿 draft");
  const selected = page.getByRole("button", {
    name: "选择状态示例",
    exact: true,
  });
  await selected.click();
  const toggle = page.getByRole("switch", {
    name: "共享开关示例",
    exact: true,
  });
  await toggle.click();
  for (const width of [1920, 1099, 767, 480, 390, 900, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(input).toHaveValue("保留草稿 draft");
    await expect(selected).toHaveAttribute("aria-pressed", "true");
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    for (const [name, value] of [
      ["主题", "light"],
      ["强调色", "purple"],
      ["密度", "compact"],
    ])
      await expect(
        page.getByRole("combobox", { name, exact: true }),
      ).toHaveValue(value);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
    await expect
      .poll(() =>
        toggle.evaluate((element) => {
          const outer = element.getBoundingClientRect();
          const thumb = element.querySelector("span")!.getBoundingClientRect();
          return outer.right - thumb.right;
        }),
      )
      .toBeCloseTo(4, 0);
  }
  await page.screenshot({
    path: info.outputPath("resize-retained-state.png"),
    fullPage: true,
  });
});

test("preview consumes real themes and accents without touching product storage", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("preview must not read storage");
    };
    Storage.prototype.setItem = () => {
      throw new Error("preview must not write storage");
    };
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "设计规范预览", exact: true }),
  ).toBeVisible();
  const browserSession = await page.context().browser()!.newBrowserCDPSession();
  const command = await browserSession.send("Browser.getBrowserCommandLine");
  const featureSwitches = command.arguments.filter((arg: string) =>
    arg.startsWith("--disable-features="),
  );
  expect(featureSwitches).toHaveLength(1);
  expect(featureSwitches[0]).toContain("msWindowTabManagerPublic");
  expect(featureSwitches[0]).toContain("ThirdPartyStoragePartitioning");
  await browserSession.detach();
  for (const theme of ["dark", "light"]) {
    await page
      .getByRole("combobox", { name: "主题", exact: true })
      .selectOption(theme);
    for (const accent of ACCENTS) {
      await page
        .getByRole("combobox", { name: "强调色", exact: true })
        .selectOption(accent);
      const token = themeTokens(theme, accent);
      await expect(page.getByTestId("color-surface")).toHaveCSS(
        "background-color",
        cssRgb(token("--kk-bg-surface")),
      );
      await expect(page.getByTestId("color-accent")).toHaveCSS(
        "background-color",
        cssRgb(token("--kk-accent")),
      );
      await expect(
        page.getByRole("button", { name: "主动作示例", exact: true }),
      ).toHaveCSS("background-color", cssRgb(token("--kk-button-primary-bg")));
      await expect(
        page.getByRole("button", { name: "主动作示例", exact: true }),
      ).toHaveCSS("color", cssRgb(token("--kk-button-primary-text")));
      await expect(page.getByTestId("color-accent-value")).toHaveText(
        token("--kk-accent"),
      );
    }
  }
  await page
    .getByRole("combobox", { name: "密度", exact: true })
    .selectOption("comfortable");
  await expect(page.getByTestId("density-sample")).toHaveCSS("padding", "16px");
  await page
    .getByRole("combobox", { name: "密度", exact: true })
    .selectOption("compact");
  await expect(page.getByTestId("density-sample")).toHaveCSS("padding", "12px");
  await expect(page.getByTestId("type-body")).toHaveCSS("font-size", "16px");
  await expect(page.getByTestId("spacing-4")).toHaveCSS("width", "16px");
  await expect(page.getByTestId("radius-control")).toHaveCSS(
    "border-radius",
    "8px",
  );
  expect(errors).toEqual([]);
});

test("shared controls keep capsule, square, disabled, switch and keyboard contracts", async ({
  page,
}) => {
  await page.goto("/");
  const primary = page.getByRole("button", { name: "主动作示例", exact: true });
  await expect(primary).toHaveCSS("border-radius", "1000px");
  const icon = page.getByRole("button", { name: "图标动作示例", exact: true });
  await expect(icon).toHaveCSS("border-radius", "8px");
  const rect = (await icon.boundingBox())!;
  expect(rect.width).toBe(rect.height);
  await expect(
    page.getByRole("button", { name: "禁用动作示例", exact: true }),
  ).toBeDisabled();
  const toggle = page.getByRole("switch", {
    name: "共享开关示例",
    exact: true,
  });
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await page.getByRole("combobox", { name: "主题", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("combobox", { name: "强调色", exact: true }),
  ).toBeFocused();
  await primary.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(primary).toBeFocused();
  await expect(primary).toHaveCSS("outline-style", "solid");
  await primary.click();
  await expect(page.getByRole("status", { name: "操作反馈" })).toContainText(
    "主动作示例已触发",
  );
});

test("DESIGN.md remains literal source and explains the editor preview workflow", async ({
  page,
}) => {
  await page.goto("/");
  const source = readFileSync(
    new URL("../../DESIGN.md", import.meta.url),
    "utf8",
  );
  expect(await page.getByTestId("design-source").textContent()).toBe(source);
  await expect(page.getByTestId("design-source").locator("*")).toHaveCount(0);
  await expect(
    page.getByText(
      "在 IDE 或 Codex 编辑器中修改 DESIGN.md；开发预览会自动刷新。构建预览需重新构建。",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "DESIGN.md" })).toHaveCount(0);
});

for (const width of [390, 1099, 1920]) {
  test(`preview remains readable without horizontal overflow at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
    for (const label of ["主题", "强调色", "密度"]) {
      const control = page.getByRole("combobox", { name: label, exact: true });
      const box = (await control.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
    }
    await info.attach("runtime-geometry", {
      contentType: "application/json",
      body: JSON.stringify(
        await page.evaluate(() => ({
          url: location.href,
          runtimeMode: document
            .querySelector("main")
            ?.getAttribute("data-runtime-mode"),
          scripts: [...document.scripts].map((script) => script.src),
          viewport: { width: innerWidth, height: innerHeight },
          controls: [...document.querySelectorAll("select, button, input")].map(
            (element) => {
              const bounds = element.getBoundingClientRect();
              const style = getComputedStyle(element);
              return {
                name:
                  element.getAttribute("aria-label") ??
                  element.textContent?.trim(),
                x: bounds.x,
                y: bounds.y,
                width: bounds.width,
                height: bounds.height,
                fontSize: style.fontSize,
                borderRadius: style.borderRadius,
              };
            },
          ),
        })),
      ),
    });
    await page.screenshot({
      path: info.outputPath(`preview-${width}.png`),
      fullPage: true,
    });
  });
}
