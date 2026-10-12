import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verifyInstallerReceipt } from "./installer-receipt.mjs";

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [receiptPath] = process.argv.slice(2);
  if (!receiptPath) {
    throw new Error(
      "Usage: verify-installer-receipt.mjs <installer-receipt.json>",
    );
  }
  const receiptFile = path.resolve(receiptPath);
  const receipt = JSON.parse(await fs.readFile(receiptFile, "utf8"));
  const result = await verifyInstallerReceipt({
    receipt,
    receiptDirectory: path.dirname(receiptFile),
  });
  console.log(
    JSON.stringify(
      {
        verified: true,
        commit: result.commit,
        sourceTree: result.sourceTree,
        installer: path.basename(result.installer),
        versions: result.versions,
      },
      null,
      2,
    ),
  );
}
