import { expect, test, type Locator } from "@playwright/test";
import { openWorkspace } from "./helpers";

const evidence = "docs/changes/2026-09-23-input-contract/evidence";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
  "base64",
);
async function assertFlow(form: Locator) {
  const input = await form.locator("textarea").boundingBox();
  const attachments = await form.locator(".start-attachment-row").boundingBox();
  const actions = await form
    .locator("[data-node-id='407:29315'], .start-composer-footer")
    .boundingBox();
  expect(attachments!.y).toBeGreaterThanOrEqual(input!.y + input!.height + 7);
  expect(actions!.y).toBeGreaterThanOrEqual(
    attachments!.y + attachments!.height + 7,
  );
}
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("short-screen model menu keeps its scroll position and opens the last action", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 480 });
  await openWorkspace(page);
  if (
    await page
      .getByRole("button", { name: "打开对话", exact: true })
      .isVisible()
  )
    await page.getByRole("button", { name: "打开对话", exact: true }).click();
  await page.getByRole("button", { name: "模型", exact: true }).click();
  const menu = page.getByRole("menu", { name: "选择模型", exact: true });
  const retained = await menu.evaluate(
    (el) =>
      new Promise<number>((resolve) => {
        el.addEventListener(
          "scroll",
          () =>
            requestAnimationFrame(() =>
              requestAnimationFrame(() => resolve(el.scrollTop)),
            ),
          { once: true },
        );
        el.scrollTop = 100;
      }),
  );
  expect(retained).toBeGreaterThan(0);
  await menu
    .getByRole("button", { name: "配置供应商与账号…", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "设置", exact: true }),
  ).toBeVisible();
});

test("phone menus leave all composer actions reachable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const form = page.locator(".start-composer");
  await form.locator("textarea").fill("菜单切换保持草稿");
  for (const name of ["模型", "Skill", "插件", /^当前模式：/]) {
    const trigger = form.getByRole("button", { name, exact: true });
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    const hits = await form
      .locator(".composer-toolbar button")
      .evaluateAll((buttons) =>
        buttons
          .filter(
            (el) => !el.closest('[role="menu"]') && el.getClientRects().length,
          )
          .map((el) => {
            const box = el.getBoundingClientRect();
            return {
              name: el.getAttribute("aria-label") || el.textContent,
              hit: el.contains(
                document.elementFromPoint(
                  box.x + box.width / 2,
                  box.y + box.height / 2,
                ),
              ),
            };
          }),
      );
    for (const hit of hits) expect(hit.hit, String(hit.name)).toBe(true);
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
  }
  await expect(form.locator("textarea")).toHaveValue("菜单切换保持草稿");
});

test("growing the home input keeps the discovery section below the entire form", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page
    .getByLabel("创作提示词", { exact: true })
    .fill("较长创意和补充条件\n".repeat(20));
  await page.locator('.start-composer input[type="file"]').setInputFiles(
    Array.from({ length: 4 }, (_, i) => ({
      name: `素材-${i}.png`,
      mimeType: "image/png",
      buffer: png,
    })),
  );
  await expect(page.locator(".start-attachment-chip")).toHaveCount(4);
  const hero = (await page.locator(".start-hero").boundingBox())!;
  const discovery = (await page.locator(".start-discovery").boundingBox())!;
  expect(discovery.y).toBeGreaterThanOrEqual(hero.y + hero.height + 24);
});

for (const [width, height] of [
  [390, 844],
  [834, 1112],
  [1440, 900],
]) {
  test(`composer text grows and has one focus boundary at ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    for (const kind of ["start", "chat"]) {
      if (kind === "chat") {
        await openWorkspace(page);
        if (
          await page
            .getByRole("button", { name: "打开对话", exact: true })
            .isVisible()
        )
          await page
            .getByRole("button", { name: "打开对话", exact: true })
            .click();
        await page.getByLabel("执行方式").selectOption("direct");
      }
      const form = page.locator(`.${kind}-composer`);
      const input = form.locator("textarea");
      await input.fill("输入框的文字与工具各自对齐");
      await form.screenshot({
        path: `${evidence}/${width}-${kind}-focused.png`,
      });
      await expect(input).toHaveCSS("outline-style", "none");
      await expect(form).toHaveCSS("outline-width", "2px");
      const initial = (await input.boundingBox())!.height;
      if (kind === "start" && width >= 768)
        expect(
          (await form.locator(".composer-toolbar").boundingBox())!.height,
        ).toBe(width <= 1200 ? 44 : 32);
      await input.fill(
        Array.from({ length: 6 }, (_, i) => `第 ${i + 1} 行输入`).join("\n"),
      );
      expect((await input.boundingBox())!.height).toBeGreaterThan(initial + 30);
      await input.fill("连续的中文输入与长内容\n".repeat(25));
      expect((await input.boundingBox())!.height).toBeLessThanOrEqual(
        width <= 1200 ? 192 : 160,
      );
      expect(
        await input.evaluate((el) => el.scrollHeight > el.clientHeight),
      ).toBe(true);
      await input.fill("草稿保持");
      expect((await input.boundingBox())!.height).toBe(initial);
      await form.getByRole("button", { name: "模型", exact: true }).click();
      await page.keyboard.press("Escape");
      await expect(
        form.getByRole("button", { name: "模型", exact: true }),
      ).toBeFocused();
      await expect(form).toHaveCSS("outline-style", "none");
      await expect(input).toHaveValue("草稿保持");
    }
  });

  test(`attachments occupy space and stay removable at ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    for (const kind of ["start", "chat"]) {
      if (kind === "chat") {
        await openWorkspace(page);
        if (
          await page
            .getByRole("button", { name: "打开对话", exact: true })
            .isVisible()
        )
          await page
            .getByRole("button", { name: "打开对话", exact: true })
            .click();
        await page.getByLabel("执行方式").selectOption("direct");
      }
      const form = page.locator(`.${kind}-composer`);
      await form.locator("textarea").fill("保留多行草稿\n".repeat(5));
      await form.locator('input[type="file"]').setInputFiles(
        Array.from({ length: 4 }, (_, i) => ({
          name: `参考素材-${i}-一个很长的文件名.png`,
          mimeType: "image/png",
          buffer: png,
        })),
      );
      // This lookup deliberately includes the home list before the flow correction.
      const region = page.getByLabel("已添加的参考素材", { exact: true });
      await expect(region.locator(".start-attachment-chip")).toHaveCount(4);
      await page.screenshot({
        path: `${evidence}/${width}-${kind}-attachments.png`,
      });
      await expect(form.locator(".start-attachment-row")).toHaveCount(1);
      await assertFlow(form);
      await form
        .getByRole("button", {
          name: "移除素材 参考素材-2-一个很长的文件名.png",
          exact: true,
        })
        .click();
      await expect(region.locator(".start-attachment-chip")).toHaveCount(3);
      await expect(form.locator("textarea")).toHaveValue(
        "保留多行草稿\n".repeat(5),
      );
      while (await region.getByRole("button").count())
        await region.getByRole("button").first().click();
      await expect(form.locator(".start-attachment-row")).toHaveCount(0);
    }
  });
}
