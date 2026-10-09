# Auto-merge rollback

Rollback is a reviewed revert PR. Do not reset, force-push, delete the protected branch, or edit history.

1. Read the main-guard incident and record the source event, previous head, current head, current tree, failed check, and affected PR.
2. Create a revert PR from the current `main` head using GitHub's **Revert** action or an equivalent `git revert` commit. Keep the original merge and incident evidence intact.
3. Run the complete `verify`, `delivery`, `deploy-linux`, and `governance` checks on the revert PR and wait for the merge queue's required checks.
4. Set repository variable `AUTO_MERGE_PAUSED=true` while investigating. Keep `AUTO_MERGE_ACTIVATION` disabled until a fresh ruleset readback and independent review are available.
5. Merge the reviewed revert PR through the same protected queue. Fetch `main`, verify the merge SHA and tree, and attach the verification evidence to the incident.
6. Resume only after the root cause is fixed in a separate reviewed PR, the main health guard is green, and a current readback proves every auto-merge gate. Remove the pause variable through the normal repository administration process; never bypass the queue.

The guard records evidence rather than rewriting it. If a revert cannot be prepared safely, leave the repository paused and escalate with the incident URL.
