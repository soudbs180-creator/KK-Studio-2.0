// Historical Mobile protocol integration fixture; never deployed or imported by app runtime.
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { ZodError } from "zod";
import { IdentityError, type IdentityRepository } from "./repository.ts";
const prefix = "/api/mobile/auth/";
const loopback = (address: string | undefined) =>
  address === "127.0.0.1" ||
  address === "::1" ||
  address === "::ffff:127.0.0.1";
function json(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status, {
    "content-type": "application/json",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  response.end(JSON.stringify(value));
}
async function body(request: IncomingMessage) {
  if (
    request.headers["content-type"]?.split(";")[0].trim() !== "application/json"
  )
    throw new IdentityError("JSON_REQUIRED", 415);
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 8192) throw new IdentityError("BODY_TOO_LARGE", 413);
    chunks.push(Buffer.from(chunk));
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new IdentityError("INVALID_JSON", 400);
  }
}
export function createIdentityServer(options: {
  repository: IdentityRepository;
  allowedOrigins?: string[];
  allowLoopbackHttp?: boolean;
  now?: () => number;
  loginLimit?: number;
  tls?: { cert: Buffer; key: Buffer };
}) {
  const origins = new Set(options.allowedOrigins ?? []);
  for (const origin of origins) {
    const url = new URL(origin);
    const developmentLoopbackOrigin =
      options.allowLoopbackHttp === true &&
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (
      origin !== url.origin ||
      !(url.protocol === "https:" || developmentLoopbackOrigin)
    )
      throw new IdentityError("HTTPS_CORS_ORIGIN_REQUIRED", 500);
  }
  const now = options.now ?? Date.now;
  const attempts = new Map<string, { count: number; until: number }>();
  function limit(key: string, maximum: number) {
    for (const [entry, value] of attempts)
      if (value.until <= now()) attempts.delete(entry);
    let value = attempts.get(key);
    if (!value) {
      if (attempts.size >= 4096) throw new IdentityError("RATE_LIMITED", 429);
      value = { count: 0, until: now() + 60_000 };
      attempts.set(key, value);
    }
    if (++value.count > maximum) throw new IdentityError("RATE_LIMITED", 429);
  }
  const handler = (request: IncomingMessage, response: ServerResponse) => {
    void (async () => {
      try {
        const encrypted =
          "encrypted" in request.socket && request.socket.encrypted;
        if (
          !encrypted &&
          !(
            options.allowLoopbackHttp &&
            loopback(request.socket.remoteAddress) &&
            loopback(request.socket.localAddress)
          )
        )
          throw new IdentityError("HTTPS_REQUIRED", 403);
        if (
          !encrypted &&
          !/^(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/.test(
            request.headers.host ?? "",
          )
        )
          throw new IdentityError("INVALID_HOST", 403);
        const origin = request.headers.origin;
        if (origin && !origins.has(origin))
          throw new IdentityError("ORIGIN_FORBIDDEN", 403);
        if (origin) {
          response.setHeader("access-control-allow-origin", origin);
          response.setHeader("vary", "Origin");
        }
        const route = request.url;
        if (
          !route ||
          ![
            `${prefix}login`,
            `${prefix}refresh`,
            `${prefix}me`,
            `${prefix}logout`,
          ].includes(route)
        )
          throw new IdentityError("NOT_FOUND", 404);
        if (request.method === "OPTIONS") {
          response.writeHead(204, {
            "access-control-allow-methods": "GET, POST",
            "access-control-allow-headers":
              "Content-Type, Authorization, X-KK-Device-Id",
            "access-control-max-age": "600",
          });
          response.end();
          return;
        }
        const ip = request.socket.remoteAddress ?? "unknown";
        limit(`all:${ip}`, 120);
        if (route === `${prefix}me`) {
          if (request.method !== "GET")
            throw new IdentityError("METHOD_NOT_ALLOWED", 405);
        } else if (request.method !== "POST")
          throw new IdentityError("METHOD_NOT_ALLOWED", 405);
        if (route === `${prefix}login` || route === `${prefix}refresh`) {
          limit(`auth:${ip}`, options.loginLimit ?? 20);
          const input = await body(request);
          json(
            response,
            200,
            route === `${prefix}login`
              ? await options.repository.login(input)
              : await options.repository.refresh(input),
          );
          return;
        }
        const token = request.headers.authorization?.match(
          /^Bearer ([A-Za-z0-9_-]{32,128})$/,
        )?.[1];
        const deviceId = request.headers["x-kk-device-id"];
        if (
          !token ||
          typeof deviceId !== "string" ||
          !/^[\w-]{1,120}$/.test(deviceId)
        )
          throw new IdentityError("SESSION_REQUIRED");
        if (route === `${prefix}logout`) await body(request);
        json(
          response,
          200,
          route === `${prefix}me`
            ? await options.repository.authenticate(token, deviceId)
            : await options.repository.logout(token, deviceId),
        );
      } catch (error) {
        const status =
          error instanceof IdentityError
            ? error.status
            : error instanceof ZodError
              ? 400
              : 503;
        const code =
          error instanceof IdentityError
            ? error.code
            : error instanceof ZodError
              ? "INVALID_REQUEST"
              : "IDENTITY_UNAVAILABLE";
        if (!response.headersSent) json(response, status, { error: { code } });
        else response.destroy();
      }
    })();
  };
  const server = options.tls
    ? createHttpsServer(
        { cert: options.tls.cert, key: options.tls.key, minVersion: "TLSv1.2" },
        handler,
      )
    : createServer(handler);
  server.requestTimeout = 10_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5000;
  server.maxConnections = 128;
  return server;
}
