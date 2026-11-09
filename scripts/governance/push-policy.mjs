import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const protectedBranch = /^refs\/heads\/(?:main$|master$|release(?:\/|$))/;
const retainedBranch = /^refs\/heads\/(?:archive|backup)(?:\/|$)/;
const objectId = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
const zeroId = /^0+$/;

function git(cwd, args) {
  return spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 15_000,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
}

function githubRequest(url, init = {}) {
  const credential = spawnSync("git", ["credential", "fill"], {
    input: "protocol=https\nhost=github.com\n\n",
    encoding: "utf8",
    stdio: ["pipe", "pipe", "ignore"],
  });
  const token =
    credential.status === 0
      ? credential.stdout.match(/^password=(.+)$/m)?.[1]
      : undefined;
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...init, headers });
}

function isAncestor(cwd, older, newer) {
  return git(cwd, ["merge-base", "--is-ancestor", older, newer]).status === 0;
}

/** Evaluate Git's pre-push stdin protocol, failing closed on unknown ancestry. */
export function evaluatePush(
  input,
  { cwd = process.cwd(), mergedTips = new Map() } = {},
) {
  const errors = [];
  const lines = input.split(/\r?\n/).filter((line) => line.trim());
  for (const line of lines) {
    const fields = line.trim().split(/\s+/);
    const [, localOid, remoteRef, remoteOid] = fields;
    if (
      fields.length !== 4 ||
      !objectId.test(localOid) ||
      !objectId.test(remoteOid) ||
      localOid.length !== remoteOid.length
    ) {
      errors.push(
        "Malformed pre-push input; expected refs and matching full object IDs.",
      );
      continue;
    }
    if (git(cwd, ["check-ref-format", remoteRef]).status !== 0) {
      errors.push("Invalid destination ref.");
      continue;
    }
    if (protectedBranch.test(remoteRef)) {
      errors.push(
        `Direct push or deletion of ${remoteRef} is blocked; use a reviewed PR.`,
      );
      continue;
    }
    if (zeroId.test(localOid)) {
      if (
        !remoteRef.startsWith("refs/heads/") ||
        retainedBranch.test(remoteRef) ||
        zeroId.test(remoteOid) ||
        mergedTips.get(remoteRef) !== remoteOid
      )
        errors.push(
          `Deletion of ${remoteRef} is blocked; require a merged GitHub PR at this exact tip with no open head/base dependencies.`,
        );
      continue;
    }
    if (remoteRef.startsWith("refs/tags/")) {
      if (!zeroId.test(remoteOid))
        errors.push(`Existing tag ${remoteRef} is immutable.`);
      else if (
        git(cwd, ["cat-file", "-e", `${localOid}^{object}`]).status !== 0
      )
        errors.push(
          `New tag ${remoteRef} does not point to an available object.`,
        );
      continue;
    }
    if (!remoteRef.startsWith("refs/heads/")) {
      errors.push(
        `Unsupported destination ${remoteRef}; only branches and new tags are allowed.`,
      );
      continue;
    }
    if (git(cwd, ["cat-file", "-e", `${localOid}^{commit}`]).status !== 0) {
      errors.push(
        `Branch ${remoteRef} must point to a locally available commit.`,
      );
      continue;
    }
    if (!zeroId.test(remoteOid) && !isAncestor(cwd, remoteOid, localOid))
      errors.push(
        `Non-fast-forward or unknown ancestry for ${remoteRef}; fetch and merge before pushing.`,
      );
  }
  return { ok: errors.length === 0, errors };
}

/** Verify public GitHub PRs, including squash merges, without trusting local refs. */
export async function collectMergedTopicTips(
  input,
  remoteUrl,
  request = githubRequest,
) {
  const remote =
    /^(?:https:\/\/github\.com\/|git@github\.com:)([\w.-]+)\/([\w.-]+?)(?:\.git)?$/.exec(
      remoteUrl || "",
    );
  const tips = new Map();
  if (!remote) return tips;
  const repo = `${remote[1]}/${remote[2]}`;
  const deletions = new Map();
  for (const line of input.split(/\r?\n/)) {
    const fields = line.trim().split(/\s+/);
    const [, localOid, ref, remoteOid] = fields;
    if (
      fields.length === 4 &&
      objectId.test(localOid) &&
      zeroId.test(localOid) &&
      objectId.test(remoteOid) &&
      !zeroId.test(remoteOid) &&
      localOid.length === remoteOid.length &&
      ref.startsWith("refs/heads/") &&
      !protectedBranch.test(ref) &&
      !retainedBranch.test(ref) &&
      git(process.cwd(), ["check-ref-format", ref]).status === 0
    )
      deletions.set(ref, remoteOid);
  }
  if (!deletions.size) return tips;
  const pulls = [];
  for (let page = 1; ; page += 1) {
    const response = await request(
      `https://api.github.com/repos/${repo}/pulls?state=all&per_page=100&page=${page}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "KK-Studio-push-guard",
        },
        signal: AbortSignal.timeout(10_000),
        redirect: "error",
      },
    );
    if (!response.ok)
      throw new Error("GitHub PR verification unavailable; deletion denied.");
    const batch = await response.json();
    if (!Array.isArray(batch))
      throw new Error("Invalid GitHub PR response; deletion denied.");
    pulls.push(...batch);
    if (batch.length < 100) break;
  }
  const sameRepo = (value) =>
    value?.full_name?.toLowerCase() === repo.toLowerCase();
  const openDependencies = new Set();
  for (const pull of pulls) {
    if (pull.state !== "open") continue;
    if (sameRepo(pull.head?.repo))
      openDependencies.add(`refs/heads/${pull.head.ref}`);
    if (sameRepo(pull.base?.repo))
      openDependencies.add(`refs/heads/${pull.base.ref}`);
  }
  for (const pull of pulls) {
    const ref = `refs/heads/${pull.head?.ref}`;
    if (
      pull.state === "closed" &&
      pull.merged_at &&
      sameRepo(pull.head?.repo) &&
      sameRepo(pull.base?.repo) &&
      deletions.get(ref) === pull.head?.sha &&
      !openDependencies.has(ref)
    )
      tips.set(ref, pull.head.sha);
  }
  return tips;
}

async function main() {
  const input = fs.readFileSync(0, "utf8");
  const mergedTips = await collectMergedTopicTips(input, process.argv[3]);
  const result = evaluatePush(input, { mergedTips });
  for (const error of result.errors)
    console.error(`[KK Studio push guard] ${error}`);
  if (!result.ok) {
    console.error(
      "Local hooks can be bypassed; this guard does not replace hosting protection.",
    );
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    await main();
  } catch {
    console.error(
      "[KK Studio push guard] Policy execution failed; push denied.",
    );
    process.exitCode = 1;
  }
}
