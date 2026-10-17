import type { CreationTask } from "@kk-studio/creation-contracts";
import { newMobileDraft } from "../core/mobileModel.ts";
import { invariant, validateTask, referencedAssetIds } from "./validation.ts";
import type { StorageValidationPolicy } from "./schemaPrimitives.ts";
export async function verifyTaskOriginals(
  task: CreationTask,
  readOriginal: (assetId: string) => Promise<Uint8Array>,
  previous?: CreationTask,
  receiptIdentity?: Pick<CreationTask, "id" | "idempotencyKey">,
  policy: StorageValidationPolicy = {},
): Promise<void> {
  validateTask(task, receiptIdentity, policy);
  const ids = referencedAssetIds({
    composerDraft: newMobileDraft(0),
    tasks: [task],
    assetIds: [],
    canvas: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
  });
  const verify = previous
    ? new Set(
        (task.outputs ?? [])
          .filter(
            (o) =>
              o.status === "succeeded" &&
              o.assetId &&
              (task.status === "succeeded" ||
                previous.outputs?.find((old) => old.index === o.index)
                  ?.status !== "succeeded"),
          )
          .map((o) => o.assetId!),
      )
    : ids;
  // A damaged reference must not prevent receipt/unknown-state persistence after submission.
  for (const assetId of verify) await readOriginal(assetId);
  invariant(
    task.kind === "text" ||
      task.status !== "succeeded" ||
      (task.outputs?.filter((o) => o.status === "succeeded" && o.assetId)
        .length ?? 0) === task.requestedOutputs,
    "Successful media task requires archived originals",
  );
}
