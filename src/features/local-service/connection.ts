import { z } from "zod";
import { BROWSER_STORAGE_KEYS } from "../../runtime/storage-contract.ts";

export const COMPANION_CONNECTION_STORAGE_KEY = BROWSER_STORAGE_KEYS.companion;

const loopbackHosts = new Set(["127.0.0.1", "localhost", "[::1]"]);
const connectionSchema = z
  .object({
    version: z.literal(1),
    endpoint: z.string().min(1).max(160),
    deviceId: z.string().min(1).max(120).optional(),
    protocolVersion: z.number().int().positive().optional(),
    enabled: z.boolean(),
  })
  .strip();

export interface CompanionConnection {
  version: 1;
  endpoint: string;
  deviceId?: string;
  protocolVersion?: number;
  enabled: boolean;
}

function storageOrNull(storage?: Storage): Storage | null {
  if (storage) return storage;
  if (typeof window !== "undefined") return window.localStorage;
  return null;
}

export function normalizeCompanionEndpoint(value: string): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("本机服务地址无效。");
  }
  if (
    url.protocol !== "http:" ||
    !loopbackHosts.has(url.hostname) ||
    url.username ||
    url.password ||
    (url.pathname !== "" && url.pathname !== "/") ||
    url.search ||
    url.hash
  )
    throw new Error("本机服务地址必须是无路径的 loopback HTTP 地址。");
  const port = Number(url.port);
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error("本机服务端口必须在 1024 到 65535 之间。");
  return `http://${url.hostname === "[::1]" ? "[::1]" : url.hostname}:${port}`;
}

export function readCompanionConnection(
  storage?: Storage,
): CompanionConnection | null {
  const target = storageOrNull(storage);
  if (!target) return null;
  const raw = target.getItem(COMPANION_CONNECTION_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = connectionSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    return {
      ...parsed.data,
      endpoint: normalizeCompanionEndpoint(parsed.data.endpoint),
    };
  } catch {
    return null;
  }
}

export function writeCompanionConnection(
  value: CompanionConnection,
  storage?: Storage,
): void {
  const target = storageOrNull(storage);
  if (!target) throw new Error("浏览器本地设置不可用。");
  const connection: CompanionConnection = {
    version: 1,
    endpoint: normalizeCompanionEndpoint(value.endpoint),
    ...(value.deviceId ? { deviceId: value.deviceId } : {}),
    ...(value.protocolVersion
      ? { protocolVersion: value.protocolVersion }
      : {}),
    enabled: value.enabled,
  };
  target.setItem(COMPANION_CONNECTION_STORAGE_KEY, JSON.stringify(connection));
}

export function clearCompanionConnection(storage?: Storage): void {
  storageOrNull(storage)?.removeItem(COMPANION_CONNECTION_STORAGE_KEY);
}
