/**
 * Provider 配置便携导入导出（kk-provider-config v1）。
 *
 * 安全边界：文件中绝不包含密钥明文；credentialRef 仅作为不透明引用透传，
 * 密钥由接线层从系统凭据库按引用解析。导出时对序列化全文做密钥形态扫描。
 */
import { z } from "zod";
import {
  providerConnectionSchema,
  type ProviderConnection,
} from "../../domain/providerConnections.ts";
import {
  assertNoSecrets,
  connectionFingerprint,
} from "./providerTargetRenderers.ts";

export const providerConfigSchema = z
  .object({
    version: z.literal(1),
    exportedAt: z.string().datetime(),
    source: z.string().trim().min(1).max(120).default("kk-studio"),
    connections: z.array(providerConnectionSchema).max(200),
  })
  .strict();
export type ProviderConfigFile = z.infer<typeof providerConfigSchema>;

export function exportProviderConfig(
  connections: ProviderConnection[],
): string {
  const file: ProviderConfigFile = {
    version: 1,
    exportedAt: new Date().toISOString(),
    source: "kk-studio",
    connections: connections.map((connection) =>
      providerConnectionSchema.parse(connection),
    ),
  };
  const json = JSON.stringify(file, null, 2);
  assertNoSecrets(json, "配置导出");
  return json;
}

export function parseProviderConfig(raw: string): ProviderConfigFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("配置不是合法 JSON。");
  }
  const result = providerConfigSchema.safeParse(parsed);
  if (!result.success)
    throw new Error("配置格式不符合 kk-provider-config-v1。");
  return result.data;
}

export type ImportMode = "keep-existing" | "replace";

/**
 * 合并导入：keep-existing 时已存在 id 保留现有运行状态
 * （state/cooldown/verification/activeJobs），新 id 追加；
 * replace 时同 id 整体替换（仅导入方提供的字段）。
 */
export function mergeProviderConnections(
  existing: ProviderConnection[],
  incoming: ProviderConnection[],
  mode: ImportMode = "keep-existing",
): ProviderConnection[] {
  const byId = new Map(
    existing.map((connection) => [connection.id, connection]),
  );
  const incomingIds = new Set<string>();
  for (const connection of incoming) {
    if (incomingIds.has(connection.id))
      throw new Error(`导入配置包含重复连接 id：${connection.id}`);
    incomingIds.add(connection.id);
    if (!byId.has(connection.id) || mode === "replace")
      byId.set(connection.id, connection);
  }
  return [...byId.values()];
}

export interface SeedProfile {
  name: string;
  baseUrl: string;
  model?: string;
  credentialRef?: string;
}

/** cc-switch 风格最小 seed（name/baseUrl/model）→ user_byok 连接。 */
export function buildSeedConnection(profile: SeedProfile): ProviderConnection {
  const name = profile.name.trim();
  if (!name) throw new Error("seed 名称不能为空");
  const asciiId = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const id = `${asciiId || "provider"}-${connectionFingerprint(`${name}\0${profile.baseUrl}`)}`;

  let credentialRef: string | undefined = undefined;
  if (profile.credentialRef !== undefined) {
    const trimmed = profile.credentialRef.trim();
    if (!trimmed) {
      throw new Error("credentialRef 不能为空");
    }
    if (
      /^(?:sk-[A-Za-z0-9_-]{12,}|Bearer\s+\S+|ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{6,})/i.test(
        trimmed,
      ) ||
      /^[A-Za-z0-9_-]{32,}$/.test(trimmed)
    ) {
      throw new Error(
        "CREDENTIAL_REF_IS_SECRET: credentialRef 必须是不透明引用，禁止存放密钥明文",
      );
    }
    if (!/^[A-Za-z0-9_-]{1,160}$/.test(trimmed)) {
      throw new Error("credentialRef 格式不合法，仅允许字母数字下划线短横线");
    }
    credentialRef = trimmed;
  }

  const connection: ProviderConnection = {
    id,
    provider: name.slice(0, 80),
    kind: "user_byok",
    displayName: name.slice(0, 120),
    baseUrl: profile.baseUrl,
    credentialRef,
    model: profile.model?.trim().slice(0, 120) || undefined,
    capabilities: {
      modalities: ["text"],
      operations: ["generate"],
      async: false,
      estimatedLatencyClass: "interactive",
    },
    state: "active",
    concurrencyLimit: 4,
    verificationStatus: "unverified",
  };
  const validated = providerConnectionSchema.parse(connection);
  assertNoSecrets(JSON.stringify(validated), "Seed 连接生成");
  return validated;
}

export interface DeeplinkImportPayload {
  readonly name: string;
  readonly endpoint: string;
  readonly baseUrl: string;
  readonly apiKey?: string;
  readonly model?: string;
  readonly app?: string;
  readonly resource?: string;
}

export function parseCcSwitchDeeplink(
  deeplinkUrl: string,
): DeeplinkImportPayload {
  const trimmed = deeplinkUrl.trim();
  if (!trimmed) throw new Error("Deeplink URL 不能为空");
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("非法 CC Switch Deeplink 协议或 URL");
  }
  if (url.protocol !== "ccswitch:") {
    throw new Error("非法 CC Switch Deeplink 协议，必须为 ccswitch:");
  }
  const fullPath = (
    url.host ? `${url.host}${url.pathname}` : url.pathname
  ).replace(/^\/+/, "");
  if (fullPath !== "v1/import") {
    throw new Error("非法 CC Switch Deeplink 路径，必须为 v1/import");
  }
  const name = url.searchParams.get("name")?.trim() || "CC Switch 导入";
  const rawEndpoint = url.searchParams.get("endpoint")?.trim() || "";
  const rawHomepage = url.searchParams.get("homepage")?.trim() || "";
  const endpoint = rawEndpoint || rawHomepage;
  if (!endpoint) {
    throw new Error("CC Switch Deeplink 缺少 endpoint 或 homepage 地址");
  }
  try {
    const parsed = new URL(endpoint);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("接口地址必须使用 HTTP 或 HTTPS 协议");
    }
  } catch {
    throw new Error(`接口地址无效: ${endpoint}`);
  }
  const apiKey = url.searchParams.get("apiKey")?.trim() || undefined;
  const model = url.searchParams.get("model")?.trim() || undefined;
  const app = url.searchParams.get("app")?.trim() || undefined;
  const resource = url.searchParams.get("resource")?.trim() || undefined;

  return {
    name,
    endpoint,
    baseUrl: endpoint,
    apiKey,
    model,
    app,
    resource,
  };
}

export function buildDeeplinkConnection(
  payload: DeeplinkImportPayload,
  options?: { credentialRef?: string },
): { connection: ProviderConnection; rawApiKey?: string } {
  const connection = buildSeedConnection({
    name: payload.name,
    baseUrl: payload.endpoint || payload.baseUrl,
    model: payload.model,
    credentialRef: options?.credentialRef,
  });
  return {
    connection,
    rawApiKey: payload.apiKey,
  };
}

export function parseSeedProfiles(raw: unknown): SeedProfile[] {
  if (!Array.isArray(raw)) throw new Error("Seed 列表必须为数组");
  return raw.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`第 ${index + 1} 项 seed 格式无效`);
    }
    const rec = item as Record<string, unknown>;
    const name = typeof rec.name === "string" ? rec.name.trim() : "";
    const rawBaseUrl =
      typeof rec.baseUrl === "string"
        ? rec.baseUrl.trim()
        : typeof rec.endpoint === "string"
          ? rec.endpoint.trim()
          : "";
    if (!name) throw new Error(`第 ${index + 1} 项 seed 缺少名称`);
    if (!rawBaseUrl) throw new Error(`第 ${index + 1} 项 seed 缺少 baseUrl`);
    const model =
      typeof rec.model === "string" && rec.model.trim()
        ? rec.model.trim()
        : undefined;
    const credentialRef =
      typeof rec.credentialRef === "string" && rec.credentialRef.trim()
        ? rec.credentialRef.trim()
        : undefined;
    return { name, baseUrl: rawBaseUrl, model, credentialRef };
  });
}

export function importSeedConnections(
  profiles: SeedProfile[],
  existing: ProviderConnection[] = [],
  mode: ImportMode = "keep-existing",
): ProviderConnection[] {
  const incoming = profiles.map(buildSeedConnection);
  return mergeProviderConnections(existing, incoming, mode);
}
