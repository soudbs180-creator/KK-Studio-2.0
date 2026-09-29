import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { CompanionProtocolError } from "./protocol.ts";

const DEFAULT_SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

function sameDigest(left: Buffer, right: Buffer): boolean {
  return left.length === right.length && timingSafeEqual(left, right);
}

export class CompanionSessionManager {
  private readonly pairingDigest: Buffer;
  private readonly sessions = new Map<string, number>();
  private readonly ttlMs: number;
  private pairingUsed = false;

  constructor(pairingCode: string, ttlMs = DEFAULT_SESSION_TTL_MS) {
    if (!/\S{8,128}/.test(pairingCode))
      throw new CompanionProtocolError(
        "PAIRING_INVALID",
        500,
        "配对码配置无效。",
      );
    if (!Number.isSafeInteger(ttlMs) || ttlMs < 60_000)
      throw new CompanionProtocolError(
        "INVALID_REQUEST",
        500,
        "会话时长配置无效。",
      );
    this.pairingDigest = digest(pairingCode);
    this.ttlMs = ttlMs;
  }

  pair(pairingCode: string): string {
    if (this.pairingUsed)
      throw new CompanionProtocolError("PAIRING_USED", 401, "配对码已使用。");
    if (!sameDigest(this.pairingDigest, digest(pairingCode)))
      throw new CompanionProtocolError("PAIRING_INVALID", 401, "配对码无效。");
    this.pairingUsed = true;
    const session = randomBytes(32).toString("base64url");
    this.sessions.set(session, Date.now() + this.ttlMs);
    return session;
  }

  authenticate(session: string | undefined): boolean {
    if (!session || !/^[A-Za-z0-9_-]{40,80}$/.test(session)) return false;
    const expiresAt = this.sessions.get(session);
    if (!expiresAt) return false;
    if (expiresAt <= Date.now()) {
      this.sessions.delete(session);
      return false;
    }
    return true;
  }

  revoke(session: string | undefined): void {
    if (session) this.sessions.delete(session);
  }
}

export function sessionFromCookie(
  cookie: string | undefined,
): string | undefined {
  const value = cookie?.match(
    /(?:^|;\s*)kk_companion_session=([A-Za-z0-9_-]+)/,
  )?.[1];
  return value && /^[A-Za-z0-9_-]{40,80}$/.test(value) ? value : undefined;
}
