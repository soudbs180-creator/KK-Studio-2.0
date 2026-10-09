import { execFileSync } from "node:child_process";

const shaPattern = /^[0-9a-f]{40,64}$/i;

function git(args) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

export function validateMergeGroup({ baseSha, headSha, checkoutSha, mainSha, isAncestor = true } = {}) {
  const reasons = [];
  if (![baseSha, headSha, checkoutSha].every((sha) => shaPattern.test(String(sha ?? ""))))
    reasons.push("merge_group base/head/checkout SHA is missing or malformed");
  if (mainSha && baseSha !== mainSha) reasons.push("merge_group base SHA is not the current origin/main SHA");
  if (isAncestor !== true) reasons.push("merge_group head is not based on its advertised base");
  return { ok: reasons.length === 0, reasons, baseSha: baseSha ?? null, headSha: headSha ?? null, checkoutSha: checkoutSha ?? null };
}

export function readMergeGroupEnvironment(env = process.env, gitImpl = git) {
  const baseSha = env.BASE_SHA ?? env.GITHUB_BASE_SHA;
  const headSha = env.HEAD_SHA ?? env.GITHUB_HEAD_SHA;
  const checkoutSha = env.CHECKOUT_SHA ?? env.GITHUB_SHA;
  let mainSha = null;
  let isAncestor = false;
  try {
    mainSha = gitImpl(["rev-parse", "origin/main"]);
    gitImpl(["merge-base", "--is-ancestor", baseSha, headSha]);
    isAncestor = true;
  } catch {
    // The validator reports the missing or invalid relationship.
  }
  return validateMergeGroup({ baseSha, headSha, checkoutSha, mainSha, isAncestor });
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/merge-group-gate.mjs")) {
  const result = readMergeGroupEnvironment();
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}
