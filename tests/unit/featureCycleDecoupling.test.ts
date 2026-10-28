import assert from "node:assert/strict";
import test from "node:test";
import { collectArchitecture } from "../../scripts/governance/check-architecture.mjs";

test("the complete feature graph has no cycle after P3a through P3e", async () => {
  const current = await collectArchitecture();
  assert.deepEqual(
    current.rules.R4.items,
    [],
    "type-only, dynamic and transitive feature cycles must all stay absent",
  );
});
