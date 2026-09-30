import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const output = join(dirname(fileURLToPath(import.meta.url)), "architecture");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "msedge" });
const results = [];

for (const width of [1440, 390]) {
  const context = await browser.newContext({
    viewport: { width, height: width === 390 ? 844 : 900 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:1423/");

  async function capture(name) {
    await page.screenshot({ path: join(output, `${width}-${name}.png`), animations: "disabled" });
    results.push({
      width,
      name,
      title: await page.title(),
      viewport: await page.evaluate(() => ({ width: innerWidth, height: innerHeight })),
      documentOverflow: await page.evaluate(() =>
        Math.max(0, document.documentElement.scrollWidth - innerWidth),
      ),
      headings: await page.locator("h1,h2").allTextContents(),
      classNames: await page.locator("main").first().getAttribute("class"),
      geometry: await page.evaluate(() => {
        const selectors = [
          ".topbar", ".sidebar", ".workspace", ".start-composer",
          ".catalog-page", ".catalog-page-search", ".catalog-card",
          ".project-library-card", ".settings-panel", ".settings-nav",
          ".settings-content", ".canvas-toolbar", ".canvas-top-left",
          ".canvas-top-right", ".conversation-panel", ".catalog-panel",
          ".catalog-tab-indicator",
        ];
        return Object.fromEntries(selectors.flatMap((selector) => {
          const element = document.querySelector(selector);
          if (!element || !element.getClientRects().length) return [];
          const bounds = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return [[selector, {
            x: Math.round(bounds.x), y: Math.round(bounds.y),
            width: Math.round(bounds.width), height: Math.round(bounds.height),
            radius: style.borderRadius, font: style.fontSize,
            background: style.backgroundColor,
          }]];
        }));
      }),
    });
  }

  async function navigate(name) {
    const sidebar = page.locator(".sidebar");
    if (await sidebar.getAttribute("class").then((value) => value?.includes("is-collapsed"))) {
      await page.getByRole("button", { name: "展开侧边栏", exact: true }).click();
    }
    await sidebar.getByRole("button", { name, exact: true }).click();
    if (await sidebar.getAttribute("class").then((value) => value?.includes("is-narrow") && !value?.includes("is-collapsed"))) {
      await page.keyboard.press("Escape");
    }
  }

  async function openFileAction(name) {
    if (width === 390) {
      await page.getByRole("button", { name: "应用功能菜单" }).click();
      await page.getByRole("menuitem", { name, exact: true }).click();
    } else {
      await page.getByRole("navigation", { name: "应用菜单" }).getByRole("button", { name: "文件", exact: true }).click();
      await page.getByRole("button", { name, exact: true }).click();
    }
  }

  await capture("home");
  await openFileAction("资产管理");
  await capture("assets");
  await page.getByRole("button", { name: "关闭资产管理" }).click();
  await openFileAction("提示词库");
  await capture("prompts");
  await page.getByRole("button", { name: "关闭提示词库" }).click();
  for (const [name, file] of [["项目库", "projects"], ["Skill", "skills"], ["ComfyUI 工作流", "comfyui"]]) {
    await navigate(name);
    await capture(file);
  }
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await capture("settings-general");
  for (const [name, file] of [["账号管理", "settings-account"], ["储存", "settings-storage"], ["网络", "settings-network"], ["记忆", "settings-memory"], ["模型接入", "settings-models"], ["插件·技能·伙伴", "settings-extensions"], ["Comfy UI", "settings-comfyui"], ["高级", "settings-advanced"], ["软件更新", "settings-updates"]]) {
    await page.getByRole("dialog", { name: "设置" }).locator(".settings-nav").getByRole("button", { name, exact: true }).click();
    await capture(file);
  }
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page.getByRole("dialog", { name: "设置" }).waitFor({ state: "detached" });
  await navigate("项目库");
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await capture("canvas");
  await page.getByRole("button", { name: "打开任务列表", exact: true }).click();
  await capture("tasks");
  await page.getByRole("button", { name: "打开任务工作台", exact: true }).click();
  await capture("task-workbench");
  await page.getByRole("button", { name: "关闭任务工作台", exact: true }).click();
  if (width === 390) {
    await page.getByRole("button", { name: "对话", exact: true }).click();
  } else {
    const close = page.getByRole("button", { name: "收起对话", exact: true });
    if (await close.isVisible()) await close.click();
    await page.getByRole("button", { name: "打开对话", exact: true }).click();
  }
  await page.locator(".conversation-panel").waitFor({ state: "visible" });
  await page.mouse.click(width === 390 ? 100 : 1360, 20);
  await page.locator(".conversation-panel").waitFor({ state: "visible" });
  await capture("canvas-chat");
  if (width === 390) {
    await page.getByRole("button", { name: "对话", exact: true }).click();
  } else {
    await page.getByRole("button", { name: "收起对话", exact: true }).click();
  }
  const searchButton = width === 390 ? page.locator(".mobile-search") : page.locator(".sidebar-search");
  await searchButton.click();
  await capture("search");
  await context.close();
}

await writeFile(join(output, "metrics.json"), JSON.stringify(results, null, 2));
await browser.close();
