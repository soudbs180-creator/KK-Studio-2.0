import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";
import { checkDeliveryFiles } from "../../scripts/governance/delivery.mjs";

const change = "docs/changes/2026-09-20-example/";
const manifest = [
  "intent.md",
  "spec.md",
  "plan.md",
  "verification.md",
  "review.md",
].map((f) => change + f);
const changed = [
  "src/App.tsx",
  "docs/PROGRESS.md",
  "docs/governance/task-ledger.json",
  ...manifest,
];
const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const deliveryScript = path.join(repoRoot, "scripts", "check-delivery.mjs");
test("delivery accepts a complete scoped artifact package", () => {
  assert.deepEqual(
    checkDeliveryFiles(
      changed,
      (f: string) =>
        manifest.includes(f) ||
        f === "docs/PROGRESS.md" ||
        f === "docs/governance/task-ledger.json",
    ),
    [],
  );
});
test("delivery cannot substitute unrelated historical files for a missing current review", () => {
  const current = manifest.filter((f) => !f.endsWith("review.md"));
  assert.match(
    checkDeliveryFiles(changed, (f: string) => current.includes(f)).join(),
    /review/,
  );
});
test("every changed package must be complete; an unrelated complete package cannot satisfy a partial one", () => {
  const other = "docs/changes/2026-09-19-old/";
  const completeOther = [
    "intent.md",
    "spec.md",
    "plan.md",
    "verification.md",
    "review.md",
  ].map((f) => other + f);
  const partialCurrent = manifest.filter((f) => !f.endsWith("review.md"));
  const result = checkDeliveryFiles(
    [
      "src/App.tsx",
      "docs/PROGRESS.md",
      "docs/governance/task-ledger.json",
      ...completeOther,
      ...partialCurrent,
    ],
    (file: string) =>
      completeOther.includes(file) || partialCurrent.includes(file),
    (file: string) => file === "docs/changes/2026-09-19-old",
  );
  assert.match(
    result.join("\n"),
    /2026-09-20-example.*review|2026-09-20-example.*incomplete/s,
  );
});
test("a changed package must update both verification and review", () => {
  const result = checkDeliveryFiles(
    [
      "src/App.tsx",
      "docs/PROGRESS.md",
      "docs/governance/task-ledger.json",
      ...manifest.filter(
        (file) =>
          !file.endsWith("verification.md") && !file.endsWith("review.md"),
      ),
    ],
    (file: string) => manifest.includes(file),
  );
  assert.match(result.join(), /verification\.md/);
  assert.match(result.join(), /review\.md/);
});
test("historical packages alone cannot pass, while a new package must bind to a changed ledger task", () => {
  const oldPackage = "docs/changes/2026-09-19-old/";
  const oldFiles = manifest.map((file) => file.replace(change, oldPackage));
  const ledgerTask = {
    id: "TASK-NEW",
    branch: "feat/TASK-NEW-work",
    evidence: [`${change}verification.md`],
  };
  const complete = [...changed, ...oldFiles];
  const baseExists = (file: string) => file === "docs/changes/2026-09-19-old";
  const exists = (file: string) => complete.includes(file);
  assert.match(
    checkDeliveryFiles(
      [
        "src/App.tsx",
        "docs/PROGRESS.md",
        "docs/governance/task-ledger.json",
        ...oldFiles,
      ],
      exists,
      baseExists,
    ).join(),
    /new dated change package/,
  );
  assert.deepEqual(
    checkDeliveryFiles(complete, exists, baseExists, {
      headLedger: [ledgerTask],
      baseLedger: [],
      branch: ledgerTask.branch,
    }),
    [],
  );
  assert.match(
    checkDeliveryFiles(complete, exists, baseExists, {
      headLedger: [ledgerTask],
      baseLedger: [],
      branch: "fix/other",
    }).join(),
    /bound to a changed task-ledger/,
  );
});
test("delivery rejects code-only PR and missing current ledger update", () => {
  const result = checkDeliveryFiles(["src/App.tsx"], () => true).join();
  assert.match(result, /dated/);
  assert.match(result, /PROGRESS/);
  assert.match(result, /ledger/);
});
test("delivery blocks secret/generated payloads and competing locks but permits an env example", () => {
  const bad = [
    "config/.env.production",
    ".git/hooks/post-commit",
    "dist/index.html",
    ".worktrees/task/src/a.ts",
    "coverage/lcov.info",
    "private/key.pem",
    "release/app.exe",
    "pnpm-lock.yaml",
    "node_modules/.env.example",
  ];
  const result = checkDeliveryFiles(
    [...changed, ...bad, ".env.example"],
    (f: string) =>
      manifest.includes(f) ||
      bad.includes(f) ||
      f === ".env.example" ||
      f === "docs/PROGRESS.md" ||
      f === "docs/governance/task-ledger.json",
  );
  assert.equal(result.length, 9);
  assert.match(result.join(), /node_modules.*\.env\.example/);
  assert.equal(
    result.filter((message: string) => message.endsWith(".env.example")).length,
    1,
  );
});
test("deleting a secret/generated file or competing lock is allowed, but deleting required governance files is not", () => {
  const deleted = [
    "config/.env.production",
    "dist/index.html",
    "pnpm-lock.yaml",
  ];
  const result = checkDeliveryFiles(
    [...changed, ...deleted],
    (file: string) =>
      manifest.includes(file) &&
      file !== "docs/PROGRESS.md" &&
      file !== "docs/governance/task-ledger.json",
  );
  assert.equal(
    result.filter((message: string) => message.includes("Forbidden")).length,
    0,
  );
  assert.equal(
    result.filter((message: string) => message.includes("Only package-lock"))
      .length,
    0,
  );
  assert.match(result.join(), /PROGRESS/);
  assert.match(result.join(), /ledger/);
});
test("delivery rejects path traversal and alternate Windows path spellings", () => {
  const bad = [
    "../.env",
    "C:/repo/.env",
    "docs\\changes\\escape\\intent.md",
    "docs/changes/x/../review.md",
  ];
  const result = checkDeliveryFiles([...changed, ...bad], (f: string) =>
    manifest.includes(f),
  );
  assert.equal(
    result.filter((message: string) =>
      message.startsWith("Invalid delivery path"),
    ).length,
    bad.length,
  );
});
test("delivery CLI rejects an unknown base instead of treating it as an empty review", () => {
  const head = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim();
  const result = spawnSync(
    process.execPath,
    [deliveryScript, "--base", "a".repeat(40), "--head", head],
    { cwd: repoRoot, encoding: "utf8" },
  );
  assert.notEqual(result.status, 0);
  assert.match(
    `${result.stdout}${result.stderr}`,
    /Cannot resolve delivery revisions/,
  );
});
test("delivery CLI includes a pure deletion in the real diff", () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "kk-delivery-delete-"));
  try {
    const git = (...args: string[]) =>
      execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
    git("init", "-q", "-b", "main");
    git("config", "user.email", "test@example.invalid");
    git("config", "user.name", "Delivery Test");
    fs.writeFileSync(path.join(repo, "removed.txt"), "remove me\n");
    git("add", "removed.txt");
    git("commit", "-qm", "base");
    const base = git("rev-parse", "HEAD");
    fs.rmSync(path.join(repo, "removed.txt"));
    git("commit", "-am", "delete");
    const head = git("rev-parse", "HEAD");
    const result = spawnSync(
      process.execPath,
      [deliveryScript, "--base", base, "--head", head],
      { cwd: repo, encoding: "utf8" },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stdout + result.stderr, /Delivery: 1 files/);
    assert.match(result.stdout + result.stderr, /dated|PROGRESS|ledger/);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test("delivery CLI binds a new package to the changed task and rejects stale base, history reuse and invalid ledger", () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "kk-delivery-binding-"));
  try {
    const git = (...args: string[]) =>
      execFileSync("git", args, {
        cwd: repo,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }).trim();
    const write = (file: string, body: string) => {
      fs.mkdirSync(path.dirname(path.join(repo, file)), { recursive: true });
      fs.writeFileSync(path.join(repo, file), body);
    };
    const commit = () => {
      git("add", ".");
      git("commit", "-qm", "fixture");
      return git("rev-parse", "HEAD");
    };
    const run = (base: string, head: string, branch = "codex/TASK-TEST-002") =>
      spawnSync(
        process.execPath,
        [deliveryScript, "--base", base, "--head", head, "--branch", branch],
        { cwd: repo, encoding: "utf8" },
      );
    git("init", "-q", "-b", "main");
    git("config", "user.email", "test@example.invalid");
    git("config", "user.name", "Delivery Test");
    for (const file of manifest) write(file, "historical record\n");
    write("docs/PROGRESS.md", "base\n");
    write("docs/governance/task-ledger.json", "[]\n");
    const base = commit();
    write(change + "review.md", "touched old review\n");
    write(change + "verification.md", "touched old verification\n");
    write("docs/PROGRESS.md", "current\n");
    const current = "docs/changes/2026-09-20-next/";
    write(
      "docs/governance/task-ledger.json",
      JSON.stringify([
        {
          id: "TASK-TEST-002",
          branch: "codex/TASK-TEST-002",
          evidence: [current + "verification.md"],
        },
      ]),
    );
    const historicalHead = commit();
    const historical = run(base, historicalHead);
    assert.notEqual(historical.status, 0);
    assert.match(historical.stderr, /historical packages cannot/);
    for (const file of manifest)
      write(file.replace(change, current), "current record\n");
    const head = commit();
    const accepted = run(base, head);
    assert.equal(accepted.status, 0, accepted.stderr);
    const wrongBranch = run(base, head, "codex/TASK-OTHER");
    assert.notEqual(wrongBranch.status, 0);
    assert.match(wrongBranch.stderr, /bound.*task-ledger.*branch/);
    write("docs/governance/task-ledger.json", "null\n");
    const invalid = run(base, commit());
    assert.notEqual(invalid.status, 0);
    assert.match(invalid.stderr, /Cannot read task ledger/);
    git("checkout", "-qb", "upstream", base);
    write("upstream.txt", "new main change\n");
    const stale = run(commit(), head);
    assert.notEqual(stale.status, 0);
    assert.match(stale.stderr, /Cannot resolve delivery revisions/);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});
