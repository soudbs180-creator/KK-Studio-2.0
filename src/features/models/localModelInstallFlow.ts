import type {
  LocalInstallSelection,
  LocalInstallStatus,
  LocalInstallationSummary,
} from "../../domain/localModelInstallation.ts";
import { localModelInstallation } from "./localModelInstallation.ts";

export type LocalModelInstallBridge = typeof localModelInstallation;

export interface LocalModelInstallFlowResult {
  status: LocalInstallStatus;
  installed: LocalInstallationSummary[];
}

/**
 * Shared install orchestration for settings UI and tests.
 * Never starts downloads without an explicit prepare+install sequence.
 */
export async function runLocalModelInstallFlow(
  selection: LocalInstallSelection,
  options: {
    bridge?: LocalModelInstallBridge;
    confirmDownload?: (plan: {
      downloadBytes: number;
      destination: string;
    }) => Promise<boolean>;
    pollIntervalMs?: number;
    maxPolls?: number;
  } = {},
): Promise<LocalModelInstallFlowResult> {
  const bridge = options.bridge ?? localModelInstallation;
  const grant = await bridge.chooseDirectory();
  if (!grant) {
    throw new Error("未选择目录，未开始下载。");
  }
  const plan = await bridge.prepare(grant.grantId, selection);
  const confirmed =
    (await options.confirmDownload?.({
      downloadBytes: plan.downloadBytes,
      destination: plan.destination,
    })) ?? true;
  if (!confirmed) {
    throw new Error("已取消安装。");
  }
  let status = await bridge.install(plan.operationId);
  const interval = options.pollIntervalMs ?? 0;
  const maxPolls = options.maxPolls ?? 1;
  for (
    let attempt = 0;
    attempt < maxPolls &&
    status.state !== "installed" &&
    status.state !== "failed" &&
    status.state !== "cancelled";
    attempt += 1
  ) {
    if (interval > 0) {
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
    status = await bridge.status(plan.operationId);
  }
  const installed = await bridge.listInstalled();
  return { status, installed };
}
