const {chromium}=require('playwright');
const fs=require('node:fs');const path=require('node:path');
(async()=>{
  const browser=await chromium.launch({channel:'msedge'});
  try{
    const page=await browser.newPage({viewport:{width:1920,height:1080}});
    await page.goto('http://127.0.0.1:1422');
    await page.evaluate(()=>Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{}))));
    const geometry=await page.evaluate(()=>{
      const measure=(selector,origin)=>{const el=document.querySelector(selector),r=el.getBoundingClientRect(),o=document.querySelector(origin).getBoundingClientRect();return {x:r.x-o.x,y:r.y-o.y,width:r.width,height:r.height};};
      const toolbar=Object.fromEntries(['toolbar-add','toolbar-current-tool','toolbar-toggle','toolbar-favorite','toolbar-assets','toolbar-help'].map(name=>[name,measure('.'+name,'.canvas-toolbar')]));
      const navigation=Object.fromEntries(['canvas-arrange','canvas-background','canvas-lines','canvas-map-trigger'].map(name=>[name,measure('.'+name,'.canvas-navigation-tools')]));
      return {toolbar,navigation,disabledOpacity:getComputedStyle(document.querySelector('.toolbar-favorite')).opacity,toolbarColor:getComputedStyle(document.querySelector('.canvas-toolbar')).backgroundColor};
    });
    await page.locator('.canvas-toolbar').screenshot({path:path.join(__dirname,'toolbar-desktop.png')});
    await page.locator('.canvas-top-right').screenshot({path:path.join(__dirname,'navigation-desktop.png')});
    await page.locator('.canvas-zoom-trigger').click();
    await page.getByRole('menuitemradio',{name:'200%',exact:true}).click();
    await page.locator('.canvas-zoom-trigger').click();
    const navBox=await page.locator('.canvas-top-right').boundingBox();
    const menuBox=await page.locator('.canvas-zoom-menu').boundingBox();
    geometry.openMenu={x:menuBox.x-navBox.x,y:menuBox.y-navBox.y,width:menuBox.width,height:menuBox.height};
    await page.screenshot({path:path.join(__dirname,'navigation-open-200.png'),clip:{x:navBox.x,y:navBox.y,width:navBox.width,height:menuBox.y+menuBox.height-navBox.y}});
    await page.keyboard.press('Escape');
    await page.locator('.canvas-zoom-trigger').click();
    await page.getByRole('menuitemradio',{name:'100%',exact:true}).click();
    await page.getByRole('button',{name:'收起对话',exact:true}).click();
    await page.getByRole('button',{name:'收起侧边栏',exact:true}).click();
    await page.screenshot({path:path.join(__dirname,'workspace-collapsed-source-state.png')});
    const expectedToolbar={'toolbar-add':{x:5,y:5,width:40,height:40},'toolbar-current-tool':{x:61,y:5,width:40,height:40},'toolbar-toggle':{x:103,y:5,width:20,height:40},'toolbar-favorite':{x:125,y:5,width:40,height:40},'toolbar-assets':{x:167,y:5,width:40,height:40},'toolbar-help':{x:225,y:10,width:30,height:30}};
    const expectedNavigation={'canvas-arrange':{x:8,y:4,width:47,height:18},'canvas-background':{x:61,y:4,width:18,height:18},'canvas-lines':{x:81,y:4,width:18,height:18},'canvas-map-trigger':{x:101,y:4,width:55,height:18}};
    const delta=(actual,expected)=>Object.fromEntries(Object.entries(expected).map(([name,values])=>[name,Object.fromEntries(Object.entries(values).map(([axis,value])=>[axis,actual[name][axis]-value]))]));
    const result={geometry,expectedToolbar,expectedNavigation,toolbarDelta:delta(geometry.toolbar,expectedToolbar),navigationDelta:delta(geometry.navigation,expectedNavigation),remaining:'Glyphs in the bottom toolbar still use legacy Lucide; responsive placement and screen-space controls are engineering supplements.'};
    fs.writeFileSync(path.join(__dirname,'source-compare.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({toolbarDelta:result.toolbarDelta,navigationDelta:result.navigationDelta,disabledOpacity:geometry.disabledOpacity}));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
