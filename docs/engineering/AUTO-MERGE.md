# Controlled auto-merge

This repository has a fail-closed auto-merge control plane. The `controlled-auto-merge` workflow runs on pull requests targeting `main`, checks the live GitHub ruleset and branch protection readback, then evaluates the candidate head. It can call GitHub's native `enablePullRequestAutoMerge` mutation only when every gate is true:

- an active `main` ruleset requires a merge queue with `SQUASH`;
- the ruleset requires strict `verify`, `delivery`, `deploy-linux`, and `governance` checks;
- stale approvals are dismissed; the single-owner ruleset may keep platform approvals at zero, while an independent exact-head review is checked separately;
- every required check is successful on the exact PR head SHA;
- an independent reviewer approved that exact head, with no unresolved review threads;
- `main` is healthy; and
- repository variable `AUTO_MERGE_ACTIVATION` reads back as `enabled`, while `AUTO_MERGE_PAUSED` is not `true`.

The default is disabled. A missing, stale, ambiguous, or unavailable readback is a denial. The privileged workflow is triggered by `pull_request_target`, checks out only the trusted base SHA for its control-plane code, and never executes PR contents. It does not deploy anything or send external messages.

The `governance` job is a required-status candidate in `quality.yml`; the hosting ruleset must be configured to require all four exact names. A workflow file alone does not enforce a remote ruleset. An operator may set the activation variable only after reviewing a current ruleset readback. This task does not perform that remote mutation and does not claim that auto-merge is enabled.

`main-health-guard` runs after pushes to `main`. If a required check or branch readback fails, it writes `AUTO_MERGE_PAUSED=true` and opens an incident through the GitHub API with source, previous head, current head/tree, and check evidence. Recovery is documented in [ROLLBACK.md](ROLLBACK.md).
