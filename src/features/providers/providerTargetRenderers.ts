/**
 * 多目标配置渲染层：把同一个 ProviderConnection 渲染成 Codex / Claude /
 * OpenAI 兼容环境三套目标配置。纯函数、无 I/O、绝不输出密钥明文。
 *
 * 边界：本模块只产出配置结构与序列化文本；真实消费（写入 config.toml /
 * settings.json / 注入进程环境）由接线层完成，渲染结果与目标工具版本的
 * 对拍验证在接线任务中进行（TASK-PROV-002 remaining）。
 */
import { z } from "zod";
import type { ProviderConnection } from "../../domain/providerConnections.ts";

const CREDENTIAL_PATTERNS = [
  /(?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password)\s*[:=]/i,
  /sk-[A-Za-z0-9_-]{12,}/,
  /-----BEGIN [A-Z ]+ PRIVATE KEY-----/,
  /(?:Bearer|Basic)\s+[A-Za-z0-9+/._-]{16,}/i,
];

/** 渲染产物不允许携带任何密钥形态文本；未来新增字段同样受此防线约束。 */
export function assertNoSecrets(value: unknown, label: string): void {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (CREDENTIAL_PATTERNS.some((pattern) => pattern.test(text)))
    throw new Error(`${label} 疑似包含密钥或凭据`);
}

/** 连接 id → 配置内稳定键（小写字母数字与下划线，带 kk_ 前缀）。 */
export function providerKey(connectionId: string): string {
  const key = connectionId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  if (!key) throw new Error("连接 id 无法生成配置键");
  return `kk_${key}`;
}

/** 凭据引用 → 接线层约定使用的环境变量名（值由宿主从系统凭据库注入）。 */
export function envKeyFor(connectionId: string, suffix: string): string {
  const stem = connectionId
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
  return `KK_STUDIO_${stem}_${suffix}`;
}

export const wireApiSchema = z.enum(["chat", "responses"]);
export type WireApi = z.infer<typeof wireApiSchema>;

export const codexProviderBlockSchema = z.object({
  providerKey: z.string().regex(/^kk_[a-z0-9_]+$/),
  name: z.string().min(1).max(80),
  baseUrl: z.string().url(),
  envKey: z.string().optional(),
  wireApi: wireApiSchema,
  model: z.string().max(120).optional(),
});
export type CodexProviderBlock = z.infer<typeof codexProviderBlockSchema>;

export const claudeEnvBlockSchema = z.object({
  env: z.record(z.string(), z.string()),
  envKey: z.string().optional(),
  model: z.string().max(120).optional(),
  /** 目标是否假定为 Anthropic 兼容协议；接线时必须以真实 provider 行为对拍。 */
  assumesAnthropicProtocol: z.boolean(),
});
export type ClaudeEnvBlock = z.infer<typeof claudeEnvBlockSchema>;

export const openAiEnvBlockSchema = z.object({
  env: z.record(z.string(), z.string()),
  envKey: z.string().optional(),
  model: z.string().max(120).optional(),
});
export type OpenAiEnvBlock = z.infer<typeof openAiEnvBlockSchema>;

export type TargetRender =
  | { target: "codex"; ok: true; value: CodexProviderBlock }
  | { target: "claude"; ok: true; value: ClaudeEnvBlock }
  | { target: "openai-env"; ok: true; value: OpenAiEnvBlock };

export function renderCodexTarget(
  connection: ProviderConnection,
  options: { wireApi?: WireApi } = {},
): CodexProviderBlock {
  const baseUrl = connection.baseUrl;
  if (!baseUrl) throw new Error("Codex 渲染需要 baseUrl");
  const block: CodexProviderBlock = {
    providerKey: providerKey(connection.id),
    name: connection.displayName || connection.provider,
    baseUrl,
    wireApi: options.wireApi ?? "chat",
  };
  if (connection.credentialRef)
    block.envKey = envKeyFor(connection.id, "API_KEY");
  if (connection.model) block.model = connection.model;
  codexProviderBlockSchema.parse(block);
  assertNoSecrets(block, "Codex 渲染");
  return block;
}

export function renderClaudeTarget(
  connection: ProviderConnection,
  options: { assumeAnthropicProtocol?: boolean } = {},
): ClaudeEnvBlock {
  const baseUrl = connection.baseUrl;
  if (!baseUrl) throw new Error("Claude 渲染需要 baseUrl");
  const block: ClaudeEnvBlock = {
    env: { ANTHROPIC_BASE_URL: baseUrl },
    assumesAnthropicProtocol: options.assumeAnthropicProtocol ?? false,
  };
  if (connection.credentialRef)
    block.envKey = envKeyFor(connection.id, "ANTHROPIC_TOKEN");
  if (connection.model) block.model = connection.model;
  claudeEnvBlockSchema.parse(block);
  assertNoSecrets(block, "Claude 渲染");
  return block;
}

export function renderOpenAiEnvTarget(
  connection: ProviderConnection,
): OpenAiEnvBlock {
  const baseUrl = connection.baseUrl;
  if (!baseUrl) throw new Error("OpenAI 环境渲染需要 baseUrl");
  const block: OpenAiEnvBlock = {
    env: { OPENAI_BASE_URL: baseUrl },
  };
  if (connection.credentialRef)
    block.envKey = envKeyFor(connection.id, "OPENAI_KEY");
  if (connection.model) block.model = connection.model;
  openAiEnvBlockSchema.parse(block);
  assertNoSecrets(block, "OpenAI 环境渲染");
  return block;
}

/** 渲染全部适用目标；Claude 协议假设默认关闭，由接线层显式开启。 */
export function renderAllTargets(
  connection: ProviderConnection,
  options: { wireApi?: WireApi; assumeAnthropicProtocol?: boolean } = {},
): TargetRender[] {
  const renders: TargetRender[] = [];
  try {
    renders.push({
      target: "codex",
      ok: true,
      value: renderCodexTarget(connection, options),
    });
  } catch {
    // 缺少 baseUrl 时跳过，不虚构配置。
  }
  if (options.assumeAnthropicProtocol) {
    try {
      renders.push({
        target: "claude",
        ok: true,
        value: renderClaudeTarget(connection, options),
      });
    } catch {
      // 缺少 baseUrl 时跳过。
    }
  }
  try {
    renders.push({
      target: "openai-env",
      ok: true,
      value: renderOpenAiEnvTarget(connection),
    });
  } catch {
    // 缺少 baseUrl 时跳过。
  }
  return renders;
}

function tomlQuote(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

/** Codex config.toml provider 块（wire_api 需与目标 Codex 版本对拍）。 */
export function serializeCodexToml(block: CodexProviderBlock): string {
  const lines: string[] = [];
  lines.push(`[model_providers.${block.providerKey}]`);
  lines.push(`name = ${tomlQuote(block.name)}`);
  lines.push(`base_url = ${tomlQuote(block.baseUrl)}`);
  if (block.envKey) lines.push(`env_key = ${tomlQuote(block.envKey)}`);
  lines.push(`wire_api = ${tomlQuote(block.wireApi)}`);
  if (block.model) {
    lines.push("");
    lines.push(`model_provider = ${tomlQuote(block.providerKey)}`);
    lines.push(`model = ${tomlQuote(block.model)}`);
  }
  return lines.join("\n");
}

/** Claude settings.json 内容；envKey 所指密钥由接线层从凭据库注入，不落盘。 */
export function serializeClaudeSettings(block: ClaudeEnvBlock): string {
  return JSON.stringify(
    { env: block.env, ...(block.model ? { model: block.model } : {}) },
    null,
    2,
  );
}

/** OpenAI 兼容环境变量注入脚本（bash 形态，供接线层使用）。 */
export function serializeOpenAiEnv(block: OpenAiEnvBlock): string {
  const lines = Object.entries(block.env).map(
    ([key, value]) => `export ${key}=${JSON.stringify(value)}`,
  );
  return lines.join("\n");
}
