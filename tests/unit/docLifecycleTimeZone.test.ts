import test from "node:test";
import assert from "node:assert/strict";
import { checkDocumentLifecycleHeader } from "../../scripts/governance/doc-index.mjs";

function document(date: string): string {
  return [
    "# Current",
    "- docId: CURRENT",
    "- status: current",
    `- updatedAt: ${date}`,
    "- source: ledger",
    "- supersededBy: null",
  ].join("\n");
}

test("document calendar accepts the current Shanghai date before UTC midnight", () => {
  assert.deepEqual(
    checkDocumentLifecycleHeader(document("2026-10-14"), "current.md", {
      now: new Date("2026-10-13T16:30:00Z"),
    }),
    [],
  );
});

test("document calendar still rejects tomorrow and invalid calendar dates", () => {
  const now = new Date("2026-10-13T16:30:00Z");
  assert.ok(
    checkDocumentLifecycleHeader(document("2026-10-15"), "current.md", {
      now,
    }).some((issue: string) => issue.includes("不能晚于")),
  );
  assert.ok(
    checkDocumentLifecycleHeader(document("2026-02-30"), "current.md", {
      now,
    }).some((issue: string) => issue.includes("不是有效")),
  );
});

test("document calendar uses its specified timezone independent of host timezone", () => {
  const now = new Date("2026-10-13T16:30:00Z");
  assert.ok(
    checkDocumentLifecycleHeader(document("2026-10-14"), "current.md", {
      now,
      timeZone: "UTC",
    }).some((issue: string) => issue.includes("不能晚于")),
  );
});
