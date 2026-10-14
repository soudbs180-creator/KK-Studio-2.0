import test from "node:test";
import assert from "node:assert/strict";
import { testProviderConnection } from "../../src/components/settings/testProviderConnection.ts";
import {
  newModelProfileConnection,
  writeProviderConnections,
} from "../../src/features/creation/providerRegistry.ts";
import { readModelCatalogs } from "../../src/features/models/modelCatalog.ts";
import type { ConnectionState } from "../../src/components/settings/modelProviderSettingsState.ts";

test("an account edited during discovery cannot receive the prior model scope", async (t) => {
  const descriptors = ["window", "localStorage", "isTauri"].map(
    (name) =>
      [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const,
  );
  const online = Object.getOwnPropertyDescriptor(navigator, "onLine");
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
  let resolveModels!: (value: string[]) => void, requestStarted!: () => void;
  const started = new Promise<void>((resolve) => {
    requestStarted = resolve;
  });
  const models = new Promise<string[]>((resolve) => {
    resolveModels = resolve;
  });
  Object.defineProperty(globalThis, "isTauri", {
    configurable: true,
    value: true,
  });
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value: true,
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: storage,
      location: { protocol: "tauri:", hostname: "tauri.localhost" },
      setTimeout,
      clearTimeout,
      dispatchEvent: () => true,
      __TAURI_INTERNALS__: {
        invoke: async (command: string) => {
          assert.equal(command, "provider_models_fetch");
          requestStarted();
          return models;
        },
      },
    },
  });
  t.after(() => {
    for (const [name, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
    if (online) Object.defineProperty(navigator, "onLine", online);
    else Reflect.deleteProperty(navigator, "onLine");
  });
  const valid = {
    version: 1 as const,
    name: "Fixture",
    baseUrl: "http://127.0.0.1:1234/v1",
    protocol: "ollama" as const,
    authMode: "none" as const,
    model: "fixture-model",
  };
  const original = newModelProfileConnection(valid);
  writeProviderConnections([original]);
  const states: ConnectionState[] = [];
  const pending = testProviderConnection({
    valid,
    apiKey: "",
    credentialRef: original.credentialRef!,
    connections: [original],
    requestRef: { current: null },
    setConnection: (state) => states.push(state),
  });
  await started;
  writeProviderConnections([
    {
      ...original,
      protocol: "anthropic",
      authMode: "api-key",
      healthRevision: 1,
    },
  ]);
  resolveModels(["prior-scope-model"]);
  await pending;
  assert.equal(states.at(-1)?.kind, "error");
  assert.match(states.at(-1)!.message, /检测期间已变化/);
  assert.deepEqual(readModelCatalogs(), []);
});
