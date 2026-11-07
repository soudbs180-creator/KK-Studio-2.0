#!/usr/bin/env node
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { Readable } from "node:stream";
import {
    transpileAnthropicToOpenAiRequest,
    transpileOpenAiToAnthropicRequest,
    transpileAnthropicToOpenAiResponse,
    transpileOpenAiToAnthropicResponse,
    createStreamTranspiler,
} from "../../src/features/ai-gateway/transpiler/index.ts";

const pkg = createRequire(import.meta.url)("./package.json");

const CORS_HEADERS = {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "*",
    "access-control-allow-headers": "*",
    "access-control-expose-headers": "*",
    "access-control-max-age": "86400",
};

/** Headers that describe the hop to this proxy rather than the upstream request. */
const SKIP_REQUEST_HEADERS = new Set(["host", "connection", "content-length", "accept-encoding", "origin", "referer", "sec-fetch-dest", "sec-fetch-mode", "sec-fetch-site"]);
/** fetch() already decoded and re-framed the body, so the upstream framing headers no longer apply. */
const SKIP_RESPONSE_HEADERS = new Set(["content-encoding", "content-length", "transfer-encoding", "connection", "keep-alive"]);

function readArg(args, name, fallback) {
    const index = args.indexOf(`--${name}`);
    return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on("data", (chunk) => chunks.push(chunk));
        req.on("end", () => resolve(Buffer.concat(chunks)));
        req.on("error", reject);
    });
}

function readTarget(url, req) {
    const headerTarget = req?.headers?.["x-target-url"] || req?.headers?.["x-upstream-url"];
    if (headerTarget && typeof headerTarget === "string" && /^https?:\/\//i.test(headerTarget)) {
        return headerTarget;
    }
    const queryIdx = url.indexOf("?target=");
    if (queryIdx >= 0) {
        const queryTarget = decodeURIComponent(url.slice(queryIdx + 8).split("&")[0]);
        if (/^https?:\/\//i.test(queryTarget)) return queryTarget;
    }
    const raw = url.slice(1);
    // decodeURI undoes the escaping browsers apply to the path while keeping intentional encodeURIComponent escapes.
    let target = raw;
    try {
        target = decodeURI(raw);
    } catch {
        // Malformed escape sequence: forward the raw form instead of failing.
    }
    // Some clients collapse the "//" in the embedded target URL, so restore it before parsing.
    target = target.replace(/^(https?:)\/*/i, "$1//");
    return /^https?:\/\/[^/]/i.test(target) ? target : "";
}

function requestHeaders(req) {
    const headers = {};
    for (const [key, value] of Object.entries(req.headers)) {
        if (SKIP_REQUEST_HEADERS.has(key) || value === undefined) continue;
        headers[key] = Array.isArray(value) ? value.join(", ") : value;
    }
    return headers;
}

function responseHeaders(upstream) {
    const headers = { ...CORS_HEADERS };
    upstream.headers.forEach((value, key) => {
        if (SKIP_RESPONSE_HEADERS.has(key) || key.startsWith("access-control-")) return;
        headers[key] = value;
    });
    return headers;
}

function sendJson(res, status, payload) {
    res.writeHead(status, { ...CORS_HEADERS, "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(payload));
}

function logForward(method, target, outcome, startedAt) {
    console.log(`${new Date().toLocaleTimeString()} ${method} ${target} -> ${outcome} ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
}

function detectDownstreamProtocol(req, parsedBody) {
    const headerProto = req.headers["x-downstream-protocol"];
    if (headerProto === "anthropic" || headerProto === "openai") return headerProto;
    if (req.url.startsWith("/v1/messages")) return "anthropic";
    if (req.url.startsWith("/v1/chat/completions")) return "openai";
    if (parsedBody && typeof parsedBody === "object") {
        if ("system" in parsedBody || (Array.isArray(parsedBody.messages) && parsedBody.messages.some(m => Array.isArray(m.content)))) {
            return "anthropic";
        }
        if (Array.isArray(parsedBody.messages) && parsedBody.messages.some(m => m.role === "system" || m.role === "developer")) {
            return "openai";
        }
    }
    return null;
}

function detectUpstreamProtocol(target) {
    if (target.includes("/v1/messages")) return "anthropic";
    if (target.includes("/v1/chat/completions")) return "openai";
    return null;
}

async function forward(req, res, target) {
    const rawBody = req.method === "GET" || req.method === "HEAD" ? undefined : await readBody(req);
    let parsedBody = null;
    if (rawBody && rawBody.length > 0) {
        try {
            parsedBody = JSON.parse(rawBody.toString("utf8"));
        } catch {
            // Non-JSON body
        }
    }

    const downstreamProto = detectDownstreamProtocol(req, parsedBody);
    const upstreamProto = detectUpstreamProtocol(target);

    // If protocols differ and both are identified
    if (parsedBody && downstreamProto && upstreamProto && downstreamProto !== upstreamProto) {
        let finalTarget = target;
        let finalBody = rawBody;
        const streamRequested = Boolean(parsedBody.stream);

        if (downstreamProto === "anthropic" && upstreamProto === "openai") {
            const converted = transpileAnthropicToOpenAiRequest(parsedBody);
            finalBody = Buffer.from(JSON.stringify(converted), "utf8");
            finalTarget = target.replace(/\/v1\/messages(\?|$)/, "/v1/chat/completions$1");
        } else if (downstreamProto === "openai" && upstreamProto === "anthropic") {
            const converted = transpileOpenAiToAnthropicRequest(parsedBody);
            finalBody = Buffer.from(JSON.stringify(converted), "utf8");
            finalTarget = target.replace(/\/v1\/chat\/completions(\?|$)/, "/v1/messages$1");
        }

        const headers = requestHeaders(req);
        headers["content-type"] = "application/json";
        headers["content-length"] = String(finalBody.length);
        if (upstreamProto === "anthropic" && !headers["anthropic-version"]) {
            headers["anthropic-version"] = "2023-06-01";
        }

        const upstream = await fetch(finalTarget, { method: req.method, headers, body: finalBody, redirect: "follow" });

        if (!upstream.ok) {
            res.writeHead(upstream.status, responseHeaders(upstream));
            if (upstream.body) {
                Readable.fromWeb(upstream.body).pipe(res);
            } else {
                res.end();
            }
            return upstream.status;
        }

        const contentType = upstream.headers.get("content-type") || "";
        const isSse = contentType.includes("text/event-stream") || streamRequested;

        if (isSse && upstream.body) {
            const outHeaders = responseHeaders(upstream);
            outHeaders["content-type"] = "text/event-stream; charset=utf-8";
            res.writeHead(upstream.status, outHeaders);

            const transpiler = createStreamTranspiler({
                sourceProtocol: upstreamProto,
                targetProtocol: downstreamProto,
                defaultModel: parsedBody.model,
            });

            const stream = Readable.fromWeb(upstream.body);
            let buffer = "";
            res.on("close", () => stream.destroy());

            for await (const chunk of stream) {
                buffer += Buffer.from(chunk).toString("utf8");
                let newlineIdx;
                while ((newlineIdx = buffer.indexOf("\n")) >= 0) {
                    const line = buffer.slice(0, newlineIdx).replace(/\r$/, "");
                    buffer = buffer.slice(newlineIdx + 1);
                    const outputs = transpiler.processLine(line);
                    for (const out of outputs) {
                        res.write(out);
                    }
                }
            }

            if (buffer.trim()) {
                const outputs = transpiler.processLine(buffer.trim());
                for (const out of outputs) {
                    res.write(out);
                }
            }
            const flushed = transpiler.flush();
            for (const out of flushed) {
                res.write(out);
            }
            res.end();
            return upstream.status;
        } else {
            const jsonResp = await upstream.json();
            let transpiledResp = jsonResp;
            if (downstreamProto === "anthropic" && upstreamProto === "openai") {
                transpiledResp = transpileOpenAiToAnthropicResponse(jsonResp);
            } else if (downstreamProto === "openai" && upstreamProto === "anthropic") {
                transpiledResp = transpileAnthropicToOpenAiResponse(jsonResp, parsedBody.model);
            }
            sendJson(res, upstream.status, transpiledResp);
            return upstream.status;
        }
    }

    // Direct passthrough
    const upstream = await fetch(target, { method: req.method, headers: requestHeaders(req), body: rawBody, redirect: "follow" });
    // Logged as soon as the status line arrives, so a long SSE stream still shows up immediately.
    res.writeHead(upstream.status, responseHeaders(upstream));
    if (!upstream.body) {
        res.end();
        return upstream.status;
    }
    // Streamed so that SSE responses (text generation) reach the browser chunk by chunk.
    const stream = Readable.fromWeb(upstream.body);
    res.on("close", () => stream.destroy());
    stream.pipe(res);
    return upstream.status;
}

export function createProxyServer() {
    return createServer((req, res) => {
        if (req.method === "OPTIONS") {
            res.writeHead(204, CORS_HEADERS);
            res.end();
            return;
        }
        const target = readTarget(req.url || "/", req);
        if (!target) {
            sendJson(res, 200, { app: "infinite-canvas", proxy: pkg.name, version: pkg.version, usage: "/<full-target-url>" });
            return;
        }
        const startedAt = Date.now();
        const method = req.method || "GET";
        forward(req, res, target)
            .then((status) => logForward(method, target, status, startedAt))
            .catch((error) => {
                const reason = error instanceof Error ? error.message : String(error);
                logForward(method, target, `failed (${reason})`, startedAt);
                if (res.headersSent) {
                    res.destroy();
                    return;
                }
                sendJson(res, 502, { error: reason });
            });
    });
}

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
    console.log(`${pkg.name} v${pkg.version}\n\nUsage: npx ${pkg.name}@latest [--port 23210] [--host 127.0.0.1]\n\nForwards http://<host>:<port>/<full-target-url> to <full-target-url> with permissive CORS headers.`);
    process.exit(0);
}

// 仅作为 CLI 直接运行时才启动监听；被测试或宿主模块 import 时不产生副作用。
if (import.meta.main) {
    const port = Number(readArg(args, "port", process.env.PORT || 23210));
    const host = readArg(args, "host", process.env.HOST || "127.0.0.1");

    createProxyServer().listen(port, host, () => {
        console.log(`${pkg.name} v${pkg.version} listening on http://${host}:${port}`);
        console.log(`Fill this address into Infinite Canvas → 配置 → 本地代理: http://${host}:${port}`);
    });
}
