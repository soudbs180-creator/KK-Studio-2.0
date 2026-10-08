import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const root = process.cwd();
const require = createRequire(path.join(root, 'package.json'));
const { chromium, expect } = require('@playwright/test');
const mode = process.argv[2];
assert(['production', 'development', 'desktop'].includes(mode));
const sourceHead = execFileSync('git', ['rev-parse', 'HEAD'], {encoding:'utf8'}).trim();
const expectedHead = process.env.KK_RUNTIME_QA_HEAD || 'eaa0886e99965d00a5a514b301adb665b150373d';
assert(['eaa0886e99965d00a5a514b301adb665b150373d','1d6f640ac6f3a1e7af32c38d85596527704dc54a'].includes(expectedHead));
assert.equal(sourceHead, expectedHead);
const knownPluginBaseline = mode==='development' && process.env.KK_QA_PREEXISTING_PLUGIN==='1';
assert.equal(execFileSync('git', ['status', '--porcelain'], {encoding:'utf8'}).trim(), '');
if (sourceHead.startsWith('eaa0886')) assert.equal(execFileSync('git', ['diff', '--name-only', '27bdb8b', sourceHead, '--', 'src', 'src-tauri', 'config', 'package.json', 'package-lock.json'], {encoding:'utf8'}).trim(), '');
if (knownPluginBaseline) {
  const ledger=JSON.parse(await fs.readFile(path.join(root,'docs/governance/task-ledger.json'),'utf8'));
  const task=ledger.find(t=>t.id==='TASK-PLUGIN-DEV-001');
  assert.equal(task.status,'TODO'); assert.equal(task.verificationResult,'FAIL');
  assert.equal(execFileSync('git',['diff','--name-only','1d6f640','27bdb8b','--','src/features/plugins','vite.config.ts','public/plugins'],{encoding:'utf8'}).trim(),'');
}
const port = mode === 'desktop' ? 9365 : mode === 'development' ? 1421 : 1423;
await new Promise((resolve,reject) => {
  const probe = net.createServer();
  probe.once('error', reject);
  probe.listen(port, '127.0.0.1', () => probe.close(resolve));
});
const external = 'D:/kk-studio/.verification/TASK-IMAGE-EDIT-001-integration';
const output = path.join(external, `${mode}-${sourceHead.slice(0,7)}-${Date.now()}`);
await fs.mkdir(output);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const executable = path.join(root, 'src-tauri/target/release/kk-studio.exe');
const dataRoot = path.join(output, 'isolated-data');
const profile = path.join(output, 'isolated-webview');
const args = mode === 'desktop' ? ['--data-dir', dataRoot] : [path.join(root, 'node_modules/vite/bin/vite.js'), ...(mode === 'production' ? ['preview'] : []), '--host', '127.0.0.1', '--port', String(port), '--strictPort'];
if (mode === 'desktop') { await fs.mkdir(dataRoot); await fs.mkdir(profile); }
const started = performance.now();
const child = spawn(mode === 'desktop' ? executable : process.execPath, args, {
  cwd: root, windowsHide:true, stdio:['ignore','pipe','pipe'],
  env:{...process.env,...(mode === 'desktop' ? {WEBVIEW2_USER_DATA_FOLDER:profile, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:`--remote-debugging-port=${port} --remote-debugging-address=127.0.0.1`} : {})}
});
let processLog = '';
child.stdout.on('data', b => processLog += b);
child.stderr.on('data', b => processLog += b);
let spawnError;
child.on('error', e => spawnError=e);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let browser;
const report = {sourceHead, productSourceHead:sourceHead.startsWith('eaa0886')?'27bdb8bda6bdd5eec041dd5e2fab28e4dd728d0a':sourceHead, mode, command: [mode==='desktop'?executable:process.execPath,...args], cwd:root, pid:child.pid, port, route:'/', chain:'index.html -> src/main.tsx -> App -> StartPage / deferred SettingsPanel; workspace -> CanvasImageActions / App ImageLightbox', startedAt:new Date().toISOString(), pages:[], passed:false, knownPluginBaseline, developmentPluginAcceptance:knownPluginBaseline?'FAIL / unchanged TASK-PLUGIN-DEV-001, explicitly dismissed only to inspect unrelated home/settings':'outside development baseline exception'};
try {
  let ready = false;
  for (let i=0;i<100;i++) {
    if (spawnError) throw spawnError;
    assert.equal(child.exitCode, null, `Own process exited: ${processLog}`);
    try { ready = (await fetch(`http://127.0.0.1:${port}/${mode==='desktop'?'json/version':''}`)).ok; } catch {}
    if (ready) break;
    await sleep(200);
  }
  assert(ready, 'Own process did not become ready');
  browser = mode==='desktop' ? await chromium.connectOverCDP(`http://127.0.0.1:${port}`) : await chromium.launch({channel:'msedge',headless:true});
  for (const width of (mode==='desktop'?[1920]:[390,1099,1920])) {
    const context = mode==='desktop' ? browser.contexts()[0] : await browser.newContext({viewport:{width,height:width===390?844:1080}});
    const page = mode==='desktop' ? context.pages()[0] : await context.newPage();
    assert(page);
    const errors=[]; const settingsRequests=[];
    page.on('pageerror', error=>errors.push(String(error)));
    page.on('request', request=>{ if (/\/assets\/SettingsPanel-[^/]+\.js|\/components\/settings\/SettingsPanel\.tsx/.test(request.url())) settingsRequests.push(request.url()); });
    if (mode!=='desktop') await page.goto(`http://127.0.0.1:${port}/`, {waitUntil:'domcontentloaded'});
    else await page.waitForURL('http://tauri.localhost/');
    await expect(page.getByRole('region',{name:'开始创作',exact:true})).toBeVisible({timeout:30000});
    await expect(page.getByTestId('infinite-canvas')).toHaveCount(0);
    await expect(page.locator('.conversation-panel')).toHaveCount(0);
    assert.equal(settingsRequests.length,0,'Settings must be deferred at home');
    let baselineOverlay;
    if (knownPluginBaseline) {
      await expect.poll(()=>page.locator('vite-error-overlay').count()).toBeGreaterThan(0);
      baselineOverlay=await page.locator('vite-error-overlay').evaluateAll(elements=>elements.map(el=>el.shadowRoot?.textContent||''));
      for (const text of baselineOverlay) assert(/Failed to load url \/plugins\/(html|sticky-note|markdown|svg)\.js/.test(text),'Unexpected overlay outside known baseline');
      await page.screenshot({path:path.join(output,`known-plugin-error-${width}.png`)});
      await page.keyboard.press('Escape');
      await expect(page.locator('vite-error-overlay')).toHaveCount(0);
    } else await expect(page.locator('vite-error-overlay')).toHaveCount(0);
    const runtime = await page.evaluate(()=>({url:location.href, mode:document.querySelector('[data-runtime-mode]')?.dataset.runtimeMode, entry:document.querySelector('[data-runtime-entry]')?.dataset.runtimeEntry, native:Boolean(window.__TAURI_INTERNALS__), scripts:[...document.scripts].map(s=>s.src).filter(Boolean), styles:[...document.styleSheets].map(s=>s.href), devStyleModules:[...document.querySelectorAll('style[data-vite-dev-id]')].map(s=>s.dataset.viteDevId), viewport:{width:innerWidth,height:innerHeight}, overflow:document.documentElement.scrollWidth>innerWidth, topbar:{height:getComputedStyle(document.querySelector('.topbar')).height, align:getComputedStyle(document.querySelector('.topbar')).alignItems}, canvasCount:document.querySelectorAll('[data-testid="infinite-canvas"]').length, conversationCount:document.querySelectorAll('.conversation-panel').length}));
    assert.equal(runtime.entry,'src/main.tsx');
    assert.equal(runtime.mode,mode==='development'?'development':'production');
    assert.equal(runtime.native,mode==='desktop');
    assert.equal(runtime.overflow,false);
    const actualBundles=[];
    if (mode==='development') {
      assert(runtime.scripts.some(s=>s.endsWith('/src/main.tsx')));
      const suffix=runtime.devStyleModules.filter(s=>/\/(image-edit|image-selection|desktop-titlebar)\.css$/.test(s)).map(s=>path.basename(s));
      assert.deepEqual(suffix,sourceHead.startsWith('eaa0886')?['image-edit.css','image-selection.css','desktop-titlebar.css']:['image-selection.css','desktop-titlebar.css']);
    } else {
      for (const url of [...runtime.scripts,...runtime.styles].filter(s=>s && /\/assets\/index-.*\.(js|css)$/.test(s))) {
        const content = await page.evaluate(async url=>Array.from(new Uint8Array(await (await fetch(url)).arrayBuffer())),url);
        const relative=new URL(url).pathname.slice(1);
        const actual=hash(Buffer.from(content));
        assert.equal(actual,hash(await fs.readFile(path.join(root,'dist',relative))));
        actualBundles.push({url,relative,sha256:actual,bytes:content.length});
      }
      assert.equal(actualBundles.length,2);
    }
    if (mode==='desktop') {
      report.executableSha256=hash(await fs.readFile(executable));
      const actualRoot=await page.evaluate(()=>window.__TAURI_INTERNALS__.invoke('get_storage_root'));
      assert.equal(path.resolve(actualRoot).toLowerCase(),dataRoot.toLowerCase());
      report.actualDataRoot=actualRoot;
      report.observedHomeReadyMs=performance.now()-started;
      assert.equal(runtime.topbar.height,'40px');
      await expect(page.locator('.window-controls')).toBeVisible();
    } else await expect(page.locator('.window-controls')).toHaveCount(0);
    await page.screenshot({path:path.join(output,`home-${width}.png`)});
    const trigger=page.getByRole('button',{name:'打开设置',exact:true});
    await trigger.click();
    const navigation=page.getByRole('navigation',{name:'设置分类'});
    await expect(navigation).toBeVisible();
    await expect(navigation.getByRole('button',{name:'通用',exact:true})).toBeFocused();
    assert.equal(settingsRequests.length,1,'Settings should load once on demand');
    await page.screenshot({path:path.join(output,`settings-${width}.png`)});
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog',{name:'设置',exact:true})).toHaveCount(0);
    await expect(trigger).toBeFocused();
    assert.deepEqual(errors,[]);
    report.pages.push({width,runtime,actualBundles,deferredSettings:{requests:settingsRequests,focusAndEscape:'PASS'},errors,baselineOverlay});
    if (mode!=='desktop') await context.close();
  }
  assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceHead);
  assert.equal(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),'');
  report.passed=true;
} catch (error) { report.failure=String(error); throw error; }
finally {
  await browser?.close().catch(()=>{});
  if (child.exitCode===null) child.kill();
  await sleep(500);
  report.ownProcessStopped=child.exitCode!==null || child.signalCode!==null;
  await fs.writeFile(path.join(output,'process.log'),processLog,{flag:'wx'});
  await fs.writeFile(path.join(output,'receipt.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
}
console.log(JSON.stringify({passed:report.passed,mode,sourceHead,productSourceHead:report.productSourceHead,output,widths:report.pages.map(p=>p.width),ownProcessStopped:report.ownProcessStopped}));
