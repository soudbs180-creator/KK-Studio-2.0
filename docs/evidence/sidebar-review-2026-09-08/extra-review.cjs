const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
(async()=>{
  const browser = await chromium.launch({channel:'msedge',headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,recordVideo:{dir:path.join(__dirname,'motion')}});
  const page=await context.newPage();
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:1422/');
  await page.screenshot({path:path.join(__dirname,'final-390-touch.png')});
  await page.getByRole('button',{name:'打开设置',exact:true}).tap();
  await page.getByLabel('主题',{exact:true}).selectOption('light');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(220);
  await page.screenshot({path:path.join(__dirname,'final-390-light.png'),animations:'disabled'});
  const transitions=[];
  for(let i=0;i<4;i++){
    await page.locator('.sidebar-toggle').tap();
    transitions.push(await page.locator('.sidebar').evaluate(el=>({expanded:el.querySelector('.sidebar-toggle').getAttribute('aria-expanded'),animations:el.getAnimations({subtree:true}).map(a=>({duration:a.effect.getTiming().duration,frames:a.effect.getKeyframes()}))})));
    await page.waitForTimeout(220);
  }
  await page.getByRole('button',{name:'打开设置',exact:true}).tap();
  await page.getByLabel('主题',{exact:true}).selectOption('dark');
  await page.keyboard.press('Escape');
  const motion=await page.video().path();
  await context.close();
  const source={sidebarWidth:61,nav:{x:12,y:[140,192,244,296],width:39,height:48},search:{x:18,y:955,width:26,height:20},toggle:{x:18,y:994,width:26,height:18},account:{x:18,y:1031,width:26,height:26},settings:{x:72,y:1031,width:29,height:29}};
  const actual=JSON.parse(fs.readFileSync(path.join(__dirname,'final.json'),'utf8')).states[0];
  const deltas={sidebarWidth:actual.sidebar.width-source.sidebarWidth,nav:actual.nav.map((n,i)=>({x:n.x-source.nav.x,y:n.y-source.nav.y[i],width:n.width-source.nav.width,height:n.height-source.nav.height}))};
  for(const key of ['search','toggle','account','settings']) deltas[key]=Object.fromEntries(['x','y','width','height'].map(prop=>[prop,actual[key][prop]-source[key][prop]]));
  fs.writeFileSync(path.join(__dirname,'source-compare.json'),JSON.stringify({source,actual,deltas},null,2));
  fs.writeFileSync(path.join(__dirname,'extra-review.json'),JSON.stringify({errors,motion,transitions},null,2));
  await browser.close(); console.log(JSON.stringify({errors,motion,states:transitions.length,deltas}));
})().catch(e=>{console.error(e);process.exitCode=1});
