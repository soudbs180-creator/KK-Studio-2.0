const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const phase = process.argv[2] || 'after';
const dir = __dirname;
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const states = [];
  for (const [width, height] of [[1920,1080],[1440,900],[768,1024],[390,844]]) {
    await page.setViewportSize({width,height});
    await page.goto('http://127.0.0.1:1422/');
    if (width > 800) await page.getByRole('button',{name:'收起侧边栏',exact:true}).click();
    await page.waitForTimeout(300);
    const metrics = await page.evaluate(() => {
      const rect = selector => {
        const e = document.querySelector(selector);
        if (!e) return null;
        const r = e.getBoundingClientRect();
        return {x:r.x,y:r.y,width:r.width,height:r.height,display:getComputedStyle(e).display};
      };
      return {
        sidebar:rect('.sidebar'), canvas:rect('.canvas'),
        nav:[...document.querySelectorAll('.primary-nav button')].map(e=>{
          const r=e.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height};
        }),
        search:rect('.sidebar [aria-label="搜索"]'),
        toggle:rect('.sidebar-toggle, .brand button:last-child'),
        account:rect('.sidebar [aria-label="个人信息"]'),
        settings:rect('.sidebar [aria-label="打开设置"]'),
        overflow:document.documentElement.scrollWidth>innerWidth,
      };
    });
    states.push({width,height,state:'compact',...metrics});
    await page.screenshot({path:path.join(dir,`${phase}-${width}.png`)});
    await page.screenshot({path:path.join(dir,`${phase}-${width}-rail.png`),clip:{x:0,y:40,width:112,height:height-40}});
    if (phase!=='before') {
      await page.getByRole('button',{name:'搜索',exact:true}).click();
      await page.getByRole('dialog',{name:'搜索与收藏'}).waitFor();
      await page.keyboard.press('Escape');
      await page.getByRole('button',{name:'展开侧边栏',exact:true}).click();
      await page.screenshot({path:path.join(dir,`${phase}-${width}-expanded.png`),animations:'disabled'});
    }
  }
  fs.writeFileSync(path.join(dir,`${phase}.json`),JSON.stringify({states,errors},null,2));
  await browser.close();
  console.log(JSON.stringify({phase,states:states.length,errors}));
})().catch(e=>{ console.error(e); process.exitCode=1; });
