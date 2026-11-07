import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const testFiles = [
  resolve(__dirname, "t1_features.test.ts"),
  resolve(__dirname, "t2_boundaries.test.ts"),
  resolve(__dirname, "t3_pairwise.test.ts"),
  resolve(__dirname, "t4_scenarios.test.ts"),
];

console.log(
  "===============================================================================",
);
console.log(
  "  KK-Studio 2.0: CC Switch & Codex++ Gateway E2E Test Runner (Tiers 1-4)",
);
console.log(
  "===============================================================================",
);
console.log(
  `Executing ${testFiles.length} test suites with Node 24 native test runner...\n`,
);

const child = spawn(process.execPath, ["--test", ...testFiles], {
  stdio: "inherit",
  cwd: resolve(__dirname, "../.."),
});

child.on("close", (code) => {
  if (code === 0) {
    console.log(
      "\n===============================================================================",
    );
    console.log(
      "  [SUCCESS] All E2E Gateway acceptance tests passed cleanly (100% pass rate).",
    );
    console.log(
      "===============================================================================",
    );
  } else {
    console.error(
      "\n===============================================================================",
    );
    console.error(
      `  [FAILURE] E2E Gateway test suite exited with code ${code}.`,
    );
    console.error(
      "===============================================================================",
    );
  }
  process.exit(code ?? 1);
});
