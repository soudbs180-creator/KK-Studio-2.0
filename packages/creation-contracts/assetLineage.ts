import type { AssetProvenance } from "./wire.ts";

export interface AssetOrigin {
  sourceJobId?: string;
  promptHash?: string;
  parentId?: string;
  provenance: AssetProvenance;
}
export interface AssetLineage extends AssetOrigin {
  origins?: AssetOrigin[];
}

/** Retry timestamps do not create a new origin; parent and provider identities do. */
export function assetOriginIdentity(origin: AssetOrigin): string {
  const p = origin.provenance;
  return JSON.stringify([
    origin.sourceJobId,
    origin.promptHash,
    origin.parentId,
    p.provider,
    p.model,
    p.providerRequestId,
    p.connectionId,
    p.c2paPresent,
    p.synthIdSignal,
  ]);
}

/** A read-compatible, bounded merge. It never changes canonical metadata or asset bytes. */
export function mergeAssetOrigins(
  old: AssetLineage,
  incoming: AssetLineage,
): AssetOrigin[] {
  const origin = (value: AssetOrigin): AssetOrigin => ({
    sourceJobId: value.sourceJobId,
    promptHash: value.promptHash,
    parentId: value.parentId,
    provenance: { ...value.provenance },
  });
  const values = [
    origin(old),
    ...(old.origins ?? []),
    ...(incoming.origins ?? []),
    origin(incoming),
  ];
  const seen = new Set<string>();
  return values
    .filter((value) => {
      const key = assetOriginIdentity(value);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(-200)
    .map(origin);
}
