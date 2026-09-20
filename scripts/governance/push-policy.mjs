import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const protectedBranch = /^refs\/heads\/(?:main$|master$|release(?:\/|$))/;
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

function isAncestor(cwd, older, newer) {
  return git(cwd, ["merge-base", "--is-ancestor", older, newer]).status === 0;
}

/** Evaluate Git's pre-push stdin protocol, failing closed on unknown ancestry. */
export function evaluatePush(input, { cwd = process.cwd() } = {}) {
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
      errors.push(
        `Deletion of ${remoteRef} is blocked; merged-topic cleanup needs a separate reviewed maintenance process.`,
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

function main() {
  const result = evaluatePush(fs.readFileSync(0, "utf8"));
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
    main();
  } catch {
    console.error(
      "[KK Studio push guard] Policy execution failed; push denied.",
    );
    process.exitCode = 1;
  }
}
