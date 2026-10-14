#!/usr/bin/env node
/**
 * scripts/gemini-bridge.mjs — 极简本地桥,代理 Gemini CLI(Google 账号登录,免 API Key)。
 *
 * - GET  /health            → 免费进程健康检查（不启动 CLI 或模型请求）。
 * - GET  /status            → { installed, version?, login, loginStatus? }
 * - POST /chat              → body { prompt, resumeSessionId?, model? } → { text, sessionId?, error? }
 * - 仅监听 127.0.0.1;请求体 ≤ 1 MiB;CORS 允许本机来源。
 * - Windows 通过 npm 全局 @google/gemini-cli 的 bin 入口以 node 进程方式执行,避免 shell 注入。
 *
 * 用法: node scripts/gemini-bridge.mjs [--port 1424]
 */
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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

/**
 * 定位 gemini 可执行。
 * win32: 优先经 `npm root -g` 找到 @google/gemini-cli 的 bin 入口,用 node 直接执行(无 shell,零注入);
 *        定位失败明确报未安装,不把用户输入送入 cmd.exe。
 * 其他平台: 直接 spawn("gemini")。
 */
async function resolveGeminiInvocation(ctx) {
  if (process.platform !== "win32")
    return {
      kind: "bin",
      command: "gemini",
      args: [],
    };
  try {
    const npmCli = join(
      dirname(process.execPath),
      "node_modules",
      "npm",
      "bin",
      "npm-cli.js",
    );
    const rootResult = await runOnce(
      ctx,
      { command: process.execPath, args: [npmCli] },
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
    };
  } catch {
    return null;
  }
}

function runOnce(ctx, invocation, args, { timeoutMs = 30000, signal } = {}) {
  if (signal?.aborted)
    return Promise.resolve({
      ok: false,
      code: "aborted",
      message: "",
      stdout: "",
      stderr: "",
    });
  const child = ctx.spawn(invocation.command, [...invocation.args, ...args], {
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

async function probeLogin(ctx, invocation, signal) {
  const probe = await runOnce(
    ctx,
    invocation,
    ["-p", "ping", "--output-format", "json", "-m", "gemini-2.5-flash"],
    { timeoutMs: PROBE_TIMEOUT_MS, signal },
  );
  const parsed = parseGeminiJson(probe.stdout.trim());
  if (
    (parsed?.error && LOGIN_HINTS.test(JSON.stringify(parsed.error))) ||
    (!probe.ok && LOGIN_HINTS.test(probe.stderr))
  )
    return "required";
  if (!probe.ok || !parsed || parsed.error) return "unknown";
  return typeof parsed.response === "string" || Array.isArray(parsed.items)
    ? "verified"
    : "unknown";
}

function admitBridgeRequest(req, actualPort) {
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "cache-control": "no-store",
    vary: "Origin",
  };
  const origin = req.headers.origin;
  const allowedOrigins = new Set([
    "http://localhost:1421",
    "http://127.0.0.1:1421",
    "http://localhost:1423",
    "http://127.0.0.1:1423",
    "http://tauri.localhost",
    "tauri://localhost",
  ]);
  if (origin && allowedOrigins.has(origin))
    headers["access-control-allow-origin"] = origin;
  const allowedHosts = new Set([
    `127.0.0.1:${actualPort}`,
    `localhost:${actualPort}`,
  ]);
  if (!allowedHosts.has(req.headers.host?.toLowerCase()))
    return { headers, error: "Host 不受信任。" };
  if (origin && !allowedOrigins.has(origin))
    return { headers, error: "来源不受信任。" };
  if (
    !origin &&
    (req.headers["sec-fetch-site"] || req.headers["sec-fetch-mode"])
  )
    return { headers, error: "浏览器请求缺少可信来源。" };
  return { headers, error: null };
}

export function createGeminiBridge(options = {}) {
  const port = options.port ?? DEFAULT_PORT;
  const ownerNonce = options.ownerNonce ?? "";
  if (ownerNonce && !/^[a-f0-9]{64}$/.test(ownerNonce))
    throw new Error("托管桥归属标识无效。");
  const activeRequests = new Set();
  let closing = false;
  const timeoutMs = options.timeoutMs ?? CHAT_TIMEOUT_MS;
  const ctx = {
    spawn: options.spawnImpl ?? spawn,
    readFile: options.readFileImpl ?? readFile,
  };
  // Installation can change while this bridge stays alive; never cache absence.
  const getInvocation = () => resolveGeminiInvocation(ctx);

  async function handleStatus({ signal } = {}) {
    const invocation = await getInvocation();
    if (!invocation) return { installed: false, login: false };
    const version = await runOnce(ctx, invocation, ["--version"], {
      timeoutMs: 15000,
      signal,
    });
    if (version.code === "spawn") return { installed: false, login: false };
    const loginStatus = await probeLogin(ctx, invocation, signal);
    return {
      installed: true,
      version: version.ok ? version.stdout.trim().split(/\r?\n/)[0] : undefined,
      login: loginStatus === "verified",
      loginStatus,
    };
  }

  async function handleChat(body, { signal } = {}) {
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
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
    if (
      (model && !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,127}$/.test(model)) ||
      (resumeSessionId &&
        !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(resumeSessionId))
    )
      return {
        error: { code: "invalid", message: "model 或会话 ID 格式无效。" },
      };
    const invocation = await getInvocation();
    if (!invocation)
      return {
        error: {
          code: "not-installed",
          message: "未找到 Gemini CLI 的 Node 入口。",
        },
      };
    const args = [`--prompt=${prompt}`, "--output-format=json"];
    if (model) args.push(`--model=${model}`);
    if (resumeSessionId) args.push(`--resume=${resumeSessionId}`);
    const result = await runOnce(ctx, invocation, args, { timeoutMs, signal });
    if (signal?.aborted)
      return { error: { code: "cancelled", message: "请求已停止。" } };
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
      (typeof parsed.session_id === "string" && parsed.session_id) ||
      (typeof parsed.sessionId === "string" && parsed.sessionId) ||
      (typeof parsed.stats?.sessionId === "string" && parsed.stats.sessionId) ||
      (typeof parsed.response?.sessionId === "string" &&
        parsed.response.sessionId) ||
      undefined;
    return { text, ...(sessionId ? { sessionId } : {}) };
  }

  function runtimeResponse(req, pathname) {
    const ownedRequest =
      ownerNonce && req.headers["x-kk-bridge-owner"] === ownerNonce;
    if (req.method === "GET" && pathname === "/health") {
      if (ownerNonce && !ownedRequest)
        return {
          status: 403,
          payload: {
            error: { code: "forbidden", message: "桥归属检查失败。" },
          },
        };
      return {
        status: 200,
        payload: {
          ok: true,
          service: "kk-gemini-bridge",
          owned: Boolean(ownerNonce),
          pid: process.pid,
          ...(ownerNonce ? { nonce: ownerNonce } : {}),
        },
      };
    }
    if (req.method === "POST" && pathname === "/runtime/shutdown") {
      if (!ownedRequest)
        return {
          status: 403,
          payload: {
            error: { code: "forbidden", message: "桥归属检查失败。" },
          },
        };
      if (activeRequests.size)
        return {
          status: 409,
          payload: {
            error: {
              code: "busy",
              message: "桥仍有请求，请先取消检测或对话。",
            },
          },
        };
      // Atomically refuse new paid work before the Native owner closes its Job.
      closing = true;
      return { status: 200, payload: { ok: true } };
    }
    return null;
  }

  const server = createServer((req, res) => {
    const { headers, error: admissionError } = admitBridgeRequest(
      req,
      server.address()?.port,
    );
    const send = (status, payload) => {
      if (res.destroyed) return;
      res.writeHead(status, headers);
      res.end(JSON.stringify(payload));
    };
    if (admissionError)
      return send(403, {
        error: { code: "forbidden", message: admissionError },
      });
    const operation = new AbortController();
    const cancel = () => {
      if (!res.writableEnded) operation.abort();
    };
    req.on("aborted", cancel);
    res.on("close", cancel);
    if (req.method === "OPTIONS") return send(204, {});
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const runtime = runtimeResponse(req, url.pathname);
    if (runtime) return send(runtime.status, runtime.payload);
    if (closing)
      return send(503, {
        error: { code: "stopping", message: "托管桥正在停止。" },
      });
    const track = () => {
      activeRequests.add(res);
      const complete = () => activeRequests.delete(res);
      res.once("finish", complete);
      res.once("close", complete);
    };
    if (req.method === "GET" && url.pathname === "/status") {
      track();
      return handleStatus({ signal: operation.signal }).then(
        (payload) => send(200, payload),
        (error) =>
          send(500, {
            error: { code: "failed", message: String(error?.message ?? error) },
          }),
      );
    }
    if (req.method === "POST" && url.pathname === "/chat") {
      if (
        req.headers["content-type"]?.split(";", 1)[0].toLowerCase() !==
        "application/json"
      )
        return send(415, {
          error: { code: "invalid", message: "只接受 JSON 请求。" },
        });
      track();
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
        return handleChat(body, { signal: operation.signal }).then(
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
      return server.address().port;
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
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const portArg = process.argv.indexOf("--port");
  const port = portArg >= 0 ? Number(process.argv[portArg + 1]) : DEFAULT_PORT;
  const ownerNonce = process.env.KK_GEMINI_BRIDGE_OWNER_NONCE ?? "";
  delete process.env.KK_GEMINI_BRIDGE_OWNER_NONCE;
  createGeminiBridge({ port, ownerNonce })
    .listen()
    .then((actual) => {
      if (ownerNonce)
        console.log(
          "KK_GEMINI_BRIDGE_READY " +
            JSON.stringify({
              port: actual,
              pid: process.pid,
              nonce: ownerNonce,
            }),
        );
      else
        console.log(`Gemini CLI 桥已启动: http://127.0.0.1:${actual} (仅本机)`);
    })
    .catch((error) => {
      console.error("Gemini CLI 桥启动失败:", error.message);
      process.exit(1);
    });
}
