import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

/** The names below are the only checks this automation is allowed to trust. */
export const REQUIRED_CHECKS = Object.freeze([
  "verify",
  "delivery",
  "deploy-linux",
  "governance",
]);

export function activationReadbackPass({ activation, paused } = {}) {
  return activation?.value === "enabled" && paused?.value === "false";
}

const GRAPHQL_ENDPOINT = "https://api.github.com/graphql";

function asLogin(value) {
  return value?.login ?? value?.user?.login ?? value?.actor?.login ?? null;
}

function branchMatchesMain(ruleset) {
  const includes =
    ruleset?.target === "branch"
      ? ruleset.conditions?.ref_name?.include
      : ruleset?.conditions?.ref_name?.include;
  if (!Array.isArray(includes)) return false;
  return includes.some((ref) => ref === "refs/heads/main" || ref === "main");
}

function rules(ruleset) {
  return Array.isArray(ruleset?.rules) ? ruleset.rules : [];
}

function ruleOf(ruleset, type) {
  return rules(ruleset).find((rule) => rule?.type === type);
}

/**
 * Turn a raw ruleset/branch-protection response into a small, auditable
 * readback. Missing or ambiguous fields intentionally remain false.
 */
export function readRulesetConfig({ ruleset, branchProtection } = {}) {
  const queue = ruleOf(ruleset, "merge_queue");
  const statusRule = ruleOf(ruleset, "required_status_checks");
  const reviewRule = ruleOf(ruleset, "pull_request");
  const queueParameters = queue?.parameters ?? {};
  const statusParameters = statusRule?.parameters ?? {};
  const reviewParameters = reviewRule?.parameters ?? {};
  const contexts =
    statusParameters.required_status_checks?.map((item) => item.context) ??
    branchProtection?.required_status_checks?.contexts;
  const requiredChecks = Array.isArray(contexts)
    ? [...new Set(contexts)].sort()
    : [];
  const expectedChecks = [...REQUIRED_CHECKS].sort();
  const mergeMethod =
    queueParameters.merge_method ?? ruleset?.merge_queue?.merge_method;
  const staleDismissal =
    reviewParameters.dismiss_stale_reviews_on_push ??
    branchProtection?.required_pull_request_reviews?.dismiss_stale_reviews;
  const approvals =
    reviewParameters.required_approving_review_count ??
    branchProtection?.required_pull_request_reviews
      ?.required_approving_review_count;
  const target = branchMatchesMain(ruleset) || Boolean(branchProtection);
  return {
    active: ruleset?.enforcement === "active" || Boolean(branchProtection),
    targetMain: target,
    mergeQueue: Boolean(queue),
    squash: mergeMethod === "SQUASH" || mergeMethod === "squash",
    requiredChecks: requiredChecks.join(",") === expectedChecks.join(","),
    strictChecks:
      statusParameters.strict_required_status_checks_policy ??
      branchProtection?.required_status_checks?.strict ??
      false,
    staleReviewDismissal: staleDismissal === true,
    independentReviewRequired: Number.isInteger(approvals) && approvals >= 1,
    requireLastPushApproval:
      reviewParameters.require_last_push_approval === true,
    checks: requiredChecks,
    mergeMethod: mergeMethod ?? null,
  };
}

export function rulesetReadbackPass(config) {
  return Boolean(
    config?.active &&
    config.targetMain &&
    config.mergeQueue &&
    config.squash &&
    config.requiredChecks &&
    config.strictChecks &&
    config.staleReviewDismissal,
  );
}

function checkResults(checks, headSha) {
  if (!Array.isArray(checks))
    return { ok: false, missing: [...REQUIRED_CHECKS], wrongHead: true };
  const byName = new Map();
  for (const check of checks) {
    const name = check?.name ?? check?.context;
    if (!name) continue;
    // A check without an exact head SHA is ambiguous. It may be a stale
    // status from another commit, so it cannot satisfy an exact-head gate.
    if (headSha && check.head_sha !== headSha) continue;
    byName.set(name, check);
  }
  const missing = REQUIRED_CHECKS.filter((name) => {
    const check = byName.get(name);
    return (
      !check ||
      (check.status && check.status !== "completed") ||
      check.conclusion !== "success"
    );
  });
  return {
    ok: missing.length === 0,
    missing,
    wrongHead: checks.length > 0 && byName.size === 0,
  };
}

function reviewPass(reviews, { headSha, author }) {
  if (!Array.isArray(reviews))
    return { ok: false, reason: "reviews unavailable" };
  // The REST endpoint is requested with per_page=100 below. A full page is
  // still ambiguous without a Link-header walk, so refuse to trust it.
  if (reviews.length >= 100)
    return { ok: false, reason: "review history may be paginated" };
  const latest = new Map();
  for (const review of reviews) {
    const login = asLogin(review);
    if (!login) continue;
    const previous = latest.get(login);
    const time =
      Date.parse(review.submitted_at ?? review.updated_at ?? "") || 0;
    const previousTime =
      Date.parse(previous?.submitted_at ?? previous?.updated_at ?? "") || 0;
    if (!previous || time >= previousTime) latest.set(login, review);
  }
  const independent = [...latest.values()].some(
    (review) =>
      String(review.state).toUpperCase() === "APPROVED" &&
      asLogin(review) !== author &&
      review.commit_id === headSha,
  );
  return {
    ok: independent,
    reason: independent
      ? null
      : "independent review is not approved on exact head",
  };
}

function threadsPass(threads) {
  if (!Array.isArray(threads))
    return { ok: false, reason: "review threads unavailable" };
  const unresolved = threads.filter(
    (thread) => thread?.isResolved !== true && thread?.resolved !== true,
  );
  return { ok: unresolved.length === 0, unresolved: unresolved.length };
}

/** Pure gate evaluation; it has no network or mutation side effects. */
export function evaluateMergeEligibility({
  pullRequest,
  rulesetConfig,
  checks,
  reviews,
  threads,
  mainHealthy,
  baseMatchesMain = false,
  activation = false,
} = {}) {
  const headSha = pullRequest?.head?.sha ?? pullRequest?.headSha;
  const author =
    asLogin(pullRequest?.user ?? pullRequest?.author) ?? pullRequest?.author;
  const checkGate = checkResults(checks, headSha);
  const reviewGate = reviewPass(reviews, { headSha, author });
  const threadGate = threadsPass(threads);
  const reasons = [];
  if (pullRequest?.state !== "open" || pullRequest?.draft === true)
    reasons.push("pull request is not an open ready-for-review PR");
  if (pullRequest?.base?.ref !== "main")
    reasons.push("pull request does not target main");
  if (!headSha) reasons.push("pull request head SHA is unavailable");
  if (!rulesetReadbackPass(rulesetConfig))
    reasons.push(
      "ruleset readback does not prove the required merge queue policy",
    );
  if (!checkGate.ok)
    reasons.push(
      `required checks are not successful: ${checkGate.missing.join(", ")}`,
    );
  if (!reviewGate.ok) reasons.push(reviewGate.reason);
  if (!threadGate.ok)
    reasons.push(threadGate.reason ?? "unresolved review threads remain");
  if (baseMatchesMain !== true)
    reasons.push("pull request base SHA is not the current origin/main SHA");
  if (mainHealthy !== true) reasons.push("main health is not proven");
  if (activation !== true) reasons.push("auto-merge activation is disabled");
  return {
    ok: reasons.length === 0,
    reasons,
    headSha: headSha ?? null,
    checks: checkGate,
    review: reviewGate,
    threads: threadGate,
    ruleset: rulesetConfig,
  };
}

export function createGitHubApi({ token, repository, fetchImpl = fetch } = {}) {
  if (!token || !repository)
    throw new Error("GITHUB_TOKEN and GITHUB_REPOSITORY are required");
  const headers = {
    accept: "application/vnd.github+json",
    authorization: `Bearer ${token}`,
    "x-github-api-version": "2022-11-28",
  };
  const request = async (route, options = {}) => {
    const response = await fetchImpl(`https://api.github.com${route}`, {
      ...options,
      headers: { ...headers, ...(options.headers ?? {}) },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(
        `GitHub ${response.status} ${route}: ${body.message ?? "request failed"}`,
      );
    return body;
  };
  return {
    request,
    async graphql(query, variables) {
      const response = await fetchImpl(GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({ query, variables }),
      });
      const body = await response.json();
      if (!response.ok || body.errors?.length)
        throw new Error(
          `GitHub GraphQL request failed: ${body.errors?.[0]?.message ?? response.status}`,
        );
      return body.data;
    },
    repository,
  };
}

async function loadRemoteState(api, number) {
  const base = `/repos/${api.repository}`;
  const pullRequest = await api.request(`${base}/pulls/${number}`);
  const [reviews, checkRuns, branchProtection, rulesets] = await Promise.all([
    api.request(`${base}/pulls/${number}/reviews?per_page=100`),
    api.request(`${base}/commits/${pullRequest.head.sha}/check-runs`),
    api.request(`${base}/branches/main/protection`).catch(() => null),
    api.request(`${base}/rulesets?includes_parents=true`).catch(() => []),
  ]);
  let matchingRuleset = null;
  for (const summary of rulesets) {
    const detail = summary?.id
      ? await api.request(`${base}/rulesets/${summary.id}`).catch(() => null)
      : summary;
    if (detail?.enforcement === "active" && branchMatchesMain(detail)) {
      matchingRuleset = detail;
      break;
    }
  }
  const threadsData = await api.graphql(
    `query($owner:String!,$name:String!,$number:Int!){repository(owner:$owner,name:$name){pullRequest(number:$number){reviewThreads(first:100){totalCount nodes{isResolved}}}}}`,
    (() => {
      const [owner, name] = api.repository.split("/");
      return { owner, name, number };
    })(),
  );
  const [owner, name] = api.repository.split("/");
  const branch = await api.request(`${base}/branches/main`);
  const mainRuns = branch?.commit?.sha
    ? await api
        .request(`${base}/commits/${branch.commit.sha}/check-runs`)
        .catch(() => ({ check_runs: [] }))
    : { check_runs: [] };
  const activation = await api
    .request(`${base}/actions/variables/AUTO_MERGE_ACTIVATION`)
    .catch(() => null);
  const paused = await api
    .request(`${base}/actions/variables/AUTO_MERGE_PAUSED`)
    .catch(() => null);
  const threadConnection = threadsData?.repository?.pullRequest?.reviewThreads;
  const threads = threadConnection ? [...(threadConnection.nodes ?? [])] : null;
  if (
    threads &&
    Number.isInteger(threadConnection?.totalCount) &&
    threadConnection.totalCount > threads.length
  )
    threads.push({ isResolved: false });
  return {
    pullRequest,
    rulesetConfig: readRulesetConfig({
      ruleset: matchingRuleset,
      branchProtection,
    }),
    checks: checkRuns.check_runs ?? [],
    reviews,
    threads,
    baseMatchesMain: pullRequest.base?.sha === branch?.commit?.sha,
    mainHealthy:
      branch?.name === "main" &&
      Boolean(branch?.commit?.sha) &&
      checkResults(mainRuns.check_runs ?? [], branch.commit.sha).ok,
    // Both variables must be read successfully. Missing/ambiguous pause state
    // fails closed instead of treating a readback error as "not paused".
    activation: activationReadbackPass({ activation, paused }),
    owner,
    name,
  };
}

export async function enablePullRequestAutoMerge({ api, pullRequest, gate }) {
  if (!gate?.ok)
    throw new Error(
      `Refusing auto-merge: ${gate?.reasons?.join("; ") ?? "gate failed"}`,
    );
  const data = await api.graphql(
    `mutation($id:ID!,$expectedHeadOid:GitObjectID!){enablePullRequestAutoMerge(input:{pullRequestId:$id,expectedHeadOid:$expectedHeadOid,mergeMethod:SQUASH}){pullRequest{number,autoMergeRequest{enabledAt,mergeMethod}}}}`,
    {
      id: pullRequest.node_id,
      expectedHeadOid: gate.headSha,
    },
  );
  return data.enablePullRequestAutoMerge.pullRequest;
}

const AUTO_MERGE_STATE_QUERY = `query($id:ID!){node(id:$id){... on PullRequest {autoMergeRequest {enabledAt}}}}`;

/** Disable native auto-merge and verify the setting is actually gone. */
export async function disablePullRequestAutoMerge({ api, pullRequest }) {
  const id = pullRequest?.node_id;
  if (!id) throw new Error("Pull request node id is unavailable");
  const readState = async () => {
    const data = await api.graphql(AUTO_MERGE_STATE_QUERY, { id });
    if (
      !data?.node ||
      !Object.prototype.hasOwnProperty.call(data.node, "autoMergeRequest")
    )
      throw new Error("Native auto-merge state readback is unavailable");
    return data.node.autoMergeRequest;
  };
  if ((await readState()) !== null) {
    await api.graphql(
      `mutation($id:ID!){disablePullRequestAutoMerge(input:{pullRequestId:$id}){pullRequest{number}}}`,
      { id },
    );
  }
  if ((await readState()) !== null)
    throw new Error("Native auto-merge remains enabled after disable request");
  return { disabled: true };
}

async function main() {
  const payload = JSON.parse(
    fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"),
  );
  const number = payload.pull_request?.number;
  if (!number)
    throw new Error("auto-merge workflow requires a pull_request event");
  const api = createGitHubApi({
    token: process.env.GITHUB_TOKEN,
    repository: process.env.GITHUB_REPOSITORY,
  });
  const state = await loadRemoteState(api, number);
  const gate = evaluateMergeEligibility(state);
  console.log(JSON.stringify({ gate }, null, 2));
  if (!gate.ok) {
    try {
      const autoMerge = await disablePullRequestAutoMerge({
        api,
        pullRequest: state.pullRequest,
      });
      console.log(JSON.stringify({ gate, autoMerge }, null, 2));
    } catch (error) {
      console.error(
        `[KK Studio auto-merge] gate denied and disable failed: ${error.message}`,
      );
      process.exitCode = 1;
    }
  } else
    await enablePullRequestAutoMerge({
      api,
      pullRequest: state.pullRequest,
      gate,
    });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main().catch((error) => {
    console.error(`[KK Studio auto-merge] ${error.message}`);
    process.exitCode = 1;
  });
}
