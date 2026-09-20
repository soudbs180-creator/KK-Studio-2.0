const { chromium } = require('playwright');
const fs = require('node:fs'); const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, recordVideo: { dir: __dirname, size: { width: 1280, height: 720 } } });
  const page = await context.newPage(); const recording = page.video(); const errors = []; const views = []; let connectorInteraction;
  const settle = () => page.evaluate(async () => {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {})));
    await new Promise(resolve => requestAnimationFrame(resolve));
  });
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto('http://127.0.0.1:1422');
    const node = page.getByTestId('canvas-node-image');
    await node.focus(); await page.keyboard.press('Enter'); await settle();
    const follow = page.getByRole('button', { name:'从图片创建卡片添加下游' });
    const beforeFollow = await follow.boundingBox();
    const preview = await page.locator('.image-preview').boundingBox();
    const pathBefore = await page.getByTestId('connector-video1').getAttribute('d');
    await page.mouse.move(preview.x+180,preview.y+180); await page.mouse.down();
    await page.mouse.move(preview.x+244,preview.y+212,{steps:20}); await page.mouse.up();
    const afterFollow = await follow.boundingBox();
    const point = await page.getByTestId('connector-video1').evaluate(path => {
      const p = path.getPointAtLength(path.getTotalLength() * .9);
      const s = new DOMPoint(p.x,p.y).matrixTransform(path.getScreenCTM());
      return {x:s.x,y:s.y};
    });
    await page.mouse.move(point.x,point.y);
    const remove = page.getByRole('button', {name:'删除连线 图片创建卡片 → 视频卡片 1',exact:true});
    const box = await remove.boundingBox();
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2,{steps:15});
    await page.screenshot({path:path.join(__dirname,'connection-delete-hover.png'),animations:'disabled'});
    const deleteOpacity = await remove.evaluate(el => getComputedStyle(el).opacity);
    const pathAfter = await page.getByTestId('connector-video1').getAttribute('d');
    await remove.click();
    const deleted = await page.getByTestId('connector-video1').count() === 0;
    await page.getByRole('button',{name:'撤销删除连线',exact:true}).click();
    connectorInteraction = {followDelta:{x:afterFollow.x-beforeFollow.x,y:afterFollow.y-beforeFollow.y},pathChanged:pathBefore !== pathAfter,deleteOpacity,deleted,restored:await page.getByTestId('connector-video1').count() === 1};
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: '示范素材', exact: true }).click();
    await settle();
    await page.getByRole('dialog', { name: '示范素材' }).screenshot({ path: path.join(__dirname, 'demo-library.png'), animations: 'disabled' });
    await page.getByRole('button', { name: '添加全部示范', exact: true }).click();
    await page.locator('.demo-result-node').last().waitFor();
    await page.screenshot({ path: path.join(__dirname, 'demo-canvas-1920.png'), animations: 'disabled' });
    for (const [title, kind] of [['海岸镜头','video'], ['蓝调氛围','audio'], ['蓝调时刻文案','text']]) {
      await page.getByRole('button', { name: `预览${title}`, exact: true }).click();
      const dialog = page.getByRole('dialog', { name: `预览${title}` });
      if (kind !== 'text') {
        await dialog.locator(kind).evaluate(async media => { await media.play(); await new Promise(resolve => setTimeout(resolve, 1200)); media.pause(); });
      } else {
        await dialog.getByLabel('编辑文案').fill('蓝调时刻\n\n让灵感在此刻发生。');
        await dialog.getByRole('button', { name: '保存文案到卡片' }).click();
      }
      await dialog.screenshot({ path: path.join(__dirname, `preview-${kind}.png`), animations: 'disabled' });
      await page.keyboard.press('Escape');
    }
    for (const [width, height] of [[1920,1080],[1440,900],[768,1024],[390,844]]) {
      await page.setViewportSize({ width, height });
      await settle();
      const audio = page.locator('.canvas-node').filter({ has: page.locator('.demo-result-node[data-kind="audio"]') });
      await audio.focus(); await page.keyboard.press('Enter');
      await settle();
      const add = page.getByRole('button', { name: '从蓝调氛围添加下游' });
      const box = await add.boundingBox();
      const canvas = await page.getByTestId('infinite-canvas').boundingBox();
      views.push({ width, button: box, canvas, inside: box.x >= canvas.x && box.x + box.width <= canvas.x + canvas.width });
      await add.click();
      await page.screenshot({ path: path.join(__dirname, `actions-${width}.png`), animations: 'disabled' });
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: '预览蓝调氛围', exact: true }).click();
      await page.getByRole('dialog', { name: '预览蓝调氛围' }).screenshot({ path: path.join(__dirname, `preview-audio-${width}.png`), animations: 'disabled' });
      await page.keyboard.press('Escape');
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByRole('button', { name: '示范素材', exact: true }).click();
    const reducedAnimations = await page.evaluate(() => document.getAnimations().length);
    await page.keyboard.press('Escape');
    fs.writeFileSync(path.join(__dirname, 'visual-flow.json'), JSON.stringify({ capturedAt: new Date().toISOString(), connectorInteraction, views, reducedAnimations, errors, video: 'frontend-flow.webm' }, null, 2));
    console.log(JSON.stringify({connectorInteraction,viewports: views.map(view => ({ width: view.width, buttonWidth: view.button.width, inside: view.inside })), reducedAnimations, errors }));
  } finally {
    await context.close(); await recording.saveAs(path.join(__dirname, 'frontend-flow.webm')); await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
