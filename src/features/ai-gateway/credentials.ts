/**
 * Credential storage for channel adapters.
 *
 * Configuration only ever holds an opaque `credential_ref`. The plaintext is
 * owned by the vault and reaches an adapter exclusively through
 * `ChannelRequestContext.resolveSecret`, so no log line, error message or
 * serialized job row can accidentally carry the secret itself.
 *
 * This module performs no IO. The import-boundary gate forbids `src/features/`
 * from importing node builtins, and keeping the vault behind ports also makes
 * the encryption scheme a deployment decision rather than a hardcoded one.
 */

export interface CredentialStore {
  read(ref: string): Promise<string | undefined>;
  write(ref: string, secret: string): Promise<void>;
  delete(ref: string): Promise<boolean>;
  list(): Promise<string[]>;
}

/** Platform keychain binding, e.g. DPAPI on Windows. */
export interface SecretProtector {
  protect(plaintext: string): Promise<Uint8Array>;
  unprotect(ciphertext: Uint8Array): Promise<string>;
}

/** Ciphertext blob storage backing a {@link SecretProtector}. */
export interface CiphertextStoragePort {
  read(ref: string): Promise<Uint8Array | undefined>;
  write(ref: string, ciphertext: Uint8Array): Promise<void>;
  delete(ref: string): Promise<boolean>;
  list(): Promise<string[]>;
}

/**
 * Shapes that look like a real credential are rejected before the format check.
 * Order matters: a bare key pasted into config would otherwise fail the format
 * test and report only "malformed reference", hiding the real problem that a
 * secret was written where a reference belongs.
 *
 * Reference ids are short and structured (`conn.primary`), so the fallback
 * heuristic below is deliberately conservative: an unpunctuated run of 32+
 * characters is a key, not a name.
 */
const SECRET_PATTERN =
  /^(?:sk-[A-Za-z0-9_-]{16,}|Bearer\s+\S+|ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{6,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,}|ghp_[A-Za-z0-9]{20,}|AIza[A-Za-z0-9_-]{20,})/i;

const REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/;

export function looksLikeSecret(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 12) return false;
  if (SECRET_PATTERN.test(trimmed)) return true;
  // A long run with no separators or dots is raw key material. Reference ids
  // are structured (`conn.primary`), so a 32+ character opaque run is a secret.
  return /^[A-Za-z0-9_-]{32,}$/.test(trimmed);
}

export function assertCredentialRef(ref: string): string {
  const trimmed = ref.trim();
  if (!trimmed)
    throw new Error("CREDENTIAL_REF_REQUIRED: credential reference is empty");
  if (looksLikeSecret(trimmed))
    throw new Error(
      "CREDENTIAL_REF_IS_SECRET: a raw credential was supplied where a reference belongs; store it in the vault and reference it",
    );
  if (!REF_PATTERN.test(trimmed))
    throw new Error(
      `CREDENTIAL_REF_MALFORMED: reference may only contain letters, digits, dot, dash and underscore`,
    );
  return trimmed;
}

export class MemoryCredentialStore implements CredentialStore {
  readonly #secrets = new Map<string, string>();

  constructor(seed: Readonly<Record<string, string>> = {}) {
    for (const [ref, secret] of Object.entries(seed))
      this.#secrets.set(assertCredentialRef(ref), secret);
  }

  async read(ref: string): Promise<string | undefined> {
    return this.#secrets.get(assertCredentialRef(ref));
  }

  async write(ref: string, secret: string): Promise<void> {
    this.#secrets.set(assertCredentialRef(ref), secret);
  }

  async delete(ref: string): Promise<boolean> {
    return this.#secrets.delete(assertCredentialRef(ref));
  }

  async list(): Promise<string[]> {
    return [...this.#secrets.keys()].sort();
  }
}

/**
 * Vault-backed store. Plaintext exists only inside `read`, so an adapter that
 * logs the result of this call leaks the secret; that is why adapters are
 * expected to pass the value straight into an Authorization header.
 */
export class ProtectedCredentialStore implements CredentialStore {
  readonly #protector: SecretProtector;
  readonly #storage: CiphertextStoragePort;

  constructor(protector: SecretProtector, storage: CiphertextStoragePort) {
    this.#protector = protector;
    this.#storage = storage;
  }

  async read(ref: string): Promise<string | undefined> {
    const key = assertCredentialRef(ref);
    const ciphertext = await this.#storage.read(key);
    if (!ciphertext) return undefined;
    return this.#protector.unprotect(ciphertext);
  }

  async write(ref: string, secret: string): Promise<void> {
    const key = assertCredentialRef(ref);
    if (looksLikeSecret(ref))
      throw new Error(
        "CREDENTIAL_REF_IS_SECRET: refusing to key a vault entry by a secret",
      );
    await this.#storage.write(key, await this.#protector.protect(secret));
  }

  async delete(ref: string): Promise<boolean> {
    return this.#storage.delete(assertCredentialRef(ref));
  }

  async list(): Promise<string[]> {
    return (await this.#storage.list()).sort();
  }
}

/**
 * Read-through cache in front of a durable store. Model switches hit the same
 * credential repeatedly, and the keychain round trip is the slowest part of an
 * otherwise in-memory dispatch.
 */
export class LayeredCredentialStore implements CredentialStore {
  readonly #primary: CredentialStore;
  readonly #fallback: CredentialStore;
  readonly #cache = new Map<string, string>();
  #generation = 0;

  constructor(primary: CredentialStore, fallback: CredentialStore) {
    this.#primary = primary;
    this.#fallback = fallback;
  }

  async read(ref: string): Promise<string | undefined> {
    const key = assertCredentialRef(ref);
    const cached = this.#cache.get(key);
    if (cached !== undefined) return cached;
    const generation = this.#generation;
    // The durable store wins so a rotated secret takes effect without a restart.
    // Both are queried rather than short-circuiting: an empty string is a value
    // the vault stored, not an absent entry.
    const [primary, fallback] = await Promise.all([
      this.#primary.read(key),
      this.#fallback.read(key),
    ]);
    if (generation !== this.#generation) return this.read(key);
    const found = primary ?? fallback;
    if (found !== undefined) this.#cache.set(key, found);
    return found;
  }

  async write(ref: string, secret: string): Promise<void> {
    const key = assertCredentialRef(ref);
    await this.#primary.write(key, secret);
    this.#generation++;
    this.#cache.set(key, secret);
  }

  async delete(ref: string): Promise<boolean> {
    const key = assertCredentialRef(ref);
    this.#cache.delete(key);
    const invalidate = () => {
      this.#generation++;
      this.#cache.delete(key);
    };
    // Both sides must be cleared: short-circuiting on the first `true` would
    // leave the copy in the other store, and the next read would resurrect it.
    // Each layer invalidates reads even if the other deletion fails first.
    const [primary, fallback] = await Promise.all([
      this.#primary.delete(key).finally(invalidate),
      this.#fallback.delete(key).finally(invalidate),
    ]);
    return primary || fallback;
  }

  async list(): Promise<string[]> {
    const merged = new Set([
      ...(await this.#primary.list()),
      ...(await this.#fallback.list()),
    ]);
    return [...merged].sort();
  }
}
