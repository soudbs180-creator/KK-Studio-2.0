import { checkedUrl, ServiceError } from "../services/httpClient.ts";

export function canonicalIdentityOrigin(
  value: string,
  allowLoopbackHttp = false,
): string {
  if (value.length > 2000) throw new ServiceError("INVALID_SERVICE_URL");
  const url = checkedUrl(value.trim(), allowLoopbackHttp);
  if (url.pathname !== "/" && url.pathname !== "")
    throw new ServiceError("IDENTITY_ORIGIN_REQUIRED");
  return url.origin;
}

export async function identityScope(
  origin: string,
  userId: string,
  digest: (value: string) => Promise<string>,
): Promise<string> {
  if (!userId || userId.length > 2000)
    throw new ServiceError("INVALID_IDENTITY_RESPONSE");
  const hash = await digest(JSON.stringify([origin, userId]));
  if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error("身份存储隔离校验失败。");
  return `realm-v1-${hash}`;
}
