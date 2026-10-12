#!/usr/bin/env node
/**
 * branch-audit.mjs — 未合并分支只读核验（TASK-GOV-003 配套工具）
 *
 * 用法：node scripts/governance/branch-audit.mjs [--format md|tsv] [--base main]
 *
 * 对每个未合并 <base> 的本地分支输出只读测量：
 *   beyond      领先 base 的提交数
 *   own         分支自叉点以来的改动文件数（三点 diff）
 *   remaining   其中与 base 现存内容仍不同的文件数（真正的未集成增量）
 *   src/ev      remaining 中源码/测试类与证据类文件数
 *   cherry      补丁等价判定（+/−，−=已在 base）
 *   remote      是否有 origin 远端副本
 *   worktree    是否被 worktree 持有
 *   collide     分支与 base 自共同基点均改过的文件数（合并冲突预判）
 *
 * 纯只读：不创建/修改/删除任何 ref、文件或工作区内容。
 */
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const fmt = args.includes("--format")
  ? args[args.indexOf("--format") + 1]
  : "md";
const baseIdx = args.indexOf("--base");
const base = baseIdx >= 0 ? args[baseIdx + 1] : "main";

const git = (cmd) =>
  execFileSync("git", cmd, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

const BOOKKEEPING = new Set([
  "docs/PROGRESS.md",
  "docs/governance/task-ledger.json",
  "docs/governance/TASK_LEDGER.md",
  "docs/governance/PROJECT_STATE.md",
  "docs/governance/AI_HANDOFF.md",
  "VERSION",
  "config/platform-versions.json",
  "package.json",
  "package-lock.json",
  "docs/features/features.registry.json",
  "docs/features/README.md",
  "docs/README.md",
  "AGENTS.md",
]);

const lines = (s) =>
  s
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

const branches = lines(
  git(["branch", "--no-merged", base, "--format=%(refname:short)"]),
);
const remotes = new Set(
  lines(git(["branch", "-r", "--format=%(refname:short)"])),
);

// worktree holdings
const wt = new Map();
let cur = null;
for (const l of git(["worktree", "list", "--porcelain"]).split("\n")) {
  if (l.startsWith("worktree ")) cur = l.slice(9).trim();
  else if (l.startsWith("branch refs/heads/"))
    wt.set(l.slice("branch refs/heads/".length).trim(), cur);
}

const rows = [];
for (const b of branches) {
  const beyond = Number(git(["rev-list", "--count", `${base}..${b}`]).trim());
  let own = new Set();
  let noBase = false;
  try {
    own = new Set(lines(git(["diff", "--name-only", `${base}...${b}`])));
  } catch {
    noBase = true; // 无共同祖先（unrelated histories）
  }
  const nowDiff = new Set(lines(git(["diff", "--name-only", base, b])));
  const remaining = [...own].filter((f) => nowDiff.has(f));
  const cherry = git(["cherry", base, b]);
  const cPlus = lines(cherry).filter((x) => x.startsWith("+")).length;
  const cMinus = lines(cherry).filter((x) => x.startsWith("-")).length;
  let mb;
  try {
    mb = git(["merge-base", base, b]).trim();
  } catch {
    mb = "";
  }
  let collide = 0;
  if (mb) {
    const mainCh = new Set(
      lines(git(["diff", "--name-only", `${mb}..${base}`])),
    );
    collide = [...own].filter((f) => mainCh.has(f)).length;
  }
  const src = remaining.filter((f) =>
    /^(src|src-tauri|scripts|tests)\//.test(f),
  ).length;
  const ev = remaining.filter((f) =>
    /^docs\/(changes|evidence)\//.test(f),
  ).length;
  const subst = remaining.filter((f) => !BOOKKEEPING.has(f)).length;
  rows.push({
    b,
    beyond,
    own: noBase ? "n/a" : own.size,
    remaining: noBase ? "n/a" : remaining.length,
    subst: noBase ? "n/a" : subst,
    src,
    ev,
    cherry: `${cPlus}/${cMinus}`,
    remote: remotes.has(`origin/${b}`) ? "Y" : "N",
    wt: wt.has(b) ? "Y" : "-",
    collide: mb ? collide : "n/a",
    noBase,
  });
}
rows.sort((a, b2) => b2.remaining - a.remaining || a.b.localeCompare(b2.b));

const summary = {
  branches: rows.length,
  integrated: rows.filter((r) => r.subst === 0 && !r.noBase).length,
  noRemote: rows.filter((r) => r.remote === "N").length,
  withWorktree: rows.filter((r) => r.wt === "Y").length,
  noCommonBase: rows.filter((r) => r.noBase).map((r) => r.b),
};

if (fmt === "tsv") {
  console.log(
    [
      "branch",
      "beyond",
      "own",
      "remaining",
      "subst",
      "src",
      "ev",
      "cherry",
      "remote",
      "wt",
      "collide",
    ].join("\t"),
  );
  for (const r of rows)
    console.log(
      [
        r.b,
        r.beyond,
        r.own,
        r.remaining,
        r.subst,
        r.src,
        r.ev,
        r.cherry,
        r.remote,
        r.wt,
        r.collide,
      ].join("\t"),
    );
} else {
  console.log(
    "| 分支 | beyond | 独有delta | 仍差异 | 实质剩余 | src | 证据 | cherry | 远端 | worktree | 碰撞 |",
  );
  console.log("|---|---:|---:|---:|---:|---:|---:|---|---|---|---:|");
  for (const r of rows) {
    console.log(
      `| \`${r.b}\` | +${r.beyond} | ${r.own} | ${r.remaining} | ${r.subst} | ${r.src} | ${r.ev} | ${r.cherry} | ${r.remote} | ${r.wt} | ${r.collide} |`,
    );
  }
}
console.error(`\nsummary: ${JSON.stringify(summary)}`);
