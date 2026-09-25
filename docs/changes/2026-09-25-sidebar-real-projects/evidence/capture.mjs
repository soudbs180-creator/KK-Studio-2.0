/** Production preview visual evidence for real project sidebar integration. */
import { chromium, expect } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const base = process.env.EVIDENCE_BASE ?? "http://127.0.0.1:1424";
const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const sidebar = page.getByRole("complementary", { name: "工作台侧栏" });

async function createNamedProject(name) {
  await sidebar.getByRole("button", { name: "创建未分组项目" }).click();
  const input = sidebar.getByRole("textbox", { name: "项目名称" });
  await input.fill(name);
  await input.press("Enter");
  await expect(sidebar.getByRole("button", { name, exact: true })).toBeVisible();
}

try {
  await page.goto(base);
  await expect(sidebar.locator(".project-entry")).toHaveCount(0);
  await page.screenshot({ path: path.join(dir, "01-empty-1440.png"), animations: "disabled" });

  await createNamedProject("视觉方案甲");
  await createNamedProject("视觉方案乙");
  await sidebar.getByRole("button", { name: "创建项目文件夹" }).click();
  const folder = sidebar.locator(".project-folder-group").first();
  await sidebar
    .locator(".project-entry")
    .filter({ hasText: "视觉方案乙" })
    .dragTo(folder.locator(".folder-heading-toggle"));
  await expect(folder.locator(".project-nested-entry")).toContainText("视觉方案乙");
  await page.screenshot({ path: path.join(dir, "02-real-projects-1440.png"), animations: "disabled" });

  const widths = [];
  for (const width of [390, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(250);
    if (width <= 800) await expect(sidebar).toHaveClass(/is-collapsed/);
    if (await sidebar.evaluate((element) => element.classList.contains("is-collapsed")))
      await sidebar.getByRole("button", { name: "展开侧边栏" }).click();
    await expect(folder.locator(".folder-heading-toggle")).toBeVisible();
    await page.waitForTimeout(250);
    const measure = await page.evaluate(() => ({
      width: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      sidebarWidth: document.querySelector(".sidebar")?.getBoundingClientRect().width,
      folderVisible: Boolean(document.querySelector(".project-folder-group .folder-heading-toggle")?.getClientRects().length),
    }));
    if (measure.documentWidth > width + 1) throw new Error(`horizontal overflow at ${width}: ${measure.documentWidth}`);
    widths.push(measure);
    if (width === 390 || width === 768)
      await page.screenshot({ path: path.join(dir, `03-real-projects-${width}.png`), animations: "disabled" });
    if (width <= 800)
      await sidebar.getByRole("button", { name: "收起侧边栏" }).click();
  }
  await fs.writeFile(path.join(dir, "metrics.json"), JSON.stringify({ base, widths }, null, 2) + "\n");
  console.log(JSON.stringify({ base, widths }));
} finally {
  await browser.close();
}
