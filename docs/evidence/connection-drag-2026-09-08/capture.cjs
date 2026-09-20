const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const phase = process.argv[2] || 'after';
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage({viewport:{width:1920,height:1080},recordVideo:{dir:path.join(__dirname,phase+'-motion')}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:1422/');
  const measurements=await page.evaluate(()=>{
    const card=document.querySelector('.image-preview').getBoundingClientRect();
    const curve=document.querySelector('[data-testid="connector-video1"]');
    const p=curve.getPointAtLength(0);const start=new DOMPoint(p.x,p.y).matrixTransform(curve.getScreenCTM());
    return {image:{x:card.x,y:card.y,width:card.width,height:card.height},start:{x:start.x,y:start.y},deltaY:start.y-card.y-card.height/2};
  });
  await page.getByRole('button',{name:'从图片创建卡片添加下游',exact:true}).click();
  await page.evaluate(()=>document.fonts.ready);
  const geometry=phase==='final'?await page.locator('.add-node-menu').evaluate(el=>{
    const origin=el.getBoundingClientRect();
    const rect=x=>{const b=x.getBoundingClientRect();const s=getComputedStyle(x);return {x:b.x-origin.x,y:b.y-origin.y,width:b.width,height:b.height,font:s.fontFamily,size:s.fontSize,weight:s.fontWeight,color:s.color};};
    return {width:origin.width,height:origin.height,title:rect(el.querySelector('.add-node-title')),rows:[...el.querySelectorAll('[role=menuitem]')].map(row=>({row:rect(row),icon:rect(row.querySelector('.add-node-icon-box')),label:rect(row.querySelector('.add-node-label')),badge:row.querySelector('.add-node-badge')?rect(row.querySelector('.add-node-badge')):null,disabled:row.disabled}))};
  }):undefined;
  await page.screenshot({path:path.join(__dirname,phase+'-menu.png'),animations:'disabled'});
  if(phase==='final')await page.locator('.add-node-menu').screenshot({path:path.join(__dirname,'final-source-state.png'),animations:'disabled'});
  await page.keyboard.press('Escape');
  if(phase!=='before'){
    const port=page.getByRole('button',{name:'从图片创建卡片添加下游',exact:true});
    const box=await port.boundingBox();
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
    await page.mouse.down();
    await page.mouse.move(940,690,{steps:20});
    await page.screenshot({path:path.join(__dirname,phase+'-drag.png')});
    await page.mouse.up();
    await page.getByRole('menu',{name:'新增下游卡片'}).screenshot({path:path.join(__dirname,phase+'-menu-detail.png'),animations:'disabled'});
    await page.getByRole('menuitem',{name:'视频',exact:true}).click();
    await page.screenshot({path:path.join(__dirname,phase+'-created.png'),animations:'disabled'});
    await page.setViewportSize({width:390,height:844});
    await page.getByRole('button',{name:'添加资源',exact:true}).click();
    await page.screenshot({path:path.join(__dirname,phase+'-390.png'),animations:'disabled'});
    if(phase==='final'){
      for(const [width,height] of [[1440,900],[768,1024],[663,450]]){
        await page.setViewportSize({width,height});
        await page.screenshot({path:path.join(__dirname,phase+'-'+width+'.png'),animations:'disabled'});
      }
      await page.setViewportSize({width:390,height:844});
      await page.evaluate(()=>document.documentElement.dataset.theme='light');
      await page.screenshot({path:path.join(__dirname,phase+'-390-light.png'),animations:'disabled'});
    }
  }
  fs.writeFileSync(path.join(__dirname,phase+'.json'),JSON.stringify({errors,measurements,geometry},null,2));
  await page.close();await browser.close();console.log(JSON.stringify({phase,errors,measurements}));
})().catch(e=>{console.error(e);process.exitCode=1});
