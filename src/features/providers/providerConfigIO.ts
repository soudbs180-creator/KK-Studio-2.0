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
import { assertNoSecrets } from "./providerTargetRenderers.ts";

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
  for (const connection of incoming) {
    if (!byId.has(connection.id) || mode === "replace")
      byId.set(connection.id, connection);
  }
  return [...byId.values()];
}

export interface SeedProfile {
  name: string;
  baseUrl: string;
  model?: string;
}

/** cc-switch 风格最小 seed（name/baseUrl/model）→ user_byok 连接。 */
export function buildSeedConnection(profile: SeedProfile): ProviderConnection {
  const name = profile.name.trim();
  if (!name) throw new Error("seed 名称不能为空");
  const id =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "provider";
  const connection: ProviderConnection = {
    id,
    provider: name.slice(0, 80),
    kind: "user_byok",
    displayName: name.slice(0, 120),
    baseUrl: profile.baseUrl,
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
  return providerConnectionSchema.parse(connection);
}
