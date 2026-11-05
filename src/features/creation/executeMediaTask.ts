import type { Asset } from "../../domain/assets.ts";
import type { CanvasCollectionItem } from "../../domain/canvasItems.ts";
import type { ProviderConnection } from "../../domain/providerConnections.ts";
import type { CreationTask, CreationTaskOutput } from "./model.ts";
import { storeGeneratedAsset } from "./assetRepository.ts";
import { archivedTaskResult } from "./archivedTaskResult.ts";
import { executeMediaOutputs } from "./mediaTaskExecution.ts";
import { mediaBlobDataUrl } from "./mediaResponse.ts";

export async function executeMediaTask(options: {
  projectId: string;
  task: CreationTask;
  connection: ProviderConnection;
  outputs: CreationTaskOutput[];
  signal: AbortSignal;
  queryOnly: boolean;
  promptHash?: string;
  assertCurrent: () => void;
  publish: (
    status: CreationTask["status"],
    error?: string,
    submission?: CreationTask["submissionState"],
  ) => void;
  flush: () => Promise<void>;
  createdItems: CanvasCollectionItem[];
  setAssets: (update: (assets: Asset[]) => Asset[]) => void;
  onStart: () => void;
}): Promise<void> {
  const { task, signal, outputs, publish, flush } = options;
  await executeMediaOutputs({
    ...options,
    persist: async () => {
      publish("running", undefined, "submitted");
      await flush();
    },
    archive: async (blob, output, providerJobId) => {
      options.assertCurrent();
      signal.throwIfAborted();
      const asset = await storeGeneratedAsset({
        source: await mediaBlobDataUrl(blob),
        provider: task.providerName,
        model: task.model,
        providerRequestId: providerJobId,
        connectionId: task.providerConnectionId,
        sourceJobId: task.id,
        promptHash: options.promptHash,
        signal,
      });
      options.assertCurrent();
      signal.throwIfAborted();
      output.assetId = asset.assetId;
      options.createdItems.push(
        archivedTaskResult(options.projectId, task, output.index, asset),
      );
      options.setAssets((assets) =>
        assets.some((value) => value.id === asset.assetId)
          ? assets
          : [
              ...assets,
              {
                id: asset.assetId,
                name: `${task.kind === "video" ? "视频" : "音频"}结果`,
                type: task.kind,
                tag: "AI生成",
                createdAt: asset.provenance.generatedAt,
                src: asset.preview,
                source: "provider",
                isAiGenerated: true,
                sourceTaskId: task.id,
                providerConnectionId: task.providerConnectionId,
                provider: task.providerName,
                model: task.model,
                sha256: asset.sha256,
              },
            ],
      );
    },
  });
  const succeeded = outputs.filter(
    (output) => output.status === "succeeded",
  ).length;
  const unknown = outputs.some((output) => output.status === "unknown");
  const status = unknown
    ? "unknown"
    : succeeded === outputs.length
      ? "succeeded"
      : succeeded
        ? "partial"
        : signal.aborted
          ? "cancelled"
          : "failed";
  publish(
    status,
    outputs.find((output) => output.error)?.error,
    unknown ? "unknown" : "terminal",
  );
  await flush();
}
