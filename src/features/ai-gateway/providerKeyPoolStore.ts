import {
  providerKeyPoolSchema,
  type ProviderKeyPool,
} from "./providerKeyPool.ts";
import { z } from "zod";

const STORAGE_KEY = "kk:provider-key-pools:v1";

const storeSchema = z
  .object({
    version: z.literal(1),
    pools: z.array(providerKeyPoolSchema).max(128),
  })
  .strict();
export type ProviderKeyPoolStore = z.infer<typeof storeSchema>;

function emptyStore(): ProviderKeyPoolStore {
  return { version: 1, pools: [] };
}

/** Browser/Desktop webview metadata only — never secrets. */
export function readProviderKeyPoolStore(
  storage: Pick<Storage, "getItem"> | null = typeof window === "undefined"
    ? null
    : window.localStorage,
): ProviderKeyPoolStore {
  if (!storage) return emptyStore();
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    return storeSchema.parse(JSON.parse(raw));
  } catch {
    return emptyStore();
  }
}

export function writeProviderKeyPoolStore(
  storeValue: ProviderKeyPoolStore,
  storage: Pick<Storage, "setItem"> | null = typeof window === "undefined"
    ? null
    : window.localStorage,
): boolean {
  if (!storage) return false;
  try {
    const store = storeSchema.parse(storeValue);
    // Defense in depth: reject accidental secret-shaped fields.
    const json = JSON.stringify(store);
    if (/(api[_-]?key|password|bearer|authorization)/i.test(json)) {
      return false;
    }
    storage.setItem(STORAGE_KEY, json);
    return true;
  } catch {
    return false;
  }
}

export function upsertProviderKeyPool(
  pool: ProviderKeyPool,
  storage?: Pick<Storage, "getItem" | "setItem"> | null,
): boolean {
  const current = readProviderKeyPoolStore(storage ?? undefined);
  const nextPools = [
    ...current.pools.filter((item) => item.connectionId !== pool.connectionId),
    providerKeyPoolSchema.parse(pool),
  ];
  return writeProviderKeyPoolStore(
    { version: 1, pools: nextPools },
    storage ?? undefined,
  );
}

export function readProviderKeyPool(
  connectionId: string,
  storage?: Pick<Storage, "getItem"> | null,
): ProviderKeyPool | null {
  return (
    readProviderKeyPoolStore(storage ?? undefined).pools.find(
      (item) => item.connectionId === connectionId,
    ) ?? null
  );
}

export function removeProviderKeyPool(
  connectionId: string,
  storage?: Pick<Storage, "getItem" | "setItem"> | null,
): boolean {
  const current = readProviderKeyPoolStore(storage ?? undefined);
  return writeProviderKeyPoolStore(
    {
      version: 1,
      pools: current.pools.filter((item) => item.connectionId !== connectionId),
    },
    storage ?? undefined,
  );
}
