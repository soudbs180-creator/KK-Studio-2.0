import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createCompanionServer } from "./server.ts";
import { CompanionStore } from "./store.ts";

export interface CompanionStartOptions {
  dataDirectory?: string;
  port?: number;
  allowedOrigins?: readonly string[];
}

export interface RunningCompanionService {
  server: ReturnType<typeof createCompanionServer>;
  store: CompanionStore;
  pairingCode: string;
  port: number;
  deviceId: string;
}

function defaultDataDirectory(): string {
  const base =
    process.env.KK_STUDIO_COMPANION_DATA ??
    process.env.LOCALAPPDATA ??
    process.env.APPDATA ??
    join(homedir(), ".local", "share");
  return join(base, "kk-studio", "companion");
}

function deviceId(root: string): string {
  const path = join(root, "app", "companion.json");
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as {
      deviceId?: unknown;
    };
    if (
      typeof parsed.deviceId === "string" &&
      /^[a-z0-9-]{8,120}$/i.test(parsed.deviceId)
    )
      return parsed.deviceId;
  } catch {
    /* First launch or a damaged metadata file gets a fresh identity. */
  }
  const id = `device-${randomUUID()}`;
  const directory = join(root, "app");
  const metadata = JSON.stringify({ version: 1, deviceId: id });
  // CompanionStore creates the root, but app is not part of the snapshot paths.
  mkdirSync(directory, { recursive: true });
  writeFileSync(path, metadata, { encoding: "utf8", flag: "w" });
  return id;
}

export function originsFromEnvironment(): string[] {
  const raw = process.env.KK_STUDIO_COMPANION_ORIGINS;
  if (!raw) return ["http://127.0.0.1:1421", "http://127.0.0.1:1423"];
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => {
      try {
        const url = new URL(value);
        return (
          (url.protocol === "http:" || url.protocol === "https:") &&
          url.pathname === "/" &&
          !url.search &&
          !url.hash &&
          !url.username &&
          !url.password &&
          url.origin === value
        );
      } catch {
        return false;
      }
    });
}

export async function startCompanionService(
  options: CompanionStartOptions = {},
): Promise<RunningCompanionService> {
  const root = resolve(options.dataDirectory ?? defaultDataDirectory());
  const store = new CompanionStore(root);
  const pairingCode = randomBytes(18).toString("base64url");
  const device = deviceId(root);
  const port =
    options.port ?? Number(process.env.KK_STUDIO_COMPANION_PORT ?? 4319);
  if (
    !Number.isInteger(port) ||
    port < 0 ||
    port > 65535 ||
    (port !== 0 && port < 1024)
  )
    throw new Error("KK_STUDIO_COMPANION_PORT must be between 1024 and 65535");
  const server = createCompanionServer({
    store,
    allowedOrigins: options.allowedOrigins ?? originsFromEnvironment(),
    pairingCode,
    deviceId: device,
  });
  await new Promise<void>((resolveListen, reject) => {
    const onError = (error: Error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolveListen();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, "127.0.0.1");
  });
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("本机服务未绑定端口。");
  return {
    server,
    store,
    pairingCode,
    port: address.port,
    deviceId: device,
  };
}

async function runFromCli(): Promise<void> {
  const service = await startCompanionService({
    dataDirectory: process.argv[2],
  });
  process.stdout.write(
    `KK Local Companion listening on http://127.0.0.1:${service.port}\nPairing code: ${service.pairingCode}\nDevice: ${service.deviceId}\n`,
  );
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    service.server.close(() => process.exit(0));
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  void runFromCli();
