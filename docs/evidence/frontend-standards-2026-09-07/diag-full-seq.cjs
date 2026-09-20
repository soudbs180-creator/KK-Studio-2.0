/* 精确复刻 frontend.spec.ts:163 从 293 行起至输入拖拽的完整序列，记录每步 stage/节点样式。 */
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ channel: "msedge" });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto("http://127.0.0.1:1422");
  const imageNode = page.getByTestId("canvas-node-image");
  const stage = page.getByTestId("canvas-stage");
  const canvas = page.getByTestId("infinite-canvas");
  const snap = async (tag) => {
    const box = await imageNode.boundingBox();
    const st = await stage.getAttribute("style");
    const nodeStyle = await imageNode.getAttribute("style");
    console.log(`${tag}: node=(${box.x.toFixed(1)},${box.y.toFixed(1)}) stage="${st}" nodeStyle="${nodeStyle}"`);
  };

  // —— 复刻 293 行之前的操作：选中-展开-收藏-收起工具栏-视频点击-滚动断言 ——
  await page.locator(".image-preview").click();
  await page.getByTestId("image-composer").waitFor({ state: "visible" });
  await imageNode.focus();
  await page.keyboard.press("Enter");
  await page.getByTestId("image-composer").waitFor({ state: "visible" });
  await page.keyboard.press("Escape");
  await page.locator(".image-preview").click();
  await page.keyboard.press("Escape");
  await page.locator(".image-preview").click();
  await page.getByTestId("image-composer").waitFor({ state: "visible" });
  await page.keyboard.press("Escape");
  await page.locator(".video-placeholder").first().click();
  await page.locator(".image-preview").click();
  await page.getByTestId("image-composer").waitFor({ state: "visible" });
  await page.keyboard.press("Escape");

  // 复刻 306 行的节点拖拽
  const dragStart = await page.locator(".image-preview").evaluate((element) => {
    const box = element.getBoundingClientRect();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  });
  await snap("before-node-drag");
  await page.mouse.move(dragStart.x, dragStart.y);
  await page.mouse.down();
  await page.mouse.move(dragStart.x + 120, dragStart.y + 60);
  await page.mouse.up();
  await snap("after-node-drag");

  await imageNode.focus();
  await page.keyboard.press("ArrowRight");
  await snap("after-keyboard");

  // 重选打开编辑器
  await page.locator(".image-preview").click();
  await page.getByTestId("image-composer").waitFor({ state: "visible" });
  await snap("re-selected(composer-visible)");
  await page.waitForTimeout(300);
  await snap("re-selected(+300ms)");

  // 输入拖拽
  const beforeInputDrag = await imageNode.boundingBox();
  const prompt = page.getByLabel("图片提示词");
  const pb = await prompt.boundingBox();
  await snap("before-input-drag");
  await page.mouse.move(pb.x + pb.width / 2, pb.y + 12);
  await page.mouse.down();
  await page.mouse.move(pb.x + pb.width / 2 + 60, pb.y + 12, { steps: 5 });
  await page.mouse.up();
  const afterInputDrag = await imageNode.boundingBox();
  await snap("after-input-drag");
  console.log(`DY=${(afterInputDrag.y - beforeInputDrag.y).toFixed(1)} DX=${(afterInputDrag.x - beforeInputDrag.x).toFixed(1)}`);
  await browser.close();
})().catch((error) => { console.error(error); process.exitCode = 1; });
