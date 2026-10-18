import { lstatSync } from "node:fs";
import { join } from "node:path";
import { CompanionProtocolError } from "./protocol.ts";

export function assertStandaloneRoot(root: string): void {
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
  try {
    lstatSync(join(root, "app/repository.json"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw new CompanionProtocolError(
      "IO",
      409,
      "无法确认仓库身份，已停止本机服务访问。",
    );
  }
  throw new CompanionProtocolError(
    "SNAPSHOT_UNSUPPORTED",
    409,
    "这是桌面原生仓库；本机服务只能使用独立数据目录，原件已保留。",
  );
}
