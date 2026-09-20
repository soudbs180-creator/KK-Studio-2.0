const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const label = process.argv[2] || 'before';
  const browser = await chromium.launch({channel:'msedge'});
  const page = await browser.newPage({viewport:{width:1920,height:1080}});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto('http://127.0.0.1:1422');
    await page.getByRole('button',{name:'打开设置',exact:true}).click();
    const panel = page.locator('.settings-panel');
    await panel.screenshot({path:path.join(__dirname,`${label}-dark.png`),animations:'disabled'});
    const measure = () => panel.evaluate(root => {
      const origin = root.getBoundingClientRect();
      const result = {};
      for (const [name,selector] of Object.entries({panel:'.settings-panel',navigation:'.settings-nav-item',content:'.settings-content',title:'.settings-page-title',language:'.settings-select',theme:'.settings-row:nth-child(2) .settings-select',toggle:'.settings-toggle',thumb:'.settings-toggle span',close:'.settings-close'})) {
        const el = selector === '.settings-panel' ? root : root.querySelector(selector);
        const box = el.getBoundingClientRect(); const css = getComputedStyle(el);
        result[name] = {x:box.x-origin.x,y:box.y-origin.y,width:box.width,height:box.height,color:css.color,background:css.backgroundColor,borderColor:css.borderColor,radius:css.borderRadius,font:css.fontSize,weight:css.fontWeight,transition:css.transition};
      }
      return result;
    });
    const dark = await measure();
    let interaction;
    if (label === 'after') {
      const toggle = page.getByRole('switch',{name:'浮岛布局',exact:true});
      await toggle.click();
      await page.evaluate(() => Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{}))));
      const off = await measure();
      for (let i=0;i<3;i++) await toggle.click();
      await page.evaluate(() => Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{}))));
      const checkedAfterRapid = await toggle.getAttribute('aria-checked');
      await page.keyboard.press('Tab');
      const focus = await page.evaluate(() => ({label:document.activeElement.getAttribute('aria-labelledby'),color:getComputedStyle(document.activeElement).outlineColor,width:getComputedStyle(document.activeElement).outlineWidth}));
      await page.emulateMedia({reducedMotion:'reduce'});
      await toggle.click();
      const reduced = await page.locator('.settings-toggle span').first().evaluate(el=>({transition:getComputedStyle(el).transitionDuration,animations:document.getAnimations().length}));
      await toggle.click();
      await page.emulateMedia({reducedMotion:'no-preference'});
      interaction = {offThumbOffset:off.thumb.x-off.toggle.x,onThumbOffset:dark.thumb.x-dark.toggle.x,checkedAfterRapid,focus,reduced,disabledDesktop:await page.locator('.settings-toggle:disabled').count()};
      if (checkedAfterRapid !== 'true' || Math.abs(interaction.offThumbOffset-2.667)>.03 || reduced.animations !== 0) throw new Error('Settings interaction measurements failed');
    }
    await page.getByRole('combobox',{name:'主题',exact:true}).selectOption('light');
    await page.getByRole('button',{name:'收起设置提示',exact:true}).click();
    await panel.screenshot({path:path.join(__dirname,`${label}-light.png`),animations:'disabled'});
    const light = await measure();
    const viewports = [];
    if (label === 'after') {
      await page.getByRole('combobox',{name:'主题',exact:true}).selectOption('dark');
      await page.getByRole('button',{name:'收起设置提示',exact:true}).click();
      for (const [width,height] of [[1920,1080],[1440,900],[768,1024],[390,844]]) {
        await page.setViewportSize({width,height});
        await panel.screenshot({path:path.join(__dirname,`settings-${width}.png`),animations:'disabled'});
        const box = await panel.boundingBox();
        const overflow = await panel.evaluate(el=>({width:el.scrollWidth-el.clientWidth,document:document.documentElement.scrollWidth-window.innerWidth}));
        viewports.push({width,height,panel:box,overflow});
        if (box.x<0 || box.y<0 || box.x+box.width>width || box.y+box.height>height || overflow.document>0) throw new Error('Settings viewport overflow');
      }
    }
    fs.writeFileSync(path.join(__dirname,`${label}.json`),JSON.stringify({capturedAt:new Date().toISOString(),dark,light,interaction,viewports,errors},null,2));
    console.log(JSON.stringify({label,panel:dark.panel,interaction,viewports:viewports.map(v=>({width:v.width,overflow:v.overflow})),errors}));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
