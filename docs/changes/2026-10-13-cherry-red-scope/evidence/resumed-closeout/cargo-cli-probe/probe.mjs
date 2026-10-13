import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

const root = process.cwd();
const directory = path.resolve(root, '.tmp/cherry-red/cargo-cli-probe');
assert.equal(directory, 'D:\\kk-studio\\.worktrees\\TASK-CHERRY-RED-001\\.tmp\\cherry-red\\cargo-cli-probe');
const old = '0e77c54cb879bbb856dc916de0e64ab716917865';
const cli = path.join(root, 'node_modules/@tauri-apps/cli/tauri.js');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const blob = (file) => execFileSync('git', ['show', `${old}:${file}`], { cwd: root });
const inputPaths = ['src-tauri/Cargo.toml', 'src-tauri/Cargo.lock', 'src-tauri/tauri.conf.json', 'src-tauri/tauri.agent.conf.json', 'src-tauri/tauri.installer.conf.json'];
const originals = Object.fromEntries(inputPaths.map(file => [file, fs.readFileSync(path.join(root, file))]));
const summary = [];
for (const origin of ['old-git-lf', 'old-checkout-crlf', 'current-working-exact']) {
  for (const configuration of ['agent', 'installer']) {
    const name = `${origin}-${configuration}`;
    const probe = path.join(directory, name);
    assert(!fs.existsSync(probe), 'Probe directory must be fresh');
    fs.mkdirSync(path.join(probe, 'src-tauri/src'), { recursive: true });
    fs.mkdirSync(path.join(probe, 'dist'), { recursive: true });
    fs.writeFileSync(path.join(probe, 'dist/index.html'), '<!doctype html><title>CLI probe only</title>');
    fs.writeFileSync(path.join(probe, 'src-tauri/src/main.rs'), 'fn main() {}\n');
    fs.writeFileSync(path.join(probe, 'src-tauri/build'), 'console.log("PROBE_RUNNER_NO_COMPILATION"); process.exit(75);\n');
    fs.writeFileSync(path.join(probe, 'package.json'), JSON.stringify({ name: 'cli-manifest-probe', version: '1.0.0', type: 'module' }));
    for (const file of inputPaths) {
      let bytes = origin === 'current-working-exact' ? originals[file] : blob(file);
      if (origin === 'old-checkout-crlf') bytes = Buffer.from(bytes.toString('utf8').replaceAll('\r\n', '\n').replaceAll('\n', '\r\n'));
      fs.writeFileSync(path.join(probe, file), bytes);
    }
    const cargo = path.join(probe, 'src-tauri/Cargo.toml');
    const before = fs.readFileSync(cargo);
    fs.writeFileSync(path.join(directory, `${name}.before.toml`), before);
    const result = spawnSync(process.execPath, [cli, 'build', '--config', `src-tauri/tauri.${configuration}.conf.json`, '--config', '{"build":{"beforeBuildCommand":""}}', '--runner', process.execPath, '--no-bundle'], { cwd: probe, encoding: 'utf8', windowsHide: true, timeout: 30000 });
    const stdout = result.stdout ?? '';
    const stderr = result.stderr ?? '';
    fs.writeFileSync(path.join(directory, `${name}.log`), stdout + '\n' + stderr);
    const after = fs.readFileSync(cargo);
    fs.writeFileSync(path.join(directory, `${name}.after.toml`), after);
    const diff = spawnSync('git', ['diff', '--no-index', '--ignore-space-at-eol', `${name}.before.toml`, `${name}.after.toml`], { cwd: directory, encoding: 'utf8' });
    fs.writeFileSync(path.join(directory, `${name}.diff`), diff.stdout ?? '');
    assert.equal(result.status, 1, 'Tauri must fail before compilation');
    assert(stdout.includes('PROBE_RUNNER_NO_COMPILATION'), 'The bounded Node runner must be reached');
    assert(!stdout.includes('Built application at'), 'No application may be built');
    summary.push({ name, oldSha: origin.startsWith('old-') ? old : undefined, cliVersion: JSON.parse(fs.readFileSync(path.join(root, 'node_modules/@tauri-apps/cli/package.json'), 'utf8')).version, nodeRunner: process.execPath, result: result.status, runnerMarker: true, beforeSha256: hash(before), afterSha256: hash(after), beforeSize: before.length, afterSize: after.length, changed: !before.equals(after), diff: diff.stdout, error: result.error?.message, stdoutTail: stdout.split('\n').slice(-6), stderrTail: stderr.split('\n').slice(-8) });
  }
}
for (const file of inputPaths) assert(fs.readFileSync(path.join(root, file)).equals(originals[file]), `The real source must not change: ${file}`);
fs.writeFileSync(path.join(directory, 'receipt.json'), JSON.stringify({ createdAt: new Date().toISOString(), scope: 'Private exact-byte Cargo/config probe; Node runner exits 75; no Rust compilation, frontend build, application launch or original source mutation', summary }, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
