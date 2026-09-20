import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const stage = process.argv[2] ?? 'before';
const base = process.argv[3] ?? 'http://127.0.0.1:1421/';
const dir = new URL('./', import.meta.url);
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const states = [];
async function capture(state) {
  await page.evaluate(() => Promise.all([...document.images].map(i => i.decode().catch(() => {}))));
  await page.screenshot({ path: new URL(`${stage}-${state}.png`, dir).pathname.replace(/^\/(\w:)/, '$1') });
  states.push(await page.evaluate((state) => ({ state, url: location.href, viewport: { width:innerWidth, height:innerHeight }, runtime: {...document.documentElement.dataset}, app: {...document.querySelector('.app')?.dataset}, scripts: [...document.scripts].map(s=>s.src), styleSheets: [...document.querySelectorAll('style[data-vite-dev-id],link[rel=stylesheet]')].map(e=>e.dataset.viteDevId ?? e.href), logos: [...document.querySelectorAll('img')].filter(i => /logo|brand/.test(i.src+' '+i.className+' '+i.parentElement.className)).filter(i=>i.getClientRects().length).map(i => { const r=i.getBoundingClientRect(); const s=getComputedStyle(i); return { src:i.getAttribute('src'), class:i.className, parent:i.parentElement.className, natural:[i.naturalWidth,i.naturalHeight], rect:{x:r.x,y:r.y,width:r.width,height:r.height}, style:{width:s.width,height:s.height,objectFit:s.objectFit,overflow:s.overflow}, loaded:i.complete&&i.naturalWidth>0 }; }), favicon: document.querySelector('link[rel=icon]')?.href }), state));
}
try {
  await page.goto(base);
  await capture('landing');
  await page.getByRole('button',{name:'个人信息',exact:true}).click();
  await capture('account');
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'项目库',exact:true}).click();
  await page.getByRole('button',{name:'新建项目',exact:true}).click();
  await capture('workspace');
  await page.locator('.image-preview').click();
  await page.getByRole('button',{name:'kk Image 2',exact:true}).click();
  await capture('model-menu');
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'收起侧边栏',exact:true}).click();
  await capture('collapsed');
  await page.setViewportSize({width:390,height:844});
  await page.goto(base);
  await capture('landing-390');
  await fs.writeFile(new URL(`${stage}-dom.json`, dir), JSON.stringify({stage,errors,states},null,2));
  console.log(JSON.stringify({stage,states:states.map(s=>({state:s.state,logos:s.logos.length,loaded:s.logos.every(i=>i.loaded)})),errors}));
} finally { await browser.close(); }
