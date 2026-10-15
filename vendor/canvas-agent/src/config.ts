import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { writeFileAtomic } from "./agent/codex-provider-config.js";

export const DEFAULT_PORT = 17371;
export const CONFIG_DIR = process.env.KK_AGENT_CONFIG_DIR || path.join(os.homedir(), ".infinite-canvas");
export const CONFIG_FILE = path.join(CONFIG_DIR, "canvas-agent.json");
export const VERSION = readPackageVersion();
export const AGENT_PROMPT = fs.readFileSync(new URL("../agent-instructions.md", import.meta.url), "utf8");
const initializedWorkspaces = new Set<string>();

export type SiteWorkspaceConfig = { workspacePath: string; activeThreadId?: string; pinnedThreadIds?: string[] };
export type CanvasAgentConfig = { url: string; token: string; origins?: string[]; workspace?: SiteWorkspaceConfig; codebuddy?: { cliPath: string } };

const configSchema = z.object({
    url: z.string().url(),
    token: z.string().optional(),
    origins: z.array(z.string()).optional(),
    workspace: z.object({
        workspacePath: z.string().min(1),
        activeThreadId: z.string().optional(),
        pinnedThreadIds: z.array(z.string()).optional(),
    }).passthrough().optional(),
    codebuddy: z.object({ cliPath: z.string().min(1) }).passthrough().optional(),
}).passthrough();

/** 读取本地 Canvas Agent 配置，不存在时生成默认配置。 */
export function loadConfig(create = false): CanvasAgentConfig {
    let raw: string;
    try {
        raw = fs.readFileSync(CONFIG_FILE, "utf8");
    } catch (error) {
        if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") {
            throw new Error("无法读取 Agent 配置，原文件已保留；请检查文件权限后重试。");
        }
        const config = { url: `http://127.0.0.1:${Number(process.env.PORT) || DEFAULT_PORT}`, token: process.env.CANVAS_AGENT_TOKEN || crypto.randomBytes(18).toString("hex") };
        if (create) saveConfig(config);
        return config;
    }
    let value: unknown;
    try {
        value = JSON.parse(raw);
    } catch {
        throw new Error("Agent 配置格式无效，原文件已保留；请恢复配置后重试。");
    }
    const parsed = configSchema.safeParse(value);
    if (!parsed.success) throw new Error("Agent 配置结构无效，原文件已保留；请恢复配置后重试。");
    return { ...parsed.data, token: process.env.CANVAS_AGENT_TOKEN || crypto.randomBytes(32).toString("hex") };
}

/** 将 Canvas Agent 配置写入用户配置目录。 */
export function saveConfig(config: CanvasAgentConfig) {
    writeConfigFile(CONFIG_DIR, CONFIG_FILE, { ...config, token: "" });
}

/** 写入配置并强制目录 0700、文件 0600，包括纠正已有宽松权限。 */
export function writeConfigFile(dir: string, file: string, config: CanvasAgentConfig) {
    if (!configSchema.safeParse(config).success) throw new Error("Agent 配置结构无效，原文件已保留。");
    const content = JSON.stringify(config, null, 2);
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    fs.chmodSync(dir, 0o700);
    writeFileAtomic(file, content, 0o600);
}

/** 确保站点级 Codex 工作空间存在并已初始化。 */
export function ensureSiteWorkspace(config: CanvasAgentConfig): SiteWorkspaceConfig {
    const current = config.workspace;
    if (current?.workspacePath) {
        const workspacePath = resolveWorkspacePath(current.workspacePath);
        initializeWorkspace(workspacePath);
        return { ...current, workspacePath };
    }
    const workspacePath = path.join(CONFIG_DIR, "codex-workspaces", "site");
    const workspace = { workspacePath };
    initializeWorkspace(workspacePath);
    saveConfig({ ...config, workspace });
    config.workspace = workspace;
    return workspace;
}

/** 更新站点级 Codex 工作空间配置。 */
export function updateSiteWorkspace(config: CanvasAgentConfig, patch: Partial<SiteWorkspaceConfig>) {
    const current = ensureSiteWorkspace(config);
    const workspacePath = patch.workspacePath ? resolveWorkspacePath(patch.workspacePath) : current.workspacePath;
    const next = { ...current, ...patch, workspacePath };
    initializeWorkspace(workspacePath);
    saveConfig({ ...config, workspace: next });
    config.workspace = next;
    return next;
}

/** 创建工作空间目录并写入默认 AGENTS.md。 */
function initializeWorkspace(workspacePath: string) {
    if (initializedWorkspaces.has(workspacePath)) return;
    fs.mkdirSync(workspacePath, { recursive: true });
    const instructionsFile = path.join(workspacePath, "AGENTS.md");
    const current = fs.existsSync(instructionsFile) ? fs.readFileSync(instructionsFile, "utf8") : "";
    if (!current || current.startsWith("# Infinite Canvas Agent")) fs.writeFileSync(instructionsFile, AGENT_PROMPT);
    initializedWorkspaces.add(workspacePath);
}

/** 将用户输入的工作空间路径解析为绝对路径。 */
function resolveWorkspacePath(value: string) {
    if (value === "~") return os.homedir();
    if (value.startsWith("~/")) return path.join(os.homedir(), value.slice(2));
    return path.resolve(value);
}

/** 从当前包信息中读取 Canvas Agent 版本号。 */
function readPackageVersion() {
    try {
        const pkg = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version?: string };
        return pkg.version || "0.0.0";
    } catch {
        return "0.0.0";
    }
}
