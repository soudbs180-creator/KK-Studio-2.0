import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { REQUIRED_CHECKS, createGitHubApi } from "./merge-auto.mjs";

function checkResults(checks, sha) {
  if (!Array.isArray(checks)) return { ok: false, missing: [...REQUIRED_CHECKS] };
  const missing = REQUIRED_CHECKS.filter((name) => {
    const matching = checks.find((check) =>
      (check.name ?? check.context) === name && (!check.head_sha || check.head_sha === sha),
    );
    return !matching || matching.conclusion !== "success";
  });
  return { ok: missing.length === 0, missing };
}

/** Evaluate a push to main without mutating GitHub. */
export function evaluateMainHealth({ branch, checks, expectedSha } = {}) {
  const reasons = [];
  if (!branch || branch.name !== "main") reasons.push("main branch readback is unavailable");
  if (expectedSha && branch?.commit?.sha !== expectedSha) reasons.push("main moved after the guarded push");
  const result = checkResults(checks, branch?.commit?.sha ?? expectedSha);
  if (!result.ok) reasons.push(`required main checks are not successful: ${result.missing.join(", ")}`);
  return { ok: reasons.length === 0, reasons, checks: result, sha: branch?.commit?.sha ?? expectedSha ?? null };
}

export function incidentBody({ source, previousHead, currentHead, currentTree, checks, health }) {
  return [
    "## Main guard evidence",
    "",
    "The controlled auto-merge guard paused activation after a failed main health check.",
    "",
    `- Source: ${source ?? "unknown"}`,
    `- Previous main head: ${previousHead ?? "unknown"}`,
    `- Current main head: ${currentHead ?? "unknown"}`,
    `- Current main tree: ${currentTree ?? "unknown"}`,
    `- Required checks: ${JSON.stringify(checks ?? [])}`,
    `- Failure: ${health?.reasons?.join("; ") ?? "unknown"}`,
    "",
    "Recovery: use the documented revert PR procedure in docs/engineering/ROLLBACK.md. Do not reset or force-push main.",
  ].join("\n");
}

export async function pauseAfterMainFailure({ api, evidence, health }) {
  if (health.ok) return { paused: false, incident: null };
  const variablePath = `/repos/${api.repository}/actions/variables/AUTO_MERGE_PAUSED`;
  const variableBody = {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "AUTO_MERGE_PAUSED", value: "true" }),
  };
  let pauseError = null;
  try {
    await api.request(variablePath, variableBody);
  } catch (error) {
    // PUT updates an existing variable; POST creates it on first failure.
    try {
      await api.request(`/repos/${api.repository}/actions/variables`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "AUTO_MERGE_PAUSED", value: "true" }),
      });
    } catch (createError) {
      pauseError = `${error?.message ?? "update failed"}; ${createError?.message ?? "create failed"}`;
    }
  }
  const incidentPayload = {
    title: "[auto-merge incident] main guard failed",
    body: incidentBody({ ...evidence, health }),
    labels: ["incident", "auto-merge"],
  };
  let incident;
  try {
    incident = await api.request(`/repos/${api.repository}/issues`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(incidentPayload),
    });
  } catch {
    // Labels may not exist in a newly provisioned repository; preserve the incident.
    incident = await api.request(`/repos/${api.repository}/issues`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: incidentPayload.title, body: incidentPayload.body }),
    });
  }
  return { paused: true, incident: incident.html_url ?? incident.number ?? null, pauseError };
}

async function main() {
  const payload = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const sha = payload.after ?? payload.workflow_run?.head_sha;
  if (!sha) throw new Error("main guard event does not contain a guarded head SHA");
  const api = createGitHubApi({ token: process.env.GITHUB_TOKEN, repository: process.env.GITHUB_REPOSITORY });
  const branch = await api.request(`/repos/${api.repository}/branches/main`);
  const runs = await api.request(`/repos/${api.repository}/commits/${sha}/check-runs`);
  const commit = await api.request(`/repos/${api.repository}/commits/${sha}`);
  const health = evaluateMainHealth({ branch, checks: runs.check_runs ?? [], expectedSha: sha });
  const evidence = {
    source: payload.ref ?? `push:${api.repository}`,
    previousHead: payload.before ?? commit.parents?.[0]?.sha,
    currentHead: branch.commit?.sha ?? sha,
    currentTree: commit.commit?.tree?.sha ?? "unknown",
    checks: (runs.check_runs ?? []).map((check) => ({ name: check.name, conclusion: check.conclusion, head_sha: check.head_sha })),
  };
  console.log(JSON.stringify({ health, evidence }, null, 2));
  if (!health.ok) await pauseAfterMainFailure({ api, evidence, health });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`[KK Studio main guard] ${error.message}`);
    process.exitCode = 1;
  });
}
