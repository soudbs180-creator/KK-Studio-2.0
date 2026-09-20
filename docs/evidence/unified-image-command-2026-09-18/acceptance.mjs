import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import path from 'node:path';
import { chromium, expect } from '@playwright/test';
const mode=process.argv[2]??'preview';
const cwd=process.cwd();
const evidence=path.join(cwd,'docs/evidence/unified-image-command-2026-09-18');
const runRoot=path.join(cwd,'.tmp','t4-'+mode+'-'+Date.now());
const dataRoot=path.join(runRoot,'data');
const exe=path.join(cwd,'src-tauri/target/release/kk-studio.exe');
await mkdir(dataRoot,{recursive:true});await mkdir(evidence,{recursive:true});
const sessions=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const pixel='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const baseUrl='https://t4-'+mode+'.example.test/v1';
async function launch(label){
 const native=mode==='native'; const port=native?9238:mode==='dev'?1421:1423;
 const profile=path.join(runRoot,label);await mkdir(profile);
 const child=spawn(native?exe:process.execPath,native?['--data-dir',dataRoot]:['node_modules/vite/bin/vite.js',...(mode==='preview'?['preview']:[]),'--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd,windowsHide:true,stdio:'ignore',env:{...process.env,WEBVIEW2_USER_DATA_FOLDER:profile,WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:'--remote-debugging-port='+port}});
 const session={child,profile};sessions.push(session);
 let ready=false;
 for(let i=0;i<100;i++){try{if((await fetch(`http://127.0.0.1:${port}/${native?'json/version':''}`)).ok){ready=true;break;}}catch{}await sleep(200);}
 assert(ready,'runtime ready');
 session.browser=native?await chromium.connectOverCDP('http://127.0.0.1:'+port):await chromium.launch({channel:'msedge',headless:true});
 session.page=native?session.browser.contexts().flatMap(c=>c.pages())[0]:await session.browser.newPage({viewport:{width:1920,height:1080}});
 if(!native)await session.page.goto('http://127.0.0.1:'+port+'/');
 await session.page.getByRole('button',{name:'打开设置',exact:true}).waitFor();await sleep(300);return session;
}
async function invoke(page,command,args={}){return page.evaluate(({command,args})=>window.__TAURI_INTERNALS__.invoke(command,args),{command,args});}
async function snapshot(page){return mode==='native'?(await invoke(page,'read_creation_snapshot')).snapshot:await page.evaluate(()=>JSON.parse(localStorage.getItem('kk-studio-next:creation:v1')));}
async function settings(page){await page.getByRole('button',{name:'打开设置',exact:true}).click();await page.getByRole('button',{name:'模型供应商',exact:true}).click();}
async function completed(page,count){await expect.poll(async()=>{const s=await snapshot(page);const p=s?.projects.find(p=>p.id===s.activeProjectId);return p?.tasks.filter(t=>t.status==='succeeded').length;},{timeout:10000}).toBe(count);await expect(page.locator('.project-save-state')).toContainText('已保存');}
async function close(s){await s.browser?.close().catch(()=>{});s.child.kill();await sleep(500);}
let credentialRef;let first;
try{
 first=await launch('profile-1');const page=first.page;const errors=[];page.on('pageerror',e=>errors.push(String(e)));const requests=[];
 await page.route(baseUrl+'/images/*',async route=>{requests.push({url:route.request().url(),editHasOriginal:route.request().url().endsWith('/edits')?route.request().postDataBuffer()?.includes(Buffer.from(pixel,'base64')):undefined});await route.fulfill({json:{data:[{b64_json:pixel}]}});});
 await settings(page);
 await page.getByLabel('供应商名称').fill('T4 '+mode+' fixture');await page.getByLabel('API Base URL').fill(baseUrl);await page.getByLabel('默认模型').fill('image-test');await page.getByLabel('API Key').fill('t4-fixture-key');await page.getByRole('button',{name:'保存供应商'}).click();
 await expect(page.locator('.connection-verification')).toHaveText('未验证生成');
 credentialRef=await page.evaluate(()=>JSON.parse(localStorage.getItem('kk-studio-next:provider-connections:v1'))[0].credentialRef);
 await page.getByRole('button',{name:'关闭设置',exact:true}).click();
 await page.getByLabel('创作提示词').fill('T4 '+mode+' 三入口验收');await page.getByRole('button',{name:'开始创建项目'}).click();await page.getByRole('button',{name:'批准并提交'}).click();await completed(page,1);
 await page.getByLabel('对话内容').fill('第二次图片创作');await page.getByRole('button',{name:'发送消息'}).click();await page.getByRole('button',{name:'批准并提交'}).click();await completed(page,2);
 let state=await snapshot(page);let project=state.projects.find(p=>p.id===state.activeProjectId);const sourceId=project.tasks[1].resultItemId;
 const node=page.getByTestId('canvas-node-'+sourceId);await node.focus();await page.keyboard.press('Enter');const composer=page.getByTestId('image-composer');await composer.getByLabel('图片提示词').fill('从结果节点继续编辑原件');await composer.getByRole('button',{name:'生成数量',exact:true}).click();await page.keyboard.press('Home');await page.keyboard.press('Escape');await composer.getByRole('button',{name:'生成图片',exact:true}).click();await page.getByRole('button',{name:'批准并提交'}).click();await completed(page,3);
 state=await snapshot(page);project=state.projects.find(p=>p.id===state.activeProjectId);const edited=project.tasks[2];assert.equal(edited.sourceItemId,sourceId);assert.equal(project.tasks.length,3);assert.equal(project.canvas.edges.filter(e=>e.kind==='result').length,3);assert.equal(edited.attachments.length,1);assert.deepEqual(requests.map(r=>r.url.split('/').at(-1)),['generations','generations','edits']);assert.equal(requests[2].editHasOriginal,true);
 const runtime=await page.evaluate(()=>({url:location.href,mode:document.querySelector('[data-runtime-mode]')?.dataset.runtimeMode,entry:document.querySelector('[data-runtime-entry]')?.dataset.runtimeEntry,scripts:[...document.scripts].map(s=>s.src).filter(Boolean),route:document.querySelector('.workspace-content:not([hidden])')?'workspace':'other'}));
 await page.screenshot({path:path.join(evidence,mode+'-canvas.png')});await settings(page);await expect(page.locator('.connection-verification')).toHaveText('已验证生成');await page.screenshot({path:path.join(evidence,mode+'-provider.png')});await page.getByRole('button',{name:'清除密钥',exact:true}).click();await expect(page.getByText('已清除当前供应商的密钥。',{exact:true})).toBeVisible();
 let restored=false,originalHash;
 if(mode==='native'){
  const assetId=edited.outputs[0].assetId;const original=await invoke(page,'asset_read',{assetId});originalHash=hash(Buffer.from(original.dataBase64,'base64'));assert.equal(originalHash,hash(Buffer.from(pixel,'base64')));
  await close(first);const second=await launch('fresh-profile-2');const recovered=await snapshot(second.page);assert.deepEqual(recovered.projects.map(p=>p.tasks),state.projects.map(p=>p.tasks));assert.deepEqual(recovered.projects.map(p=>p.canvas),state.projects.map(p=>p.canvas));const recoveredAsset=await invoke(second.page,'asset_read',{assetId});assert.equal(hash(Buffer.from(recoveredAsset.dataBase64,'base64')),originalHash);restored=true;await second.page.getByRole('button',{name:'项目库',exact:true}).click();await second.page.locator('.project-library-card').first().click();await second.page.screenshot({path:path.join(evidence,'native-fresh-profile.png')});
 }
 assert.deepEqual(errors,[]);
 const result={mode,sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),runtime,requests,sourceIds:project.tasks.map(t=>t.sourceItemId),taskStatuses:project.tasks.map(t=>t.status),results:project.tasks.map(t=>t.resultItemId),resultEdges:project.canvas.edges.filter(e=>e.kind==='result'),originalHash,freshProfileRestored:restored,credentialCleared:true,errors,executableSha256:mode==='native'?hash(await readFile(exe)):undefined};await writeFile(path.join(evidence,mode+'-acceptance.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}finally{
 if(mode==='native'&&first?.page&&credentialRef)await invoke(first.page,'credential_delete',{providerId:credentialRef}).catch(()=>{});
 for(const session of sessions.reverse())await close(session);
}
