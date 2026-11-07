import test from "node:test";
import assert from "node:assert/strict";
import { lintAestheticStyles } from "../../scripts/check-ui-standards.mjs";

test("production UI check parses CSS into the shared aesthetic rules with exact locations", () => {
  const findings = lintAestheticStyles(
    "src/styles/example.css",
    ".control { gap: 13px; transition: width 200ms; }\n@media (width < 500px) { .other { gap: 8px; } }",
  );
  assert.deepEqual(
    findings.map((item: { ruleId: string }) => item.ruleId),
    ["SP-01", "MOT-04"],
  );
  assert.ok(
    findings.every(
      (item: { line: number; selector: string }) =>
        item.line === 1 && item.selector === ".control",
    ),
  );
  assert.equal(
    lintAestheticStyles(
      "valid.css",
      ".control { gap: var(--kk-space-2); transition: transform 200ms; }",
    ).length,
    0,
  );
});

test("current Figma 01 heading weight 700 and dark compensation 660 remain valid CSS", () => {
  assert.deepEqual(
    lintAestheticStyles(
      "heading.css",
      ".heading { font-weight: 700; } .dark .heading { font-weight: 660; }",
    ),
    [],
  );
  assert.equal(
    lintAestheticStyles("heading.css", ".heading { font-weight: 800; }")[0]
      .ruleId,
    "TYP-01",
  );
});
