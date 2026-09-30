import path from "node:path";
import { fileURLToPath } from "node:url";
import { recordInstallerInputs } from "./installer-receipt.mjs";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
await recordInstallerInputs(root);
console.log(
  "Recorded pre-bundle executable, runtime and installer configuration.",
);
