import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const sourceRoot = fileURLToPath(new URL("../../", import.meta.url));
const containerSnapshot =
  "docs/plans/KK-Studio-功能台账与四向推进-2026-10-09.md";

function snapshotHeader() {
  return [
    `> 快照日期：${new Date().toISOString().slice(0, 10)}`,
    "> 数据源：docs/governance/task-ledger.json",
    "> 本文不替代权威账本。",
  ].join("\n");
}

function createFixture(t: test.TestContext) {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "kk-snapshot-scope-"),
  );
  t.after(() => {
    assert.equal(
      path.dirname(path.resolve(directory)),
      path.resolve(os.tmpdir()),
    );
    assert.match(path.basename(directory), /^kk-snapshot-scope-/);
    fs.rmSync(directory, { recursive: true, force: true });
  });
  const root = path.join(directory, "standalone checkout");
  for (const relativePath of [
    "scripts/check-snapshot-header.mjs",
    "scripts/governance/doc-index.mjs",
  ]) {
    const target = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(sourceRoot, relativePath), target);
  }
  const governance = path.join(root, "docs/governance");
  fs.mkdirSync(governance, { recursive: true });
  for (const [id, source] of [
    ["TASK_STATUS", "docs/governance/task-ledger.json"],
    ["PROJECT_STATE", "docs/governance/task-ledger.json"],
    ["AI_HANDOFF", "docs/governance/PROJECT_STATE.md"],
  ]) {
    fs.writeFileSync(
      path.join(governance, `${id}.md`),
      [
        `- docId: ${id}`,
        "- status: current",
        `- updatedAt: ${new Date().toISOString().slice(0, 10)}`,
        `- source: ${source}`,
        "- supersededBy: null",
        ...(id === "TASK_STATUS" ? [snapshotHeader()] : []),
      ].join("\n"),
    );
  }
  const containerRoot = path.join(directory, "explicit container 中文");
  const externalPath = path.join(containerRoot, containerSnapshot);
  fs.mkdirSync(path.dirname(externalPath), { recursive: true });
  fs.writeFileSync(externalPath, snapshotHeader());
  return { root, governance, containerRoot, externalPath, directory };
}

function runSnapshot(
  root: string,
  args: string[] = [],
  containerRoot?: string,
) {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key.toUpperCase() === "KK_CONTAINER_ROOT") delete env[key];
  }
  if (containerRoot !== undefined) env.KK_CONTAINER_ROOT = containerRoot;
  return spawnSync(
    process.execPath,
    [path.join(root, "scripts/check-snapshot-header.mjs"), ...args],
    { cwd: root, env, encoding: "utf8", timeout: 20_000 },
  );
}

test("snapshot CLI standalone checkout checks repository and reports external scope unrequested", (t) => {
  const { root } = createFixture(t);
  const result = runSnapshot(root);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /3 unique documents, 0 violations/);
  assert.match(result.stdout, /container not requested.*NOT VERIFIED/);
});

test("snapshot CLI still rejects a missing required repository snapshot", (t) => {
  const { root, governance } = createFixture(t);
  fs.unlinkSync(path.join(governance, "TASK_STATUS.md"));
  const result = runSnapshot(root);
  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /docs\/governance\/TASK_STATUS\.md: 快照文档不存在/,
  );
});

test("snapshot CLI still rejects invalid repository lifecycle metadata", (t) => {
  const { root, governance } = createFixture(t);
  const filePath = path.join(governance, "AI_HANDOFF.md");
  fs.writeFileSync(
    filePath,
    fs
      .readFileSync(filePath, "utf8")
      .replace(
        "source: docs/governance/PROJECT_STATE.md",
        "source: docs/governance/task-ledger.json",
      ),
  );
  const result = runSnapshot(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /source 应精确为/);
});

test("snapshot CLI still scans additional governance entries for duplicate current identities", (t) => {
  const { root, governance } = createFixture(t);
  fs.copyFileSync(
    path.join(governance, "PROJECT_STATE.md"),
    path.join(governance, "PROJECT_STATE_COPY.md"),
  );
  const result = runSnapshot(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /重复 current docId PROJECT_STATE/);
});

test("snapshot CLI explicit container flag checks the selected external documents", (t) => {
  const { root, containerRoot } = createFixture(t);
  const result = runSnapshot(root, ["--container-root", containerRoot]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /4 unique documents, 0 violations/);
  assert.match(result.stdout, /repository \+ explicit container/);
});

test("snapshot CLI preserves the explicit KK_CONTAINER_ROOT environment contract", (t) => {
  const { root, containerRoot } = createFixture(t);
  const result = runSnapshot(root, [], containerRoot);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /4 unique documents, 0 violations/);
});

test("snapshot CLI refuses missing explicitly selected container documents", (t) => {
  const { root, containerRoot, externalPath } = createFixture(t);
  fs.unlinkSync(externalPath);
  for (const result of [
    runSnapshot(root, ["--container-root", containerRoot]),
    runSnapshot(root, [], containerRoot),
  ]) {
    assert.equal(result.status, 1);
    assert.match(result.stderr, /KK-Studio-功能台账与四向推进.*快照文档不存在/);
  }
});

test("snapshot CLI rejects malformed external headers when a container is selected", (t) => {
  const { root, containerRoot, externalPath } = createFixture(t);
  fs.writeFileSync(externalPath, "# External snapshot without metadata\n");
  const result = runSnapshot(root, [], containerRoot);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /缺少快照日期声明/);
  assert.match(result.stderr, /缺少数据源声明/);
  assert.match(result.stderr, /不替代权威账本/);
});

test("snapshot CLI refuses incomplete or unknown scope arguments", (t) => {
  const { root } = createFixture(t);
  for (const args of [
    ["--container-root"],
    ["--container-root", ""],
    ["--container-root", "--unknown"],
    ["--skip-container"],
    ["--container-root", "somewhere", "unexpected"],
  ]) {
    const result = runSnapshot(root, args);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /--container-root.*非空路径|不支持的参数/);
  }
});

test("snapshot CLI refuses an explicitly empty KK_CONTAINER_ROOT", (t) => {
  const { root } = createFixture(t);
  const result = runSnapshot(root, [], " ");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /KK_CONTAINER_ROOT.*非空路径/);
});
