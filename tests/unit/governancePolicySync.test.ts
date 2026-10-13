import assert from "node:assert/strict";
import test from "node:test";
import {
  checkMemoryContractSync,
  parseArgs,
} from "../../scripts/governance/check-policy-sync.mjs";

test("policy sync is silent when MEMORY-CONTRACT is unchanged", () => {
  assert.deepEqual(
    checkMemoryContractSync([
      "docs/README.md",
      "src/features/memory/injector.ts",
    ]),
    [],
  );
});

test("MEMORY-CONTRACT changes require the data, feature, implementation, test and governance set", () => {
  const issues = checkMemoryContractSync(["docs/MEMORY-CONTRACT.md"]);
  assert.equal(issues.length, 6);
  assert.match(issues.join("\n"), /DATA-STORAGE\.md/);
  assert.match(issues.join("\n"), /feat-020-memory\.md/);
  assert.match(issues.join("\n"), /features\.registry\.json/);
  assert.match(issues.join("\n"), /implementation/);
  assert.match(issues.join("\n"), /memory test/);
  assert.match(issues.join("\n"), /MEMORY-GOVERNANCE\.md/);
});

test("a complete memory contract change passes the sync gate", () => {
  assert.deepEqual(
    checkMemoryContractSync([
      "docs/MEMORY-CONTRACT.md",
      "docs/architecture/DATA-STORAGE.md",
      "docs/features/feat-020-memory.md",
      "docs/features/features.registry.json",
      "docs/MEMORY-GOVERNANCE.md",
      "src/features/memory/storage.ts",
      "tests/unit/memoryStorage.test.ts",
    ]),
    [],
  );
});

test("the CLI requires full base and accepts HEAD as the default head", () => {
  assert.deepEqual(parseArgs(["--base", "a".repeat(40)]), {
    base: "a".repeat(40),
    head: "HEAD",
  });
  assert.throws(() => parseArgs(["--base", "short"]), /full-base-sha/);
});
