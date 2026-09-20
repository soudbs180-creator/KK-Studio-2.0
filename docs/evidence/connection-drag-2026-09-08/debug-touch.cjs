const {chromium}=require('@playwright/test');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext({viewport:{width:768,height:1024},hasTouch:true});
 const page=await context.newPage();
 await page.goto('http://127.0.0.1:1422/');
 await page.evaluate(()=>{
   window.trace=[];
   for(const type of ['touchstart','touchend','touchmove','pointerdown','pointerup','pointercancel','mousedown','mouseup','click','dblclick','focusin'])document.addEventListener(type,e=>{const info={type,target:e.target.outerHTML.slice(0,240),pointer:e.pointerType,primary:e.isPrimary,detail:e.detail,menu:document.querySelector('.add-node-menu')?.getAttribute('aria-label'),x:e.clientX,y:e.clientY,t:performance.now()};window.trace.push(info);setTimeout(()=>info.prevented=e.defaultPrevented,0);},true);
 });
 await page.getByRole('button',{name:'添加资源',exact:true}).tap();
 await page.getByRole('menuitem',{name:'文本',exact:true}).tap();
 const port=page.getByTestId('canvas-node-added-text-1').locator('.node-add-follow');
 const box=await port.boundingBox();
 const session=await context.newCDPSession(page);
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2,id:1}]});
 await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:650,y:650,id:1}]});
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.locator('.add-node-menu').screenshot({path:__dirname+'/touch-debug-menu.png'});
 if(process.argv[2]==='pause')await new Promise(resolve=>setTimeout(resolve,700));
 const audio=await page.getByRole('menuitem',{name:'音频',exact:true}).boundingBox();
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:audio.x+audio.width/2,y:audio.y+audio.height/2,id:1}]});
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.screenshot({path:__dirname+'/touch-debug-after.png'});
 const data=await page.evaluate(()=>({trace:window.trace,nodes:[...document.querySelectorAll('[data-canvas-node]')].map(x=>x.dataset.nodeId),edges:[...document.querySelectorAll('.connection')].map(x=>x.outerHTML.slice(0,160)),menu:document.querySelector('.add-node-menu')?.outerHTML.slice(0,180)}));
 fs.writeFileSync(__dirname+'/touch-debug-'+(process.argv[2]||'third')+'.json',JSON.stringify(data,null,2));console.log(JSON.stringify({nodes:data.nodes,trace:data.trace.slice(-6)}));
 await browser.close();
})();
