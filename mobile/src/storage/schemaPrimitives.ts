export const LIMITS = {
  originalBytes: 16 * 1024 * 1024,
  snapshotBytes: 8 * 1024 * 1024,
  backupBytes: 64 * 1024 * 1024,
  assets: 256,
  projects: 500,
  tasks: 1000,
  messages: 5000,
} as const;
/** Runtime/build policy only; it is never loaded from project or backup content. */
export interface StorageValidationPolicy {
  allowLoopbackHttp?: boolean;
}
export class StoragePolicyError extends Error {
  constructor() {
    super(
      "HTTPS is required. Development loopback data needs an explicitly enabled development policy; original content is preserved.",
    );
    this.name = "StoragePolicyError";
  }
}
const secretKeys =
  /^(api.?key|password|secret|token|access.?token|refresh.?token|authorization|cookie|proxy.?credentials)$/i;
export function keys(
  value: Record<string, unknown>,
  allowed: readonly string[],
): void {
  invariant(
    Object.keys(value).every((k) => allowed.includes(k)),
    "Unexpected schema metadata",
  );
}
export function invariant(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}
export function object(
  value: unknown,
): asserts value is Record<string, unknown> {
  invariant(
    value !== null && typeof value === "object" && !Array.isArray(value),
    "Corrupt object",
  );
}
export function id(value: unknown): asserts value is string {
  invariant(
    typeof value === "string" && /^[A-Za-z0-9._:-]{1,200}$/.test(value),
    "Corrupt identity",
  );
}
export function text(
  value: unknown,
  maximum = 200000,
): asserts value is string {
  invariant(
    typeof value === "string" && value.length <= maximum,
    "Corrupt bounded text",
  );
}
export function integer(value: unknown): asserts value is number {
  invariant(
    Number.isSafeInteger(value) && Number(value) >= 0,
    "Corrupt integer",
  );
}
export function array(
  value: unknown,
  maximum: number,
): asserts value is unknown[] {
  invariant(
    Array.isArray(value) && value.length <= maximum,
    "Corrupt bounded array",
  );
}
export function assertNoSecrets(value: unknown, depth = 0): void {
  invariant(depth <= 40, "Corrupt nesting limit");
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    invariant(
      !secretKeys.test(key),
      "Secret credentials cannot enter project storage",
    );
    assertNoSecrets(child, depth + 1);
  }
}
export function validateUrl(
  value: unknown,
  policy: StorageValidationPolicy = {},
): void {
  text(value, 2000);
  const url = new URL(value);
  invariant(
    !url.username && !url.password && !url.search && !url.hash,
    "Credential-free HTTPS URL required",
  );
  const loopback =
    policy.allowLoopbackHttp === true &&
    url.protocol === "http:" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !loopback) throw new StoragePolicyError();
}
