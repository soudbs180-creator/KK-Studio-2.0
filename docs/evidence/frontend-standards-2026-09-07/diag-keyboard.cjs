const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({channel:'msedge'});
  const page = await browser.newPage({viewport:{width:1920,height:1080}});
  await page.goto('http://127.0.0.1:1422');
  const log = async(label) => console.log(label, await page.evaluate(() => ({active:document.activeElement.outerHTML.slice(0,220),text:document.activeElement.textContent,nodes:[...document.querySelectorAll('.canvas-node')].map(x=>x.getAttribute('data-testid'))})));
  const point = await page.getByTestId('connector-video1').evaluate(path => {
    const p = path.getPointAtLength(path.getTotalLength() * .9);
    const s = new DOMPoint(p.x,p.y).matrixTransform(path.getScreenCTM());
    return {x:s.x,y:s.y};
  });
  await page.mouse.move(point.x,point.y);
  const remove = page.getByRole('button',{name:'删除连线 图片创建卡片 → 视频卡片 1',exact:true});
  const box = await remove.boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2,{steps:12});
  await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
  await page.getByRole('button',{name:'从图片创建卡片添加下游'}).focus();
  await log('focus');
  await page.keyboard.press('Enter'); await log('enter');
  await page.keyboard.press('ArrowDown'); await log('down');
  await page.keyboard.press('Enter'); await log('add');
  await page.evaluate(()=>new Promise(requestAnimationFrame)); await log('frame');
  await browser.close();
})();
