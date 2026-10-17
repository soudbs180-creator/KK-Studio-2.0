import type { CreationTask } from "@kk-studio/creation-contracts";
import type { MobileAsset } from "../core/mobileModel.ts";
import type { MobileComfyCapture } from "../core/comfyModel.ts";
import { comfyOutputKey, sameComfyJson } from "../core/comfyIdentity.ts";
import {
  array,
  integer,
  invariant,
  keys,
  object,
  text,
} from "./schemaPrimitives.ts";

export function validateComfyOutputs(capture: MobileComfyCapture): void {
  if (capture.outputs === undefined) return;
  array(capture.outputs, capture.requestedOutputs);
  const seen = new Set<string>();
  const segment = (value: string) =>
    value.length > 0 &&
    value.length <= 255 &&
    value !== "." &&
    value !== ".." &&
    !/[\x00-\x1f\\/:?%#]/.test(value);
  for (const [index, raw] of capture.outputs.entries()) {
    object(raw);
    keys(raw, [
      "slot",
      "key",
      "nodeId",
      "filename",
      "subfolder",
      "type",
      "sha256",
    ]);
    integer(raw.slot);
    invariant(
      raw.slot === index,
      "Comfy output slots must remain contiguous and fixed",
    );
    text(raw.nodeId, 64);
    text(raw.filename, 255);
    text(raw.subfolder, 1024);
    text(raw.key, 4096);
    invariant(
      /^[A-Za-z0-9_-]{1,64}$/.test(raw.nodeId) &&
        Object.prototype.hasOwnProperty.call(
          capture.identity.workflow,
          raw.nodeId,
        ),
      "Comfy output node identity missing",
    );
    invariant(
      segment(raw.filename) &&
        (!raw.subfolder || raw.subfolder.split("/").every(segment)),
      "Invalid Comfy output path",
    );
    invariant(
      raw.type === "output" || raw.type === "temp",
      "Invalid Comfy output type",
    );
    invariant(
      raw.key ===
        comfyOutputKey(
          raw as unknown as NonNullable<MobileComfyCapture["outputs"]>[number],
        ) && !seen.has(raw.key),
      "Comfy output key forged or duplicated",
    );
    seen.add(raw.key);
    if (raw.sha256 !== undefined)
      invariant(
        typeof raw.sha256 === "string" && /^[a-f0-9]{64}$/.test(raw.sha256),
        "Invalid Comfy output hash",
      );
  }
  invariant(
    capture.promptIdConfirmed || capture.outputs.length === 0,
    "Unconfirmed Comfy prompt cannot map originals",
  );
}
export function validateComfyOutputUpdate(
  previous: MobileComfyCapture,
  next: MobileComfyCapture,
): void {
  if (previous.outputs === undefined) return;
  invariant(
    next.outputs && next.outputs.length >= previous.outputs.length,
    "Comfy output mapping cannot disappear",
  );
  for (const old of previous.outputs) {
    const row = next.outputs[old.slot];
    const { sha256: priorHash, ...identity } = old,
      { sha256: nextHash, ...updated } = row;
    invariant(
      sameComfyJson(identity, updated),
      "Comfy output slot identity cannot change",
    );
    invariant(
      priorHash === undefined || nextHash === priorHash,
      "Comfy output hash cannot change",
    );
  }
}
export function validateComfyArchivedOutputs(
  capture: MobileComfyCapture,
  task: CreationTask,
  assets?: ReadonlyMap<string, MobileAsset>,
): void {
  if (capture.outputs === undefined) return; // Legacy evidence stays readable; application fails closed for partial recovery.
  for (const output of task.outputs ?? []) {
    if (output.status !== "succeeded") continue;
    const row = capture.outputs[output.index];
    invariant(
      row?.sha256 && output.assetId,
      "Comfy archived slot requires mapped output hash",
    );
    if (assets)
      invariant(
        assets.get(output.assetId)?.sha256 === row.sha256,
        "Comfy archived original hash does not match output slot",
      );
  }
}
