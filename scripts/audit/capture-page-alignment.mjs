import fs from "node:fs/promises";
import path from "node:path";
import { expect } from "@playwright/test";

// This matrix uses actual app navigation and isolated runtime data. Figma
// measurements cover shells; example data and unsupported states are recorded
// separately instead of fabricating a matching account/provider response.
export async function capturePageAlignment(page, evidence, mode) {
  const states = [];
  const button = (name) => page.getByRole("button", { name, exact: true });
  const close = async () => {
    await page.keyboard.press("Escape");
    await expect(page.locator("dialog[open]")).toHaveCount(0);
  };
  const capture = async (id, selector, figma = null) => {
    await page.evaluate(() => document.fonts.ready);
    const target = page.locator(selector);
    await expect(target).toBeVisible();
    const geometry = await target.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const css = getComputedStyle(el);
      return {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        background: css.backgroundColor,
        radius: css.borderRadius,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        controls: [...el.querySelectorAll("button,input,select,textarea")]
          .filter((control) => control.getClientRects().length)
          .map((control) => ({
            name:
              control.getAttribute("aria-label") || control.textContent.trim(),
            disabled: control.disabled,
          })),
      };
    });
    const screenshot = `screenshots/${mode}-${id}.png`;
    await target.screenshot({ path: path.join(evidence, screenshot) });
    states.push({ id, selector, figma, geometry, screenshot });
    await fs.writeFile(
      path.join(evidence, `runtime/${mode}-page-matrix-progress.json`),
      JSON.stringify(states, null, 2) + "\n",
    );
    expect(
      geometry.scrollWidth,
      `${id}: horizontal overflow`,
    ).toBeLessThanOrEqual(geometry.clientWidth + 1);
  };
  await button("开始创作").click();
  await capture("landing", ".start-page");
  for (const [label, id] of [
    ["项目库", "projects"],
    ["Skill", "skills"],
    ["ComfyUI 工作流", "comfyui"],
  ]) {
    await page
      .locator(".primary-nav")
      .getByRole("button", { name: label, exact: true })
      .click();
    await capture(id, ".catalog-page");
  }
  await button("打开设置").click();
  const sections = await page.locator(".settings-nav-item").allTextContents();
  for (let index = 0; index < sections.length; index++) {
    await page.locator(".settings-nav-item").nth(index).click();
    await capture(
      `settings-${index}`,
      ".settings-panel",
      index === 0 ? "399:27506" : null,
    );
  }
  await close();
  await button("搜索").click();
  await capture("search", ".catalog-panel", "388:938");
  for (const name of ["喜欢收藏", "创作页", "项目", "类型", "文件资产"]) {
    await page.getByRole("tab", { name, exact: true }).click();
    await capture(
      `search-${["喜欢收藏", "创作页", "项目", "类型", "文件资产"].indexOf(name)}`,
      ".catalog-panel",
      name === "喜欢收藏" ? "398:25274" : null,
    );
  }
  await close();
  await button("项目库").click();
  await button("新建项目").click();
  await expect(page.locator(".conversation-panel")).toBeVisible();
  await capture("workspace", ".app", "404:28667");
  await button("个人信息").click();
  await capture("account", ".account-popup", "312:2436");
  await page.keyboard.press("Escape");
  await button("资产管理").click();
  await capture("assets-canvas", ".asset-panel", "392:938");
  await button("收起资产管理").click();
  await capture("assets-canvas-compact", ".asset-panel", "398:27304");
  await button("展开资产管理").click();
  await page.getByRole("tab", { name: "资产", exact: true }).click();
  await capture("assets-library", ".asset-panel", "398:26864");
  await button("收起资产管理").click();
  await capture("assets-library-compact", ".asset-panel", "398:27079");
  await close();
  await button("帮助与快捷键").click();
  await page.getByRole("menuitem", { name: "帮助教程", exact: true }).click();
  await capture("help", ".info-panel", "395:938");
  await close();
  await button("帮助与快捷键").click();
  await page.getByRole("menuitem", { name: "快捷按键", exact: true }).click();
  for (const name of ["全局", "画布", "文件"]) {
    await page.getByRole("tab", { name, exact: true }).click();
    await capture(
      `shortcuts-${["全局", "画布", "文件"].indexOf(name)}`,
      ".shortcuts-panel",
      name === "全局" ? "394:938" : null,
    );
  }
  await close();
  await page.locator(".task-button").click();
  await capture("tasks-popover", ".task-panel", "396:938");
  await button("打开任务工作台").click();
  await capture("tasks-workbench", ".task-workbench");
  await close();
  await button("收起对话").click();
  await button("收起侧边栏").click();
  await capture("workspace-folded", ".app", "410:67357");
  const report = {
    mode,
    url: page.url(),
    viewport: await page.evaluate(() => [innerWidth, innerHeight]),
    runtime: await page
      .locator("[data-runtime-entry]")
      .evaluate((el) => ({ ...el.dataset })),
    states,
  };
  await fs.writeFile(
    path.join(evidence, `runtime/${mode}-page-matrix.json`),
    JSON.stringify(report, null, 2) + "\n",
  );
  return states.length;
}
