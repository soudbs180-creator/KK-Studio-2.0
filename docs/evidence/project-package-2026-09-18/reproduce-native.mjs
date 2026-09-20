import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { emptySnapshot, createProject, createTask, normalizeCreationSnapshot } from '../../../src/features/creation/model.ts';
import { encodeSnapshotAssets } from '../../../src/features/creation/snapshotAssets.ts';

const worktree=process.cwd();
const exe=path.join(worktree,'src-tauri/target/release/kk-studio.exe');
const runRoot=path.join(worktree,'.tmp','t3b-accept-'+Date.now());
const sourceRoot=path.join(runRoot,'source');
const targetRoot=path.join(runRoot,'restored');
const packagePath=path.join(runRoot,'backup.kkproject');
const evidence=path.join(worktree,'docs/evidence/project-package-2026-09-18');
await mkdir(sourceRoot,{recursive:true}); await mkdir(evidence,{recursive:true});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const pngBase64='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const png=Buffer.from(pngBase64,'base64'); const sha256=hash(png); const assetId='asset-'+sha256.slice(0,24);
const preview='data:image/png;base64,'+pngBase64;
const metadata={assetId,sha256,mime:'image/png',tags:['T3b','native-acceptance'],source:'upload',isAiGenerated:false,provenance:{generatedAt:'2026-09-18T12:00:00.000Z'}};
const asset={...metadata,preview};
const attachment={id:'attachment-package',assetId,name:'original.png',mime:'image/png',size:png.length,dataUrl:preview};
const project=createProject({prompt:'T3b 项目包恢复',model:'fixture-model',kind:'image',attachments:[attachment]});
project.items[0]={...project.items[0],assetId,preview,generationStatus:'succeeded',result:{id:'result-original',kind:'image',title:'Original',description:'',source:'provider',src:preview}};
project.items.push({id:'package-node2',title:'参考节点',description:'',kind:'image',parentAssetId:assetId});
project.canvas={version:1,positions:{[project.items[0].id]:{x:82,y:107},'package-node2':{x:660,y:107}},edges:[{id:'package-edge',source:project.items[0].id,target:'package-node2',kind:'reference'}],viewport:{x:20,y:-15,scale:0.8}};
project.tasks=[{...createTask(project),status:'succeeded',completedOutputs:1,outputs:[{index:0,status:'succeeded',assetId,model:'fixture-model',createdAt:1}]}];
const project2=createProject({prompt:'第二个恢复项目',model:'fixture-model',kind:'image',attachments:[]});
const snapshot=normalizeCreationSnapshot({...emptySnapshot(),revision:1,activeProjectId:project.id,projects:[project,project2]});
assert(snapshot);
const encoded=await encodeSnapshotAssets(snapshot,async()=>asset);
const sessions=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function launch(root,port,label){
  const profile=path.join(runRoot,label); await mkdir(profile);
  const child=spawn(exe,['--data-dir',root],{cwd:worktree,windowsHide:true,stdio:'ignore',env:{...process.env,WEBVIEW2_USER_DATA_FOLDER:profile,WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:'--remote-debugging-port='+port}});
  const session={child,profile,errors:[]}; sessions.push(session);
  let ready=false;
  for(let i=0;i<100;i++){try{const response=await fetch('http://127.0.0.1:'+port+'/json/version');if(response.ok){ready=true;break;}}catch{} await sleep(200);}
  assert(ready,'CDP startup');
  session.browser=await chromium.connectOverCDP('http://127.0.0.1:'+port);
  session.page=session.browser.contexts().flatMap(c=>c.pages())[0];
  session.page.on('pageerror',e=>session.errors.push(String(e)));
  session.page.on('console',m=>{if(m.type()==='error')session.errors.push(m.text());});
  await session.page.waitForURL('http://tauri.localhost/');
  await session.page.getByRole('button',{name:'打开设置',exact:true}).waitFor();
  await sleep(700); return session;
}
async function invoke(page,command,args={}){return page.evaluate(({command,args})=>window.__TAURI_INTERNALS__.invoke(command,args),{command,args});}
async function settings(page){await page.getByRole('button',{name:'打开设置',exact:true}).click();await page.getByRole('button',{name:'储存',exact:true}).click();}
async function runtime(page){return page.evaluate(()=>({url:location.href,mode:document.querySelector('[data-runtime-mode]')?.dataset.runtimeMode,entry:document.querySelector('[data-runtime-entry]')?.dataset.runtimeEntry,scripts:[...document.scripts].map(s=>s.src).filter(Boolean),body:document.body.innerText.slice(0,5000)}));}
async function close(session){try{await session.browser?.close();}catch{}session.child.kill();await sleep(400);}
try {
  const first=await launch(sourceRoot,9227,'source-profile');
  await invoke(first.page,'asset_store',{dataBase64:pngBase64,metadata});
  await invoke(first.page,'write_creation_snapshot',{snapshot:encoded,expectedRevision:null});
  await first.page.reload();await sleep(900);
  const before=await readFile(path.join(sourceRoot,'projects/creation-v2.json'));
  const durable=(await invoke(first.page,'read_creation_snapshot')).snapshot;
  const original=await readFile(path.join(sourceRoot,'assets/blobs',sha256));
  const exportSummary=await invoke(first.page,'export_project_package',{destination:packagePath,expectedRevision:durable.revision});
  const preflight=await invoke(first.page,'preflight_project_package',{source:packagePath}); assert.deepEqual(exportSummary,preflight);
  const imported=await invoke(first.page,'import_project_package',{source:packagePath,targetRoot});assert.deepEqual(imported,preflight);
  await assert.rejects(invoke(first.page,'import_project_package',{source:packagePath,targetRoot}),/target-not-empty/);
  await assert.rejects(invoke(first.page,'export_project_package',{destination:path.join(sourceRoot,'bad.kkproject'),expectedRevision:1}),/permission/);
  await assert.rejects(invoke(first.page,'export_project_package',{destination:path.join(runRoot,'stale.kkproject'),expectedRevision:999}),/conflict/);
  const after=await readFile(path.join(sourceRoot,'projects/creation-v2.json'));assert(before.equals(after));
  assert(original.equals(await readFile(path.join(sourceRoot,'assets/blobs',sha256))));
  await settings(first.page);
  assert.equal(await first.page.getByRole('button',{name:'导出项目包',exact:true}).isEnabled(),true);
  await first.page.screenshot({path:path.join(evidence,'native-settings.png')});
  const sourceRuntime=await runtime(first.page);
  const second=await launch(targetRoot,9228,'restored-fresh-profile');
  const restored=await invoke(second.page,'read_creation_snapshot');
  const restoredAsset=await invoke(second.page,'asset_read',{assetId});
  assert.deepEqual(restored.snapshot,durable);
  assert.equal(hash(Buffer.from(restoredAsset.dataBase64,'base64')),sha256);
  assert(before.equals(await readFile(path.join(targetRoot,'projects/creation-v2.json'))));
  await second.page.getByRole('button',{name:'项目库',exact:true}).click();
  await second.page.locator('.project-library-card').filter({hasText:'T3b 项目包恢复'}).click();
  await second.page.getByRole('region',{name:'无限画布',exact:true}).waitFor();
  await sleep(600);
  assert.equal(await second.page.getByRole('region',{name:'无限画布',exact:true}).locator('img').evaluateAll((imgs,preview)=>imgs.some(img=>img.complete&&img.naturalWidth===1&&img.src===preview),preview),true);
  const visibleSnapshot=(await invoke(second.page,'read_creation_snapshot')).snapshot;
  assert.deepEqual(visibleSnapshot.projects.map(p=>p.canvas),durable.projects.map(p=>p.canvas));
  assert.deepEqual(visibleSnapshot.projects.map(p=>p.tasks),durable.projects.map(p=>p.tasks));
  assert.deepEqual(visibleSnapshot.projects.map(p=>p.messages),durable.projects.map(p=>p.messages));
  await second.page.screenshot({path:path.join(evidence,'restored-fresh-webview.png')});
  const targetRuntime=await runtime(second.page);
  const result={sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceTreeStatus:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),executable:exe,executableSha256:hash(await readFile(exe)),packageSha256:hash(await readFile(packagePath)),manifestChecksum:preflight.checksum,sourceRoot,targetRoot,sourceRuntime,targetRuntime,profiles:[first.profile,second.profile],counts:{projects:encoded.projects.length,nodes:encoded.projects.reduce((n,p)=>n+p.items.length,0),edges:project.canvas.edges.length,messages:encoded.projects.reduce((n,p)=>n+p.messages.length,0),tasks:project.tasks.length,assets:preflight.assetIds.length},checks:{fullSnapshotEqual:true,sourceBytesUnchanged:true,restoredSnapshotBytesEqual:true,originalSha256:sha256,restoredOriginalSha256:hash(Buffer.from(restoredAsset.dataBase64,'base64')),freshWebviewMediaLoaded:true,occupiedTargetRejected:true,activeRootRejected:true,staleRevisionRejected:true},errors:[...first.errors,...second.errors]};
  assert.deepEqual(result.errors,[]);
  await writeFile(path.join(evidence,'native-acceptance.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({checks:result.checks,counts:result.counts,packageSha256:result.packageSha256,errors:result.errors},null,2));
} finally {for(const session of sessions.reverse())await close(session);}
