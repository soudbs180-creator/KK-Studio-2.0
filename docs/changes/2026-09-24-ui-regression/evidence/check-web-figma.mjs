import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { chromium, expect } from "@playwright/test";

const repo = process.cwd();
const output = path.join(repo, "docs/changes/2026-09-24-ui-regression/evidence");
const baseURL = "http://127.0.0.1:1423/";
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const browser = await chromium.launch({ channel: "msedge", headless: true });
const report = {
  timestamp: new Date().toISOString(),
  url: baseURL,
  mode: "Vite production preview",
  entryChain: "index.html → src/main.tsx → src/App.tsx → StartPage/Canvas/ConversationPanel/CatalogPanel",
  loadedAssets: [],
  pageErrors: [],
  passed: false,
};

try {
  const context = await browser.newContext({ viewport: { width: 882, height: 715 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  page.on("pageerror", (error) => report.pageErrors.push(error.message));
  await page.goto(baseURL);
  await expect(page.locator(".app")).toHaveAttribute("data-runtime-mode", "production");
  await expect(page.locator(".app")).toHaveAttribute("data-runtime-entry", "src/main.tsx");
  report.runtime = await page.locator(".app").evaluate((element) => ({
    mode: element.dataset.runtimeMode,
    entry: element.dataset.runtimeEntry,
  }));
  const assets = await page
    .locator('script[type="module"][src], link[rel="stylesheet"][href]')
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("src") ?? element.getAttribute("href")),
    );
  for (const asset of assets) {
    if (!asset.startsWith("/assets/")) continue;
    const local = await fs.readFile(path.join(repo, "dist", asset.slice(1)));
    const actual = await page.evaluate(async (url) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Asset fetch ${response.status}`);
      return Array.from(new Uint8Array(await response.arrayBuffer()));
    }, asset);
    expect(sha(Buffer.from(actual))).toBe(sha(local));
    report.loadedAssets.push({ asset, sha256: sha(local), bytes: local.length });
  }
  const composer = page.locator(".start-composer");
  report.home = {
    box: await composer.boundingBox(),
    radius: await composer.evaluate((element) => getComputedStyle(element).borderRadius),
  };
  expect(report.home.box.width).toBe(652);
  await page.screenshot({ path: path.join(output, "web-home-882.png") });
  await page.getByRole("button", { name: "模型", exact: true }).click();
  report.homeModelMenu = await page.getByRole("menu", { name: "选择模型" }).boundingBox();
  expect(report.homeModelMenu.width).toBe(227);
  expect(report.homeModelMenu.height).toBeLessThanOrEqual(318);
  await page.screenshot({ path: path.join(output, "web-model-picker-882.png") });
  await page.setViewportSize({ width: 1280, height: 1038 });
  await expect
    .poll(async () => (await page.getByRole("menu", { name: "选择模型" }).boundingBox())?.height)
    .toBe(318);
  report.homeModelMenuTall = await page.getByRole("menu", { name: "选择模型" }).boundingBox();
  expect(report.homeModelMenuTall.width).toBe(227);
  expect(report.homeModelMenuTall.height).toBe(318);
  await page.screenshot({ path: path.join(output, "web-model-picker-1280.png") });
  await page.setViewportSize({ width: 882, height: 715 });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "搜索", exact: true }).click();
  await page.getByRole("tab", { name: "项目", exact: true }).click();
  report.search = {
    selected: await page.getByRole("tab", { name: "项目", exact: true }).getAttribute("aria-selected"),
    indicator: await page.locator(".catalog-tab-indicator").boundingBox(),
  };
  await page.screenshot({ path: path.join(output, "web-search-882.png") });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "项目库", exact: true }).first().click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  await expect(page.getByRole("region", { name: "无限画布" })).toBeVisible();
  report.canvas = {
    toolbar: await page.locator(".canvas-toolbar").boundingBox(),
    task: await page.getByRole("button", { name: "打开任务列表" }).boundingBox(),
    zoom: await page.getByRole("button", { name: "画布缩放" }).boundingBox(),
    arrange: await page.getByRole("button", { name: "整理画布" }).boundingBox(),
    opener: await page.getByRole("button", { name: "打开对话" }).boundingBox(),
  };
  await page.screenshot({ path: path.join(output, "web-canvas-882.png") });
  await page.getByRole("button", { name: "打开对话" }).click();
  await expect(page.locator(".conversation-panel")).toBeVisible();
  report.chat = {
    close: await page.getByRole("button", { name: "收起对话" }).boundingBox(),
  };
  await page.screenshot({ path: path.join(output, "web-chat-882.png") });
  expect(Math.abs(report.canvas.opener.x - report.chat.close.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(report.canvas.opener.y - report.chat.close.y)).toBeLessThanOrEqual(1);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "收起对话" }).click();
  await page.getByRole("button", { name: "开始创作", exact: true }).click();
  report.phone = { composer: await composer.boundingBox() };
  expect(report.phone.composer.width).toBe(306);
  await page.screenshot({ path: path.join(output, "web-home-390.png") });
  expect(report.pageErrors).toEqual([]);
  report.passed = true;
  await context.close();
} catch (error) {
  report.error = error instanceof Error ? error.stack : String(error);
} finally {
  await browser.close();
  await fs.writeFile(path.join(output, "web-figma-runtime.json"), JSON.stringify(report, null, 2) + "\n");
}
if (!report.passed) throw new Error(report.error ?? "Web Figma acceptance failed");
console.log(`Web Figma acceptance PASS: ${path.join(output, "web-figma-runtime.json")}`);
