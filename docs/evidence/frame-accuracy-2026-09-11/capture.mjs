import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const dir = new URL('./', import.meta.url);
const base = process.argv[2] ?? 'http://127.0.0.1:1421/';
const prefix = process.argv[3] ?? 'after-dev';
const browser = await chromium.launch({ channel: 'msedge' });
const context = await browser.newContext({ viewport: { width:1920,height:1080 }, reducedMotion:'reduce' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const states=[];
const selectors=['.app','.workspace-content','.sidebar','.topbar strong','.sidebar-toggle','.sidebar-search','.sidebar-account','.sidebar-settings','.primary-nav','.project-groups-header','.project-entry','.account-row','.task-button','.canvas-top-right','.chat-reopen','.canvas-toolbar','.conversation-panel','.conversation-panel > header','.chat-composer','.chat-composer textarea','.chat-composer > div'];
async function capture(state){
  await page.evaluate(()=>document.fonts.ready);
  await page.mouse.move(600,850);
  states.push(await page.evaluate(({state,selectors})=>({state,url:location.href,viewport:{width:innerWidth,height:innerHeight},runtime:{...document.querySelector('.app').dataset},scripts:[...document.scripts].map(s=>s.src),styleSheets:[...document.querySelectorAll('style[data-vite-dev-id],link[rel=stylesheet]')].map(e=>e.dataset.viteDevId??e.href),elements:Object.fromEntries(selectors.map(selector=>[selector,[...document.querySelectorAll(selector)].map(el=>{const r=el.getBoundingClientRect(),c=getComputedStyle(el);return {rect:[r.x,r.y,r.width,r.height],display:c.display,background:c.backgroundColor,border:c.border,borderRadius:c.borderRadius,transition:c.transition,transform:c.transform}})])),grid:{position:getComputedStyle(document.querySelector('.canvas')).backgroundPosition,size:getComputedStyle(document.querySelector('.canvas')).backgroundSize},images:[...document.querySelectorAll('.sidebar-icon img')].map(el=>({src:el.getAttribute('src'),loaded:el.complete&&el.naturalWidth>0,rect:[el.getBoundingClientRect().x,el.getBoundingClientRect().y,el.getBoundingClientRect().width,el.getBoundingClientRect().height]}))}),{state,selectors}));
  await page.screenshot({path:new URL(`${prefix}-${state}.png`,dir).pathname.replace(/^\/(\w:)/,'$1')});
}
await page.goto(base);
await page.getByRole('button',{name:'项目库',exact:true}).click();
await page.getByRole('button',{name:'新建项目',exact:true}).click();
await capture('expanded');
await page.getByRole('button',{name:'收起侧边栏',exact:true}).click();
await capture('left-collapsed');
await page.getByRole('button',{name:'收起对话',exact:true}).click();
await capture('both-collapsed');
await page.getByRole('button',{name:'展开侧边栏',exact:true}).click();
await capture('right-collapsed');
await page.getByRole('button',{name:'打开对话',exact:true}).click();
for (const [width,height] of [[1600,900],[1440,900],[390,844]]){
  await page.setViewportSize({width,height});
  await capture(`${width}`);
}
await fs.writeFile(new URL(`${prefix}-dom.json`,dir),JSON.stringify({base,prefix,errors,states},null,2));
console.log(JSON.stringify({states:states.map(s=>s.state),errors,allIconsLoaded:states.every(s=>s.images.every(i=>i.loaded))}));
await browser.close();
