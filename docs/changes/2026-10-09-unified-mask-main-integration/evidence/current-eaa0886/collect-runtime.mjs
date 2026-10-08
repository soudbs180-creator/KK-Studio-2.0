import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=process.cwd(), external='D:/kk-studio/.verification/TASK-IMAGE-EDIT-001-integration';
const head='eaa0886e99965d00a5a514b301adb665b150373d', product='27bdb8bda6bdd5eec041dd5e2fab28e4dd728d0a', base='1d6f640ac6f3a1e7af32c38d85596527704dc54a';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const hash=b=>createHash('sha256').update(b).digest('hex');
assert.equal(git('rev-parse','HEAD'),head); assert.equal(git('status','--porcelain'),'');
const bytes=fs.readFileSync('test-results/browser-results.json'), browser=JSON.parse(bytes);
const specs=[]; function walk(s){specs.push(...(s.specs??[])); for(const c of s.suites??[])walk(c);} walk(browser);
const tests=specs.flatMap(s=>s.tests), results=tests.flatMap(t=>t.results);
assert.equal(tests.length,445); assert.equal(results.length,445);
assert(results.every(r=>r.status==='passed'&&r.retry===0));
assert.equal(browser.stats.flaky,0); assert.equal(browser.stats.skipped,0); assert.equal(browser.stats.unexpected,0);
const summary={head,tests:tests.length,attempts:results.length,stats:browser.stats,configuredWorkers:browser.config.workers,actualWorkers:browser.config.metadata.actualWorkers,maxActualRetry:Math.max(...results.map(r=>r.retry)),configuredRetries:[...new Set(tests.map(t=>t.retries))],sha256:hash(bytes)};
fs.writeFileSync(path.join(external,'browser-results-eaa0886.json'),bytes,{flag:'wx'});
fs.writeFileSync(path.join(external,'browser-summary-eaa0886.json'),JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
const destination=path.join(external,'runtime-eaa0886'); fs.mkdirSync(destination);
const copies=[];
for(const [folder,label] of [
 ['.tmp/image-edit/desktop/run-1791479240550-82872','native-mask'],
 ['.tmp/desktop/image-selection/1791479621520-b0583c16-08d1-44ad-a85e-506df888f4c5','native-selection'],
 ['.tmp/model-capabilities/desktop/run-1791479805299-67356','native-model'],
 ['.tmp/titlebar/desktop-1791479725412','native-titlebar'],
 [path.join(external,'native-taskhost-eaa0886'),'native-taskhost'],
 [path.join(external,'desktop-eaa0886-1791480003053'),'native-startup'],
 [path.join(external,'production-eaa0886-1791480017549'),'web-production'],
]){
 const abs=path.isAbsolute(folder)?folder:path.join(root,folder), target=path.join(destination,label); fs.mkdirSync(target);
 for(const name of fs.readdirSync(abs).filter(f=>/\.(json|png)$/.test(f))){
  const original=path.join(abs,name); if(!fs.statSync(original).isFile())continue;
  const copy=path.join(target,name); fs.copyFileSync(original,copy,fs.constants.COPYFILE_EXCL);
  copies.push({original,copy,bytes:fs.statSync(original).size,sha256:hash(fs.readFileSync(original))});
 }
}
const exe=hash(fs.readFileSync('src-tauri/target/release/kk-studio.exe'));
assert.equal(exe,'ad5e3428497bc69fbabc40d52ac3269fd5df5b06019407a7b9b99e121944d4c9');
const mask=JSON.parse(fs.readFileSync(path.join(destination,'native-mask/desktop-acceptance.json'),'utf8'));
assert.equal(mask.executableSha256,exe); assert.equal(mask.protection.outsideChanged,0); assert.equal(mask.credentialCleanupComplete,true); assert.deepEqual(mask.errors,[]);
for(const name of ['native-selection','native-taskhost']){
 const r=JSON.parse(fs.readFileSync(path.join(destination,name,'receipt.json'),'utf8'));
 assert.equal(r.passed,true); assert.equal(r.executableSha256,exe); assert.deepEqual(r.errors,[]);
 assert.equal(name==='native-selection'?r.cleanupComplete:r.credentialCleanupComplete,true);
}
for(const [name,file] of [['native-model','desktop-acceptance.json'],['native-titlebar','receipt.json'],['native-startup','receipt.json']]){
 const r=JSON.parse(fs.readFileSync(path.join(destination,name,file),'utf8')); assert.equal(r.executableSha256||r.sha256,exe);
}
const sourceHashes={};
function collect(folder){for(const d of fs.readdirSync(folder,{withFileTypes:true})){const p=path.join(folder,d.name); if(d.isDirectory())collect(p); else if(/\.(ts|tsx|css|rs)$/.test(p))sourceHashes[p.replaceAll('\\','/')]=hash(fs.readFileSync(p));}}
collect('src'); collect('src-tauri/src');
for(const file of ['config/platform-versions.json','src-tauri/tauri.conf.json','src-tauri/Cargo.toml','src-tauri/Cargo.lock','package.json','package-lock.json','tests/desktop/image-edit.mjs','tests/desktop/model-capabilities.mjs','tests/browser/image-edit.spec.ts','tests/browser/model-capabilities.spec.ts'])sourceHashes[file]=hash(fs.readFileSync(file));
const bundles={}; for(const name of fs.readdirSync('dist/assets').filter(n=>/^index-.*\.(js|css)$/.test(n)))bundles[`assets/${name}`]=hash(fs.readFileSync(path.join('dist/assets',name)));
const productDelta=git('diff','--name-only',product,head,'--','src','src-tauri','config','package.json','package-lock.json'); assert.equal(productDelta,'');
const currentTasks=JSON.parse(fs.readFileSync('docs/governance/task-ledger.json','utf8')),mainTasks=JSON.parse(git('show',`${base}:docs/governance/task-ledger.json`));
for(const t of mainTasks)assert.deepEqual(currentTasks.find(x=>x.id===t.id),t);
const receipt={head,product,base,versions:JSON.parse(fs.readFileSync('config/platform-versions.json','utf8')),executableSha256:exe,bundles,sourceHashes,productDelta,upstreamTasksPreserved:mainTasks.length,tasks:currentTasks.length,taskhostReceiptHandling:'27b native TaskHost script passed; subsequent Playwright cleared ignored test-results. Its original console log is retained, no deleted raw JSON reconstructed. Re-executed at exact eaa with KK_TASKHOST_EVIDENCE outside test-results; original new raw JSON/PNG and cleanup are retained here.',copiedArtifacts:copies};
fs.writeFileSync(path.join(external,'identity-eaa0886.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({head,browser:summary,sourceFiles:Object.keys(sourceHashes).length,executableSha256:exe,bundles,copiedArtifacts:copies.length,pngs:copies.filter(x=>x.copy.endsWith('.png')).length}));
