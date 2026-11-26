import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { type TestContext } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const installer = "scripts/install-git-guards.mjs";
const policy = "scripts/governance/commit-policy.mjs";
const env = {
  ...process.env,
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : os.devNull,
};

function run(cwd: string, executable: string, ...args: string[]) {
  return spawnSync(executable, args, { cwd, env, encoding: "utf8" });
}

function git(cwd: string, ...args: string[]) {
  const result = run(cwd, "git", ...args);
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  return result.stdout.trim();
}

function write(repo: string, relative: string, content: string) {
  const file = path.join(repo, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function fixture(t: TestContext) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kk commit guard "));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  git(dir, "init", "-qb", "main");
  git(dir, "config", "user.name", "Fixture");
  git(dir, "config", "user.email", "fixture@example.test");
  for (const relative of [
    ".githooks/pre-push",
    ".githooks/pre-commit",
    installer,
    policy,
    "scripts/governance/push-policy.mjs",
  ]) {
    write(dir, relative, fs.readFileSync(path.join(root, relative), "utf8"));
  }
  return dir;
}

test("Git hook and CI inspect staged or committed data, preserving removal and redacting secrets", (t) => {
  const repo = fixture(t);
  let result = run(repo, process.execPath, installer);
  assert.equal(result.status, 0, result.stderr);
  write(repo, ".gitattributes", "assets/note.txt -diff\n");
  write(repo, "src/original.ts", "export const item = 17;\n");
  write(repo, "src/first.ts", "export const first = 1;\n");
  write(repo, "src/second.ts", "export const second = 2;\n");
  write(repo, ".env.example", "SERVICE_KEY=\n");
  git(repo, "add", "--", ".gitattributes", "src", ".env.example");
  git(repo, "commit", "-qm", "initial source");
  const base = git(repo, "rev-parse", "HEAD");

  const marker = ["-----BEGIN ", "PRIVATE KEY-----"].join("");
  write(repo, "assets/note.txt", marker + "\n");
  write(repo, "src/相同 code.ts", "export const item = 17;\n");
  write(repo, "src/second.ts", "export const first = 1;\n");
  write(repo, ".tmp/output.txt", "disposable\n");
  write(repo, "output/probe.txt", "disposable\n");
  write(repo, "config/signing.pem", "disposable\n");
  const tokenName = ["ghp", "_", "A".repeat(36)].join("") + ".txt";
  write(repo, `assets/${tokenName}`, "disposable\n");
  git(repo, "add", "-f", "--", ".tmp", "assets", "config", "output", "src");
  write(repo, "assets/note.txt", "unstaged correction\n");

  result = run(repo, "git", "commit", "-qm", "invalid source");
  assert.equal(result.status, 1);
  for (const expected of [
    ".tmp/output.txt",
    "output/probe.txt",
    "config/signing.pem",
    "Possible private key",
    "assets/note.txt",
    "Identical source files",
    "src/相同 code.ts",
    "src/second.ts",
    "Possible credential in an added or modified filename",
  ])
    assert.ok(result.stderr.includes(expected), result.stderr);
  assert.ok(!result.stderr.includes(marker));
  assert.ok(!result.stderr.includes(tokenName));
  assert.equal(git(repo, "rev-parse", "HEAD"), base);

  git(repo, "commit", "--no-verify", "-qm", "fixture for CI");
  const invalid = git(repo, "rev-parse", "HEAD");
  result = run(repo, process.execPath, policy, base, invalid);
  assert.equal(result.status, 1);
  assert.ok(result.stderr.includes("Possible private key"));
  assert.ok(result.stderr.includes("Identical source files"));
  assert.ok(!result.stderr.includes(marker));

  git(
    repo,
    "rm",
    "--",
    ".tmp/output.txt",
    "config/signing.pem",
    "output/probe.txt",
    `assets/${tokenName}`,
  );
  git(repo, "add", "--", "assets/note.txt");
  git(repo, "mv", "src/相同 code.ts", "src/renamed.ts");
  write(repo, "src/renamed.ts", "export const otherItem = 18;\n");
  write(repo, "src/second.ts", "export const second = 2;\n");
  git(repo, "add", "--", "src");
  git(repo, "commit", "-qm", "remove prohibited contents");
  const cleaned = git(repo, "rev-parse", "HEAD");
  result = run(repo, process.execPath, policy, invalid, cleaned);
  assert.equal(result.status, 0, result.stderr);
  result = run(repo, process.execPath, policy, base, cleaned);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Possible private key/);
  assert.ok(result.stderr.includes(invalid.slice(0, 12)));
});

test("installer preserves an unrelated pre-commit and still installs pre-push", (t) => {
  const repo = fixture(t);
  const existing = "#!/bin/sh\nprintf '%s\\n' existing\n";
  write(repo, ".git/hooks/pre-commit", existing);
  const result = run(repo, process.execPath, installer);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /Existing pre-commit/);
  assert.equal(
    fs.readFileSync(path.join(repo, ".git/hooks/pre-commit"), "utf8"),
    existing,
  );
  assert.ok(fs.existsSync(path.join(repo, ".git/hooks/pre-push")));
});
