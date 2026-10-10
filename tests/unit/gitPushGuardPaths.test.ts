import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const zero = "0".repeat(40);
const testEnv = {
  ...process.env,
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : os.devNull,
  GIT_TERMINAL_PROMPT: "0",
  // Do not let Git Bash's implicit conversion hide a broken launcher.
  MSYS_NO_PATHCONV: "1",
  MSYS2_ARG_CONV_EXCL: "*",
};

function run(
  cwd: string,
  command: string,
  args: string[],
  input?: string,
  env = testEnv,
) {
  return spawnSync(command, args, {
    cwd,
    env,
    input,
    encoding: "utf8",
    timeout: 20_000,
  });
}

function git(cwd: string, ...args: string[]) {
  const result = run(cwd, "git", ["-c", "core.longpaths=true", ...args]);
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  return result.stdout.trim();
}

function commit(repo: string, text: string) {
  fs.writeFileSync(path.join(repo, "README.md"), text);
  git(repo, "add", "README.md");
  git(repo, "commit", "-qm", text);
  return git(repo, "rev-parse", "HEAD");
}

function fixture(t: test.TestContext, segments: string[]) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kk-guard-paths-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const repo = path.join(root, ...segments);
  const remote = path.join(root, "remote with spaces.git");
  fs.mkdirSync(repo, { recursive: true });
  git(root, "init", "--bare", "-q", remote);
  // Keep the process cwd below Win32's limit while the installed policy path
  // remains >260 characters; initialize from the existing target directory
  // so Git never receives the full long path as an init target argument.
  git(repo, "init", "-q", "-b", "main");
  git(repo, "config", "core.longpaths", "true");
  git(repo, "config", "user.email", "test@example.invalid");
  git(repo, "config", "user.name", "Path Test");
  git(repo, "config", "core.autocrlf", "false");
  const initial = commit(repo, "initial");
  git(repo, "remote", "add", "origin", remote);
  // Seed the isolated bare remote before installing the guard.
  git(repo, "push", "-q", "origin", "main");
  for (const relative of [
    ".githooks/pre-push",
    "scripts/install-git-guards.mjs",
    "scripts/governance/push-policy.mjs",
  ]) {
    const target = path.join(repo, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(projectRoot, relative), target);
  }
  const installed = run(repo, process.execPath, [
    "scripts/install-git-guards.mjs",
  ]);
  assert.equal(installed.status, 0, installed.stderr);
  return {
    root,
    repo,
    remote,
    initial,
    hook: path.join(repo, ".git/hooks/pre-push"),
    policy: path.join(repo, ".git/hooks/kk-studio-push-policy.mjs"),
  };
}

for (const [name, segments] of [
  ["single directory with spaces", ["KK Studio source"]],
  [
    "nested directories with spaces",
    ["Team Projects", "KK Studio 2.0", "Source Tree"],
  ],
  [
    "long path over 260 characters",
    Array.from(
      { length: 5 },
      (_, i) => `nested directory ${i} with spaces long`,
    ),
  ],
] as const) {
  test(`real Git hook permits topic creation and fast-forward: ${name}`, (t) => {
    const { repo, remote, policy } = fixture(t, [...segments]);
    if (name.startsWith("long")) assert.ok(policy.length > 260);
    git(repo, "switch", "-qc", "fix/TASK-path-test");
    git(repo, "push", "-q", "origin", "HEAD");
    const tip = commit(repo, "fast forward");
    git(repo, "push", "-q", "origin", "HEAD");
    assert.equal(
      git(remote, "rev-parse", "refs/heads/fix/TASK-path-test"),
      tip,
    );
  });

  test(`real Git hook rejects protected and non-FF pushes: ${name}`, (t) => {
    const { repo, remote, initial } = fixture(t, [...segments]);
    git(repo, "switch", "-qc", "fix/TASK-path-test");
    const tip = commit(repo, "topic progress");
    git(repo, "push", "-q", "origin", "HEAD");
    for (const [refspec, reason] of [
      ["HEAD:refs/heads/main", /Direct push/],
      [`${initial}:refs/heads/fix/TASK-path-test`, /Non-fast-forward/],
    ] as const) {
      const denied = run(repo, "git", ["push", "--force", "origin", refspec]);
      assert.notEqual(denied.status, 0);
      assert.match(denied.stderr, /KK Studio push guard/);
      assert.match(denied.stderr, reason);
      assert.doesNotMatch(denied.stderr, /MODULE_NOT_FOUND|Cannot find module/);
    }
    assert.equal(git(remote, "rev-parse", "refs/heads/main"), initial);
    assert.equal(
      git(remote, "rev-parse", "refs/heads/fix/TASK-path-test"),
      tip,
    );
  });
}

// Linux-only boundary emulation: native Windows Node is unavailable here.
// The actual hook and policy run; doubles only model cygpath/native argv.
function nativeBoundary(t: test.TestContext) {
  const data = fixture(t, ["boundary with spaces"]);
  const bin = path.join(data.root, "tool shims");
  fs.mkdirSync(bin);
  const launcher = path.join(bin, "native-node.mjs");
  const record = path.join(bin, "launch.json");
  fs.writeFileSync(
    launcher,
    `
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
if (process.argv[2] !== process.env.GUARD_NATIVE_PATH) {
  console.error('Native Node rejected untranslated POSIX script path');
  process.exit(72);
}
const input = fs.readFileSync(0, 'utf8');
fs.writeFileSync(process.env.GUARD_RECORD, JSON.stringify({ cwd: process.cwd(), args: process.argv.slice(3), input }));
const result = spawnSync(process.execPath, [process.env.GUARD_POLICY, ...process.argv.slice(3)], { input, encoding: 'utf8' });
process.stdout.write(result.stdout || '');
process.stderr.write(result.stderr || '');
process.exit(result.status ?? 1);
`,
  );
  fs.writeFileSync(
    path.join(bin, "node"),
    '#!/bin/sh\nexec "$GUARD_REAL_NODE" "$GUARD_LAUNCHER" "$@"\n',
    { mode: 0o755 },
  );
  fs.writeFileSync(
    path.join(bin, "cygpath"),
    `#!/bin/sh
[ "$1" = '-w' ] && [ "$2" = '--' ] && [ "$3" = "$GUARD_POLICY" ] || exit 73
[ "$GUARD_CONVERSION" != fail ] || exit 74
[ "$GUARD_CONVERSION" != empty ] || exit 0
printf '%s\\n' "$GUARD_NATIVE_PATH"
`,
    { mode: 0o755 },
  );
  return {
    ...data,
    record,
    env: {
      ...testEnv,
      PATH: `${bin}${path.delimiter}${process.env.PATH}`,
      GUARD_REAL_NODE: process.execPath,
      GUARD_LAUNCHER: launcher,
      GUARD_POLICY: data.policy,
      GUARD_RECORD: record,
      GUARD_NATIVE_PATH:
        "C:\\Team Projects\\KK Studio 2.0\\.git\\hooks\\kk-studio-push-policy.mjs",
    },
  };
}

test(
  "emulated native launch converts one script argument and preserves cwd, stdin and remote args",
  { skip: process.platform === "win32" },
  (t) => {
    const { repo, hook, initial, record, env } = nativeBoundary(t);
    const args = ["origin with spaces", "C:/bare remote with spaces.git"];
    const input = `HEAD ${initial} refs/heads/topic ${zero}\n`;
    const allowed = run(repo, "sh", [hook, ...args], input, env);
    assert.equal(allowed.status, 0, allowed.stderr);
    assert.deepEqual(JSON.parse(fs.readFileSync(record, "utf8")), {
      cwd: repo,
      args,
      input,
    });
    const denied = run(
      repo,
      "sh",
      [hook, ...args],
      `HEAD ${initial} refs/heads/main ${zero}\n`,
      env,
    );
    assert.equal(denied.status, 1);
    assert.match(denied.stderr, /Direct push/);
  },
);

for (const conversion of ["fail", "empty"]) {
  test(
    `emulated cygpath ${conversion} fails closed with readable diagnosis`,
    { skip: process.platform === "win32" },
    (t) => {
      const { repo, hook, record, env } = nativeBoundary(t);
      const result = run(repo, "sh", [hook, "origin", "remote"], "", {
        ...env,
        GUARD_CONVERSION: conversion,
      });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /KK Studio push guard.*path/i);
      assert.equal(fs.existsSync(record), false);
    },
  );
}

test("missing installed policy fails closed before Node emits a module stack", (t) => {
  const { repo, policy, remote, initial } = fixture(t, [
    "missing policy with spaces",
  ]);
  fs.unlinkSync(policy);
  const result = run(repo, "git", ["push", "origin", "HEAD:refs/heads/topic"]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /KK Studio push guard.*policy/i);
  assert.doesNotMatch(result.stderr, /MODULE_NOT_FOUND|Cannot find module/);
  assert.equal(git(remote, "rev-parse", "refs/heads/main"), initial);
  assert.notEqual(
    run(remote, "git", ["rev-parse", "--verify", "refs/heads/topic"]).status,
    0,
  );
});
