import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { z } from "zod";
import {
  assetMetadataSchema,
  CompanionProtocolError,
  COMPANION_PROTOCOL_VERSION,
  healthResponseSchema,
  isAllowedCompanionOrigin,
  MAX_COMPANION_ASSET_BYTES,
  MAX_COMPANION_BODY_BYTES,
  pairRequestSchema,
  snapshotPutSchema,
  type CompanionAssetMetadata,
} from "./protocol.ts";
import { CompanionSessionManager, sessionFromCookie } from "./session.ts";
import { CompanionStore } from "./store.ts";

export interface CompanionServerOptions {
  store: CompanionStore;
  allowedOrigins: readonly string[];
  pairingCode: string;
  deviceId: string;
  maxBodyBytes?: number;
  sessionTtlMs?: number;
}

function json(res: ServerResponse, status: number, value: unknown): void {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(JSON.stringify(value));
}

async function readBody(
  req: IncomingMessage,
  maxBytes: number,
): Promise<Buffer> {
  const declared = Number(req.headers["content-length"] ?? 0);
  if (Number.isFinite(declared) && declared > maxBytes)
    throw new CompanionProtocolError("BODY_TOO_LARGE", 413);
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const bytes = Buffer.from(chunk);
    size += bytes.byteLength;
    if (size > maxBytes)
      throw new CompanionProtocolError("BODY_TOO_LARGE", 413);
    chunks.push(bytes);
  }
  return Buffer.concat(chunks);
}

function parseJson(body: Buffer): unknown {
  try {
    return JSON.parse(body.toString("utf8"));
  } catch {
    throw new CompanionProtocolError(
      "INVALID_REQUEST",
      400,
      "请求 JSON 无效。",
    );
  }
}

function parseAssetMetadataHeader(raw: string): unknown {
  if (!/^[A-Za-z0-9_-]+$/.test(raw))
    throw new CompanionProtocolError("INVALID_ASSET", 422);
  try {
    return JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
  } catch {
    throw new CompanionProtocolError("INVALID_ASSET", 422);
  }
}

function errorResponse(error: unknown): {
  status: number;
  body: { error: string };
} {
  if (error instanceof CompanionProtocolError)
    return { status: error.status, body: { error: error.code } };
  if (error instanceof z.ZodError)
    return { status: 400, body: { error: "INVALID_REQUEST" } };
  return { status: 500, body: { error: "IO" } };
}

function setSessionCookie(res: ServerResponse, session: string): void {
  res.setHeader(
    "Set-Cookie",
    `kk_companion_session=${session}; HttpOnly; SameSite=Strict; Path=/v1; Max-Age=${8 * 60 * 60}`,
  );
}

function clearSessionCookie(res: ServerResponse): void {
  res.setHeader(
    "Set-Cookie",
    "kk_companion_session=; HttpOnly; SameSite=Strict; Path=/v1; Max-Age=0",
  );
}

function assetPath(path: string): string | null {
  const match = path.match(/^\/v1\/assets\/(asset-[a-f0-9]{24})$/i);
  return match?.[1]?.toLowerCase() ?? null;
}

export function createCompanionServer(options: CompanionServerOptions): Server {
  const maxBodyBytes = options.maxBodyBytes ?? MAX_COMPANION_BODY_BYTES;
  const sessions = new CompanionSessionManager(
    options.pairingCode,
    options.sessionTtlMs,
  );
  const server = createServer((req, res) => {
    void (async () => {
      try {
        const origin = req.headers.origin;
        if (!isAllowedCompanionOrigin(origin, options.allowedOrigins))
          throw new CompanionProtocolError("ORIGIN_FORBIDDEN", 403);
        if (origin) {
          res.setHeader("Access-Control-Allow-Origin", origin);
          res.setHeader("Access-Control-Allow-Credentials", "true");
          res.setHeader("Vary", "Origin");
        }
        if (req.method === "OPTIONS") {
          res.writeHead(204, {
            "Access-Control-Allow-Methods": "GET,PUT,POST,DELETE,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, X-KK-Asset-Metadata",
          });
          res.end();
          return;
        }
        const url = new URL(req.url ?? "/", "http://127.0.0.1");
        if (url.search)
          throw new CompanionProtocolError("INVALID_REQUEST", 400);
        const path = url.pathname;

        if (path === "/health" && req.method === "GET") {
          json(
            res,
            200,
            healthResponseSchema.parse({
              status: "ok",
              service: "kk-local-companion",
              protocolVersion: COMPANION_PROTOCOL_VERSION,
              deviceId: options.deviceId,
            }),
          );
          return;
        }

        if (path === "/v1/pair" && req.method === "POST") {
          const request = pairRequestSchema.parse(
            parseJson(await readBody(req, 4096)),
          );
          const session = sessions.pair(request.code);
          setSessionCookie(res, session);
          json(res, 200, {
            protocolVersion: COMPANION_PROTOCOL_VERSION,
            deviceId: options.deviceId,
          });
          return;
        }

        const session = sessionFromCookie(req.headers.cookie);
        if (!sessions.authenticate(session))
          throw new CompanionProtocolError("UNAUTHENTICATED", 401);

        if (path === "/v1/session" && req.method === "DELETE") {
          sessions.revoke(session);
          clearSessionCookie(res);
          res.writeHead(204, { "Cache-Control": "no-store" });
          res.end();
          return;
        }

        if (path === "/v1/snapshot" && req.method === "GET") {
          json(res, 200, options.store.readSnapshot());
          return;
        }
        if (path === "/v1/snapshot" && req.method === "PUT") {
          const request = snapshotPutSchema.parse(
            parseJson(await readBody(req, maxBodyBytes)),
          );
          options.store.writeSnapshot(
            request.snapshot,
            request.expectedRevision,
          );
          json(res, 200, {
            status: "saved",
            revision: request.snapshot.revision,
          });
          return;
        }

        const id = assetPath(path);
        if (id && req.method === "GET") {
          const stored = options.store.readAsset(id);
          if (!stored)
            throw new CompanionProtocolError("NOT_FOUND", 404, "素材不存在。");
          res.writeHead(200, {
            "Content-Type": stored.metadata.mime,
            "Content-Length": stored.bytes.byteLength,
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
            "Content-Disposition": "inline",
          });
          res.end(Buffer.from(stored.bytes));
          return;
        }
        if (id && req.method === "PUT") {
          const rawMetadata = req.headers["x-kk-asset-metadata"];
          if (typeof rawMetadata !== "string")
            throw new CompanionProtocolError("INVALID_ASSET", 422);
          let metadata: CompanionAssetMetadata;
          try {
            metadata = assetMetadataSchema.parse(
              parseAssetMetadataHeader(rawMetadata),
            );
          } catch {
            throw new CompanionProtocolError("INVALID_ASSET", 422);
          }
          if (metadata.assetId !== id)
            throw new CompanionProtocolError("INVALID_ASSET", 422);
          const body = await readBody(req, MAX_COMPANION_ASSET_BYTES);
          const staged = options.store.stageAsset(
            metadata,
            new Uint8Array(body),
          );
          const saved = options.store.publishStagedAsset(staged.stageId);
          json(res, 201, { metadata: saved });
          return;
        }

        if (path === "/v1/backups/export" && req.method === "POST") {
          const backup = options.store.createBackup();
          json(res, 200, { manifest: backup.manifest });
          return;
        }

        throw new CompanionProtocolError("NOT_FOUND", 404);
      } catch (error) {
        if (res.headersSent) {
          res.destroy();
          return;
        }
        const result = errorResponse(error);
        json(res, result.status, result.body);
      }
    })();
  });
  return server;
}
