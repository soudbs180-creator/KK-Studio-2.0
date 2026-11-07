import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

test("E2E harness only re-exports production modules without local substitutes", () => {
  const path = new URL("../e2e/harness.ts", import.meta.url);
  const file = ts.createSourceFile(
    path.pathname,
    readFileSync(path, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  assert.ok(file.statements.length > 0);
  for (const statement of file.statements) {
    assert.ok(
      ts.isExportDeclaration(statement),
      "No inline declarations, imports or test models in the harness",
    );
    assert.ok(
      statement.moduleSpecifier &&
        ts.isStringLiteral(statement.moduleSpecifier),
    );
    assert.match(
      statement.moduleSpecifier.text,
      /^\.\.\/\.\.\/src\/(domain|features)\//u,
    );
  }
});
