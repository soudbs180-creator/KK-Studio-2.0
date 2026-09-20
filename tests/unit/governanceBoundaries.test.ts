import assert from "node:assert/strict";
import test from "node:test";
import { checkImportBoundaries } from "../../scripts/governance/import-boundaries.mjs";

test("browser boundaries reject Node builtins and server directory imports in every supported syntax", () => {
  for (const code of [
    'import fs from "fs";',
    'export * from "node:fs";',
    'import("fs/promises");',
    'require("node:child_process");',
    'import server from "../features/generation-server";',
    'export { x } from "@/features/generation-server/provider";',
    'type Module = typeof import("node:fs");',
    "import(`node:fs`);",
  ])
    assert.ok(
      checkImportBoundaries("src/components/example.ts", code).length > 0,
      code,
    );
  assert.deepEqual(
    checkImportBoundaries(
      "src/features/generation-server/example.ts",
      'import fs from "fs";',
    ),
    [],
  );
});

test("domain dependencies reject presentation and adapters without blocking valid pure modules", () => {
  for (const specifier of [
    "../components",
    "../integrations",
    "../features/creation/model",
    "react",
    "react-dom/client",
    "@tauri-apps/api/core",
  ])
    assert.ok(
      checkImportBoundaries(
        "src/domain/model.ts",
        `import x from "${specifier}";`,
      ).length > 0,
      specifier,
    );
  for (const specifier of [
    "zod",
    "./projectCanvas",
    "../runtime/storage-contract",
  ])
    assert.deepEqual(
      checkImportBoundaries(
        "src/domain/model.ts",
        `import x from "${specifier}";`,
      ),
      [],
    );
});
