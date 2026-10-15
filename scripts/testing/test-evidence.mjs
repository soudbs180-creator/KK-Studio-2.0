import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";

export function allocateTestEvidenceRun(
  suite,
  { rootDir = process.cwd(), directory } = {},
) {
  if (!/^[a-z][a-z0-9-]*$/.test(suite))
    throw new Error("Test evidence suite must be a simple directory name");
  const runDirectory = path.resolve(
    directory ?? path.join(rootDir, "test-results", suite, randomUUID()),
  );
  mkdirSync(path.dirname(runDirectory), { recursive: true });
  // Exclusive creation rejects old evidence, files and links before a test starts.
  mkdirSync(runDirectory);
  return {
    directory: runDirectory,
    artifactsDir: path.join(runDirectory, "artifacts"),
    reportFile: path.join(runDirectory, `${suite}-results.json`),
  };
}
