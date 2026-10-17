import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { existsSync } from "node:fs";
import {
  chmod,
  cp,
  link,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  readlink,
  rm,
  symlink,
  utimes,
  writeFile,
} from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { packageManagedWeb } from "../../deploy/package-managed-web.mjs";

const script = fileURLToPath(
  new URL("../../deploy/managed-web-release.py", import.meta.url),
);
const bundledPython = path.join(
  homedir(),
  ".cache",
  "codex-runtimes",
  "codex-primary-runtime",
  "dependencies",
  "python",
  "python.exe",
);
const python =
  process.env.KK_DEPLOY_PYTHON ??
  (process.platform === "win32" && existsSync(bundledPython)
    ? bundledPython
    : "python3");
const sourceCommit = "a".repeat(40);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

test("release workflow accepts stable released events and protected version tags, then waits only for matching main quality", async () => {
  const workflow = await readFile(
    new URL("../../.github/workflows/web-release.yml", import.meta.url),
    "utf8",
  );
  const trigger = /^on:\r?\n([\s\S]*?)(?=\r?\n\S)/m.exec(workflow)?.[1];
  assert.match(trigger, /^  release:\r?\n    types: \[released\]\r?\n$/);
  assert.match(
    workflow,
    /if: github\.event\.release\.draft == false && github\.event\.release\.prerelease == false/,
  );
  const tagPattern = /\[\[ "\$RELEASE_TAG" =~ (\S+) \]\]/.exec(workflow)?.[1];
  assert.ok(tagPattern);
  const allowedTag = new RegExp(tagPattern);
  assert.ok(allowedTag.test("v2.1.36"));
  for (const tag of ["web-v2.1.36", "v2.1.36-rc.1", "main", "v2.1.36;id"])
    assert.equal(allowedTag.test(tag), false, tag);
  assert.match(workflow, /timeout-minutes: 60/);
  assert.match(workflow, /for attempt in \{1\.\.90\}/);
  assert.match(workflow, /-f branch=main -f event=push -f head_sha="\$source"/);
  assert.match(workflow, /if test "\$attempt" -lt 90; then sleep 30; fi/);
  const gate = workflow.indexOf('test "$quality_ready" = true');
  assert.ok(
    gate > 0 &&
      gate < workflow.indexOf("npm ci --ignore-scripts") &&
      gate < workflow.indexOf("secrets.KK_WEB_DEPLOY_KEY"),
  );
});

async function fixture(t) {
  const root = await realpath(
    await mkdtemp(path.join(tmpdir(), "kk-managed-web-")),
  );
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

async function artifact(
  root,
  releaseId,
  content = releaseId,
  webVersion = "2.1.36",
  mobile = false,
) {
  const dist = path.join(root, `input-${releaseId}-${content}`);
  await mkdir(path.join(dist, "assets"), { recursive: true });
  await writeFile(
    path.join(dist, "index.html"),
    `<html><script type="module" src="/assets/main.js"></script><link rel="stylesheet" href="/assets/main.css"><body>${content}</body></html>`,
  );
  await writeFile(
    path.join(dist, "assets/main.js"),
    `console.log(${JSON.stringify(content)})`,
  );
  await writeFile(path.join(dist, "assets/main.css"), "body{display:block}");
  if (mobile) {
    await mkdir(path.join(dist, "mobile"));
    await writeFile(
      path.join(dist, "mobile/index.html"),
      '<html><script src="/mobile/main.js"></script><body>Phone</body></html>',
    );
    await writeFile(path.join(dist, "mobile/main.js"), "console.log('phone')");
  }
  const packaged = await packageManagedWeb({
    dist,
    out: path.join(root, `${releaseId}-${content}.tar.gz`),
    releaseId,
    sourceCommit,
    webVersion,
  });
  const unpacked = path.join(root, `unpacked-${releaseId}-${content}`);
  await mkdir(unpacked);
  execFileSync(process.platform === "win32" ? "tar.exe" : "tar", [
    "-xzf",
    packaged.archive,
    "-C",
    unpacked,
  ]);
  return { ...packaged, fixture: path.join(unpacked, "dist"), dist };
}

function controller(
  root,
  args,
  input = Buffer.alloc(0),
  fixtureDirectory,
  extraEnv = {},
) {
  const env = { ...process.env, ...extraEnv };
  delete env.SSH_ORIGINAL_COMMAND;
  const result = spawnSync(
    python,
    [
      script,
      "--test-root",
      root,
      ...(fixtureDirectory ? ["--health-fixture", fixtureDirectory] : []),
      ...args,
    ],
    { input, env, encoding: "utf8", timeout: 15000 },
  );
  if (result.error) throw result.error;
  return result;
}

async function receive(root, packaged, extra = []) {
  return controller(
    root,
    ["receive", packaged.manifest.releaseId, packaged.sha256, ...extra],
    await readFile(packaged.archive),
    packaged.fixture,
  );
}

function success(result) {
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

async function mutated(root, packaged, mode) {
  const output = path.join(root, `bad-${mode}.tar.gz`);
  const code = `import io, json, sys, tarfile
source, output, mode = sys.argv[1:]
with tarfile.open(source, 'r:gz') as old, tarfile.open(output, 'w:gz', format=tarfile.USTAR_FORMAT) as new:
 for entry in old:
  body = old.extractfile(entry).read() if entry.isfile() else None
  if mode == 'hash' and entry.name == 'dist/assets/main.js':
   body = b'tampered'
   entry.size = len(body)
  new.addfile(entry, io.BytesIO(body) if body is not None else None)
 name = {'traversal':'../escaped', 'absolute':'/tmp/escaped', 'backslash':'dist/..\\\\escaped', 'duplicate':'dist/index.html', 'symlink':'dist/linked', 'hardlink':'dist/hard', 'special':'dist/fifo', 'oversize':'dist/huge'}.get(mode)
 if name:
  entry = tarfile.TarInfo(name)
  if mode == 'symlink': entry.type, entry.linkname = tarfile.SYMTYPE, '/tmp'
  elif mode == 'hardlink': entry.type, entry.linkname = tarfile.LNKTYPE, 'dist/index.html'
  elif mode == 'special': entry.type = tarfile.FIFOTYPE
  elif mode == 'oversize': entry.size = 128 * 1024 * 1024 + 1
  if mode == 'oversize':
   new.fileobj.write(entry.tobuf())
   new.offset += 512
  else: new.addfile(entry, io.BytesIO(b''))
`;
  execFileSync(python, ["-c", code, packaged.archive, output, mode]);
  return { ...packaged, archive: output, sha256: hash(await readFile(output)) };
}

test("managed package records every static byte and public build identity", async (t) => {
  const root = await fixture(t);
  const packaged = await artifact(root, "v2.1.36");
  assert.equal(packaged.manifest.kind, "kk-studio-managed-web");
  assert.equal(packaged.manifest.sourceCommit, sourceCommit);
  assert.equal(packaged.sha256, hash(await readFile(packaged.archive)));
  assert.deepEqual(
    Object.keys(
      JSON.parse(
        await readFile(path.join(packaged.fixture, "build-info.json")),
      ),
    ),
    ["schemaVersion", "kind", "releaseId", "sourceCommit", "webVersion"],
  );
  for (const record of packaged.manifest.files) {
    const bytes = await readFile(
      path.join(packaged.fixture, record.path.slice(5)),
    );
    assert.equal(record.bytes, bytes.length);
    assert.equal(record.sha256, hash(bytes));
  }
  success(await receive(root, packaged, ["--dry-run"]));
  assert.deepEqual(await readdir(path.join(root, "releases")), []);
  assert.equal(existsSync(path.join(root, "current")), false);
});

test("release retries produce identical archive bytes after metadata changes and a rebuild", async (t) => {
  const root = await fixture(t);
  const first = await artifact(root, "repeatable");
  const identity = {
    releaseId: "repeatable",
    sourceCommit,
    webVersion: "2.1.36",
  };
  for (const name of [
    "index.html",
    "assets/main.js",
    "assets/main.css",
    "assets",
    "",
  ]) {
    await utimes(path.join(first.dist, name), 1234567890, 1234567890);
  }
  await chmod(path.join(first.dist, "index.html"), 0o444);
  await chmod(path.join(first.dist, "assets"), 0o700);
  const second = await packageManagedWeb({
    ...identity,
    dist: first.dist,
    out: path.join(root, "retry.tar.gz"),
  });
  const rebuilt = path.join(root, "rebuilt");
  await mkdir(path.join(rebuilt, "assets"), { recursive: true });
  for (const name of ["assets/main.css", "assets/main.js", "index.html"]) {
    await writeFile(
      path.join(rebuilt, name),
      await readFile(path.join(first.dist, name)),
    );
  }
  const third = await packageManagedWeb({
    ...identity,
    dist: rebuilt,
    out: path.join(root, "rebuilt.tar.gz"),
  });
  assert.deepEqual(second.manifest, first.manifest);
  assert.deepEqual(third.manifest, first.manifest);
  assert.equal(second.sha256, first.sha256);
  assert.equal(third.sha256, first.sha256);
  assert.deepEqual(
    await readFile(second.archive),
    await readFile(first.archive),
  );
  assert.deepEqual(
    await readFile(third.archive),
    await readFile(first.archive),
  );
  success(await receive(root, second, ["--dry-run"]));
  if (process.platform !== "win32") {
    const failed = await receive(root, {
      ...first,
      fixture: path.join(root, "missing-health"),
    });
    assert.notEqual(failed.status, 0);
    assert.equal(existsSync(path.join(root, "current")), false);
    success(await receive(root, { ...second, fixture: first.fixture }));
    success(await receive(root, { ...third, fixture: first.fixture }));
  }
});

test("managed packaging rejects source links and sensitive files", async (t) => {
  const root = await fixture(t);
  const packaged = await artifact(root, "safe");
  await writeFile(path.join(packaged.dist, ".env.production"), "fake-secret");
  const options = {
    dist: packaged.dist,
    out: path.join(root, "bad.tar.gz"),
    releaseId: "bad",
    sourceCommit,
    webVersion: "2.1.36",
  };
  await assert.rejects(() => packageManagedWeb(options), /Unsafe static path/);
  await rm(path.join(packaged.dist, ".env.production"));
  await link(
    path.join(packaged.dist, "index.html"),
    path.join(packaged.dist, "hard.html"),
  );
  await assert.rejects(
    () => packageManagedWeb(options),
    /Unsupported static entry/,
  );
});

test("archive hash, member paths, links, special entries, inventory and size are rejected before activation", async (t) => {
  const root = await fixture(t);
  const packaged = await artifact(root, "safe");
  const wrongHash = controller(
    root,
    ["receive", "safe", "0".repeat(64)],
    await readFile(packaged.archive),
    packaged.fixture,
  );
  assert.notEqual(wrongHash.status, 0);
  assert.match(wrongHash.stderr, /Archive SHA-256 mismatch/);
  for (const mode of [
    "traversal",
    "absolute",
    "backslash",
    "duplicate",
    "symlink",
    "hardlink",
    "special",
    "oversize",
    "hash",
  ]) {
    const result = await receive(root, await mutated(root, packaged, mode));
    assert.notEqual(result.status, 0, mode);
    assert.match(result.stderr, /release refused/, mode);
  }
  assert.deepEqual(await readdir(path.join(root, "releases")), []);
  assert.equal(existsSync(path.join(root, "current")), false);
});

// Windows cannot create the production symlinks without additional OS privilege.
const linuxOnly = { skip: process.platform === "win32" };

test("gzip expansion and hidden PAX metadata obey budgets before tar allocation", async (t) => {
  const root = await fixture(t);
  const code = `import gzip, importlib.util, io, pathlib, sys, tarfile
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('managed', sys.argv[1])
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
root = pathlib.Path(sys.argv[2])
for mode, limit in [('pax',4096), ('padding',4096), ('pax',2*1024*1024)]:
 archive = root / ('bomb-' + mode + str(limit) + '.tar.gz')
 entry = tarfile.TarInfo('dist/index.html'); entry.size = 2
 data = entry.tobuf() + b'ok' + bytes(510) + bytes(1024)
 if mode == 'pax':
  header = tarfile.TarInfo('global'); header.type = tarfile.XGLTYPE; header.size = 1024*1024
  data = header.tobuf() + bytes(header.size) + data
 else: data += bytes(1024*1024)
 with gzip.open(archive, 'wb') as output: output.write(data)
 assert archive.stat().st_size < 4096
 m.MAX_FILE = m.MAX_TOTAL = 4096
 m.MAX_TAR = limit
 stage = root / ('stage-' + mode + str(limit)); stage.mkdir()
 try: m.unpack(archive, stage)
 except ValueError as error:
  assert 'Expanded archive' in str(error) or 'Tar metadata' in str(error), str(error)
 else: raise AssertionError('Metadata/expansion bomb was accepted: ' + mode + str(limit))
print('metadata budgets PASS')
`;
  assert.match(
    execFileSync(python, ["-c", code, script, root], { encoding: "utf8" }),
    /metadata budgets PASS/,
  );
});

test("an exception after the first current replacement restores both pointers", async (t) => {
  const root = await fixture(t);
  const packaged = await artifact(root, "candidate");
  const code = `import importlib.util, pathlib, sys
sys.dont_write_bytecode = True
root = pathlib.Path(sys.argv[2]); archive = pathlib.Path(sys.argv[3]); checksum = sys.argv[4]
for operation in ('receive', 'rollback'):
 spec = importlib.util.spec_from_file_location('managed_' + operation, sys.argv[1])
 m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
 state = {'current':'releases/old', 'previous':'releases/older'}
 initial = dict(state); failed = [False]
 m.pointer = lambda root, name: state[name]
 def replace(root, name, target):
  state[name] = target
  if name == 'current' and not failed[0]:
   failed[0] = True
   raise InterruptedError('signal immediately after os.replace')
 m.set_pointer = replace
 m.health = lambda *args: None
 m.cleanup = lambda *args: None
 (root / 'releases/old').mkdir(parents=True, exist_ok=True)
 (root / 'releases/old/manifest.json').write_text('{"webVersion":"2.1.35"}')
 try:
  if operation == 'receive':
   with archive.open('rb') as source: m.receive(root, 'candidate', checksum, source)
  else:
   m.managed = lambda base: {'archiveSha256':'a'*64}
   m.validate_release = lambda *args: {}
   m.rollback(root, 'old', 'older')
 except InterruptedError: pass
 else: raise AssertionError('fault injection did not run')
 assert state == initial, (operation, state)
 checked = []
 m.health = lambda *args: checked.append(dict(state))
 if operation == 'receive':
  with archive.open('rb') as source: m.receive(root, 'candidate', checksum, source)
  target = 'releases/candidate'
 else:
  m.rollback(root, 'old', 'older')
  target = 'releases/older'
 assert checked == [{'current':target, 'previous':'releases/old'}], (operation, checked)
print('pointer interruption recovery PASS')
`;
  assert.match(
    execFileSync(
      python,
      ["-c", code, script, root, packaged.archive, packaged.sha256],
      { encoding: "utf8" },
    ),
    /pointer interruption recovery PASS/,
  );
});

test(
  "activation is idempotent, retains exactly active/previous and preserves unmanaged business directories",
  linuxOnly,
  async (t) => {
    const root = await fixture(t);
    await mkdir(path.join(root, "uploads"));
    await writeFile(path.join(root, "uploads/user.bin"), "user-data");
    await mkdir(path.join(root, "releases/business"), { recursive: true });
    await writeFile(
      path.join(root, "releases/business/database.sqlite"),
      "database",
    );
    const a = await artifact(root, "release-a");
    const b = await artifact(root, "release-b");
    const c = await artifact(root, "release-c");
    success(await receive(root, a));
    success(await receive(root, b));
    success(await receive(root, b));
    assert.equal(
      (await readlink(path.join(root, "previous"))).replaceAll("\\", "/"),
      "releases/release-a",
    );
    success(await receive(root, c));
    assert.deepEqual((await readdir(path.join(root, "releases"))).sort(), [
      "business",
      "release-b",
      "release-c",
    ]);
    assert.equal(
      (await readlink(path.join(root, "current"))).replaceAll("\\", "/"),
      "releases/release-c",
    );
    assert.equal(
      (await readlink(path.join(root, "previous"))).replaceAll("\\", "/"),
      "releases/release-b",
    );
    assert.equal(
      await readFile(path.join(root, "uploads/user.bin"), "utf8"),
      "user-data",
    );
    assert.equal(
      await readFile(
        path.join(root, "releases/business/database.sqlite"),
        "utf8",
      ),
      "database",
    );
    const conflict = await artifact(root, "release-c", "different");
    const result = await receive(root, conflict);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /already exists/);
    const older = await artifact(root, "older", "older", "2.1.35");
    const downgrade = await receive(root, older);
    assert.notEqual(downgrade.status, 0);
    assert.match(downgrade.stderr, /cannot downgrade/);
    assert.equal(existsSync(path.join(root, "releases/older")), false);
  },
);

test(
  "stale index or JS/CSS health restores current and previous, then explicit rollback verifies its target",
  linuxOnly,
  async (t) => {
    const root = await fixture(t);
    const a = await artifact(root, "release-a", "release-a", "2.1.35");
    const b = await artifact(root, "release-b");
    const c = await artifact(root, "release-c");
    success(await receive(root, a));
    success(await receive(root, b));
    for (const name of [
      "index.html",
      "assets/main.js",
      "assets/main.css",
      "build-info.json",
    ]) {
      const original = await readFile(path.join(c.fixture, name));
      await writeFile(path.join(c.fixture, name), "stale cached bytes");
      const result = await receive(root, c);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /health hash mismatch/);
      assert.equal(
        (await readlink(path.join(root, "current"))).replaceAll("\\", "/"),
        "releases/release-b",
      );
      assert.equal(
        (await readlink(path.join(root, "previous"))).replaceAll("\\", "/"),
        "releases/release-a",
      );
      await writeFile(path.join(c.fixture, name), original);
    }
    success(
      controller(
        root,
        ["rollback", "release-b", "release-a"],
        undefined,
        a.fixture,
      ),
    );
    assert.equal(
      (await readlink(path.join(root, "current"))).replaceAll("\\", "/"),
      "releases/release-a",
    );
    assert.equal(
      (await readlink(path.join(root, "previous"))).replaceAll("\\", "/"),
      "releases/release-b",
    );
    const changed = controller(
      root,
      ["rollback", "release-b", "release-a"],
      undefined,
      a.fixture,
    );
    assert.notEqual(changed.status, 0);
  },
);

test(
  "local adoption preserves legacy bytes and allows the next release to retain it as previous",
  linuxOnly,
  async (t) => {
    const root = await fixture(t);
    const a = await artifact(root, "legacy");
    const base = path.join(root, "releases/legacy");
    await mkdir(base, { recursive: true });
    await cp(a.dist, path.join(base, "dist"), { recursive: true });
    await writeFile(
      path.join(base, "release-manifest.json"),
      '{"legacy":true}\n',
    );
    const before = await readFile(path.join(base, "dist/index.html"));
    success(controller(root, ["adopt", "legacy", sourceCommit, "2.0.0"]));
    assert.deepEqual(
      await readFile(path.join(base, "dist/index.html")),
      before,
    );
    assert.equal(
      await readFile(path.join(base, "release-manifest.json"), "utf8"),
      '{"legacy":true}\n',
    );
    const marker = JSON.parse(
      await readFile(path.join(base, ".kk-managed-web.json")),
    );
    assert.equal(marker.archiveSha256, null);
    assert.equal(marker.adopted, true);
    await symlink("releases/legacy", path.join(root, "current"), "dir");
    const b = await artifact(root, "next");
    success(await receive(root, b));
    assert.equal(
      (await readlink(path.join(root, "previous"))).replaceAll("\\", "/"),
      "releases/legacy",
    );
    success(
      controller(
        root,
        ["rollback", "next", "legacy"],
        undefined,
        path.join(base, "dist"),
      ),
    );
    const c = await artifact(root, "third");
    success(await receive(root, c));
    assert.deepEqual((await readdir(path.join(root, "releases"))).sort(), [
      "legacy",
      "third",
    ]);
    const d = await artifact(root, "fourth");
    success(await receive(root, d));
    assert.deepEqual((await readdir(path.join(root, "releases"))).sort(), [
      "fourth",
      "third",
    ]);
  },
);

test(
  "stale Mobile entry or bundle rolls back both pointers while valid Mobile and Desktop-only rollback stay supported",
  linuxOnly,
  async (t) => {
    const root = await fixture(t);
    const a = await artifact(root, "desktop-a", "desktop-a", "2.1.35");
    const b = await artifact(root, "desktop-b");
    const c = await artifact(root, "combined", "combined", "2.1.38", true);
    success(await receive(root, a));
    success(await receive(root, b));
    for (const name of ["mobile/index.html", "mobile/main.js"]) {
      const original = await readFile(path.join(c.fixture, name));
      await writeFile(path.join(c.fixture, name), "stale mobile response");
      const failed = await receive(root, c);
      assert.notEqual(
        failed.status,
        0,
        "Mobile HTTP health must gate activation",
      );
      assert.match(failed.stderr, /health hash mismatch/);
      assert.equal(
        (await readlink(path.join(root, "current"))).replaceAll("\\", "/"),
        "releases/desktop-b",
      );
      assert.equal(
        (await readlink(path.join(root, "previous"))).replaceAll("\\", "/"),
        "releases/desktop-a",
      );
      assert.deepEqual(
        await readFile(
          path.join(root, "releases/combined/dist/mobile/main.js"),
        ),
        await readFile(path.join(c.dist, "mobile/main.js")),
        "The validated candidate stays intact for a same-archive retry",
      );
      await writeFile(path.join(c.fixture, name), original);
    }
    success(await receive(root, c));
    success(
      controller(
        root,
        ["rollback", "combined", "desktop-b"],
        undefined,
        b.fixture,
      ),
    );
    assert.equal(
      (await readlink(path.join(root, "current"))).replaceAll("\\", "/"),
      "releases/desktop-b",
    );
  },
);

test(
  "cleanup never follows an injected release symlink or deletes invalid markers",
  linuxOnly,
  async (t) => {
    const root = await fixture(t);
    await mkdir(path.join(root, "releases"));
    await mkdir(path.join(root, "business"));
    await writeFile(path.join(root, "business/keep"), "keep");
    await symlink(
      path.join(root, "business"),
      path.join(root, "releases/linked"),
      "dir",
    );
    await mkdir(path.join(root, "releases/unmanaged"));
    await writeFile(
      path.join(root, "releases/unmanaged/.kk-managed-web.json"),
      '{"adopted":true}',
    );
    for (const release of ["one", "two", "three"])
      success(await receive(root, await artifact(root, release)));
    assert.equal(
      await readFile(path.join(root, "business/keep"), "utf8"),
      "keep",
    );
    assert.deepEqual((await readdir(path.join(root, "releases"))).sort(), [
      "linked",
      "three",
      "two",
      "unmanaged",
    ]);
  },
);

test(
  "receive waits for the controller file lock before activation",
  linuxOnly,
  async (t) => {
    const root = await fixture(t);
    const packaged = await artifact(root, "locked");
    const holder = spawn(python, [
      "-c",
      "import fcntl,sys; f=open(sys.argv[1], 'a+'); fcntl.flock(f, fcntl.LOCK_EX); print('locked', flush=True); sys.stdin.read()",
      path.join(root, ".managed-web.lock"),
    ]);
    t.after(() => holder.kill());
    await once(holder.stdout, "data");
    const child = spawn(python, [
      script,
      "--test-root",
      root,
      "--health-fixture",
      packaged.fixture,
      "receive",
      "locked",
      packaged.sha256,
    ]);
    t.after(() => child.kill());
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.stdin.end(await readFile(packaged.archive));
    await delay(150);
    assert.equal(child.exitCode, null);
    assert.equal(existsSync(path.join(root, "current")), false);
    const completed = once(child, "close");
    holder.stdin.end();
    const [code] = await completed;
    assert.equal(code, 0, stderr);
    assert.equal(
      (await readlink(path.join(root, "current"))).replaceAll("\\", "/"),
      "releases/locked",
    );
  },
);

test("forced SSH rejects all options, shell syntax and non-receive commands before touching production", () => {
  for (const command of [
    "rollback one two",
    "adopt old a 1.0.0",
    "receive ../bad " + "a".repeat(64),
    "receive safe " + "a".repeat(64) + "; id",
    "",
    "sh",
  ]) {
    const result = spawnSync(python, [script], {
      env: { ...process.env, SSH_ORIGINAL_COMMAND: command },
      encoding: "utf8",
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /SSH command is not permitted/);
  }
  const result = spawnSync(python, [script, "--test-root", tmpdir()], {
    env: {
      ...process.env,
      SSH_ORIGINAL_COMMAND: "receive safe " + "a".repeat(64),
    },
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /SSH cannot override/);
});
