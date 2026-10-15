import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { mergeProviderConnection } from "../../src/features/creation/providerRegistry.ts";
import type { ProviderConnection } from "../../src/domain/providerConnections.ts";

const connection: ProviderConnection = {
  id: "shared-account",
  provider: "Fixture",
  kind: "user_byok",
  displayName: "Fixture",
  baseUrl: "https://fixture.invalid/v1",
  credentialRef: "opaque_shared",
  model: "initial-model",
  state: "active",
  concurrencyLimit: 1,
  capabilities: {
    modalities: ["image"],
    operations: ["generate"],
    async: false,
  },
};

function queue() {
  let tail: Promise<unknown> = Promise.resolve();
  return <T>(run: () => Promise<T>): Promise<T> => {
    const result = tail.then(run);
    tail = result.catch(() => undefined);
    return result;
  };
}

async function fixture() {
  let native = [connection];
  let cache = [connection];
  let revision = 1;
  let secret = "synthetic-initial";
  let releaseA: () => void = () => undefined;
  let startA: () => void = () => undefined;
  const pausedA = new Promise<void>((resolve) => {
    releaseA = resolve;
  });
  const enteredA = new Promise<void>((resolve) => {
    startA = resolve;
  });
  const nativeQueue = queue();
  const browserQueue = queue();
  const writeMetadata = async (
    connections: ProviderConnection[],
    expected: number | null,
  ) => {
    if (expected !== revision)
      throw new Error("conflict: synthetic stale revision");
    native = structuredClone(connections);
    return ++revision;
  };
  const setSecret = async (value: string) => {
    if (value === "synthetic-A") {
      startA();
      await pausedA;
    }
    secret = value;
  };
  const source = await readFile(
    new URL(
      "../../src/features/creation/providerSaveRecovery.ts",
      import.meta.url,
    ),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const coordination = ts.transpileModule(
    await readFile(
      new URL(
        "../../src/features/creation/providerCoordination.ts",
        import.meta.url,
      ),
      "utf8",
    ),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  const createWindow = (withLocks = true) => {
    const exports: {
      saveProviderConnection?: typeof import("../../src/features/creation/providerSaveRecovery.ts").saveProviderConnection;
    } = {};
    const modules: Record<string, unknown> = {
      "../../domain/modelProvider.ts": {
        MODEL_PROVIDER_STORAGE_KEY: "fixture-profile",
        serializeModelProvider: JSON.stringify,
      },
      "./providerCredentials.ts": {
        saveApiKey: (_url: string, value: string) => setSecret(value),
        deleteApiKey: async () => {
          secret = "";
        },
        setSessionApiKey: () => undefined,
      },
      "./providerRegistry.ts": {
        isDesktopProviderDurable: () => true,
        loadProviderConnectionsDurableSnapshot: async () => ({
          revision,
          connections: structuredClone(native),
        }),
        mergeProviderConnection,
        persistProviderConnectionsDurable: async (
          connections: ProviderConnection[],
          options: { expectedRevision: number | null },
        ) => writeMetadata(connections, options.expectedRevision),
        readProviderConnections: () => structuredClone(cache),
        writeProviderConnections: (connections: ProviderConnection[]) => {
          cache = structuredClone(connections);
          return true;
        },
      },
      "@tauri-apps/api/core": {
        invoke: (
          command: string,
          args: {
            connections: ProviderConnection[];
            expectedRevision: number;
            secret?: string | null;
            clearSecret?: boolean;
          },
        ) => {
          assert.equal(command, "commit_provider_connection");
          return nativeQueue(async () => {
            const committed = await writeMetadata(
              args.connections,
              args.expectedRevision,
            );
            if (args.secret) await setSecret(args.secret);
            if (args.clearSecret) secret = "";
            return {
              revision: committed,
              credentialState: args.clearSecret
                ? "missing"
                : args.secret
                  ? "saved"
                  : "unchanged",
            };
          });
        },
      },
    };
    const context = {
      exports,
      require: (name: string) => {
        assert(name in modules, `Unexpected dependency: ${name}`);
        return modules[name];
      },
      window: {
        navigator: withLocks
          ? {
              locks: {
                request: (
                  _name: string,
                  _options: unknown,
                  run: () => Promise<unknown>,
                ) => browserQueue(run),
              },
            }
          : {},
        localStorage: { setItem: () => undefined },
      },
      AbortSignal,
    };
    const coordinationExports = {};
    runInNewContext(coordination, { ...context, exports: coordinationExports });
    modules["./providerCoordination.ts"] = coordinationExports;
    runInNewContext(compiled, context);
    return exports.saveProviderConnection!;
  };
  return {
    createWindow,
    enteredA,
    releaseA,
    state: () => ({ native, cache, secret }),
  };
}

test("two independent window modules serialize the full read/native/vault/cache save so final identities agree", async () => {
  const world = await fixture();
  const saveA = world.createWindow();
  const saveB = world.createWindow();
  const pendingA = saveA({ ...connection, model: "model-A" }, "synthetic-A");
  await world.enteredA;
  const pendingB = saveB({ ...connection, model: "model-B" }, "synthetic-B");
  await new Promise((resolve) => setImmediate(resolve));
  world.releaseA();
  await Promise.all([pendingA, pendingB]);
  assert.equal(world.state().native[0]?.model, "model-B");
  assert.equal(world.state().cache[0]?.model, "model-B");
  assert.equal(world.state().secret, "synthetic-B");
});

test("a desktop without cross-window browser coordination refuses the save before any store is changed", async () => {
  const world = await fixture();
  await assert.rejects(
    world.createWindow(false)(
      { ...connection, model: "model-B" },
      "synthetic-B",
    ),
  );
  assert.equal(world.state().native[0]?.model, "initial-model");
  assert.equal(world.state().secret, "synthetic-initial");
});
