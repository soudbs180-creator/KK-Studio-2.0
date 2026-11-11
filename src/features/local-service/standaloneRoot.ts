import { lstatSync } from "node:fs";
import { join } from "node:path";
import { admitCompanionRoot } from "../../../packages/creation-contracts/index.ts";
import { CompanionProtocolError } from "./protocol.ts";

export function assertStandaloneRoot(root: string): void {
  // app/ is a legitimate companion directory (app/companion.json holds the
  // device identity). Only app/repository.json is a reliable Native marker;
  // see the CompanionRootProbe note in storageFormat.ts.
  for (const path of [root, join(root, "app")]) {
    try {
      const entry = lstatSync(path);
      if (!entry.isDirectory() || entry.isSymbolicLink())
        throw new CompanionProtocolError(
          "IO",
          409,
          "本机服务数据目录类型不受支持，原件已保留。",
        );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  let identityDocumentPresent = false;
  try {
    lstatSync(join(root, "app/repository.json"));
    identityDocumentPresent = true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw new CompanionProtocolError(
        "IO",
        409,
        "无法确认仓库身份，已停止本机服务访问。",
      );
    }
  }
  const admission = admitCompanionRoot({ identityDocumentPresent });
  if (admission.action !== "admit") {
    throw new CompanionProtocolError(admission.code, 409, admission.message);
  }
}
