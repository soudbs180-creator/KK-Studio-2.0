/* 精确复刻 frontend.spec.ts:163 的输入防误拖时序，重复 5 次观察 dy。 */
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ channel: "msedge" });
  for (let run = 1; run <= 5; run += 1) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.goto("http://127.0.0.1:1422");
    const imageNode = page.getByTestId("canvas-node-image");
    await page.locator(".image-preview").click();
    await page.getByTestId("image-composer").waitFor({ state: "visible" });
    const before = await imageNode.boundingBox();
    const prompt = page.getByLabel("图片提示词");
    const pb = await prompt.boundingBox();
    const stage0 = await page.getByTestId("canvas-stage").getAttribute("style");
    await page.mouse.move(pb.x + pb.width / 2, pb.y + 12);
    await page.mouse.down();
    await page.mouse.move(pb.x + pb.width / 2 + 60, pb.y + 12);
    await page.mouse.up();
    const after = await imageNode.boundingBox();
    const stage1 = await page.getByTestId("canvas-stage").getAttribute("style");
    console.log(
      `run ${run}: beforeY=${before.y} afterY=${after.y} dy=${(after.y - before.y).toFixed(1)} dx=${(after.x - before.x).toFixed(1)} stageChanged=${stage0 !== stage1}`,
    );
    await page.close();
  }
  await browser.close();
})().catch((error) => { console.error(error); process.exitCode = 1; });
