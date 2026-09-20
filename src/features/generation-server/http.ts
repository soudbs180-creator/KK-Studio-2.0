import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { GenerationRepository } from "./repository.ts";
import type { PrivateAssetStore } from "./assets.ts";
import type { PersistentGenerationWorker } from "./worker.ts";
import { PlatformError, rejectSecrets, type ArchivedAsset } from "./types.ts";
import { receiveWebhook } from "./webhook.ts";

export interface Principal {
  ownerId: string;
  admin?: boolean;
}
/** Application access tokens are distinct from provider credentials. Only hashes live here. */
export function tokenAuthenticator(
  entries: Array<{ token: string; principal: Principal }>,
) {
  const principals = new Map<string, Principal>();
  for (const entry of entries) {
    const hash = createHash("sha256").update(entry.token).digest("hex");
    const existing = principals.get(hash);
    if (
      existing &&
      (existing.ownerId !== entry.principal.ownerId ||
        Boolean(existing.admin) !== Boolean(entry.principal.admin))
    )
      throw new Error("DUPLICATE_APPLICATION_TOKEN");
    principals.set(hash, entry.principal);
  }
  return (req: IncomingMessage): Principal | undefined => {
    const token =
      req.headers.authorization?.match(/^Bearer ([^\s]+)$/)?.[1] ??
      req.headers.cookie?.match(/(?:^|;\s*)kk_session=([A-Za-z0-9_-]+)/)?.[1];
    return token
      ? principals.get(createHash("sha256").update(token).digest("hex"))
      : undefined;
  };
}
async function readBody(req: IncomingMessage, max = 15000000) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > max) throw new PlatformError("BODY_TOO_LARGE", 413);
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
function json(res: ServerResponse, status: number, value: unknown) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(JSON.stringify(value));
}
const controlsSchema = z
  .object({
    platformEnabled: z.boolean().optional(),
    circuitOpen: z.boolean().optional(),
    connectionId: z.string().max(120).optional(),
    state: z.enum(["active", "disabled"]).optional(),
    credentialRef: z.string().max(160).optional(),
    costLimit: z.number().int().nonnegative().optional(),
    ownerId: z.string().max(120).optional(),
    accountDisabled: z.boolean().optional(),
  })
  .strict();
export function createGenerationServer(options: {
  repository: GenerationRepository;
  assets: PrivateAssetStore;
  worker: PersistentGenerationWorker;
  authenticate: (req: IncomingMessage) => Principal | undefined;
  webhookSecret: (connectionId: string) => Promise<string | undefined>;
  allowedOrigins?: string[];
}) {
  const { repository: r, worker, assets } = options;
  return createServer((req, res) => {
    void (async () => {
      try {
        const origin = req.headers.origin;
        if (origin) {
          if (!options.allowedOrigins?.includes(origin))
            throw new PlatformError("ORIGIN_FORBIDDEN", 403);
          res.setHeader("Access-Control-Allow-Origin", origin);
          res.setHeader("Vary", "Origin");
          res.setHeader("Access-Control-Allow-Credentials", "true");
        }
        if (req.method === "OPTIONS") {
          res.writeHead(204, {
            "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
            "Access-Control-Allow-Headers":
              "Authorization,Content-Type,Idempotency-Key",
          });
          res.end();
          return;
        }
        const url = new URL(req.url ?? "/", "http://localhost");
        if (url.search) throw new PlatformError("QUERY_NOT_ALLOWED");
        const path = url.pathname;
        if (path === "/health" && req.method === "GET") {
          json(res, worker.unhealthy ? 503 : 200, {
            status: worker.unhealthy ? "degraded" : "ok",
            service: "kk-generation-gateway",
          });
          return;
        }
        const hook = path.match(/^\/v1\/webhooks\/([A-Za-z0-9_-]+)$/);
        if (hook && req.method === "POST") {
          const secret = await options.webhookSecret(hook[1]);
          if (!secret) throw new PlatformError("WEBHOOK_SIGNATURE", 401);
          const state = receiveWebhook(
            r,
            hook[1],
            String(req.headers["idempotency-key"] ?? ""),
            String(req.headers["x-kk-timestamp"] ?? ""),
            String(req.headers["x-kk-signature"] ?? ""),
            await readBody(req, 16384),
            secret,
          );
          json(res, 202, { state });
          return;
        }
        const principal = options.authenticate(req);
        if (!principal) throw new PlatformError("UNAUTHENTICATED", 401);
        if (path === "/v1/session" && req.method === "POST") {
          const token = req.headers.authorization?.slice(7);
          if (!token || !/^[A-Za-z0-9_-]{32,}$/.test(token))
            throw new PlatformError("INVALID_SESSION", 401);
          res.setHeader(
            "Set-Cookie",
            `kk_session=${token}; HttpOnly; SameSite=Strict; Path=/v1`,
          );
          json(res, 200, { ownerId: principal.ownerId });
          return;
        }
        if (path === "/v1/connections" && req.method === "GET") {
          const rows = r.db
            .prepare(
              "SELECT c.* FROM gateway_connections c JOIN connection_acl a ON a.connection_id=c.id WHERE a.owner_id=?",
            )
            .all(principal.ownerId);
          json(
            res,
            200,
            rows.map((row) => {
              const m = JSON.parse(String(row.metadata_json));
              return {
                id: m.id,
                displayName: m.displayName,
                kind: m.kind,
                model: m.model,
                capabilities: m.capabilities,
                state: row.state,
                cooldownUntil: row.cooldown_until,
                unitPrice: row.unit_price,
              };
            }),
          );
          return;
        }
        if (path === "/v1/jobs" && req.method === "GET") {
          json(res, 200, r.list(principal.ownerId));
          return;
        }
        if (path === "/v1/jobs" && req.method === "POST") {
          const raw = JSON.parse((await readBody(req)).toString("utf8"));
          const key = req.headers["idempotency-key"];
          if (
            typeof key !== "string" ||
            (raw.idempotencyKey && raw.idempotencyKey !== key)
          )
            throw new PlatformError("IDEMPOTENCY_KEY_REQUIRED");
          json(
            res,
            202,
            r.submit(principal.ownerId, { ...raw, idempotencyKey: key }),
          );
          return;
        }
        const jobRoute = path.match(
          /^\/v1\/jobs\/(job-[a-f0-9-]+)(?:\/(cancel|retry))?$/,
        );
        if (jobRoute) {
          const [, id, action] = jobRoute;
          if (req.method === "GET" && !action) {
            json(res, 200, r.publicJob(principal.ownerId, id));
            return;
          }
          if (req.method === "POST" && action === "cancel") {
            json(res, 200, await worker.cancel(principal.ownerId, id));
            return;
          }
          if (req.method === "POST" && action === "retry") {
            const body = z
              .object({
                indices: z
                  .array(z.number().int().min(0).max(99))
                  .min(1)
                  .max(100),
              })
              .strict()
              .parse(JSON.parse((await readBody(req, 4096)).toString()));
            json(res, 202, r.retry(principal.ownerId, id, body.indices));
            return;
          }
        }
        const asset = path.match(/^\/v1\/assets\/(asset-[a-f0-9]{64})$/);
        if (asset && req.method === "GET") {
          const row = r.db
            .prepare(
              "SELECT a.* FROM stored_assets a JOIN asset_owners o ON o.asset_id=a.asset_id WHERE a.asset_id=? AND o.owner_id=?",
            )
            .get(asset[1], principal.ownerId);
          if (!row) throw new PlatformError("NOT_FOUND", 404);
          const metadata: ArchivedAsset = {
            assetId: String(row.asset_id),
            sha256: String(row.sha256),
            mime: String(row.mime),
            size: Number(row.size),
          };
          const data = await assets.read(metadata);
          res.writeHead(200, {
            "Content-Type": metadata.mime,
            "Content-Length": data.length,
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
            "Content-Disposition": "inline",
          });
          res.end(data);
          return;
        }
        if (path.startsWith("/v1/admin/")) {
          if (!principal.admin) throw new PlatformError("ADMIN_REQUIRED", 403);
          if (path === "/v1/admin/controls" && req.method === "POST") {
            const raw = JSON.parse((await readBody(req, 16384)).toString());
            rejectSecrets(raw);
            r.controls(controlsSchema.parse(raw));
            json(res, 200, { status: "updated" });
            return;
          }
          if (path === "/v1/admin/reviews" && req.method === "POST") {
            const body = z
              .object({
                reservationId: z.string().max(240),
                actualUnits: z.number().int().nonnegative(),
              })
              .strict()
              .parse(JSON.parse((await readBody(req, 4096)).toString()));
            r.review(body.reservationId, body.actualUnits);
            json(res, 200, { status: "settled" });
            return;
          }
          if (path === "/v1/admin/reviews" && req.method === "GET") {
            json(
              res,
              200,
              r.db
                .prepare(
                  "SELECT id,job_id,owner_id,units,created_at FROM credit_reservations WHERE status='manual_review'",
                )
                .all(),
            );
            return;
          }
          if (path === "/v1/admin/logs" && req.method === "GET") {
            json(
              res,
              200,
              r.db
                .prepare(
                  "SELECT * FROM provider_request_logs ORDER BY created_at DESC LIMIT 100",
                )
                .all(),
            );
            return;
          }
        }
        throw new PlatformError("NOT_FOUND", 404);
      } catch (error) {
        if (!res.headersSent)
          json(
            res,
            error instanceof PlatformError
              ? error.status
              : error instanceof z.ZodError || error instanceof SyntaxError
                ? 400
                : 500,
            {
              error:
                error instanceof PlatformError
                  ? error.code
                  : error instanceof z.ZodError || error instanceof SyntaxError
                    ? "INVALID_REQUEST"
                    : "INTERNAL_ERROR",
            },
          );
        else res.destroy();
      }
    })();
  });
}
