import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test, { type TestContext } from "node:test";
import {
  CONTAINER_SNAPSHOT_DOCUMENTS,
  TEMPORAL_DOCUMENTS,
} from "../../scripts/governance/doc-index.mjs";

function fixture(t: TestContext) {
  const container = mkdtempSync(path.join(tmpdir(), "kk-snapshot-cli-"));
  const root = path.join(container, "repository");
  t.after(() => rmSync(container, { recursive: true, force: true }));
  mkdirSync(path.join(root, "scripts/governance"), { recursive: true });
  mkdirSync(path.join(root, "docs/governance"), { recursive: true });
  for (const file of ["check-snapshot-header.mjs", "governance/doc-index.mjs"])
    copyFileSync(
      path.resolve("scripts", file),
      path.join(root, "scripts", file),
    );
  const date = new Date().toISOString().slice(0, 10);
  for (const { relativePath, documentId, source } of TEMPORAL_DOCUMENTS)
    writeFileSync(
      path.join(root, relativePath),
      [
        `- docId: ${documentId}`,
        "- status: current",
        `- updatedAt: ${date}`,
        `- 数据源: ${source}`,
        "- supersededBy: null",
        `快照日期：${date}`,
        "本文不替代权威账本",
      ].join("\n"),
    );
  const env = { ...process.env };
  delete env.KK_CONTAINER_ROOT;
  const run = (containerRoot?: string) =>
    spawnSync(process.execPath, ["scripts/check-snapshot-header.mjs"], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...env,
        ...(containerRoot === undefined
          ? {}
          : { KK_CONTAINER_ROOT: containerRoot }),
      },
    });
  const external = path.join(container, CONTAINER_SNAPSHOT_DOCUMENTS[0]);
  return { root, container, external, run };
}

test("snapshot CLI validates a standalone checkout without external documents", (t) => {
  const { run } = fixture(t);
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /3 unique documents, 0 violations/);
  assert.match(result.stdout, /Container snapshots: not configured/);
});

test("snapshot CLI still rejects missing repository snapshots", (t) => {
  const { root, run } = fixture(t);
  rmSync(path.join(root, "docs/governance/TASK_STATUS.md"));
  const result = run();
  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /docs\/governance\/TASK_STATUS\.md: 快照文档不存在/,
  );
});

test("snapshot CLI fails closed for an explicit missing container snapshot", (t) => {
  const { container, run } = fixture(t);
  const result = run(container);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /快照文档不存在/);
});

test("snapshot CLI rejects an explicitly blank container root", (t) => {
  const { run } = fixture(t);
  for (const value of ["", "  "]) {
    const result = run(value);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /KK_CONTAINER_ROOT must not be blank/);
  }
});

test("snapshot CLI validates an explicitly configured external snapshot", (t) => {
  const { container, external, run } = fixture(t);
  mkdirSync(path.dirname(external), { recursive: true });
  writeFileSync(external, "# Invalid snapshot\n");
  const invalid = run(container);
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /缺少快照日期声明/);
  writeFileSync(
    external,
    "status: superseded\n快照日期：2026-10-09\n数据源：docs/governance/task-ledger.json\n本文不替代权威账本\n",
  );
  const valid = run(container);
  assert.equal(valid.status, 0, valid.stderr);
  assert.match(valid.stdout, /4 unique documents, 0 violations/);
});

test("snapshot CLI preserves repository invariants with or without external scope", (t) => {
  const { root, container, external, run } = fixture(t);
  mkdirSync(path.dirname(external), { recursive: true });
  writeFileSync(
    external,
    "status: superseded\n快照日期：2026-10-09\n数据源：docs/governance/task-ledger.json\n本文不替代权威账本\n",
  );
  const current = path.join(root, "docs/governance/TASK_STATUS.md");
  const original = readFileSync(current, "utf8");
  for (const scope of [undefined, container]) {
    assert.equal(run(scope).status, 0);
    writeFileSync(current, original.replace("- supersededBy: null", ""));
    const malformed = run(scope);
    assert.equal(malformed.status, 1);
    assert.match(malformed.stderr, /缺少 supersededBy/);
    writeFileSync(current, original);
    const duplicate = path.join(root, "docs/governance/COPY.md");
    writeFileSync(duplicate, original);
    const repeated = run(scope);
    assert.equal(repeated.status, 1);
    assert.match(repeated.stderr, /重复 current docId TASK_STATUS/);
    rmSync(duplicate);
    rmSync(current);
    const missing = run(scope);
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /TASK_STATUS\.md: 快照文档不存在/);
    writeFileSync(current, original);
  }
});
