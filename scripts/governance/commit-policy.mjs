import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const FORBIDDEN_DIRECTORY =
  /(^|\/)(?:\.git|node_modules|dist|target|test-results|\.tmp|\.worktrees|coverage|\.cache|\.vite|playwright-report|blob-report|artifacts|build)(\/|$)/i;
const FORBIDDEN_SECRET =
  /(^|\/)(?:\.env(?:\..*)?|id_rsa(?:\..*)?|credentials(?:\.[^/]*)?|service-account(?:\.[^/]*)?|secrets?(?:\.[^/]*)?|.*\.(?:pem|key|p12|pfx|jks|keystore|secret))$/i;
const FORBIDDEN_BINARY = /\.(?:exe|msi|dmg|pkg|appimage|deb|rpm)$/i;
const LOCAL_OUTPUT =
  /^(?:(?:tmp|test-scratch|backups|releases|user-data|output|\.verification|\.tmp-[^/]+|src-tauri\/agent-runtime|public\/plugins)\/|[^/]+\.log$)|\.(?:tmp|bak|tsbuildinfo)$/i;
const SOURCE = /^src\/.*\.(?:[cm]?[jt]sx?|css)$/i;
const SECRET_MARKERS = [
  ["private key", /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----/],
  [
    "GitHub token",
    /\b(?:gh[pousr]_[A-Za-z0-9]{36,255}|github_pat_[A-Za-z0-9_]{60,255})\b/,
  ],
  ["OpenAI key", /\bsk-(?:proj|svcacct|admin)-[A-Za-z0-9_-]{40,255}/],
];

export function forbiddenDeliveryPath(file) {
  if (FORBIDDEN_DIRECTORY.test(file) || FORBIDDEN_BINARY.test(file))
    return true;
  // Source modules such as credentials.ts are policy code.
  const sourceModule =
    /^(?:src|tests|scripts)\/.*\.(?:[cm]?[jt]sx?|mjs|cjs)$/i.test(file);
  return (
    FORBIDDEN_SECRET.test(file) &&
    !/(^|\/)\.env\.example$/i.test(file) &&
    !sourceModule
  );
}

function git(...args) {
  try {
    return execFileSync("git", ["--literal-pathspecs", ...args], {
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    throw new Error(`Unable to read Git ${args[0]} for commit checks.`);
  }
}

function findSecret(diff) {
  let inHunk = false;
  for (const line of diff.split("\n")) {
    if (line.startsWith("@@ ")) inHunk = true;
    if (!inHunk || !line.startsWith("+")) continue;
    const marker = SECRET_MARKERS.find(([, pattern]) => pattern.test(line));
    if (marker) return marker[0];
  }
}

function fileLabel(file) {
  return SECRET_MARKERS.some(([, pattern]) => pattern.test(file))
    ? "[redacted path]"
    : JSON.stringify(file);
}

function sourceBlobs(head) {
  const entries = head
    ? git("ls-tree", "-rz", head, "--", "src")
    : git("ls-files", "--stage", "-z", "--", "src");
  const pathsByHash = new Map();
  for (const entry of entries.split("\0").filter(Boolean)) {
    const separator = entry.indexOf("\t");
    const file = entry.slice(separator + 1);
    const [mode, typeOrHash, hashOrStage] = entry
      .slice(0, separator)
      .split(" ");
    if (!mode.startsWith("100") || !SOURCE.test(file)) continue;
    const hash = head ? hashOrStage : typeOrHash;
    const files = pathsByHash.get(hash) ?? [];
    files.push(file);
    pathsByHash.set(hash, files);
  }
  return pathsByHash;
}

function inspectChanges(revisions, head) {
  const diff = [
    "diff",
    "--no-ext-diff",
    "--no-textconv",
    "--text",
    "--color=never",
    "--no-renames",
    "--diff-filter=ACMRT",
  ];
  const changes = git(
    ...diff,
    "--raw",
    "--no-abbrev",
    "-z",
    ...revisions,
    "--",
  ).split("\0");
  const issues = [];
  const changedSource = new Set();
  for (let index = 0; index + 1 < changes.length; index += 2) {
    const [, newMode, previousHash, hash] = changes[index].split(" ");
    const file = changes[index + 1];
    const label = fileLabel(file);
    if (label === "[redacted path]") {
      issues.push("Possible credential in an added or modified filename.");
      continue;
    }
    if (forbiddenDeliveryPath(file) || LOCAL_OUTPUT.test(file)) {
      issues.push(`Forbidden commit path: ${label}`);
      continue;
    }
    if (previousHash !== hash && newMode.startsWith("100") && SOURCE.test(file))
      changedSource.add(file);
    const secret = findSecret(
      git(...diff, "--unified=0", ...revisions, "--", file),
    );
    if (secret) issues.push(`Possible ${secret} in added content: ${label}`);
  }
  if (changedSource.size) {
    for (const files of sourceBlobs(head).values()) {
      if (files.length < 2 || !files.some((file) => changedSource.has(file)))
        continue;
      issues.push(`Identical source files: ${files.map(fileLabel).join(", ")}`);
    }
  }
  return issues;
}

export function runCommitCheck(args) {
  const issues = args.length
    ? inspectRange(args)
    : inspectChanges(["--cached"]);
  for (const issue of issues) console.error(`[KK commit guard] ${issue}`);
  if (issues.length) process.exitCode = 1;
}

function inspectRange(args) {
  if (
    args.length !== 2 ||
    args.some((sha) => !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(sha))
  ) {
    throw new Error(
      "Use the staged index or provide two full Git commit SHAs.",
    );
  }
  const [base, head] = args;
  git("merge-base", "--is-ancestor", base, head);
  return git("rev-list", "--reverse", "--parents", `${base}..${head}`)
    .trim()
    .split("\n")
    .filter(Boolean)
    .flatMap((line) => {
      const [commit, parent] = line.split(" ");
      if (!parent)
        throw new Error("Git first parent is missing during commit checks.");
      return inspectChanges([parent, commit], commit).map(
        (issue) => `${commit.slice(0, 12)} ${issue}`,
      );
    });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    runCommitCheck(process.argv.slice(2));
  } catch (error) {
    console.error(`[KK commit guard] ${error.message}`);
    process.exitCode = 1;
  }
}
