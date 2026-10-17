import type { MobileSnapshot } from "../core/mobileModel.ts";
import { utf8ByteLength } from "../core/resultLimits.ts";
import { invariant, LIMITS } from "./validation.ts";

export function serializeSnapshot(snapshot: MobileSnapshot): string {
  const payload = JSON.stringify(snapshot);
  invariant(
    utf8ByteLength(payload) <= LIMITS.snapshotBytes,
    "Snapshot exceeds limit",
  );
  return payload;
}
