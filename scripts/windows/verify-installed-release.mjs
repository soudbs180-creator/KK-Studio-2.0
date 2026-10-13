import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verifyInstalledRelease } from "./installer-receipt.mjs";

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [receiptPath, installDirectory] = process.argv.slice(2);
  if (!receiptPath || !installDirectory) {
    throw new Error(
      "Usage: verify-installed-release.mjs <installer-receipt.json> <install-directory>",
    );
  }
  const receiptFile = path.resolve(receiptPath);
  const receipt = JSON.parse(await fs.readFile(receiptFile, "utf8"));
  const result = await verifyInstalledRelease({
    receipt,
    receiptDirectory: path.dirname(receiptFile),
    installDirectory: path.resolve(installDirectory),
  });
  console.log(
    JSON.stringify(
      {
        verified: true,
        commit: result.commit,
        sourceTree: result.sourceTree,
        installer: path.basename(result.installer),
        installedFiles: result.installedFiles,
        versions: result.versions,
      },
      null,
      2,
    ),
  );
}
