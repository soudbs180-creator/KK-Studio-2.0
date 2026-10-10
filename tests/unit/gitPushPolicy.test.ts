import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { evaluatePush } from "../../scripts/governance/push-policy.mjs";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const testEnv = {
  ...process.env,
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : os.devNull,
  GIT_TERMINAL_PROMPT: "0",
};
const zero = "0".repeat(40);

function run(cwd: string, command: string, args: string[], env = testEnv) {
  return spawnSync(command, args, {
    cwd,
    env,
    encoding: "utf8",
    stdio: "pipe",
  });
}

function git(cwd: string, ...args: string[]) {
  const result = run(cwd, "git", args);
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  return result.stdout.trim();
}

function commit(repo: string, text: string) {
  fs.writeFileSync(path.join(repo, "README.md"), text);
  git(repo, "add", "README.md");
  git(repo, "commit", "-qm", text);
  return git(repo, "rev-parse", "HEAD");
}

function install(repo: string, env = testEnv, args: string[] = []) {
  return run(
    repo,
    process.execPath,
    ["scripts/install-git-guards.mjs", ...args],
    env,
  );
}

function copyGuards(repo: string) {
  for (const relative of [
    ".githooks/pre-push",
    "scripts/install-git-guards.mjs",
    "scripts/governance/push-policy.mjs",
  ]) {
    const target = path.join(repo, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(projectRoot, relative), target);
  }
}

function fixture(t: test.TestContext, installed = true) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kk-git-guard-"));
  const repo = path.join(root, "source with spaces");
  const remote = path.join(root, "remote.git");
  t.after(() => {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith("kk-git-guard-"));
    fs.rmSync(root, { recursive: true, force: true });
  });
  git(root, "init", "--bare", "-q", remote);
  git(root, "init", "-q", "-b", "main", repo);
  git(repo, "config", "user.email", "test@example.invalid");
  git(repo, "config", "user.name", "Guard Test");
  git(repo, "config", "core.autocrlf", "false");
  const initial = commit(repo, "initial");
  git(repo, "remote", "add", "origin", remote);
  git(repo, "push", "-q", "origin", "main");
  copyGuards(repo);
  if (installed) {
    const result = install(repo);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /common Git hooks shared/);
  }
  return { root, repo, remote, initial };
}

function rejected(repo: string, args: string[], reason: RegExp) {
  const result = run(repo, "git", ["push", ...args]);
  assert.notEqual(result.status, 0, "unsafe push unexpectedly succeeded");
  assert.match(result.stderr, /KK Studio push guard/);
  assert.match(result.stderr, reason);
}

function remoteRef(remote: string, ref: string) {
  const result = run(remote, "git", ["rev-parse", "--verify", ref]);
  return result.status === 0 ? result.stdout.trim() : null;
}

test("real hook denies direct main/master/release pushes and protected deletion", (t) => {
  const { repo, remote, initial } = fixture(t);
  commit(repo, "after initial");
  for (const ref of ["main", "master", "release", "release/v2"])
    rejected(repo, ["origin", `HEAD:refs/heads/${ref}`], /Direct push/);
  rejected(repo, ["origin", "--delete", "main"], /Direct push or deletion/);
  assert.equal(remoteRef(remote, "refs/heads/main"), initial);
  assert.equal(remoteRef(remote, "refs/heads/master"), null);
  assert.equal(remoteRef(remote, "refs/heads/release/v2"), null);
});

test("real hook allows topic creation and fast-forward, denies every non-FF form and topic deletion", (t) => {
  const { repo, remote, initial } = fixture(t);
  git(repo, "switch", "-qc", "codex/TASK-example");
  git(repo, "push", "-q", "origin", "HEAD");
  const latest = commit(repo, "topic progress");
  git(repo, "push", "-q", "origin", "HEAD");
  const ref = "refs/heads/codex/TASK-example";
  for (const args of [
    ["--force", "origin", `${initial}:${ref}`],
    ["--force-with-lease", "origin", `${initial}:${ref}`],
    ["origin", `+${initial}:${ref}`],
  ])
    rejected(repo, args, /Non-fast-forward/);
  rejected(
    repo,
    ["origin", "--delete", "codex/TASK-example"],
    /Deletion.*blocked/,
  );
  assert.equal(remoteRef(remote, ref), latest);
});

test("real hook allows new lightweight/annotated tags and blocks all existing tag changes/deletions", (t) => {
  const { repo, remote, initial } = fixture(t);
  git(repo, "tag", "v1.0.0");
  git(repo, "tag", "-a", "v1.0.1", "-m", "release");
  const annotated = git(repo, "rev-parse", "refs/tags/v1.0.1");
  git(repo, "push", "-q", "origin", "refs/tags/v1.0.0", "refs/tags/v1.0.1");
  const newer = commit(repo, "later");
  for (const tag of ["v1.0.0", "v1.0.1"]) {
    rejected(
      repo,
      ["--force", "origin", `${newer}:refs/tags/${tag}`],
      /Existing tag.*immutable/,
    );
    rejected(repo, ["origin", "--delete", tag], /Deletion.*blocked/);
  }
  assert.equal(remoteRef(remote, "refs/tags/v1.0.0"), initial);
  assert.equal(remoteRef(remote, "refs/tags/v1.0.1"), annotated);
});

test("one forbidden ref stops all refs in atomic and ordinary multi-ref pushes", (t) => {
  const { repo, remote, initial } = fixture(t);
  commit(repo, "mixed update");
  for (const flags of [["--atomic"], []]) {
    rejected(
      repo,
      [
        ...flags,
        "origin",
        "HEAD:refs/heads/feat/allowed",
        "HEAD:refs/heads/main",
      ],
      /Direct push/,
    );
    assert.equal(remoteRef(remote, "refs/heads/feat/allowed"), null);
    assert.equal(remoteRef(remote, "refs/heads/main"), initial);
  }
});

test("unknown remote object fails closed without a fetch or blind forced overwrite", (t) => {
  const { root, repo, remote } = fixture(t);
  const peer = path.join(root, "peer");
  git(root, "clone", "-q", "--branch", "main", remote, peer);
  git(peer, "config", "user.email", "peer@example.invalid");
  git(peer, "config", "user.name", "Peer");
  git(peer, "switch", "-qc", "feat/remote");
  const remoteTip = commit(peer, "peer progress unavailable locally");
  git(peer, "push", "-q", "origin", "HEAD");
  assert.notEqual(run(repo, "git", ["cat-file", "-e", remoteTip]).status, 0);
  commit(repo, "local independent progress");
  rejected(
    repo,
    ["--force", "origin", "HEAD:refs/heads/feat/remote"],
    /unknown ancestry/,
  );
  assert.equal(remoteRef(remote, "refs/heads/feat/remote"), remoteTip);
});

test("malformed input, missing objects and unsupported namespaces cannot open the guard", (t) => {
  const { repo, initial } = fixture(t);
  for (const input of [
    "bad protocol",
    `HEAD ${initial} refs/heads/topic 123`,
    `HEAD ${"a".repeat(40)} refs/heads/topic ${zero}`,
    `HEAD ${"a".repeat(40)} refs/tags/new ${zero}`,
    `HEAD ${initial} refs/heads/topic ${"b".repeat(40)}`,
    `HEAD ${initial} refs/notes/commits ${zero}`,
    `HEAD ${initial} bad-ref ${zero}`,
    `(delete) ${zero} refs/notes/commits ${initial}`,
  ])
    assert.equal(evaluatePush(input, { cwd: repo }).ok, false, input);
  assert.equal(evaluatePush("", { cwd: repo }).ok, true);
  assert.equal(
    evaluatePush(`HEAD ${initial} refs/heads/topic ${zero}\r\n`, { cwd: repo })
      .ok,
    true,
  );
});

test("installer preserves other hooks, is idempotent, changes no config and rejects modified installed files", (t) => {
  const { repo } = fixture(t, false);
  const hooks = path.join(repo, ".git", "hooks");
  const sourceHook = path.join(repo, ".githooks", "pre-push");
  fs.writeFileSync(
    sourceHook,
    fs.readFileSync(sourceHook, "utf8").replace(/\r?\n/g, "\r\n"),
  );
  fs.writeFileSync(path.join(hooks, "pre-commit"), "keep this hook\n");
  const config = fs.readFileSync(path.join(repo, ".git", "config"));
  assert.equal(install(repo).status, 0);
  assert.equal(install(repo).status, 0);
  assert.equal(
    fs.readFileSync(path.join(hooks, "pre-push"), "utf8").includes("\r"),
    false,
  );
  assert.deepEqual(fs.readFileSync(path.join(repo, ".git", "config")), config);
  assert.equal(
    fs.readFileSync(path.join(hooks, "pre-commit"), "utf8"),
    "keep this hook\n",
  );
  fs.appendFileSync(path.join(hooks, "pre-push"), "# unreviewed change\n");
  const modified = fs.readFileSync(path.join(hooks, "pre-push"));
  assert.notEqual(install(repo).status, 0);
  assert.deepEqual(fs.readFileSync(path.join(hooks, "pre-push")), modified);
});

test("installer refuses existing pre-push and effective global/local/worktree custom hook paths", (t) => {
  const { root, repo } = fixture(t, false);
  const existing = path.join(repo, ".git", "hooks", "pre-push");
  fs.writeFileSync(existing, "# user hook\n");
  assert.notEqual(install(repo).status, 0);
  assert.equal(fs.readFileSync(existing, "utf8"), "# user hook\n");
  fs.unlinkSync(existing);
  git(repo, "config", "core.hooksPath", ".custom-hooks");
  assert.notEqual(install(repo).status, 0);
  assert.equal(git(repo, "config", "--get", "core.hooksPath"), ".custom-hooks");
  git(repo, "config", "--unset", "core.hooksPath");
  git(repo, "config", "core.hooksPath", "");
  assert.notEqual(
    install(repo).status,
    0,
    "empty custom path must not silently disable protection",
  );
  git(repo, "config", "--unset", "core.hooksPath");
  const globalConfig = path.join(root, "test-global-config");
  fs.writeFileSync(globalConfig, "[core]\n\thooksPath = custom\n");
  assert.notEqual(
    install(repo, { ...testEnv, GIT_CONFIG_GLOBAL: globalConfig }).status,
    0,
  );
  const linked = path.join(root, "linked with spaces");
  git(repo, "worktree", "add", "-q", "-b", "feat/linked", linked, "main");
  git(repo, "config", "extensions.worktreeConfig", "true");
  git(linked, "config", "--worktree", "core.hooksPath", ".custom-linked-hooks");
  assert.notEqual(install(repo).status, 0);
  assert.equal(fs.existsSync(existing), false);
  assert.equal(
    fs.existsSync(
      path.join(repo, ".git", "hooks", "kk-studio-push-policy.mjs"),
    ),
    false,
  );
});

test("installed common hook runs in another worktree even without policy source files", (t) => {
  const { root, repo, remote, initial } = fixture(t);
  const linked = path.join(root, "another worktree");
  git(repo, "worktree", "add", "-q", "-b", "feat/linked", linked, "main");
  assert.equal(
    fs.existsSync(
      path.join(linked, "scripts", "governance", "push-policy.mjs"),
    ),
    false,
  );
  const tip = commit(linked, "linked change");
  rejected(linked, ["origin", "HEAD:refs/heads/main"], /Direct push/);
  git(linked, "push", "-q", "origin", "HEAD");
  assert.equal(remoteRef(remote, "refs/heads/main"), initial);
  assert.equal(remoteRef(remote, "refs/heads/feat/linked"), tip);
});

function installLegacyPair(repo: string) {
  const hooks = path.join(repo, ".git", "hooks");
  for (const [source, target] of [
    ["pre-push-v1", "pre-push"],
    ["push-policy-v1.mjs", "kk-studio-push-policy.mjs"],
  ]) {
    fs.copyFileSync(
      path.join(projectRoot, "tests/fixtures/git-guards", source),
      path.join(hooks, target),
    );
    fs.chmodSync(path.join(hooks, target), 0o755);
  }
  return hooks;
}

test(
  "reviewed v1 upgrade refuses symlinked hooks and policies",
  { skip: process.platform === "win32" },
  (t) => {
    const { repo } = fixture(t, false);
    const hooks = installLegacyPair(repo);
    const target = path.join(hooks, "pre-push");
    const external = path.join(repo, "user-owned-hook");
    fs.renameSync(target, external);
    fs.symlinkSync(external, target);
    const original = fs.readFileSync(external);
    assert.notEqual(
      install(repo, testEnv, ["--upgrade-reviewed-v1"]).status,
      0,
    );
    assert.equal(fs.lstatSync(target).isSymbolicLink(), true);
    assert.deepEqual(fs.readFileSync(external), original);
    fs.unlinkSync(target);
    fs.copyFileSync(external, target);
    fs.chmodSync(target, 0o755);
    const policy = path.join(hooks, "kk-studio-push-policy.mjs");
    const externalPolicy = path.join(repo, "user-owned-policy");
    fs.renameSync(policy, externalPolicy);
    fs.symlinkSync(externalPolicy, policy);
    assert.notEqual(
      install(repo, testEnv, ["--upgrade-reviewed-v1"]).status,
      0,
    );
    assert.equal(fs.lstatSync(policy).isSymbolicLink(), true);
    assert.deepEqual(fs.readFileSync(target), original);
  },
);

test("explicit reviewed v1 upgrade preserves backup, config and other hooks, then runs real pushes", (t) => {
  const { repo, remote, initial } = fixture(t, false);
  const hooks = installLegacyPair(repo);
  const legacy = fs.readFileSync(path.join(hooks, "pre-push"));
  const config = fs.readFileSync(path.join(repo, ".git/config"));
  fs.writeFileSync(path.join(hooks, "pre-commit"), "#!/bin/sh\nexit 0\n", {
    mode: 0o755,
  });
  assert.notEqual(
    install(repo).status,
    0,
    "default install must not replace older hooks",
  );
  const result = install(repo, testEnv, ["--upgrade-reviewed-v1"]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(
    fs.readFileSync(path.join(hooks, "pre-push.kk-studio-v1.bak")),
    legacy,
  );
  assert.deepEqual(fs.readFileSync(path.join(repo, ".git/config")), config);
  assert.equal(
    fs.readFileSync(path.join(hooks, "pre-commit"), "utf8"),
    "#!/bin/sh\nexit 0\n",
  );
  assert.equal(install(repo, testEnv, ["--upgrade-reviewed-v1"]).status, 0);
  git(repo, "switch", "-qc", "fix/upgraded");
  const tip = commit(repo, "after upgrade");
  git(repo, "push", "-q", "origin", "HEAD");
  rejected(repo, ["origin", "HEAD:refs/heads/main"], /Direct push/);
  assert.equal(remoteRef(remote, "refs/heads/main"), initial);
  assert.equal(remoteRef(remote, "refs/heads/fix/upgraded"), tip);
});

test(
  "reviewed v1 upgrade preserves an executable guard under restrictive umask",
  { skip: process.platform === "win32" },
  (t) => {
    const { repo, remote, initial } = fixture(t, false);
    const hooks = installLegacyPair(repo);
    const result = run(repo, process.execPath, [
      "--input-type=module",
      "-e",
      "process.umask(0o111); const { installGitGuards } = await import('./scripts/install-git-guards.mjs'); installGitGuards(process.cwd(), { upgradeReviewedV1: true });",
    ]);
    assert.equal(result.status, 0, result.stderr);
    const tip = commit(repo, "after restrictive upgrade");
    rejected(repo, ["origin", "HEAD:refs/heads/main"], /Direct push/);
    assert.equal(remoteRef(remote, "refs/heads/main"), initial);
    git(repo, "push", "-q", "origin", "HEAD:refs/heads/fix/upgraded-mode");
    assert.equal(remoteRef(remote, "refs/heads/fix/upgraded-mode"), tip);
    for (const name of ["pre-push", "pre-push.kk-studio-v1.bak"])
      assert.equal(fs.statSync(path.join(hooks, name)).mode & 0o777, 0o755);
  },
);

for (const changed of [
  "pre-push",
  "kk-studio-push-policy.mjs",
  "missing policy",
  "backup occupied",
  "temporary occupied",
]) {
  test(`reviewed v1 upgrade refuses ${changed} without changing existing files`, (t) => {
    const { repo } = fixture(t, false);
    const hooks = installLegacyPair(repo);
    if (changed === "missing policy")
      fs.unlinkSync(path.join(hooks, "kk-studio-push-policy.mjs"));
    else if (changed.endsWith("occupied"))
      fs.writeFileSync(
        path.join(
          hooks,
          changed.startsWith("backup")
            ? "pre-push.kk-studio-v1.bak"
            : "pre-push.kk-studio-v2.tmp",
        ),
        "user owned\n",
      );
    else fs.appendFileSync(path.join(hooks, changed), "\n// modified\n");
    const before = new Map(
      fs
        .readdirSync(hooks)
        .map((name) => [name, fs.readFileSync(path.join(hooks, name))]),
    );
    const result = install(repo, testEnv, ["--upgrade-reviewed-v1"]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /KK Studio git guards/);
    assert.deepEqual(
      new Map(
        fs
          .readdirSync(hooks)
          .map((name) => [name, fs.readFileSync(path.join(hooks, name))]),
      ),
      before,
    );
  });
}
