import { z } from "zod";
import {
  applyKeyFailure,
  applyKeySuccess,
  credentialKeyStateSchema,
  selectCredentialKey,
  type CredentialKeyState,
} from "./providerPoolRouting.ts";

/**
 * Key-pool snapshot for one provider connection.
 * Secrets stay in the vault; this only stores opaque credentialRef + health.
 */
export const providerKeyPoolSchema = z
  .object({
    version: z.literal(1),
    connectionId: z.string().min(1).max(120),
    rotateEveryRequest: z.boolean().default(false),
    stickySessionKey: z
      .record(z.string().max(120), z.string().max(120))
      .default({}),
    keys: z.array(credentialKeyStateSchema).min(1).max(32),
  })
  .strict();
export type ProviderKeyPool = z.infer<typeof providerKeyPoolSchema>;

export function createProviderKeyPool(input: {
  connectionId: string;
  credentialRefs: readonly string[];
  rotateEveryRequest?: boolean;
}): ProviderKeyPool {
  const refs = z
    .array(z.string().min(1).max(200))
    .min(1)
    .max(32)
    .parse(input.credentialRefs);
  return providerKeyPoolSchema.parse({
    version: 1,
    connectionId: input.connectionId,
    rotateEveryRequest: input.rotateEveryRequest ?? false,
    stickySessionKey: {},
    keys: refs.map((credentialRef, index) => ({
      keyId: `key-${index + 1}`,
      credentialRef,
      cooldownUntilMs: 0,
      quarantined: false,
      consecutiveFailures: 0,
    })),
  });
}

export function pickPoolCredential(
  poolValue: ProviderKeyPool,
  options: { nowMs: number; sessionId?: string },
): { pool: ProviderKeyPool; key: CredentialKeyState } | null {
  const pool = providerKeyPoolSchema.parse(poolValue);
  const stickyKeyId = options.sessionId
    ? pool.stickySessionKey[options.sessionId]
    : undefined;
  const key = selectCredentialKey({
    keys: pool.keys,
    nowMs: options.nowMs,
    stickyKeyId,
    rotateEveryRequest: pool.rotateEveryRequest,
    lastKeyId: stickyKeyId,
  });
  if (!key) return null;
  if (options.sessionId && !pool.rotateEveryRequest) {
    return {
      pool: providerKeyPoolSchema.parse({
        ...pool,
        stickySessionKey: {
          ...pool.stickySessionKey,
          [options.sessionId]: key.keyId,
        },
      }),
      key,
    };
  }
  return { pool, key };
}

export function recordPoolSuccess(
  poolValue: ProviderKeyPool,
  keyId: string,
): ProviderKeyPool {
  const pool = providerKeyPoolSchema.parse(poolValue);
  return providerKeyPoolSchema.parse({
    ...pool,
    keys: pool.keys.map((key) =>
      key.keyId === keyId ? applyKeySuccess(key) : key,
    ),
  });
}

export function recordPoolFailure(
  poolValue: ProviderKeyPool,
  keyId: string,
  options: { nowMs: number; cooldownMs?: number; sessionId?: string },
): ProviderKeyPool {
  const pool = providerKeyPoolSchema.parse(poolValue);
  const keys = pool.keys.map((key) =>
    key.keyId === keyId
      ? applyKeyFailure(key, {
          nowMs: options.nowMs,
          cooldownMs: options.cooldownMs,
        })
      : key,
  );
  const stickySessionKey = { ...pool.stickySessionKey };
  if (options.sessionId && stickySessionKey[options.sessionId] === keyId) {
    delete stickySessionKey[options.sessionId];
  }
  return providerKeyPoolSchema.parse({
    ...pool,
    keys,
    stickySessionKey,
  });
}
