import { expect, test, type Locator } from "@playwright/test";
import { readFileSync } from "node:fs";
import { openWorkspace } from "./helpers";

// Account attachments deduplicate by original bytes, so layout needs distinct images.
const pngFixtures = [
  "../../public/fixtures/demo/blue-hour.png",
  "../../public/design/figma/timer-start.png",
  "../../public/design/figma/task-placeholder-running.png",
  "../../public/design/figma/task-placeholder-complete.png",
].map((file) => readFileSync(new URL(file, import.meta.url)));
async function assertFlow(form: Locator) {
  const input = await form.locator("textarea").boundingBox();
  const attachments = await form.locator(".start-attachment-row").boundingBox();
  const actions = await form
    .locator("[data-node-id='407:29315'], .start-composer-footer")
    .boundingBox();
  const attachmentGap = (await form.getAttribute("class"))?.includes(
    "chat-composer",
  )
    ? 0
    : 7;
  expect(attachments!.y).toBeGreaterThanOrEqual(
    input!.y + input!.height + attachmentGap,
  );
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
  await page.addInitScript(() => {
    localStorage.setItem(
      "kk-studio-next:provider-connections:v1",
      JSON.stringify(
        Array.from({ length: 20 }, (_, index) => ({
          id: `scroll-provider-${index}`,
          provider: `Scroll API ${index}`,
          displayName: `Scroll API ${index}`,
          kind: "user_byok",
          baseUrl: "https://scroll.example.test/v1",
          credentialRef: `scroll-${index}`,
          model: `image-scroll-${index}`,
          state: "active",
          concurrencyLimit: 1,
          capabilities: {
            modalities: ["image"],
            operations: ["generate"],
            async: false,
          },
        })),
      ),
    );
  });
  await openWorkspace(page);
  if (
    await page
      .getByRole("button", { name: "打开对话", exact: true })
      .isVisible()
  )
    await page.getByRole("button", { name: "打开对话", exact: true }).click();
  await page.getByRole("button", { name: "模型", exact: true }).click();
  const menu = page.getByRole("menu", { name: "选择模型", exact: true });
  await menu.getByRole("tab", { name: "中转 API", exact: true }).click();
  const list = menu.locator(".kk-model-menu-list");
  expect(await list.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(
    true,
  );
  const retained = await list.evaluate((el) => {
    el.scrollTop = 100;
    return new Promise<number>((resolve) =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => resolve(el.scrollTop)),
      ),
    );
  });
  expect(retained).toBeGreaterThan(0);
  await menu.getByRole("button", { name: "模型接入…", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "设置", exact: true }),
  ).toBeVisible();
});

test("phone menus leave all composer actions reachable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const form = page.locator(".start-composer");
  await form.locator("textarea").fill("菜单切换保持草稿");
  for (const name of ["模型", "扩展", /^当前模式：/]) {
    const trigger = form.getByRole("button", { name, exact: true });
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    const hits = await form
      .locator(".composer-toolbar button")
      .evaluateAll((buttons) =>
        buttons
          .filter(
            (el) =>
              !el.closest('[role="menu"], [role="dialog"]') &&
              el.getClientRects().length,
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
      buffer: pngFixtures[i],
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
  test(`composer keeps the Figma fixed text region and one focus boundary at ${width}`, async ({
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
        path: test
          .info()
          .outputPath(`input-contract/${width}-${kind}-focused.png`),
      });
      await expect(input).toHaveCSS("outline-style", "none");
      await expect(form).toHaveCSS("outline-style", "none");
      await expect(form).toHaveCSS("border-width", "1px");
      const focus = await form.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          outlineStyle: style.outlineStyle,
          borderWidth: style.borderWidth,
          boxShadow: style.boxShadow,
          filter: style.filter,
          subtleColor: style.getPropertyValue("--ui-focus-subtle").trim(),
        };
      });
      expect(focus.subtleColor).not.toBe("");
      expect(focus.outlineStyle).toBe("none");
      expect(focus.borderWidth).toBe("1px");
      expect(focus.boxShadow).toBe("none");
      expect(focus.filter).toBe("none");
      const initial = (await input.boundingBox())!.height;
      const toolbarBox = await form.locator(".composer-toolbar").boundingBox();
      expect(toolbarBox!.height).toBeGreaterThanOrEqual(32);
      await input.fill(
        Array.from({ length: 6 }, (_, i) => `第 ${i + 1} 行输入`).join("\n"),
      );
      if (kind === "start") {
        await expect
          .poll(async () => (await input.boundingBox())!.height)
          .toBeGreaterThan(initial + 30);
      } else {
        expect((await input.boundingBox())!.height).toBe(initial);
      }
      await input.fill("连续的中文输入与长内容\n".repeat(25));
      if (kind === "start") {
        await expect
          .poll(async () => (await input.boundingBox())!.height)
          .toBeLessThanOrEqual(width <= 1200 ? 192 : 160);
      } else {
        expect((await input.boundingBox())!.height).toBe(initial);
      }
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
          buffer: pngFixtures[i],
        })),
      );
      // This lookup deliberately includes the home list before the flow correction.
      const region = page.getByLabel("已添加的参考素材", { exact: true });
      await expect(region.locator(".start-attachment-chip")).toHaveCount(4);
      await page.screenshot({
        path: test
          .info()
          .outputPath(`input-contract/${width}-${kind}-attachments.png`),
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
