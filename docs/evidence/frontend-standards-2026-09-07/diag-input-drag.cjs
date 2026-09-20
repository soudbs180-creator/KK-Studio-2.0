/* 诊断 frontend.spec.ts:163 输入框拖拽后节点 Y 位移 27px 的来源。 */
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ channel: "msedge" });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto("http://127.0.0.1:1422");
  const node = page.getByTestId("canvas-node-image");
  const canvas = page.getByTestId("infinite-canvas");
  const stage = page.getByTestId("canvas-stage");

  await page.locator(".image-preview").click();
  await page.getByTestId("image-composer").waitFor({ state: "visible" });

  // 采样选中后 1.2s 内节点位置与 stage 样式，观察是否仍有二次重曝光
  const samples = [];
  for (let i = 0; i < 12; i += 1) {
    const box = await node.boundingBox();
    const st = await stage.getAttribute("style");
    samples.push({ t: i * 100, x: box.x, y: box.y, stage: st });
    await page.waitForTimeout(100);
  }
  console.log("AFTER-SELECT SAMPLES:");
  console.log(JSON.stringify(samples, null, 2));

  // 在提示词输入框内拖拽（复刻测试）
  const prompt = page.getByLabel("图片提示词");
  const pb = await prompt.boundingBox();
  const before = await node.boundingBox();
  await page.mouse.move(pb.x + pb.width / 2, pb.y + 12);
  await page.mouse.down();
  await page.mouse.move(pb.x + pb.width / 2 + 60, pb.y + 12, { steps: 3 });
  await page.mouse.up();
  const after = await node.boundingBox();
  console.log("DRAG RESULT:", JSON.stringify({ before, after, dy: after.y - before.y, dx: after.x - before.x }, null, 2));
  await browser.close();
})().catch((error) => { console.error(error); process.exitCode = 1; });
