import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
const evidence='docs/evidence/project-package-2026-09-18';
const browser=await chromium.launch({channel:'msedge',headless:true});
const results=[];
try {
  for(const [mode,port] of [['development',1421],['production',1423]]){
    const child=spawn(process.execPath,['node_modules/vite/bin/vite.js',...(mode==='production'?['preview']:[]),'--host','127.0.0.1','--port',String(port),'--strictPort'],{windowsHide:true,stdio:'ignore'});
    try {
      let ready=false;
      for(let i=0;i<80;i++){try{if((await fetch('http://127.0.0.1:'+port)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,150));}
      assert(ready);
      for(const width of [1440,390]){
        const context=await browser.newContext({viewport:{width,height:width===390?844:900}});
        const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
        await page.goto('http://127.0.0.1:'+port);
        await page.getByRole('button',{name:'打开设置',exact:true}).click();
        await page.getByRole('button',{name:'储存',exact:true}).click();
        const section=page.getByTestId('project-package-actions');
        await section.scrollIntoViewIfNeeded();
        assert(await section.getByRole('button',{name:'导出项目包',exact:true}).isDisabled());
        assert(await section.getByText('项目包操作目前仅支持 Desktop；Web 文件导入导出尚未接入。',{exact:true}).isVisible());
        const state=await page.evaluate(()=>({url:location.href,mode:document.querySelector('[data-runtime-mode]').dataset.runtimeMode,entry:document.querySelector('[data-runtime-entry]').dataset.runtimeEntry,scripts:[...document.scripts].map(s=>s.src).filter(Boolean),overflow:document.documentElement.scrollWidth>innerWidth}));
        assert.equal(state.mode,mode);assert.equal(state.overflow,false);assert.deepEqual(errors,[]);
        await page.screenshot({path:`${evidence}/${mode}-${width}.png`});
        results.push({...state,width,webDisabled:true,errors});await context.close();
      }
    } finally {child.kill();await new Promise(r=>setTimeout(r,300));}
  }
  await writeFile(`${evidence}/web-acceptance.json`,JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}
