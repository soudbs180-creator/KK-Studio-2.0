# Verification

Status: `PARTIAL`; final pushed-head Hosted results remain pending. No merge or release claim is made here.

- Initial Hosted run `38246699743`: delivery reported 49 violations and verify reported 9 Windows desktopRelease failures.
- Hosted run `38271663391`, verify job `114887133928`, head `81226e02bf76f1988079829241ab04ff72e7ab85`: unit/deploy tests 993 pass, 0 fail, 13 skipped; Agent tests 172 pass, 0 fail, 2 skipped. Both `desktopAgentRuntime` tests passed. Verify stopped at Prettier for `scripts/governance/branch-audit.mjs`; later browser/native steps were not executed. Delivery, governance, deploy-linux and hook jobs passed.
- Local setup diagnosis: `npm ci --ignore-scripts` had omitted the canvas-agent nested dependencies and `dist`; normal `npm ci` executed the declared postinstall install/build steps and the two runtime tests passed. No runtime assertion was weakened.
- Full local `npm run verify` on the repair diff based on `81226e02`, 2026-10-13: lint, typecheck, unit/deploy, Agent, UI standards, formatting, build, all 475 browser tests and development plugin checks passed. The initial browser run had 5 failures: two conflicting snapshot CSS overrides and three stale locator/precondition cases, all reproduced and repaired in this continuation.
- The next pushed head must receive independent review and successful Hosted verify/delivery before this task can claim completion.
