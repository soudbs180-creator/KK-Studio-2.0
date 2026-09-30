/**
 * `providers` CLI：把便携 Provider 配置应用到 Codex / Claude Code 或做连接体检。
 *
 *   node dist/index.js providers apply <config.json> [--active <connection-id>] [--catalog <id>] [--config-dir <dir>] [--dry-run]
 *   node dist/index.js providers apply-claude <config.json> [--config-dir <dir>] [--dry-run]
 *   node dist/index.js providers check <config.json>
 *
 * 密钥纪律：配置 JSON 内不接受密钥明文（assertNoSecrets 防线）；check 仅报告
 * 环境变量是否就绪并对 base_url 做尽力探测，绝不输出密钥本身。
 */
import fs from "node:fs";
import { applyClaudeProviderConfig } from "./claude-provider-config.js";
import {
  applyCodexProviderConfig,
  envKeyFor,
  parseProviderConfig,
  providerKey,
  type ProviderConfigEntry,
} from "./codex-provider-config.js";

function readProviderConfig(configFile: string): ProviderConfigEntry[] {
  // Windows 编辑器常写 UTF-8 BOM；读取时剥除，避免 JSON.parse 拒绝。
  const raw = JSON.parse(
    fs.readFileSync(configFile, "utf8").replace(/^\uFEFF/, ""),
  ) as unknown;
  return parseProviderConfig(raw);
}

function printReport(lines: string[]): void {
  for (const line of lines) console.log(line);
}

interface ApplyFlags {
  configFile: string;
  catalog?: string;
  configDir?: string;
  active?: string;
  dryRun: boolean;
}

function parseApplyFlags(
  argv: string[],
  target: "codex" | "claude" | "check",
): ApplyFlags {
  const flags: ApplyFlags = { configFile: "", dryRun: false };
  const seen = new Set<string>();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("-")) {
      if (flags.configFile) throw new Error("只能指定一个 config.json");
      flags.configFile = arg;
      continue;
    }
    if (seen.has(arg)) throw new Error(`${arg} 只能指定一次`);
    seen.add(arg);
    if (arg === "--dry-run" && target !== "check") flags.dryRun = true;
    else if (
      target !== "check" &&
      (arg === "--config-dir" ||
        (target === "codex" && ["--catalog", "--active"].includes(arg)))
    ) {
      const value = argv[i + 1];
      if (!value || value.startsWith("-")) throw new Error(`${arg} 缺少值`);
      if (arg === "--catalog") flags.catalog = value;
      else if (arg === "--active") flags.active = value;
      else flags.configDir = value;
      i++;
    } else throw new Error(`不支持的参数: ${arg}`);
  }
  if (!flags.configFile) throw new Error("缺少 config.json");
  return flags;
}

/** `providers apply`：合并写盘（或 dry-run 预览）。 */
export function runApply(argv: string[]): number {
  const flags = parseApplyFlags(argv, "codex");
  const connections = readProviderConfig(flags.configFile);
  const result = applyCodexProviderConfig(connections, {
    catalogProfileId: flags.catalog,
    activeConnectionId: flags.active,
    configDir: flags.configDir,
    dryRun: flags.dryRun,
  });
  const lines = [
    result.dryRun ? "[dry-run] 未写盘" : "已写入 Codex 配置",
    `config: ${result.configPath}`,
    ...(result.catalogPath ? [`catalog: ${result.catalogPath}`] : []),
    `providers: ${result.providers.join(", ")}`,
    ...result.warnings.map((warning) => `warning: ${warning}`),
  ];
  printReport(lines);
  return 0;
}

/** `providers apply-claude`：合并写 Claude Code settings.json（或 dry-run 预览）。 */
export function runApplyClaude(argv: string[]): number {
  const flags = parseApplyFlags(argv, "claude");
  const connections = readProviderConfig(flags.configFile);
  const result = applyClaudeProviderConfig(connections, {
    configDir: flags.configDir,
    dryRun: flags.dryRun,
  });
  const lines = [
    result.dryRun ? "[dry-run] 未写盘" : "已写入 Claude 配置",
    `config: ${result.configPath}`,
    ...(result.model ? [`model: ${result.model}`] : []),
    `providers: ${result.providers.join(", ")}`,
    ...result.warnings.map((warning) => `warning: ${warning}`),
  ];
  printReport(lines);
  return 0;
}

/** `providers check`：校验 + 环境变量就绪 + 尽力探测（不进入单测）。 */
export async function runCheck(argv: string[]): Promise<number> {
  const { configFile } = parseApplyFlags(argv, "check");
  const connections = readProviderConfig(configFile);
  const lines = [`connections: ${connections.length}`];
  let degraded = 0;
  for (const entry of connections) {
    const key = providerKey(entry.id);
    const envName = entry.credentialRef
      ? envKeyFor(entry.id, "API_KEY")
      : undefined;
    const ready = envName ? Boolean(process.env[envName]) : true;
    lines.push(
      `- ${key} (${entry.provider}) baseUrl=${entry.baseUrl} wireApi=${entry.wireApi ?? "responses"} env=${envName ?? "无凭据引用（将走 Codex 交互登录）"}: ${ready ? "已就绪" : "环境变量缺失"}`,
    );
    if (!ready) degraded++;
    if (ready && envName) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5_000);
      try {
        const response = await fetch(
          `${entry.baseUrl.replace(/\/$/, "")}/models`,
          {
            headers: { Authorization: `Bearer ${process.env[envName]}` },
            signal: controller.signal,
          },
        );
        lines.push(
          `   探测 /models: HTTP ${response.status}${response.ok ? "" : "（非 2xx，尽力而为）"}`,
        );
        if (!response.ok) degraded++;
      } catch (error) {
        lines.push(
          `   探测 /models: 失败（${error instanceof Error ? error.message : String(error)}，尽力而为）`,
        );
        degraded++;
      } finally {
        clearTimeout(timer);
      }
    }
  }
  printReport(lines);
  return degraded === 0 ? 0 : 1;
}

/** `providers` 子命令分派；返回进程退出码。 */
export async function runProvidersCommand(argv: string[]): Promise<number> {
  const [sub] = argv;
  if (!sub) {
    printReport([
      "用法:",
      "  providers apply <config.json> [--active <connection-id>] [--catalog <id>] [--config-dir <dir>] [--dry-run]",
      "  providers apply-claude <config.json> [--config-dir <dir>] [--dry-run]",
      "  providers check <config.json>",
    ]);
    return 2;
  }
  try {
    if (sub === "apply") return runApply(argv.slice(1));
    if (sub === "apply-claude") return runApplyClaude(argv.slice(1));
    if (sub === "check") return await runCheck(argv.slice(1));
    printReport([`未知子命令: ${sub}`]);
    return 2;
  } catch (error) {
    printReport([
      `providers ${sub} 失败: ${error instanceof Error ? error.message : String(error)}`,
    ]);
    return 1;
  }
}
