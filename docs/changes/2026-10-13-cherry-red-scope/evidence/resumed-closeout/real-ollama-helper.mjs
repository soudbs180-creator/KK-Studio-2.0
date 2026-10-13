import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { chromium, expect } from '@playwright/test';
import { inspectDesktopRelease } from '../../scripts/windows/desktop-release.mjs';

const root = process.cwd();
const runId = randomUUID();
const output = path.join(root, '.tmp/cherry-red/local-native-real', runId);
const dataRoot = path.join(output, 'data');
const restoredRoot = path.join(output, 'restored');
const profile = path.join(output, 'profile');
const packagePath = path.join(output, 'comparison.kkproject');
const endpoint = 'http://127.0.0.1:11434/v1';
const models = ['qwen2.5:0.5b', 'smollm2:135m'];
const vaultId = `kk-cherry-synthetic-${runId}`;
const syntheticSecret = `SYNTHETIC-NOT-A-PROVIDER-KEY-${randomUUID()}`;
const cdp = 'http://127.0.0.1:9357';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const report = {startedAt:new Date().toISOString(), sourceHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(), release:inspectDesktopRelease(root), endpoint, models, profile, dataRoot, restoredRoot, checks:[], errors:[], passed:false};
assert.equal(report.release.reason, 'current', JSON.stringify(report.release));
const exe = path.join(root, 'src-tauri/target/release/kk-studio.exe');
report.exeHashBefore = digest(await fs.readFile(exe));
const available = () => fetch(`${cdp}/json/version`, {signal:AbortSignal.timeout(1000)}).then(r=>r.ok).catch(()=>false);
assert.equal(await available(), false, 'Owned audit debug port must be free');
await fs.mkdir(output, {recursive:true});
let app, browser, page, ollama, ollamaOut, ollamaErr, vaultWritten = false;
let projectId, connectionId, assistantId;
const invoke = (command,args={}) => page.evaluate(({command,args})=>window.__TAURI_INTERNALS__.invoke(command,args),{command,args});
const snapshot = async () => {
  const state = await invoke('read_creation_snapshot');
  assert(state.snapshot, 'Native snapshot must exist');
  return state.snapshot;
};
async function close() {
  if (app && app.exitCode === null) {
    execFileSync('powershell.exe', ['-NoProfile','-Command', `(Get-Process -Id ${app.pid}).CloseMainWindow() | Out-Null`], {windowsHide:true});
    await expect.poll(()=>app.exitCode,{timeout:15000}).not.toBeNull();
  }
  await browser?.close();
  await expect.poll(available,{timeout:10000}).toBe(false);
}
async function launch(data) {
  assert.equal(await available(), false);
  app = spawn(exe, ['--data-dir',data], {cwd:root,stdio:'ignore',windowsHide:true,env:{...process.env,WEBVIEW2_USER_DATA_FOLDER:profile,WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:'--remote-debugging-port=9357 --remote-debugging-address=127.0.0.1 --host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE tauri.localhost, EXCLUDE localhost, EXCLUDE 127.0.0.1'}});
  await expect.poll(available,{timeout:30000}).toBe(true);
  browser = await chromium.connectOverCDP(cdp);
  page = browser.contexts().flatMap(context=>context.pages())[0];
  page.setDefaultTimeout(15000);
  await page.waitForURL('http://tauri.localhost/');
  await expect(page.locator('.app')).toHaveAttribute('data-runtime-mode','production');
  await expect(page.getByText('正在读取本地项目…',{exact:true})).toHaveCount(0);
  await page.evaluate(({ownedId})=> {
    const real=window.__TAURI_INTERNALS__.invoke;
    window.__TAURI_INTERNALS__.invoke=(command,args,options)=> {
      if(command==='credential_get' && args?.providerId!==ownedId) return Promise.resolve(null);
      return real(command,args,options);
    };
  },{ownedId:vaultId});
  const actualRoot = await invoke('get_storage_root');
  assert.equal(path.resolve(actualRoot).toLowerCase(), path.resolve(data).toLowerCase());
  report.checks.push({name:'launch',data, pid:app.pid,loadedScripts:await page.evaluate(()=>[...document.scripts].map(s=>s.src).filter(Boolean))});
}
async function workspace(create=false) {
  await page.getByRole('button',{name:'项目库',exact:true}).click();
  if (create) {
    await page.getByRole('button',{name:'新建项目',exact:true}).click();
    await expect.poll(async()=> {
      const pending=await invoke('read_creation_snapshot');
      if(pending.status==='missing' && !pending.snapshot) return 0;
      assert(pending.snapshot,'Only an initial missing snapshot is pending');
      return pending.snapshot.projects.length;
    },{timeout:10000}).toBe(1);
    projectId = (await snapshot()).projects[0].id;
  } else await page.locator('.project-library-card').click();
  await expect(page.getByTestId('infinite-canvas')).toBeVisible();
  await page.getByLabel('执行方式').selectOption('models');
  assert.equal((await snapshot()).activeProjectId, projectId);
}
async function round(prompt, expectedCount) {
  await page.getByLabel('多模型对话输入').fill(prompt);
  await page.getByRole('button',{name:'同时发送',exact:true}).click();
  await expect.poll(async()=>{
    const project = (await snapshot()).projects.find(p=>p.id===projectId);
    return project.tasks.filter(task=>task.conversationRoundId && task.status==='succeeded').length;
  },{timeout:180000,intervals:[500,1000,2000]}).toBe(expectedCount);
  const project = (await snapshot()).projects.find(p=>p.id===projectId);
  const tasks = project.tasks.filter(task=>task.conversationRoundId);
  assert.equal(tasks.length, expectedCount);
  for (const task of tasks) {
    assert.equal(task.kind,'text');
    assert.equal(task.providerBaseUrl,endpoint);
    assert.equal(task.providerAuthMode,'none');
    assert.equal(task.providerProtocol,'openai-compatible');
    assert.equal(task.providerConnectionId,connectionId);
    assert(models.includes(task.model));
    assert.equal(task.status,'succeeded');
    assert(task.outputs[0].text.trim());
    const native = await invoke('task_host_get',{taskId:task.id});
    assert.equal(native.status,'succeeded');
    assert.equal(native.outputs[0].text,task.outputs[0].text);
  }
  const latest = tasks.slice(-2);
  assert.deepEqual(new Set(latest.map(t=>t.model)),new Set(models));
  for (const task of latest) {
    assert.equal(task.conversationMessages[0].role,'system');
    assert.equal(task.conversationMessages[0].content,'Reply in one short line. Use no tools.');
    assert.equal(task.conversationMessages.at(-1).content,prompt);
    if (expectedCount>2) {
      const ownPrior = tasks.find(t=>t.model===task.model && t.id!==task.id);
      assert.equal(task.conversationMessages.filter(m=>m.role==='assistant').length,1);
      assert.equal(task.conversationMessages.find(m=>m.role==='assistant').content,ownPrior.outputs[0].text);
    }
  }
  report.checks.push({name:'real-ui-round',prompt,tasks:latest.map(t=>({id:t.id,model:t.model,status:t.status,text:t.outputs[0].text,messages:t.conversationMessages}))});
  await page.screenshot({path:path.join(output,`round-${expectedCount}.png`)});
  return project;
}
try {
  const previousOwner=JSON.parse(await fs.readFile(path.join(root,'.tmp/cherry-red/ollama-real/owner.json'),'utf8'));
  assert.equal(digest(await fs.readFile(previousOwner.executable)),previousOwner.executableSha256);
  const existing=await fetch(`${endpoint}/models`,{signal:AbortSignal.timeout(1000)}).then(()=>true).catch(()=>false);
  assert.equal(existing,false,'The audit must start its own model service; never replace an existing service');
  ollamaOut=await fs.open(path.join(output,'ollama.stdout.log'),'wx');
  ollamaErr=await fs.open(path.join(output,'ollama.stderr.log'),'wx');
  ollama=spawn(previousOwner.executable,['serve'],{windowsHide:true,stdio:['ignore',ollamaOut.fd,ollamaErr.fd],env:{...process.env,USERPROFILE:previousOwner.profileDirectory,TEMP:previousOwner.tempDirectory,TMP:previousOwner.tempDirectory,OLLAMA_HOST:'127.0.0.1:11434',OLLAMA_MODELS:previousOwner.modelsDirectory,OLLAMA_NO_CLOUD:'1',CUDA_VISIBLE_DEVICES:'-1',ROCR_VISIBLE_DEVICES:'-1',HIP_VISIBLE_DEVICES:'-1',GGML_VK_VISIBLE_DEVICES:'-1',OLLAMA_VULKAN:'false'}});
  await expect.poll(()=>fetch(`${endpoint}/models`,{signal:AbortSignal.timeout(1000)}).then(r=>r.ok).catch(()=>false),{timeout:15000}).toBe(true);
  const originResponse=await fetch(`${endpoint}/models`,{headers:{Origin:'http://tauri.localhost'}});
  report.checks.push({name:'owned-cpu-model-service',pid:ollama.pid,executable:previousOwner.executable,executableSha256:previousOwner.executableSha256,originStatus:originResponse.status,cors:originResponse.headers.get('access-control-allow-origin')});
  report.discoveryScope='Real Native loopback GET; the unchanged local server may reject the WebView origin';
  await launch(dataRoot);
  assert.equal(await invoke('credential_get',{providerId:vaultId}),null);
  assert.equal(await invoke('credential_set',{providerId:vaultId,secret:syntheticSecret}),true);
  vaultWritten=true;
  assert.equal(await invoke('credential_get',{providerId:vaultId}),syntheticSecret);
  report.checks.push({name:'synthetic-vault-write-read',providerId:vaultId,passed:true});
  await page.evaluate(({endpoint,model,name})=>localStorage.setItem('kk-studio-next:model-provider:v1',JSON.stringify({version:1,name,baseUrl:endpoint,model,protocol:'openai-compatible',authMode:'none'})),{endpoint,model:models[0],name:`KK-local-audit-${runId}`});
  await page.getByRole('button',{name:'打开设置',exact:true}).click();
  await page.getByRole('navigation',{name:'设置分类'}).getByRole('button',{name:'模型接入',exact:true}).click();
  await page.getByRole('button',{name:'API Key（官方）',exact:true}).click();
  const form=page.locator('.provider-form');
  await form.getByLabel('预置提供商').selectOption('ollama');
  await form.getByLabel('模型名称',{exact:true}).fill(models[0]);
  await form.getByRole('button',{name:'保存',exact:true}).click();
  await expect(form.getByText('连接信息已保存。API Key 不会写入浏览器存储或项目快照。',{exact:true})).toBeVisible();
  await form.getByRole('button',{name:'测试连接',exact:true}).click();
  await expect(form.getByText(/连接成功，已刷新 2 个模型/)).toBeVisible();
  for (const model of models) {
    await form.getByLabel('已发现的模型',{exact:true}).selectOption(model);
    await form.getByLabel('当前模型用途',{exact:true}).selectOption('text');
    await form.getByRole('button',{name:'保存此模型能力',exact:true}).click();
    await expect(form.getByText('已保存此模型的参数声明；生成结果仍以服务返回为准。',{exact:true})).toBeVisible();
  }
  const provider=await page.evaluate(()=>JSON.parse(localStorage.getItem('kk-studio-next:provider-connections:v1')??'[]'));
  // The durable registry is authoritative; metadata must never contain a key.
  const durable=await invoke('read_provider_config');
  const configured=durable.connections.find(c=>c.baseUrl==='http://127.0.0.1:11434/v1');
  assert(configured);
  connectionId=configured.id;
  assert.equal(configured.authMode,'none');
  assert.equal(configured.verificationStatus,'unverified');
  assert.equal(JSON.stringify(durable).includes(syntheticSecret),false);
  report.checks.push({name:'real-ui-local-configuration',connection:configured,localMetadataCount:provider.length});
  await page.getByRole('button',{name:'关闭设置',exact:true}).click();
  await workspace(true);
  for (const [index,model] of models.entries()) await page.getByLabel(`对话模型 ${index+1}`,{exact:true}).selectOption(JSON.stringify([connectionId,model]));
  await page.getByRole('button',{name:'新建助手',exact:true}).click();
  const editor=page.getByRole('dialog',{name:'新建自定义助手',exact:true});
  await editor.getByLabel('助手名称').fill('本地短答验收助手');
  await editor.getByLabel('助手指令').fill('Reply in one short line. Use no tools.');
  await editor.getByRole('button',{name:'保存助手',exact:true}).click();
  assistantId=await page.getByLabel('对话助手',{exact:true}).inputValue();
  assert.match(assistantId,/^assistant-/);
  await round('What is 2 plus 2? Answer briefly.',2);
  await close();
  await launch(dataRoot);
  assert.equal(await invoke('credential_get',{providerId:vaultId}),syntheticSecret);
  report.checks.push({name:'synthetic-vault-real-restart',passed:true});
  await workspace();
  await expect(page.getByLabel('对话助手',{exact:true})).toHaveValue(assistantId);
  await expect(page.locator('.provider-conversation-replies').getByText('已完成',{exact:true})).toHaveCount(2);
  const finalProject=await round('Summarize your previous answer in one short line.',4);
  const beforeExport=await snapshot();
  const exported=await invoke('export_project_package',{destination:packagePath,expectedRevision:beforeExport.revision});
  const preflight=await invoke('preflight_project_package',{source:packagePath});
  const imported=await invoke('import_project_package',{source:packagePath,targetRoot:restoredRoot});
  assert.deepEqual(exported.projectIds,[projectId]);
  assert.deepEqual(preflight.projectIds,exported.projectIds);
  assert.deepEqual(imported.projectIds,exported.projectIds);
  assert.deepEqual(imported.assetIds,exported.assetIds);
  report.checks.push({name:'real-native-package-export-preflight-import',exported,preflight,imported,packageSha256:digest(await fs.readFile(packagePath))});
  await close();
  await launch(restoredRoot);
  const restored=(await snapshot()).projects.find(p=>p.id===projectId);
  assert(restored);
  assert.deepEqual(restored.tasks,finalProject.tasks);
  assert.deepEqual(restored.messages,finalProject.messages);
  assert.deepEqual(restored.composerDraft.conversationRoutes,finalProject.composerDraft.conversationRoutes);
  assert.equal(restored.composerDraft.assistantId,assistantId);
  report.checks.push({name:'real-restored-directory-reopen',taskCount:restored.tasks.length,passed:true});
  assert.equal(await invoke('credential_delete',{providerId:vaultId}),true);
  vaultWritten=false;
  assert.equal(await invoke('credential_get',{providerId:vaultId}),null);
  report.checks.push({name:'owned-synthetic-vault-cleanup',passed:true});
  report.exeHashAfter=digest(await fs.readFile(exe));
  assert.equal(report.exeHashAfter,report.exeHashBefore);
  report.passed=true;
} catch(error) {
  report.errors.push(error.stack??String(error));
  process.exitCode=1;
  if(page) await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});
} finally {
  if(vaultWritten && page) {
    await invoke('credential_delete',{providerId:vaultId}).then(()=>{vaultWritten=false;report.checks.push({name:'failure-owned-vault-cleanup',passed:true});}).catch(error=>report.errors.push(`Owned vault cleanup failed: ${error.message}`));
  }
  await close().catch(error=>{report.errors.push(`Owned app cleanup: ${error.message}`);process.exitCode=1;});
  if(ollama && ollama.exitCode===null) {
    const actualExe=execFileSync('powershell.exe',['-NoProfile','-Command',`(Get-CimInstance Win32_Process -Filter 'ProcessId = ${ollama.pid}').ExecutablePath`],{encoding:'utf8',windowsHide:true}).trim();
    if(path.resolve(actualExe).toLowerCase()===path.resolve(ollama.spawnfile).toLowerCase()) {
      execFileSync('taskkill.exe',['/PID',String(ollama.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});
      report.checks.push({name:'owned-model-process-tree-cleanup',pid:ollama.pid,passed:true});
    } else {report.errors.push('Owned model cleanup identity did not match');process.exitCode=1;}
  }
  await ollamaOut?.close();
  await ollamaErr?.close();
  report.finishedAt=new Date().toISOString();
  if(report.errors.length) report.passed=false;
  await fs.writeFile(path.join(output,'receipt.json'),JSON.stringify(report,null,2)+'\n');
  process.stdout.write(JSON.stringify({output,passed:report.passed,checks:report.checks.length,errors:report.errors})+'\n');
}
