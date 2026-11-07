import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { z } from "zod";
import {
  providerConnectionSchema,
  type ProviderConnection,
} from "../../domain/providerConnections.ts";
import { GenerationRepository } from "./repository.ts";
import { PrivateAssetStore } from "./assets.ts";
import { createHostAdapter } from "./provider.ts";
import { PersistentGenerationWorker } from "./worker.ts";
import { createGenerationServer, tokenAuthenticator } from "./http.ts";
import { rejectSecrets } from "./types.ts";
import {
  ARK_BASE_URL,
  ChannelRegistry,
  doubaoAdapter,
  Scheduler,
  type ChannelRegistration,
  type ChatDeps,
} from "../ai-gateway/index.ts";

const alias = z.string().regex(/^[A-Z][A-Z0-9_]{0,100}$/);
const configSchema = z
  .object({
    deployment: z.enum(["local", "managed"]).default("local"),
    port: z.number().int().min(1024).max(65535).default(4318),
    dataDirectory: z.string().min(1),
    allowedOrigins: z.array(z.string().url()).default([]),
    assetOrigins: z.array(z.string().url()).default([]),
    principals: z
      .array(
        z
          .object({
            ownerId: z.string().min(1).max(120),
            tokenEnv: alias,
            admin: z.boolean().default(false),
            initialCredits: z.number().int().nonnegative(),
            concurrency: z.number().int().min(1).max(256).default(4),
          })
          .strict(),
      )
      .min(1)
      .refine(
        (entries) =>
          new Set(entries.map((entry) => entry.tokenEnv)).size ===
          entries.length,
        "principals.tokenEnv must be unique",
      )
      .refine(
        (entries) =>
          new Set(entries.map((entry) => entry.ownerId)).size ===
          entries.length,
        "principals.ownerId must be unique",
      ),
    connections: z.array(
      z
        .object({
          metadata: providerConnectionSchema,
          ownerId: z.string().optional(),
          allowedOwners: z.array(z.string()).optional(),
          unitPrice: z.number().int().nonnegative(),
          costLimit: z.number().int().nonnegative(),
          webhookEnv: alias.optional(),
          modelMapping: z.record(z.string(), z.string()).optional(),
          priority: z.number().int().optional(),
          weight: z.number().int().positive().optional(),
          timeoutMs: z.number().int().positive().optional(),
        })
        .strict(),
    ),
    credentialEnv: z.record(z.string(), alias).default({}),
  })
  .strict();

function buildGatewayChatDeps(
  connections: Array<{
    metadata: ProviderConnection;
    unitPrice: number;
    costLimit: number;
    modelMapping?: Record<string, string>;
    priority?: number;
    weight?: number;
    timeoutMs?: number;
  }>,
  resolveSecret: (ref?: string) => Promise<string | undefined>,
): ChatDeps | undefined {
  const registry = new ChannelRegistry();
  registry.registerAdapter(doubaoAdapter);
  const registrations: ChannelRegistration[] = [];
  const states = new Map<string, ProviderConnection["state"]>();

  for (const entry of connections) {
    const meta = entry.metadata;
    if (
      meta.provider.toLowerCase() !== "doubao" ||
      !meta.capabilities.operations.includes("chat")
    ) {
      continue;
    }
    const mapping =
      entry.modelMapping ??
      (meta.model
        ? { "kk-default": meta.model, [meta.model]: meta.model }
        : {});
    if (Object.keys(mapping).length === 0) continue;
    registrations.push({
      id: meta.id,
      adapter: doubaoAdapter,
      kind: "official_api",
      enabled: meta.state !== "disabled",
      priority: entry.priority ?? 100,
      weight: entry.weight ?? 10,
      baseUrl: meta.baseUrl ?? ARK_BASE_URL,
      ...(meta.credentialRef ? { credentialRef: meta.credentialRef } : {}),
      capabilities: meta.capabilities,
      modelMapping: mapping,
      timeoutMs: entry.timeoutMs ?? 30_000,
      costLimit: entry.costLimit,
      unitPrice: entry.unitPrice,
    });
    states.set(meta.id, meta.state);
  }

  if (registrations.length === 0) return undefined;
  registry.replace({ registrations, states });
  return {
    scheduler: new Scheduler(registry),
    resolveSecret,
  };
}

const file = process.argv[2];
if (!file)
  throw new Error("Usage: npm run gateway -- <non-secret config.json>");
const raw = JSON.parse(readFileSync(resolve(file), "utf8"));
rejectSecrets(raw);
const config = configSchema.parse(raw);
const root = resolve(config.dataDirectory);
const repository = new GenerationRepository(
  join(root, "generation.sqlite"),
  config.deployment,
);
// Injected by the service manager / vault integration. No .env loader or credential provisioning HTTP route.
const memory = new Map<string, string>();
for (const key of new Set([
  ...Object.values(config.credentialEnv),
  ...config.principals.map((p) => p.tokenEnv),
  ...config.connections.flatMap((c) => (c.webhookEnv ? [c.webhookEnv] : [])),
])) {
  const value = process.env[key];
  if (!value) throw new Error("Required service credential is missing");
  memory.set(key, value);
  delete process.env[key];
}
const auth = config.principals.map((p) => {
  repository.account(p.ownerId, p.initialCredits, p.concurrency);
  return {
    token: memory.get(p.tokenEnv)!,
    principal: { ownerId: p.ownerId, admin: p.admin },
  };
});
for (const c of config.connections) repository.register(c.metadata, c);
const assets = new PrivateAssetStore(join(root, "objects"), {
  allowedRemoteOrigins: config.assetOrigins,
});
const resolveSecret = async (ref?: string) =>
  ref ? memory.get(config.credentialEnv[ref]) : undefined;
const worker = new PersistentGenerationWorker(repository, assets, (c) =>
  createHostAdapter(c, resolveSecret),
);
const chat = buildGatewayChatDeps(config.connections, resolveSecret);
const server = createGenerationServer({
  repository,
  assets,
  worker,
  authenticate: tokenAuthenticator(auth),
  allowedOrigins: config.allowedOrigins,
  ...(chat ? { chat } : {}),
  webhookSecret: async (id) => {
    const key = config.connections.find(
      (c) => c.metadata.id === id,
    )?.webhookEnv;
    return key ? memory.get(key) : undefined;
  },
});
// Binding to loopback is deliberate. Managed deployments terminate authenticated HTTPS at a trusted reverse proxy.
server.listen(config.port, "127.0.0.1", () => {
  worker.start();
  process.stdout.write(
    `KK Generation Gateway listening on 127.0.0.1:${config.port}\n`,
  );
});
let stopping = false;
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    if (stopping) return;
    stopping = true;
    server.close(() => {
      void worker.stop().then(() => {
        repository.close();
        memory.clear();
      });
    });
  });
