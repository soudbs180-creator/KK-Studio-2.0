import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

for (const [script, mode] of [
  ["scripts/check-code-health.mjs", "--report"],
  ["scripts/check-windows-footguns.mjs", "--all"],
]) {
  for (const revisionFlag of ["--base", "--head"]) {
    test(`${mode} rejects ${revisionFlag} instead of silently scanning the worktree`, () => {
      const result = spawnSync(
        process.execPath,
        [script, mode, revisionFlag, "DOES_NOT_EXIST"],
        {
          cwd: process.cwd(),
          encoding: "utf8",
        },
      );
      assert.equal(result.error, undefined);
      assert.equal(result.status, 2);
    });
  }
}
