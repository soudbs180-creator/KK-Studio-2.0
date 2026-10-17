import { IndexedDbBackend } from "./indexedDbBackend.ts";
import { MobileRepository } from "./repository.ts";
import { createSessionVault } from "./sessionVault.ts";
import { invariant } from "./validation.ts";

export async function createMobileRepository(
  accountId: string,
): Promise<MobileRepository> {
  invariant(globalThis.crypto?.subtle, "Secure browser crypto unavailable");
  const allowLoopbackHttp = typeof __DEV__ !== "undefined" && __DEV__;
  const storage = new IndexedDbBackend(globalThis.indexedDB, {
    allowLoopbackHttp,
  });
  return new MobileRepository({
    accountId,
    allowLoopbackHttp,
    backend: storage,
    originalStore: storage,
    hash: async (bytes) => {
      const digest = await globalThis.crypto.subtle.digest(
        "SHA-256",
        new Uint8Array(bytes),
      );
      return Array.from(new Uint8Array(digest), (v) =>
        v.toString(16).padStart(2, "0"),
      ).join("");
    },
    id: () => globalThis.crypto.randomUUID(),
    now: Date.now,
  });
}
export const createCredentialVault = createSessionVault;
