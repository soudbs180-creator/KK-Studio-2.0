/**
 * MCP 服务器配置契约（v2 候选）：stdio 传输 + 命令白名单。
 *
 * 边界：浏览器侧客户端（mcpClient.ts）保持 streamable_http 不变（浏览器
 * 无法 spawn 进程）；本契约供 Node 侧接线（canvas-agent / 网关）持久化与
 * 执行消费。安全：stdio env 不得携带密钥形态文本，密钥只进系统凭据库。
 */
import { z } from "zod";
import { mcpServerSchema } from "./mcpClient.ts";

const STDIO_BARE_COMMANDS = new Set([
  "npx",
  "node",
  "uvx",
  "python3",
  "bun",
  "deno",
]);

/** 反斜杠是 Windows 路径分隔符，不纳入元字符；直接 spawn 不经 shell。 */
const SHELL_METACHARACTERS = /[|;&$<>`"'\n\r\0]/;

/** 命令必须命中白名单裸名，或是无 shell 元字符的绝对文件路径。 */
export function isAllowedStdioCommand(command: string): boolean {
  const value = command.trim();
  if (!value || value.length > 260) return false;
  if (STDIO_BARE_COMMANDS.has(value)) return true;
  if (value.startsWith("-")) return false;
  const absolute =
    value.startsWith("/") ||
    /^[A-Za-z]:[\\/]/.test(value) ||
    value.startsWith("\\\\");
  if (!absolute) return false;
  if (SHELL_METACHARACTERS.test(value)) return false;
  if (value.endsWith("/") || value.endsWith("\\")) return false;
  return /[^\\/]+$/.test(value.replaceAll("\\", "/"));
}

export const mcpStdioServerSchema = z
  .object({
    transport: z.literal("stdio"),
    command: z
      .string()
      .trim()
      .min(1)
      .max(260)
      .refine(isAllowedStdioCommand, "命令必须命中白名单或为合法绝对路径"),
    args: z.array(z.string().min(1).max(200)).max(32).default([]),
    env: z
      .record(z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/), z.string().max(200))
      .refine((value) => Object.keys(value).length <= 16, "env 最多 16 项")
      .optional(),
  })
  .strict();
export type McpStdioServerConfig = z.infer<typeof mcpStdioServerSchema>;

const CREDENTIAL_PATTERNS = [
  /(?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password)\s*[:=]/i,
  /sk-[A-Za-z0-9_-]{12,}/,
  /-----BEGIN [A-Z ]+ PRIVATE KEY-----/,
  /(?:Bearer|Basic)\s+[A-Za-z0-9+/._-]{16,}/i,
];

function containsCredentialLikeText(value: string): boolean {
  return CREDENTIAL_PATTERNS.some((pattern) => pattern.test(value));
}

/** stdio env 校验：拒绝任何疑似密钥/凭据的值落入本地配置。 */
export function validateStdioEnv(config: McpStdioServerConfig): string[] {
  const problems: string[] = [];
  for (const [key, value] of Object.entries(config.env ?? {})) {
    if (containsCredentialLikeText(value))
      problems.push(`env.${key} 疑似包含密钥，禁止写入本地配置`);
  }
  return problems;
}

/** v2 持久化契约：streamable_http（现状）或 stdio（新增）。 */
export const mcpServerConfigV2Schema = z.discriminatedUnion("transport", [
  mcpServerSchema,
  mcpStdioServerSchema,
]);
export type McpServerConfigV2 = z.infer<typeof mcpServerConfigV2Schema>;
