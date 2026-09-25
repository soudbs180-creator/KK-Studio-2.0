import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { chromium, expect } from "@playwright/test";

const repo = process.cwd();
const base = "http://127.0.0.1:1424/";
const output = path.join(
  repo,
  "docs/changes/2026-09-25-sidebar-real-projects/evidence/web-runtime.json",
);
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const report = { base, assets: [], pageErrors: [], passed: false };
const browser = await chromium.launch({ channel: "msedge" });
try {
  const page = await browser.newPage();
  page.on("pageerror", (error) => report.pageErrors.push(error.message));
  await page.goto(base);
  await expect(page.getByRole("region", { name: "开始创作" })).toBeVisible();
  report.runtime = await page.locator(".app").evaluate((element) => ({
    entry: element.dataset.runtimeEntry,
    mode: element.dataset.runtimeMode,
  }));
  expect(report.runtime).toEqual({ entry: "src/main.tsx", mode: "production" });
  const assets = await page
    .locator('script[type="module"][src], link[rel="stylesheet"][href]')
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("src") ?? element.getAttribute("href")),
    );
  for (const asset of assets) {
    if (!asset.startsWith("/assets/")) continue;
    const local = await fs.readFile(path.join(repo, "dist", asset.slice(1)));
    const response = await fetch(new URL(asset, base));
    expect(response.ok).toBe(true);
    const served = Buffer.from(await response.arrayBuffer());
    expect(sha(served)).toBe(sha(local));
    report.assets.push({ asset, sha256: sha(local), bytes: local.length });
  }
  expect(report.assets.some((asset) => asset.asset.endsWith(".js"))).toBe(true);
  expect(report.assets.some((asset) => asset.asset.endsWith(".css"))).toBe(true);
  expect(report.pageErrors).toEqual([]);
  report.passed = true;
} finally {
  await browser.close();
  await fs.writeFile(output, JSON.stringify(report, null, 2) + "\n");
}
if (!report.passed) throw new Error("Web asset parity failed");
console.log(`Web asset parity PASS: ${output}`);
