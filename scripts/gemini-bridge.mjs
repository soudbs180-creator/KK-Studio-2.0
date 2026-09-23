#!/usr/bin/env node
/**
 * scripts/gemini-bridge.mjs — 极简本地桥,代理 Gemini CLI(Google 账号登录,免 API Key)。
 *
 * - GET  /status            → { installed, version?, login }
 * - POST /chat              → body { prompt, resumeSessionId?, model? } → { text, sessionId?, error? }
 * - 仅监听 127.0.0.1;请求体 ≤ 1 MiB;CORS 允许本机来源。
 * - Windows 通过 npm 全局 @google/gemini-cli 的 bin 入口以 node 进程方式执行,避免 shell 注入。
 *
 * 用法: node scripts/gemini-bridge.mjs [--port 1424]
 */
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { readFile } from "node:fs/promises";

const DEFAULT_PORT = 1424;
const MAX_BODY_BYTES = 1024 * 1024;
const PROBE_TIMEOUT_MS = 30000;
const CHAT_TIMEOUT_MS = 180000;
const LOGIN_HINTS =
  /(log\s*in|sign\s*in|authenticate|authentication|credential)/i;

function capture(child) {
  return new Promise((resolve) => {
    let stdout = "",
      stderr = "";
    child.stdout?.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) =>
      resolve({
        ok: false,
        code: "spawn",
        message: error.message,
        stdout,
        stderr,
      }),
    );
    child.on("close", (code, signal) =>
      resolve({
        ok: code === 0,
        code: code ?? "signal:" + signal,
        message: "",
        stdout,
        stderr,
      }),
    );
  });
}

function quoteShellArg(value) {
  return '"' + String(value).replace(/(["\\\r\n])/g, "\\$1") + '"';
}

/**
 * 定位 gemini 可执行。
 * win32: 优先经 `npm root -g` 找到 @google/gemini-cli 的 bin 入口,用 node 直接执行(无 shell,零注入);
 *        解析失败回退 cmd /c "gemini ..."(参数引号转义)。
 * 其他平台: 直接 spawn("gemini")。
 */
async function resolveGeminiInvocation(ctx) {
  if (process.platform !== "win32")
    return {
      kind: "bin",
      command: "gemini",
      args: [],
      viaShell: false,
      shellArgs: () => [],
    };
  try {
    const rootResult = await runOnce(
      ctx,
      { command: "npm", args: [], viaShell: false, shellArgs: () => [] },
      ["root", "-g"],
      { timeoutMs: 15000 },
    );
    if (!rootResult.ok) throw new Error("npm root -g failed");
    const root = rootResult.stdout.trim();
    const pkgPath = join(root, "@google", "gemini-cli", "package.json");
    const pkg = JSON.parse(await ctx.readFile(pkgPath, "utf8"));
    const bin = pkg.bin;
    const binPath = typeof bin === "string" ? bin : bin?.gemini;
    if (!binPath) throw new Error("no gemini bin");
    return {
      kind: "node",
      command: process.execPath,
      args: [join(root, "@google", "gemini-cli", binPath)],
      viaShell: false,
      shellArgs: () => [],
    };
  } catch {
    return {
      kind: "shell",
      command: process.env.ComSpec || "cmd.exe",
      args: [],
      viaShell: true,
      shellArgs: (args) => [
        "/d",
        "/s",
        "/c",
        "gemini " + args.map(quoteShellArg).join(" "),
      ],
    };
  }
}

function runOnce(ctx, invocation, args, { timeoutMs = 30000, signal } = {}) {
  const child = invocation.viaShell
    ? ctx.spawn(invocation.command, invocation.shellArgs(args), {
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      })
    : ctx.spawn(invocation.command, [...invocation.args, ...args], {
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      });
  const timer = setTimeout(() => {
    child.kill();
  }, timeoutMs);
  const onAbort = () => child.kill();
  signal?.addEventListener("abort", onAbort, { once: true });
  return capture(child).finally(() => {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  });
}

function parseGeminiJson(text) {
  try {
    const value = JSON.parse(text);
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

async function probeLogin(ctx, invocation) {
  const probe = await runOnce(
    ctx,
    invocation,
    ["-p", "ping", "--output-format", "json", "-m", "gemini-2.5-flash"],
    { timeoutMs: PROBE_TIMEOUT_MS },
  );
  if (!probe.ok) return false;
  const parsed = parseGeminiJson(probe.stdout.trim());
  if (!parsed) return false;
  if (
    typeof parsed.error === "object" &&
    parsed.error &&
    LOGIN_HINTS.test(JSON.stringify(parsed.error))
  )
    return false;
  return typeof parsed.response === "string" || Array.isArray(parsed.items);
}

export function createGeminiBridge(options = {}) {
  const port = options.port ?? DEFAULT_PORT;
  const timeoutMs = options.timeoutMs ?? CHAT_TIMEOUT_MS;
  const ctx = {
    spawn: options.spawnImpl ?? spawn,
    readFile: options.readFileImpl ?? readFile,
  };
  let invocationPromise;
  const getInvocation = () =>
    (invocationPromise ??= resolveGeminiInvocation(ctx));

  async function handleStatus() {
    const invocation = await getInvocation();
    const version = await runOnce(ctx, invocation, ["--version"], {
      timeoutMs: 15000,
    });
    if (version.code === "spawn") return { installed: false, login: false };
    const login = await probeLogin(ctx, invocation);
    return {
      installed: true,
      version: version.ok ? version.stdout.trim().split(/\r?\n/)[0] : undefined,
      login,
    };
  }

  async function handleChat(body) {
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt || prompt.length > 30000)
      return {
        error: { code: "invalid", message: "prompt 缺失或超过 30000 字。" },
      };
    const model =
      typeof body.model === "string" && body.model.trim()
        ? body.model.trim()
        : undefined;
    const resumeSessionId =
      typeof body.resumeSessionId === "string" && body.resumeSessionId.trim()
        ? body.resumeSessionId.trim()
        : undefined;
    const invocation = await getInvocation();
    const args = ["-p", prompt, "--output-format", "json"];
    if (model) args.push("-m", model);
    if (resumeSessionId) args.push("--resume", resumeSessionId);
    const result = await runOnce(ctx, invocation, args, { timeoutMs });
    const parsed = parseGeminiJson(result.stdout.trim());
    if (!result.ok && !parsed) {
      const hint = LOGIN_HINTS.test(result.stderr + result.stdout)
        ? "Gemini CLI 未登录,请先在终端运行 gemini 并选择 Login with Google。"
        : "gemini 执行失败,请检查安装与登录状态。";
      return { error: { code: "failed", message: hint } };
    }
    if (!parsed)
      return {
        error: {
          code: "failed",
          message: "gemini 输出无法解析,请检查 CLI 版本。",
        },
      };
    if (typeof parsed.error === "object" && parsed.error) {
      const raw = JSON.stringify(parsed.error);
      return {
        error: {
          code: LOGIN_HINTS.test(raw) ? "not-logged-in" : "failed",
          message: LOGIN_HINTS.test(raw)
            ? "Gemini CLI 未登录,请先在终端运行 gemini 并选择 Login with Google。"
            : "gemini 返回错误,请检查额度与账号状态。",
        },
      };
    }
    const text =
      typeof parsed.response === "string"
        ? parsed.response
        : Array.isArray(parsed.items)
          ? parsed.items
              .filter(
                (item) =>
                  item?.type === "text" && typeof item.text === "string",
              )
              .map((item) => item.text)
              .join("\n")
          : "";
    if (!text.trim())
      return { error: { code: "empty", message: "gemini 未返回文字内容。" } };
    const sessionId =
      (typeof parsed.sessionId === "string" && parsed.sessionId) ||
      (typeof parsed.stats?.sessionId === "string" && parsed.stats.sessionId) ||
      (typeof parsed.response?.sessionId === "string" &&
        parsed.response.sessionId) ||
      undefined;
    return { text, ...(sessionId ? { sessionId } : {}) };
  }

  const server = createServer((req, res) => {
    const headers = {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type",
      "cache-control": "no-store",
    };
    const send = (status, payload) => {
      res.writeHead(status, headers);
      res.end(JSON.stringify(payload));
    };
    if (req.method === "OPTIONS") return send(204, {});
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (req.method === "GET" && url.pathname === "/status")
      return handleStatus().then(
        (payload) => send(200, payload),
        (error) =>
          send(500, {
            error: { code: "failed", message: String(error?.message ?? error) },
          }),
      );
    if (req.method === "POST" && url.pathname === "/chat") {
      let size = 0;
      const chunks = [];
      req.on("data", (chunk) => {
        size += chunk.length;
        if (size > MAX_BODY_BYTES) {
          res.writeHead(413, headers);
          res.end(
            JSON.stringify({
              error: { code: "too-large", message: "请求体超过 1 MiB。" },
            }),
          );
          req.destroy();
          return;
        }
        chunks.push(chunk);
      });
      req.on("end", () => {
        let body;
        try {
          body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        } catch {
          return send(400, {
            error: { code: "invalid", message: "请求体不是合法 JSON。" },
          });
        }
        return handleChat(body).then(
          (payload) => send(payload.error ? 400 : 200, payload),
          (error) =>
            send(500, {
              error: {
                code: "failed",
                message: String(error?.message ?? error),
              },
            }),
        );
      });
      return;
    }
    return send(404, { error: { code: "not-found", message: "未知端点。" } });
  });

  return {
    server,
    async listen() {
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, "127.0.0.1", resolve);
      });
      return port;
    },
    close() {
      return new Promise((resolve) => {
        server.closeAllConnections?.();
        server.close(resolve);
      });
    },
    handleStatus,
    handleChat,
  };
}

if (
  process.argv[1] &&
  import.meta.url ===
    new URL(`file://${process.argv[1].replaceAll("\\", "/")}`).href
) {
  const portArg = process.argv.indexOf("--port");
  const port = portArg >= 0 ? Number(process.argv[portArg + 1]) : DEFAULT_PORT;
  createGeminiBridge({ port })
    .listen()
    .then((actual) =>
      console.log(`Gemini CLI 桥已启动: http://127.0.0.1:${actual} (仅本机)`),
    )
    .catch((error) => {
      console.error("Gemini CLI 桥启动失败:", error.message);
      process.exit(1);
    });
}
