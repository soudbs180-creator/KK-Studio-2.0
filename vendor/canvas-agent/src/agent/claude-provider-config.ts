/**
 * Claude Code settings.json 落盘（agent 侧接线层，TASK-PROV-004）。
 *
 * 把 Provider 渲染产物落进 Claude Code 用户配置：
 * - `CLAUDE_CONFIG_DIR || ~/.claude/settings.json` 保守 JSON 合并——只写
 *   `env.ANTHROPIC_BASE_URL`（baseUrl）与顶层 `model`（catalog slug），
 *   用户既有设置（permissions/hooks/env 其他键等）逐字段保留，幂等；
 * - 密钥纪律：settings.json 只写非密钥 baseUrl；认证密钥由宿主在启动
 *   agent 进程时以环境变量注入（claude.ts 子进程继承 agent env），绝不落盘；
 * - 原子写盘（目录 0700 / 文件 0600）。
 *
 * 复用 TASK-PROV-003 的 providerKey / parseModelWindow / assertNoSecrets /
 * parseProviderConfig / writeFileAtomic（源模块为权威，不复制逻辑）。
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
    assertNoSecrets,
    parseModelWindow,
    providerKey,
    writeFileAtomic,
    type ProviderConfigEntry,
} from "./codex-provider-config.js";

/** baseUrl 中内嵌 userinfo（如 https://user:pass@host）即视为凭据泄漏。 */
const URL_USERINFO = /^[a-z][a-z0-9+.-]*:\/\/[^/@\s]+@/i;

export interface ClaudeSettingsPatch {
    baseUrl: string;
    /** catalog slug（无后缀）；缺省不写顶层 model。 */
    model?: string;
}

/**
 * 保守 JSON 合并：只写受管键（env.ANTHROPIC_BASE_URL、顶层 model），
 * 其余字段深拷贝保留。空输入视为 {}；非法 JSON 抛错（不覆盖用户文件）。
 * 输出统一 2 空格缩进 + 末尾换行（JSON 无注释，整文件由本模块控制时规范化）。
 */
export function mergeClaudeSettingsJson(existing: string, patch: ClaudeSettingsPatch): string {
    if (URL_USERINFO.test(patch.baseUrl))
        throw new Error("baseUrl 不允许内嵌用户名/密码（userinfo）");
    // Windows 编辑器常写 UTF-8 BOM；JSON.parse 前剥除。
    const parsed: Record<string, unknown> = existing.replace(/^\uFEFF/, "").trim() === "" ? {} : JSON.parse(existing.replace(/^\uFEFF/, ""));
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
        throw new Error("settings.json 顶层必须是对象");
    const env: Record<string, unknown> =
        parsed.env && typeof parsed.env === "object" && !Array.isArray(parsed.env)
            ? { ...(parsed.env as Record<string, unknown>) }
            : {};
    env.ANTHROPIC_BASE_URL = patch.baseUrl;
    parsed.env = env;
    if (patch.model !== undefined) parsed.model = patch.model;
    const json = JSON.stringify(parsed, null, 2) + "\n";
    assertNoSecrets(json, "Claude settings.json 合并结果");
    return json;
}

export interface ApplyClaudeOptions {
    /** Claude 配置目录；缺省 = CLAUDE_CONFIG_DIR || ~/.claude。 */
    configDir?: string;
    /** 只渲染不写盘。 */
    dryRun?: boolean;
}

export interface ApplyClaudeResult {
    configPath: string;
    model?: string;
    providers: string[];
    warnings: string[];
    dryRun: boolean;
    /** 合并后的完整 settings.json 文本（无密钥形态，可安全展示）。 */
    settingsJson: string;
}

export function defaultClaudeConfigDir(): string {
    return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
}

/** 应用 Provider 配置到 Claude Code settings.json。 */
export function applyClaudeProviderConfig(
    connections: ProviderConfigEntry[],
    options: ApplyClaudeOptions = {},
): ApplyClaudeResult {
    const configDir = path.resolve(options.configDir || defaultClaudeConfigDir());
    const configPath = path.join(configDir, "settings.json");
    const warnings: string[] = [];
    const providers = connections.map((entry) => providerKey(entry.id));
    if (connections.length === 0) throw new Error("至少需要一个连接");
    const baseUrl = connections[0].baseUrl;
    if (connections.some((entry) => entry.baseUrl !== baseUrl))
        warnings.push(`多连接 baseUrl 不一致：settings.json 仅支持一个 ANTHROPIC_BASE_URL，以第一个连接（${baseUrl}）为准`);

    const withModel = connections.filter((entry) => entry.model);
    if (withModel.length === 0)
        warnings.push("没有连接带 model：未写 settings.json 的 model 字段，Claude 将使用其默认模型");
    const model = withModel[0] ? parseModelWindow(withModel[0].model!).slug : undefined;

    const existing = fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf8") : "";
    const settingsJson = mergeClaudeSettingsJson(existing, { baseUrl, model });

    if (!options.dryRun) writeFileAtomic(configPath, settingsJson, 0o600);

    return {
        configPath,
        model,
        providers,
        warnings,
        dryRun: Boolean(options.dryRun),
        settingsJson,
    };
}
