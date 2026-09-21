# Review

- Status: `NOT VERIFIED` while the final head is still dirty.
- Self-review scope: Web cross-window lease coordination, Gateway account provisioning, TaskHost origin/DNS/cancellation boundary, focused regression tests.
- Independent pre-review evidence: a separate audit context identified and this branch corrected the post-DNS cancellation window and bracketed IPv6 host handling in `src-tauri/src/task_host.rs`.
- Required before `PASS`: review the committed head, run the full applicable checks, and confirm no P1/P0 remains. Do not treat the previous partial audit's verification as evidence for this changed head.
