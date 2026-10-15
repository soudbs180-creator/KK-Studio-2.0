import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import {
  ensureDesktopRelease,
  inspectDesktopRelease,
  runDesktopRelease,
} from "../../scripts/windows/desktop-release.mjs";
import {
  RELEASE_EXECUTABLE,
  RELEASE_RECEIPT,
  writeDesktopReleaseReceipt,
} from "../../scripts/windows/desktop-release-identity.mjs";

function fixture(t: { after: (cleanup: () => void) => void }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kk-dependency-safety-"));
  t.after(() => {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith("kk-dependency-safety-"));
    fs.rmSync(root, { recursive: true, force: true });
  });
  const write = (relative: string, content: string) => {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
    return file;
  };
  const dependency = "node_modules/fixture-package/package.json";
  const packageContent = JSON.stringify({ version: "1.0.0" });
  const lock = write(
    "package-lock.json",
    JSON.stringify({
      packages: { "node_modules/fixture-package": { version: "1.0.0" } },
    }),
  );
  write(dependency, packageContent);
  write("config/platform-versions.json", '{"desktop":"2.1.34"}');
  const source = write("src/App.tsx", "previous source");
  const executable = write(RELEASE_EXECUTABLE, "previous executable");
  writeDesktopReleaseReceipt(root);
  const receipt = path.join(root, RELEASE_RECEIPT);
  const receiptBefore = fs.readFileSync(receipt);
  fs.writeFileSync(source, "changed source");
  const scriptDirectory = path.join(root, "scripts", "windows");
  fs.mkdirSync(scriptDirectory, { recursive: true });
  for (const file of ["desktop-release.mjs", "desktop-release-identity.mjs"])
    fs.copyFileSync(
      new URL(`../../scripts/windows/${file}`, import.meta.url),
      path.join(scriptDirectory, file),
    );
  const cli = path.join(scriptDirectory, "desktop-release.mjs");
  const calls = path.join(root, "npm-calls.jsonl");
  const npmStub = write(
    "stub-npm.mjs",
    `import fs from "node:fs";
import path from "node:path";
const args = process.argv.slice(2);
fs.appendFileSync("npm-calls.jsonl", JSON.stringify({args,cwd:process.cwd()})+"\\n");
const mode = process.env.KK_DEPENDENCY_FIXTURE;
if(args[0] === "ci") {
  if(mode !== "install-stale") {
    fs.mkdirSync(path.dirname(${JSON.stringify(dependency)}), {recursive:true});
    fs.writeFileSync(${JSON.stringify(dependency)}, ${JSON.stringify(packageContent)});
  }
  process.exit(mode === "install-fail" ? 23 : 0);
}
if(args.join(" ") !== "run client:build:agent -- --no-bundle") process.exit(99);
fs.writeFileSync(${JSON.stringify(RELEASE_EXECUTABLE)}, "replaced executable");
process.exit(mode === "build-fail" ? 24 : 0);
`,
  );
  const run = (mode: string, entry = cli) => {
    const result = spawnSync(process.execPath, [entry], {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
      timeout: 10000,
      env: {
        ...process.env,
        npm_execpath: npmStub,
        KK_DEPENDENCY_FIXTURE: mode,
      },
    });
    assert.equal(result.error, undefined, result.stderr);
    assert.equal(result.signal, null);
    return result;
  };
  return {
    root,
    lock,
    executable,
    dependency: path.join(root, dependency),
    receipt,
    receiptBefore,
    run,
    write,
    calls: () =>
      fs.existsSync(calls)
        ? fs
            .readFileSync(calls, "utf8")
            .trim()
            .split("\n")
            .map((line) => JSON.parse(line) as { args: string[]; cwd: string })
        : [],
  };
}

for (const linked of ["root", "package", "scope"] as const) {
  test(`a linked dependency ${linked} cannot reach a custom builder, npm, receipt or launch`, (t) => {
    const f = fixture(t);
    const linkedPath =
      linked === "root"
        ? path.join(f.root, "node_modules")
        : linked === "package"
          ? path.dirname(f.dependency)
          : path.join(f.root, "node_modules", "@fixture");
    if (linked === "scope") {
      f.write(
        "node_modules/@fixture/package/package.json",
        '{"version":"1.0.0"}',
      );
      fs.writeFileSync(
        f.lock,
        JSON.stringify({
          packages: {
            "node_modules/@fixture/package": { version: "1.0.0" },
          },
        }),
      );
    }
    const target = path.join(f.root, "shared-target");
    fs.renameSync(linkedPath, target);
    const sentinel = path.join(target, "owner-sentinel.bin");
    fs.writeFileSync(sentinel, Buffer.from([0, 255, 2, 10]));
    const sentinelBefore = fs.readFileSync(sentinel);
    try {
      fs.symlinkSync(target, linkedPath, "junction");
    } catch (error) {
      if (
        ["EPERM", "EACCES"].includes(
          (error as NodeJS.ErrnoException).code ?? "",
        )
      ) {
        t.skip(`junction creation unavailable: ${error}`);
        return;
      }
      throw error;
    }
    let built = 0;
    let launched = 0;
    assert.throws(
      () =>
        runDesktopRelease(f.root, {
          buildRelease: () => {
            built++;
          },
          launchRelease: () => {
            launched++;
          },
        }),
      /linked dependencies/,
    );
    assert.equal(built, 0);
    assert.equal(launched, 0);
    const result = f.run("success");
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /linked dependencies/);
    assert.deepEqual(f.calls(), []);
    assert.deepEqual(fs.readFileSync(sentinel), sentinelBefore);
    assert.deepEqual(fs.readFileSync(f.receipt), f.receiptBefore);
    assert.equal(fs.readFileSync(f.executable, "utf8"), "previous executable");
    assert.equal(fs.lstatSync(linkedPath).isSymbolicLink(), true);
  });
}

test("a dependency path escaping node_modules stops before a custom builder or npm", (t) => {
  const f = fixture(t);
  fs.writeFileSync(
    f.lock,
    JSON.stringify({
      packages: {
        "node_modules/../../escaped": { version: "1.0.0" },
      },
    }),
  );
  let built = 0;
  assert.throws(
    () =>
      ensureDesktopRelease(f.root, () => {
        built++;
      }),
    /within local node_modules/,
  );
  assert.equal(built, 0);
  const result = f.run("success");
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /within local node_modules/);
  assert.deepEqual(f.calls(), []);
  assert.deepEqual(fs.readFileSync(f.receipt), f.receiptBefore);
});

for (const invalid of ["missing", "invalid", "array", "string"] as const) {
  test(`${invalid} lockfile stops before a custom builder or npm`, (t) => {
    const f = fixture(t);
    if (invalid === "missing") fs.rmSync(f.lock);
    else
      fs.writeFileSync(
        f.lock,
        invalid === "invalid"
          ? "not JSON"
          : JSON.stringify({ packages: invalid === "array" ? [] : "invalid" }),
      );
    let built = 0;
    assert.throws(
      () =>
        ensureDesktopRelease(f.root, () => {
          built++;
        }),
      /valid package-lock.json/,
    );
    assert.equal(built, 0);
    const result = f.run("success");
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /valid package-lock.json/);
    assert.deepEqual(f.calls(), []);
    assert.deepEqual(fs.readFileSync(f.receipt), f.receiptBefore);
    assert.equal(fs.readFileSync(f.executable, "utf8"), "previous executable");
  });
}

for (const mode of ["install-fail", "install-stale", "build-fail"] as const) {
  test(`real desktop CLI stops on ${mode} without a new receipt or launching the fixture executable`, (t) => {
    const f = fixture(t);
    if (mode !== "build-fail") fs.rmSync(f.dependency);
    const result = f.run(mode);
    assert.equal(result.status, 1, result.stderr);
    assert.match(
      result.stderr,
      mode === "install-fail"
        ? /repair failed with exit code 23/
        : mode === "install-stale"
          ? /still out of sync/
          : /build failed with exit code 24/,
    );
    assert.doesNotMatch(result.stdout, /Launched/);
    assert.deepEqual(f.calls(), [
      {
        args:
          mode === "build-fail"
            ? ["run", "client:build:agent", "--", "--no-bundle"]
            : ["ci", "--ignore-scripts", "--no-audit", "--no-fund"],
        cwd: f.root,
      },
    ]);
    assert.deepEqual(fs.readFileSync(f.receipt), f.receiptBefore);
    assert.equal(
      fs.readFileSync(f.executable, "utf8"),
      mode === "build-fail" ? "replaced executable" : "previous executable",
    );
    if (mode === "install-fail")
      assert.equal(
        JSON.parse(fs.readFileSync(f.dependency, "utf8")).version,
        "1.0.0",
      );
  });
}

test("the default builder repairs and builds through the checked entry before issuing a receipt", (t) => {
  const f = fixture(t);
  f.write("node_modules/@fixture/package/package.json", '{"version":"1.0.0"}');
  const lock = JSON.parse(fs.readFileSync(f.lock, "utf8"));
  lock.packages["node_modules/@fixture/package"] = { version: "1.0.0" };
  fs.writeFileSync(f.lock, JSON.stringify(lock));
  fs.rmSync(f.dependency);
  const wrapper = f.write(
    "prepare.mjs",
    'import { ensureDesktopRelease } from "./scripts/windows/desktop-release.mjs";\n' +
      "const result = ensureDesktopRelease(process.cwd());\n" +
      'if(!result.rebuilt || result.needsBuild) throw new Error("invalid release");\n',
  );
  const result = f.run("success", wrapper);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(f.calls(), [
    {
      args: ["ci", "--ignore-scripts", "--no-audit", "--no-fund"],
      cwd: f.root,
    },
    { args: ["run", "client:build:agent", "--", "--no-bundle"], cwd: f.root },
  ]);
  assert.equal(inspectDesktopRelease(f.root).reason, "current");
  assert.notDeepEqual(fs.readFileSync(f.receipt), f.receiptBefore);
});
