import type { CredentialVault } from "./ports.ts";
import { invariant } from "./validation.ts";

/** Request/session memory only. Browser reload intentionally requires new credentials. */
const values = new Map<string, string>();
export function createSessionVault(accountId: string): CredentialVault {
  invariant(accountId.length > 0, "Credential account required");
  const key = (ref: string) => JSON.stringify([accountId, ref]);
  return {
    async get(ref) {
      return values.get(key(ref)) ?? null;
    },
    async set(ref, value) {
      invariant(
        ref.length > 0 && value.length > 0,
        "Credential reference/value required",
      );
      values.set(key(ref), value);
    },
    async remove(ref) {
      values.delete(key(ref));
    },
  };
}
