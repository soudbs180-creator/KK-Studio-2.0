import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { DESKTOP_DATA_DIRECTORIES } from "../../src/runtime/storage-contract.ts";

test("desktop layout metadata matches the directories initialized by Rust", () => {
  const layout = JSON.parse(
    readFileSync(
      new URL("../../config/storage-layout.json", import.meta.url),
      "utf8",
    ),
  ) as { directories: Record<string, string> };
  const rust = readFileSync(
    new URL("../../src-tauri/src/storage_paths.rs", import.meta.url),
    "utf8",
  );
  const declaration = rust.match(
    /const DATA_DIRECTORIES:\s*\[&str;\s*\d+\]\s*=\s*\[([^\]]+)\]/,
  );
  assert.ok(declaration, "Rust must declare its canonical data directories");
  const initialized = Array.from(
    declaration[1].matchAll(/"([^"]+)"/g),
    (match) => match[1],
  ).sort();
  assert.deepEqual(Object.keys(layout.directories).sort(), initialized);
  assert.deepEqual(Object.values(DESKTOP_DATA_DIRECTORIES).sort(), initialized);
});
