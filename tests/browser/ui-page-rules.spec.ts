import {
  expect,
  test,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";
import {
  CREATION_STORAGE_KEY,
  emptySnapshot,
} from "../../src/features/creation/model";
import { stageProject } from "../fixtures/stage-project";
import { expandSidebar, openSettingsSection } from "./helpers";

async function inspectPage(
  page: Page,
  root: Locator,
  name: string,
  info: TestInfo,
) {
  await expect(root).toBeVisible();
  const metrics = await root.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const visible = (item: Element): boolean => {
      const box = item.getBoundingClientRect();
      const style = getComputedStyle(item);
      return Boolean(
        item.getClientRects().length &&
        style.visibility !== "hidden" &&
        box.bottom > Math.max(0, bounds.top) &&
        box.top < Math.min(innerHeight, bounds.bottom) &&
        box.right > bounds.left &&
        box.left < bounds.right,
      );
    };
    const label = (item: Element) =>
      item.getAttribute("aria-label") || item.textContent?.trim().slice(0, 65);
    const text = [...element.querySelectorAll("*")]
      .filter(
        (item) =>
          visible(item) &&
          [...item.childNodes].some(
            (node) =>
              node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
          ),
      )
      .map((item) => ({
        label: label(item),
        font: parseFloat(getComputedStyle(item).fontSize),
        className: item.className,
      }));
    const controls = [
      ...element.querySelectorAll(
        ".ui-button,.primary-button,.kk-button,.settings-action",
      ),
    ]
      .filter(visible)
      .map((item) => ({
        label: label(item),
        height: parseFloat(getComputedStyle(item).height),
        radius: getComputedStyle(item).borderRadius,
      }));
    const primary = [
      ...element.querySelectorAll(".primary-button,.kk-button--primary"),
    ]
      .filter(visible)
      .map(label);
    return {
      text,
      controls,
      primary,
      bounds: {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      },
      url: location.href,
      scripts: [...document.scripts]
        .map((script) => script.src)
        .filter(Boolean),
      styles: [...document.styleSheets]
        .map((sheet) => sheet.href)
        .filter(Boolean),
    };
  });
  await info.attach(name, {
    body: JSON.stringify(metrics, null, 2),
    contentType: "application/json",
  });
  await page.screenshot({ path: info.outputPath(`${name}.png`) });
  expect(
    metrics.text.filter((item) => item.font < 12),
    "所有可见文字至少 12px",
  ).toEqual([]);
  expect(
    metrics.controls.filter(
      (item) =>
        ![24, 32, 40].some((height) => Math.abs(item.height - height) < 1),
    ),
    "标准动作遵循 24/32/40 高度",
  ).toEqual([]);
  expect(metrics.primary.length, "页面只有一个 Primary").toBeLessThanOrEqual(1);
  expect(metrics.bounds.x).toBeGreaterThanOrEqual(0);
  expect(metrics.bounds.x + metrics.bounds.width).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  await expect(
    page.locator('[data-runtime-entry="src/main.tsx"]'),
  ).toHaveAttribute("data-runtime-mode", "production");
  expect(new URL(page.url()).port).toBe("1423");
}

for (const width of [390, 1920]) {
  test(`模型设置与资源页遵循现行 UI 规则 ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
    await page.goto("/");
    await openSettingsSection(page, "模型供应商");
    await inspectPage(
      page,
      page.getByRole("dialog", { name: "设置" }),
      "model-settings",
      info,
    );
    await page
      .getByRole("button", { name: "保存", exact: true })
      .scrollIntoViewIfNeeded();
    await inspectPage(
      page,
      page.getByRole("dialog", { name: "设置" }),
      "model-actions",
      info,
    );
    await page.getByRole("radio", { name: /Gemini CLI 账号/ }).check();
    await inspectPage(
      page,
      page.getByRole("dialog", { name: "设置" }),
      "google-cli",
      info,
    );
    await page.getByRole("button", { name: "关闭设置", exact: true }).click();
    if (width < 768) {
      await page
        .getByRole("button", { name: "应用功能菜单", exact: true })
        .click();
      await page
        .getByRole("menuitem", { name: "资产管理", exact: true })
        .click();
    } else {
      await page.getByRole("button", { name: "文件", exact: true }).click();
      await page
        .locator(".menu-popover")
        .getByRole("button", { name: "资产管理", exact: true })
        .click();
    }
    await inspectPage(
      page,
      page.locator(".asset-panel"),
      "asset-library",
      info,
    );
    await page.getByRole("tab", { name: "资产", exact: true }).click();
    await inspectPage(
      page,
      page.locator(".asset-panel"),
      "asset-actions",
      info,
    );
  });

  test(`阶段计划工作台遵循现行 UI 规则 ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
    const project = stageProject();
    await page.goto("/");
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
      key: CREATION_STORAGE_KEY,
      value: JSON.stringify({
        ...emptySnapshot(),
        revision: Date.now(),
        activeProjectId: project.id,
        projects: [project],
      }),
    });
    await page.reload();
    if (width >= 768) await expandSidebar(page);
    await page.getByRole("button", { name: "项目库", exact: true }).click();
    await page
      .locator(".project-library-card")
      .filter({ hasText: project.name })
      .click();
    await page.getByRole("button", { name: "打开任务列表" }).click();
    await page.getByRole("button", { name: "打开任务工作台" }).click();
    for (const tab of [
      "Queue",
      "Prompt",
      "Generate",
      "Review",
      "Export",
      "Plan",
    ]) {
      await page.getByRole("tab", { name: tab, exact: true }).click();
      await inspectPage(
        page,
        page.getByTestId("task-workbench"),
        `workbench-${tab.toLowerCase()}`,
        info,
      );
    }
  });
}
