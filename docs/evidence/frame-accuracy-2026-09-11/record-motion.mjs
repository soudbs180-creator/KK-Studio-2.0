import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const dir = new URL('./', import.meta.url);
const browser = await chromium.launch({ channel: 'msedge' });
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: { dir: fileURLToPath(dir), size: { width: 1920, height: 1080 } },
});
const page = await context.newPage();
await page.goto(process.argv[2] ?? 'http://127.0.0.1:1421/');
await page.getByRole('button', { name: '项目库', exact: true }).click();
await page.getByRole('button', { name: '新建项目', exact: true }).click();
await page.waitForTimeout(700);
const samples = [];
for (const name of ['收起侧边栏', '收起对话', '展开侧边栏', '打开对话']) {
  await page.getByRole('button', { name, exact: true }).click();
  samples.push({ name, frames: await page.evaluate(async () => {
    const frames = []; const start = performance.now();
    while (performance.now() - start < 400) {
      const r = s => { const b = document.querySelector(s).getBoundingClientRect(); return [b.x, b.y, b.width, b.height]; };
      frames.push({ t: performance.now() - start, frame: r('.workspace-content'), task: r('.task-button'), toolbar: r('.canvas-toolbar') });
      await new Promise(requestAnimationFrame);
    }
    return frames;
  }) });
  await page.mouse.move(900, 870);
  await page.waitForTimeout(500);
}
await context.close();
await page.video().saveAs(fileURLToPath(new URL('collapse-interaction.webm', dir)));
await page.video().delete();
await fs.writeFile(new URL('motion-samples.json', dir), JSON.stringify(samples, null, 2));
console.log(JSON.stringify({ transitions: samples.length, frames: samples.reduce((n,s)=>n+s.frames.length,0) }));
await browser.close();
