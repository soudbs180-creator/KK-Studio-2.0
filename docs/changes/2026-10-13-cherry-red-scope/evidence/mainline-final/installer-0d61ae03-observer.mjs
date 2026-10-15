import childProcess from 'node:child_process';
import {syncBuiltinESMExports} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const target=path.resolve('.tmp/cherry-red/installer-state-observer-0d61ae03.ndjson');
const record=value=>fs.appendFileSync(target,JSON.stringify({at:new Date().toISOString(),...value})+'\n');
const originalSpawn=childProcess.spawn,originalExec=childProcess.execFileSync;
childProcess.spawn=function(filename,args,options){
  const child=originalSpawn.call(this,filename,args,options);
  if(path.basename(filename).toLowerCase()==='kk-studio.exe'){
    record({event:'owned-spawn',pid:child.pid,filename,args});
    child.once('exit',(code,signal)=>record({event:'owned-exit',pid:child.pid,code,signal}));
  }
  return child;
};
childProcess.execFileSync=function(filename,args,options){
  const result=originalExec.call(this,filename,args,options);
  if(args?.some(arg=>path.basename(String(arg)).toLowerCase()==='installer-state.ps1'))record({event:'actual-state',entries:JSON.parse(String(result))});
  return result;
};
syncBuiltinESMExports();
record({event:'read-only-observer-installed',pid:process.pid,scope:'Returns unchanged actual spawn/exec results; no production bridge, command, environment or application state replacement'});
