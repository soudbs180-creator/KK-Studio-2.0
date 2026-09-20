const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const label = process.argv[2] || 'before';
  const browser = await chromium.launch({channel:'msedge'});
  const page = await browser.newPage({viewport:{width:1920,height:1080}});
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  const measurements=[];
  const capture = async(name) => {
    await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));
    const state=await page.evaluate(()=>{
      const selectors={canvas:'.canvas',chat:'.conversation-panel',toolbar:'.canvas-toolbar',task:'.task-button',demo:'.demo-library-trigger',navigation:'.canvas-top-right',reopen:'.chat-reopen',arrange:'.canvas-arrange',background:'.canvas-background',lines:'.canvas-lines',map:'.canvas-map-trigger'};
      const boxes={};
      for(const [key,selector] of Object.entries(selectors)){const el=document.querySelector(selector),r=el?.getBoundingClientRect();boxes[key]=r?{x:r.x,y:r.y,width:r.width,height:r.height}:null;}
      const c=boxes.canvas,chat=boxes.chat,t=boxes.toolbar;
      const usable=chat?.width>0 ? Math.min(c.width,chat.x-c.x-16):c.width;
      const collisions=[];
      const controls=['task','demo','navigation','reopen'];
      controls.forEach((a,i)=>controls.slice(i+1).forEach(b=>{const x=boxes[a],y=boxes[b];if(x?.width&&y?.width&&Math.min(x.x+x.width,y.x+y.width)>Math.max(x.x,y.x)&&Math.min(x.y+x.height,y.y+y.height)>Math.max(x.y,y.y))collisions.push(a+' / '+b);}));
      const curve=document.querySelector('[data-testid=connector-video1]');
      let anchors;
      if(curve){const length=curve.getTotalLength();const screen=p=>new DOMPoint(p.x,p.y).matrixTransform(curve.getScreenCTM());const s=screen(curve.getPointAtLength(0)),e=screen(curve.getPointAtLength(length));const add=document.querySelector('[data-testid=canvas-node-image] .node-add-follow').getBoundingClientRect();const del=curve.closest('.connection').querySelector('.connection-delete').getBoundingClientRect();anchors={gap:add.x-s.x,addOffsetY:add.y+add.height/2-s.y,addSize:add.width,deleteOffsetX:del.x+del.width/2-(s.x+e.x)/2,deleteOffsetY:del.y+del.height/2-(s.y+e.y)/2};}
      return {boxes,collisions,toolbarCenterError:t.x+t.width/2-(c.x+usable/2),anchors,focus:document.activeElement.getAttribute('aria-label')};
    });
    await page.screenshot({path:path.join(__dirname,`${label}-${name}.png`)});
    measurements.push({name,...state});
  };
  try {
    for(const width of [1920,1440,1024,768,390]){
      await page.setViewportSize({width,height:width<=768?900:1080});await page.goto('http://127.0.0.1:1422');await capture(String(width));
      if(width===1920){
        await page.getByRole('button',{name:'收起画布工具栏',exact:true}).focus();await page.keyboard.press('Enter');await capture('collapsed');
        await page.getByRole('button',{name:'展开画布工具栏',exact:true}).click();
      }
      if(width===1920||width===390){for(const zoom of ['50%','200%']){await page.locator('.canvas-zoom-trigger').click();await page.getByRole('menuitemradio',{name:zoom,exact:true}).click();await capture(`${width}-zoom-${zoom.replace('%','')}`);}}
    }
  } finally {fs.writeFileSync(path.join(__dirname,`${label}.json`),JSON.stringify({measurements,errors},null,2));await browser.close();}
  console.log(JSON.stringify({label,errors,measurements:measurements.map(({name,collisions,toolbarCenterError,anchors,focus})=>({name,collisions,toolbarCenterError,anchors,focus}))}));
})().catch(e=>{console.error(e);process.exitCode=1;});
