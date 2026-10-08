/**
 * Codex Provider 配置注入（agent 侧接线层，TASK-PROV-003）。
 *
 * 把 TASK-PROV-002 的渲染产物落进 Codex 真实配置：
 * - `[model_providers.kk_*]` 表渲染与保守 TOML 合并（只管理 kk_* 自有表与
 *   显式指定的顶层键，其余内容逐字节保留）；
 * - `model-catalogs/<profileId>.json` 落盘与相对路径指针；
 * - 密钥纪律：注入产物只含 env_key（环境变量名），绝不写密钥明文；
 *   文件目录 0700 / 文件 0600。
 *
 * 镜像说明：providerKey / envKeyFor / tomlQuote / assertNoSecrets / 后缀解析
 * 与 app 侧 `src/features/providers/providerTargetRenderers.ts` 和
 * `src/features/models/modelCatalogWindow.ts` 保持一致，源文件为权威。
 * 本模块为纯函数 + 落盘编排；HTTP 端点（与 TASK-AGENT-006 同文件冲突）与
 * per-thread model_provider 注入登记在 remaining。
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse as parseToml } from "smol-toml";
import { z } from "zod";

// ── 密钥防线（镜像 app 侧，源文件为权威）───────────────────────────────

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
export function connectionFingerprint(value: string): string {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(value)) {
    hash = BigInt.asUintN(64, (hash ^ BigInt(byte)) * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, "0");
}

export function providerKey(connectionId: string): string {
  if (!connectionId) throw new Error("连接 id 不能为空");
  const key = connectionId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
  return `kk_${key || "provider"}_${connectionFingerprint(connectionId)}`;
}

/** 凭据引用 → 接线层约定使用的环境变量名（值由宿主从系统凭据库注入）。 */
export function envKeyFor(connectionId: string, suffix: string): string {
  if (!connectionId) throw new Error("连接 id 不能为空");
  const stem = connectionId
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
  if (!/^[A-Z][A-Z0-9_]*$/.test(suffix)) throw new Error("环境变量后缀无效");
  return `KK_STUDIO_${stem || "PROVIDER"}_${connectionFingerprint(connectionId).toUpperCase()}_${suffix}`;
}

// ── 输入契约（便携配置 v1 最小形态，镜像 app 侧 providerConfigIO）─────

export const providerConfigEntrySchema = z.object({
  id: z.string().min(1).max(120),
  provider: z.string().min(1).max(80),
  displayName: z.string().min(1).max(80).optional(),
  baseUrl: z
    .string()
    .url()
    .refine((value) => {
      const url = new URL(value);
      return (
        ["http:", "https:"].includes(url.protocol) &&
        !url.username &&
        !url.password
      );
    }, "baseUrl 必须为 HTTP(S) 且不允许内嵌用户名/密码"),
  model: z.string().min(1).max(120).optional(),
  credentialRef: z.string().min(1).max(160).optional(),
  wireApi: z.literal("responses").optional(),
});
export type ProviderConfigEntry = z.infer<typeof providerConfigEntrySchema>;

export const providerConfigSchema = z.object({
  connections: z.array(providerConfigEntrySchema).max(16),
});
export type ProviderConfigFile = z.infer<typeof providerConfigSchema>;

/** 接受裸数组或 { connections: [...] } 两种形态。 */
export function parseProviderConfig(raw: unknown): ProviderConfigEntry[] {
  const input = Array.isArray(raw) ? { connections: raw } : raw;
  const parsed = providerConfigSchema.parse(input);
  for (const entry of parsed.connections)
    assertNoSecrets(entry, "Provider 配置");
  return parsed.connections;
}

// ── Codex provider 表渲染 ───────────────────────────────────────────────

export const wireApiSchema = z.literal("responses");
export type WireApi = z.infer<typeof wireApiSchema>;

export interface CodexProviderBlock {
  providerKey: string;
  name: string;
  baseUrl: string;
  envKey?: string;
  wireApi: WireApi;
}

/** TOML 双引号字符串：JSON quoting also escapes newlines and controls. */
export function tomlQuote(value: string): string {
  return JSON.stringify(value);
}

/** 渲染 `[model_providers.kk_*]` 表（顶层键由合并层按 active 处理）。 */
export function serializeCodexProviderTable(block: CodexProviderBlock): string {
  const lines: string[] = [];
  lines.push(`[model_providers.${block.providerKey}]`);
  lines.push(`name = ${tomlQuote(block.name)}`);
  lines.push(`base_url = ${tomlQuote(block.baseUrl)}`);
  if (block.envKey) lines.push(`env_key = ${tomlQuote(block.envKey)}`);
  lines.push(`wire_api = ${tomlQuote(block.wireApi)}`);
  return lines.join("\n");
}

// ── TOML 保守合并 ────────────────────────────────────────────────────────

export interface CodexTomlPatch {
  /** 期望的 kk_* provider 集合（含期望顺序）；不在集合中的历史 kk_* 表会被移除。 */
  providers: CodexProviderBlock[];
  /** 写顶层 model_provider / model（model 为 catalog 中的 slug，无后缀）。 */
  active?: { providerKey: string; model: string };
  /** 写顶层 model_catalog_json（相对路径指针）。 */
  modelCatalogJson?: string;
}

const PROVIDER_KEY_PATTERN = /^kk_[a-z0-9_]+$/;

interface TomlSection {
  headerIndex: number;
  bodyEnd: number;
  providerKey?: string;
}

interface TomlLexState {
  quote: "'" | '"' | null;
  multiline: boolean;
  arrayDepth: number;
}

/** Locate structural lines without interpreting text inside strings/arrays. */
function scanTomlLine(line: string, state: TomlLexState) {
  const structural = state.quote === null && state.arrayDepth === 0;
  let equal = -1;
  let comment = -1;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (state.quote) {
      if (state.quote === '"' && ch === "\\") {
        i++;
      } else if (ch === state.quote) {
        if (state.multiline) {
          let count = 1;
          while (line[i + count] === ch) count++;
          if (count >= 3) {
            state.quote = null;
            state.multiline = false;
          }
          i += count - 1;
        } else {
          state.quote = null;
        }
      }
    } else if (ch === "#") {
      comment = i;
      break;
    } else if (ch === '"' || ch === "'") {
      state.quote = ch;
      state.multiline = line.slice(i, i + 3) === ch.repeat(3);
      if (state.multiline) i += 2;
    } else if (ch === "[") {
      state.arrayDepth++;
    } else if (ch === "]") {
      state.arrayDepth--;
    } else if (ch === "=" && state.arrayDepth === 0 && equal < 0) {
      equal = i;
    }
  }
  return { structural, equal, comment };
}

function parseConfigToml(value: string, label: string) {
  try {
    return parseToml(value);
  } catch {
    // Parser diagnostics can contain the original config (including secrets).
    throw new Error(`${label} TOML 无效；未写入配置，请先修复原文件`);
  }
}

function sectionProviderKey(header: string): string | undefined {
  const marker = "__kk_section_marker__";
  const parsed = parseConfigToml(`${header}\n${marker} = true\n`, "配置表头");
  const providers = parsed.model_providers;
  if (!providers || typeof providers !== "object" || Array.isArray(providers))
    return;
  for (const [key, table] of Object.entries(providers)) {
    if (
      PROVIDER_KEY_PATTERN.test(key) &&
      table &&
      typeof table === "object" &&
      !Array.isArray(table) &&
      Object.hasOwn(table, marker)
    )
      return key;
  }
}

/** 从值文本中剥离行尾注释（跳过引号内的 #）。 */
export function splitTrailingComment(value: string): {
  value: string;
  comment?: string;
} {
  const state: TomlLexState = { quote: null, multiline: false, arrayDepth: 0 };
  let offset = 0;
  for (const line of value.split(/\r\n|\n/)) {
    const { comment } = scanTomlLine(line, state);
    if (comment >= 0) {
      const i = offset + comment;
      return {
        value: value.slice(0, i).trimEnd(),
        comment: value.slice(i).trimEnd(),
      };
    }
    offset +=
      line.length +
      (value.slice(offset + line.length).startsWith("\r\n") ? 2 : 1);
  }
  return { value: value.trimEnd() };
}

/**
 * 保守行级合并：只管理 `[model_providers.kk_*]` 自有表与 patch 显式给出的
 * 顶层键（model_provider / model / model_catalog_json），其余内容逐字节保留。
 * 幂等：对同一输入 + 同一 patch 应用两次结果一致。
 */
export function mergeCodexConfigToml(
  existing: string,
  patch: CodexTomlPatch,
): string {
  const keys = new Set<string>();
  for (const block of patch.providers) {
    if (!PROVIDER_KEY_PATTERN.test(block.providerKey))
      throw new Error(`非法 providerKey: ${block.providerKey}`);
    if (keys.has(block.providerKey)) throw new Error("重复 providerKey");
    keys.add(block.providerKey);
  }
  if (
    patch.active &&
    (!keys.has(patch.active.providerKey) || !patch.active.model?.trim())
  )
    throw new Error("active 必须指定本次配置中的有效 provider 和 model");
  const parsed = parseConfigToml(existing, "原配置");
  const currentProvider = parsed.model_provider;
  if (
    typeof currentProvider === "string" &&
    PROVIDER_KEY_PATTERN.test(currentProvider) &&
    !keys.has(currentProvider) &&
    !patch.active
  )
    throw new Error("当前 provider 将被删除；请通过 active 显式选择有效连接");
  const eol = existing.includes("\r\n") ? "\r\n" : "\n";
  const lines = existing === "" ? [] : existing.split(/\r\n|\n/);
  const hasTrailingEol = lines.length > 0 && lines[lines.length - 1] === "";
  if (hasTrailingEol) lines.pop();

  // 1. 分节：顶层区 + sections
  const sections: TomlSection[] = [];
  const lexical: ReturnType<typeof scanTomlLine>[] = [];
  const state: TomlLexState = { quote: null, multiline: false, arrayDepth: 0 };
  let topLevelEnd = lines.length;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    const info = scanTomlLine(lines[i], state);
    lexical.push(info);
    if (info.structural && trimmed.startsWith("[")) {
      if (sections.length === 0) topLevelEnd = i;
      sections.push({
        headerIndex: i,
        bodyEnd: i + 1,
        providerKey: sectionProviderKey(trimmed),
      });
    } else if (sections.length > 0) {
      sections[sections.length - 1].bodyEnd = i + 1;
    }
  }

  // 2. 渲染新块
  const rendered = new Map<string, string[]>();
  for (const block of patch.providers) {
    rendered.set(
      block.providerKey,
      serializeCodexProviderTable(block).split("\n"),
    );
  }

  // 3. 顶层区：原位替换受管键（保留行尾注释），缺失则追加
  const topKeys: Record<string, string> = {};
  if (patch.active) {
    topKeys.model_provider = patch.active.providerKey;
    topKeys.model = patch.active.model;
  }
  if (patch.modelCatalogJson !== undefined)
    topKeys.model_catalog_json = patch.modelCatalogJson;
  const replaced = new Set<string>();
  const omitted = new Set<number>();
  for (let i = 0; i < topLevelEnd; i++) {
    const { structural, equal: eq } = lexical[i];
    if (!structural || eq < 0) continue;
    const keyValue = parseConfigToml(
      `${lines[i].slice(0, eq)}= true`,
      "配置键",
    );
    const [key] = Object.keys(keyValue);
    if (keyValue[key] !== true) continue;
    if (!Object.hasOwn(topKeys, key) || replaced.has(key)) continue;
    const before = lines[i].slice(0, eq).trimEnd();
    let end = i + 1;
    while (end < topLevelEnd && !lexical[end].structural) {
      omitted.add(end);
      end++;
    }
    const after = lines
      .slice(i, end)
      .join(eol)
      .slice(eq + 1);
    const { comment } = splitTrailingComment(after);
    lines[i] =
      `${before} = ${tomlQuote(topKeys[key])}${comment ? ` ${comment}` : ""}`;
    replaced.add(key);
  }
  const out: string[] = lines
    .slice(0, topLevelEnd)
    .filter((_, index) => !omitted.has(index));
  for (const [key, value] of Object.entries(topKeys)) {
    if (!replaced.has(key)) out.push(`${key} = ${tomlQuote(value)}`);
  }

  // 4. 各 section：自有表按 patch 替换/删除，其余原样
  const consumed = new Set<string>();
  for (const section of sections) {
    if (!section.providerKey) {
      out.push(...lines.slice(section.headerIndex, section.bodyEnd));
      continue;
    }
    const key = section.providerKey;
    const block = rendered.get(key);
    if (block) {
      // 自有表统一布局：上一行非空时补一个空行分隔（保证幂等）
      if (out.length > 0 && out[out.length - 1] !== "") out.push("");
      out.push(...block);
      consumed.add(key);
    }
    // 历史 kk_* 不在 patch 中 → 整表删除
  }

  // 5. 追加尚未落盘的 patch 表（保持 patch 顺序）
  for (const block of patch.providers) {
    if (consumed.has(block.providerKey)) continue;
    if (out.length > 0 && out[out.length - 1] !== "") out.push("");
    out.push(...rendered.get(block.providerKey)!);
  }

  let result = out.join(eol);
  if (hasTrailingEol || existing === "") result += eol;
  parseConfigToml(result, "合并结果");
  return result;
}

// ── model catalog（镜像 app 侧 modelCatalogWindow）───────────────────────

const WINDOW_SUFFIX = /^(.+?)\[(\d+(?:\.\d+)?)\s*([KkMm])?\]$/;
const UNITS: Record<string, number> = { k: 1000, m: 1_000_000 };

export function parseModelWindow(modelId: string): {
  slug: string;
  contextWindow?: number;
} {
  const trimmed = modelId.trim();
  const match = WINDOW_SUFFIX.exec(trimmed);
  if (!match) return { slug: trimmed };
  const [, slug, raw, unit] = match;
  if (!slug) return { slug: trimmed };
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return { slug: trimmed };
  const scale = unit ? (UNITS[unit.toLowerCase()] ?? 1) : 1;
  const contextWindow = Math.floor(value * scale);
  if (contextWindow <= 0) return { slug: trimmed };
  return { slug, contextWindow };
}

export interface CatalogModelEntry {
  slug: string;
  display_name: string;
  context_window?: number;
  max_context_window?: number;
  auto_compact_token_limit: null;
  priority?: number;
}

/** 由连接集合构建 catalog 条目（仅带 model 的连接参与）。 */
export function buildModelCatalog(
  entries: Array<{ model: string; displayName?: string; priority?: number }>,
): CatalogModelEntry[] {
  return entries.map((input) => {
    const { slug, contextWindow } = parseModelWindow(input.model);
    const entry: CatalogModelEntry = {
      slug,
      display_name: input.displayName?.trim().slice(0, 120) || slug,
      auto_compact_token_limit: null,
    };
    if (contextWindow !== undefined) {
      entry.context_window = contextWindow;
      entry.max_context_window = contextWindow;
    }
    if (input.priority !== undefined) entry.priority = input.priority;
    return entry;
  });
}

/** 生成 model-catalogs/<profileId>.json 的 payload 与相对路径指针。 */
export function buildModelCatalogJson(
  profileId: string,
  entries: Array<{ model: string; displayName?: string; priority?: number }>,
): { path: string; json: string } {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(profileId))
    throw new Error("catalog profile id 必须是安全文件名");
  return {
    path: `model-catalogs/${profileId}.json`,
    json: JSON.stringify(buildModelCatalog(entries), null, 2),
  };
}

// ── 落盘编排 ─────────────────────────────────────────────────────────────

export interface ApplyProviderOptions {
  /** Codex 配置目录；缺省 = CODEX_HOME || ~/.codex。 */
  configDir?: string;
  /** 存在则写 model-catalogs/<profileId>.json 并挂顶层相对指针。 */
  catalogProfileId?: string;
  /** Only an explicit selection may replace the user's root model choice. */
  activeConnectionId?: string;
  /** 只渲染与合并，不写盘。 */
  dryRun?: boolean;
}

export interface ApplyProviderResult {
  configPath: string;
  catalogPath?: string;
  providers: string[];
  warnings: string[];
  dryRun: boolean;
  /** 合并后的完整 config.toml 文本（无密钥形态，可安全展示）。 */
  configToml: string;
}

export function defaultCodexConfigDir(): string {
  return process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
}

/** 原子写盘：临时文件 + rename，目录 0700、文件 0600。 */
export function writeFileAtomic(
  file: string,
  content: string,
  mode: number,
): void {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const tmp = path.join(dir, `.${path.basename(file)}.tmp-${process.pid}`);
  fs.writeFileSync(tmp, content, { mode });
  fs.renameSync(tmp, file);
  try {
    fs.chmodSync(file, mode);
  } catch {
    // Windows 上 chmod 为近似语义，失败不阻塞（文件已按 mode 创建）。
  }
}

/** 应用 Provider 配置到 Codex（合并 config.toml + 可选 catalog 落盘）。 */
export function applyCodexProviderConfig(
  connections: ProviderConfigEntry[],
  options: ApplyProviderOptions = {},
): ApplyProviderResult {
  const validated = parseProviderConfig(connections);
  const configDir = path.resolve(options.configDir || defaultCodexConfigDir());
  const configPath = path.join(configDir, "config.toml");
  const warnings: string[] = [];

  const blocks: CodexProviderBlock[] = validated.map((entry) => {
    const key = providerKey(entry.id);
    const block: CodexProviderBlock = {
      providerKey: key,
      name: entry.displayName || entry.provider,
      baseUrl: entry.baseUrl,
      wireApi: entry.wireApi ?? "responses",
    };
    if (entry.credentialRef) block.envKey = envKeyFor(entry.id, "API_KEY");
    return block;
  });

  const withModel = validated.filter((entry) => entry.model);
  if (withModel.length === 0 && validated.length > 0)
    warnings.push("没有连接带 model：保留 Codex 现有默认模型");
  const activeEntry = options.activeConnectionId
    ? validated.find((entry) => entry.id === options.activeConnectionId)
    : undefined;
  if (options.activeConnectionId && !activeEntry?.model)
    throw new Error("指定的 active 连接不存在或没有 model");
  const active = activeEntry
    ? {
        providerKey: providerKey(activeEntry.id),
        model: parseModelWindow(activeEntry.model!).slug,
      }
    : undefined;

  let catalogPath: string | undefined;
  let modelCatalogJson: string | undefined;
  let catalogJson: string | undefined;
  if (options.catalogProfileId) {
    const catalog = buildModelCatalogJson(
      options.catalogProfileId,
      withModel.map((entry) => ({
        model: entry.model!,
        displayName: entry.displayName || entry.provider,
      })),
    );
    if (catalog.json !== "[]") {
      catalogPath = path.join(configDir, catalog.path);
      modelCatalogJson = catalog.path;
      catalogJson = catalog.json;
    } else {
      warnings.push(
        "catalogProfileId 已指定但没有带 model 的连接，跳过 catalog 落盘",
      );
    }
  }

  const existing = fs.existsSync(configPath)
    ? fs.readFileSync(configPath, "utf8")
    : "";
  const configToml = mergeCodexConfigToml(existing, {
    providers: blocks,
    active,
    modelCatalogJson,
  });
  assertNoSecrets(configToml, "Codex config.toml 合并结果");

  if (!options.dryRun) {
    if (catalogPath && catalogJson)
      writeFileAtomic(catalogPath, catalogJson, 0o600);
    writeFileAtomic(configPath, configToml, 0o600);
  }

  return {
    configPath,
    catalogPath,
    providers: blocks.map((block) => block.providerKey),
    warnings,
    dryRun: Boolean(options.dryRun),
    configToml,
  };
}
