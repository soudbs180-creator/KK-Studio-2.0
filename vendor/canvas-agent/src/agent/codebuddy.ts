import { spawn } from "node:child_process";
import { stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const MAX_PROMPT_LENGTH = 3_000;
const MAX_OUTPUT_BYTES = 128 * 1024;
const DEFAULT_TIMEOUT_MS = 45_000;
let running = false;

export type CodeBuddyResult = {
    text: string;
    model?: string;
    durationMs: number;
};

/** The user selects a local CLI script, never a shell command or arbitrary executable. */
export async function validateCodeBuddyCliPath(value: string): Promise<string> {
    const cliPath = value.trim();
    if (!cliPath || cliPath.length > 2_048 || !path.isAbsolute(cliPath)) {
        throw new Error("请选择 CodeBuddy CLI 的本机绝对路径");
    }
    if (!/^codebuddy(?:\.js)?$/i.test(path.basename(cliPath))) {
        throw new Error("所选文件不是 CodeBuddy CLI 脚本");
    }
    const file = await stat(cliPath).catch(() => null);
    if (!file?.isFile()) throw new Error("CodeBuddy CLI 文件不存在或无法读取");
    return cliPath;
}

/** Run a single text-only request through the already logged-in CodeBuddy CLI. */
export async function runCodeBuddy(input: {
    cliPath: string;
    prompt: string;
    timeoutMs?: number;
    signal?: AbortSignal;
}): Promise<CodeBuddyResult> {
    if (running) throw new Error("CodeBuddy 正在处理上一任务，请稍后再试");
    running = true;
    try {
        const prompt = input.prompt.trim();
        if (!prompt || prompt.length > MAX_PROMPT_LENGTH) {
            throw new Error("CodeBuddy 问题为空或过长（最多 3000 字）");
        }
        if (input.signal?.aborted) throw new Error("CodeBuddy 请求已取消");
        const cliPath = await validateCodeBuddyCliPath(input.cliPath);
        const started = Date.now();
        const output = await invokeCli(cliPath, prompt, input.timeoutMs ?? DEFAULT_TIMEOUT_MS, input.signal);
        let parsed: unknown;
        try {
            parsed = JSON.parse(output);
        } catch {
            throw new Error("CodeBuddy 返回格式无效");
        }
        const finalEvents = Array.isArray(parsed)
            ? parsed.filter((event) => event && typeof event === "object" && event.type === "result")
            : [parsed];
        if (finalEvents.length !== 1) throw new Error("CodeBuddy 返回格式无效");
        const result = finalEvents[0] as { result?: unknown; model?: unknown; is_error?: unknown; subtype?: unknown };
        if (result?.is_error || result?.subtype === "error") throw new Error("CodeBuddy 未完成本次请求");
        if (typeof result?.result !== "string" || !result.result.trim()) {
            throw new Error("CodeBuddy 返回空回复");
        }
        if (result.result.length > 8_000) throw new Error("CodeBuddy 回复过长");
        return {
            text: result.result.trim(),
            ...(typeof result.model === "string" && result.model.length <= 200 ? { model: result.model } : {}),
            durationMs: Date.now() - started,
        };
    } finally {
        running = false;
    }
}

function childEnvironment(): NodeJS.ProcessEnv {
    const allowed = [
        "PATH", "Path", "HOME", "USERPROFILE", "HOMEDRIVE", "HOMEPATH",
        "APPDATA", "LOCALAPPDATA", "PROGRAMDATA", "SystemRoot", "SYSTEMROOT",
        "TEMP", "TMP", "XDG_CONFIG_HOME", "XDG_DATA_HOME", "LANG", "LC_ALL",
    ];
    const env: NodeJS.ProcessEnv = {};
    for (const key of allowed) if (process.env[key] !== undefined) env[key] = process.env[key];
    env.CODEBUDDY_CODE_DISABLE_BACKGROUND_TASKS = "1";
    return env;
}

function invokeCli(cliPath: string, prompt: string, timeoutMs: number, signal?: AbortSignal): Promise<string> {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [
            cliPath,
            "--print", "--output-format", "json",
            "--tools", "",
            "--permission-mode", "dontAsk",
            "--no-session-persistence",
            "--max-turns", "1",
            prompt,
        ], {
            cwd: os.tmpdir(), env: childEnvironment(), shell: false,
            windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
        });
        const chunks: Buffer[] = [];
        let bytes = 0;
        let failure = "";
        let settled = false;
        const timeout = setTimeout(() => {
            failure = "CodeBuddy 请求超时，已停止子进程";
            child.kill("SIGKILL");
        }, Math.max(1, Math.min(timeoutMs, 60_000)));
        const onAbort = () => {
            failure = "CodeBuddy 请求已取消";
            child.kill("SIGKILL");
        };
        signal?.addEventListener("abort", onAbort, { once: true });
        if (signal?.aborted) onAbort();
        const finish = (error?: Error, output?: string) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeout);
            signal?.removeEventListener("abort", onAbort);
            if (error) reject(error);
            else resolve(output ?? "");
        };
        child.stdout.on("data", (chunk: Buffer) => {
            bytes += chunk.length;
            if (bytes > MAX_OUTPUT_BYTES) {
                failure = "CodeBuddy 输出过大，已停止子进程";
                child.kill("SIGKILL");
                return;
            }
            chunks.push(chunk);
        });
        child.stderr.resume(); // Never return account details or CLI diagnostics to another model.
        child.once("error", () => finish(new Error("CodeBuddy CLI 启动失败")));
        child.once("close", (code) => {
            if (failure) return finish(new Error(failure));
            if (code !== 0) return finish(new Error(`CodeBuddy 异常退出（${code ?? "unknown"}）`));
            finish(undefined, Buffer.concat(chunks).toString("utf8"));
        });
    });
}
