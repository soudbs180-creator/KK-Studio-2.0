/**
 * Git 作用域工具：base 与 head 之间变化的文件，以及任一修订上的文件内容。
 * base 与 head 都经过同一组函数读取，保证两侧度量口径一致。
 *
 * 与 hermes gitio.py 的对应关系：default_base -> merge-base(HEAD, origin/main)，
 * changed_files -> diff --name-status -M -z 加未跟踪文件；本地默认 base 落后于 main 时，
 * 用环境变量 GOVERNANCE_BASE（CI 约定）或 --base 覆盖。
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** 运行 git 并返回 stdout；失败时返回空串（由调用方决定是否致命）。 */
export function git(root, args, { check = true } = {}) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (error) {
    if (check) {
      const detail = error.stderr ? String(error.stderr).trim() : String(error);
      throw new Error(`git ${args.join(" ")} failed: ${detail}`, {
        cause: error,
      });
    }
    return "";
  }
}

export function commitOrNone(root, rev) {
  if (!rev) return null;
  return (
    git(root, ["rev-parse", "--verify", "--quiet", `${rev}^{commit}`], {
      check: false,
    }).trim() || null
  );
}

/**
 * 默认 base：HEAD 与 origin/main 的 merge-base；CI 用 GOVERNANCE_BASE 指定目标分支 tip。
 * 两侧都找不到时返回 null（调用方跳过检查，而不是误判为无发现）。
 */
export function defaultBase(root) {
  const override = process.env.GOVERNANCE_BASE?.trim();
  if (override) {
    const sha = commitOrNone(root, override);
    if (sha) return sha;
  }
  for (const ref of ["origin/main", "main"]) {
    const out = git(root, ["merge-base", "HEAD", ref], { check: false }).trim();
    if (out && commitOrNone(root, out)) return out;
  }
  return null;
}

/**
 * base 与 head 之间的变化。head 为 null 时表示工作区（含未跟踪文件）。
 * 返回 [{ status, old, new }]；R 归一为 old+new 两处都在作用域内。
 */
export function changedFiles(root, base, head = null) {
  const args = ["diff", "--name-status", "-M", "-z", "--no-color", base];
  if (head) args.push(head);
  const fields = git(root, args).split("\0");
  const changes = [];
  let i = 0;
  while (i < fields.length && fields[i]) {
    const code = fields[i][0];
    if (code === "R" || code === "C") {
      changes.push({
        status: code === "R" ? "R" : "A",
        old: fields[i + 1],
        new: fields[i + 2],
      });
      i += 3;
      continue;
    }
    const path = fields[i + 1];
    if (code === "D") changes.push({ status: "D", old: path, new: null });
    else if (code === "A") changes.push({ status: "A", old: null, new: path });
    else changes.push({ status: "M", old: path, new: path });
    i += 2;
  }
  if (!head) {
    const untracked = git(root, [
      "ls-files",
      "--others",
      "--exclude-standard",
      "-z",
    ]).split("\0");
    for (const path of untracked) {
      if (path) changes.push({ status: "A", old: null, new: path });
    }
  }
  return changes;
}

/**
 * 读取修订上的文件内容。tree 为 null 时读工作区。两侧都用 utf-8-sig 解码，
 * BOM 不会让 base 与 head 的同一文件对不上。
 */
export function readFileAt(root, tree, relPath) {
  if (tree === null) {
    try {
      return readFileSync(join(root, relPath), "utf8");
    } catch {
      return null;
    }
  }
  try {
    const out = execFileSync("git", ["show", `${tree}:${relPath}`], {
      cwd: root,
      encoding: "buffer",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
    });
    return out.toString("utf8").replace(/^\uFEFF/, "");
  } catch {
    return null;
  }
}

/** 读取指定修订配置里的开关值（如 ENFORCEMENT / FOOTGUNS_ENFORCEMENT），分支不能自我放宽。 */
export function readSwitch(root, rev, file, name, fallback = "blocking") {
  const text = rev ? readFileAt(root, rev, file) : readFileAt(root, null, file);
  if (text === null) return fallback;
  const match = [
    ...text.matchAll(
      new RegExp(`\\b${name}\\s*=\\s*["'](advisory|blocking|off)["']`, "g"),
    ),
  ].at(-1);
  return match ? match[1] : fallback;
}

/**
 * glob 转 RegExp：双星目录段匹配零或多个层级（因此 src 下的 glob 也含 src/App.tsx 这类根级文件），
 * 单星不跨目录。
 */
export function globToRegExp(glob) {
  const normalized = glob.replaceAll("\\", "/");
  let pattern = "^";
  for (let index = 0; index < normalized.length;) {
    if (normalized.startsWith("**/", index)) {
      pattern += "(?:[^/]+/)*";
      index += 3;
      continue;
    }
    if (normalized.startsWith("**", index)) {
      pattern += ".*";
      index += 2;
      continue;
    }
    const character = normalized[index];
    if (character === "*") {
      pattern += "[^/]*";
    } else if (/[.+^${}()|[\]\\]/.test(character)) {
      pattern += `\\${character}`;
    } else {
      pattern += character;
    }
    index += 1;
  }
  return new RegExp(`${pattern}$`);
}

/** 路径是否命中 include 且不命中 exclude。 */
export function inScope(relPath, scope) {
  const normalized = relPath.replaceAll("\\", "/");
  if (scope.exclude.some((glob) => globToRegExp(glob).test(normalized)))
    return false;
  return scope.include.some((glob) => globToRegExp(glob).test(normalized));
}
