import assert from "node:assert/strict";
import test from "node:test";
import { checkModelProvider } from "../../src/integrations/modelProvider.ts";
import { testProviderConnection } from "../../src/components/settings/testProviderConnection.ts";
import {
  newModelProfileConnection,
  writeProviderConnections,
} from "../../src/features/creation/providerRegistry.ts";
import { readModelCatalogs } from "../../src/features/models/modelCatalog.ts";
import type { ConnectionState } from "../../src/components/settings/modelProviderSettingsState.ts";

function nativeFixture(
  t: test.TestContext,
  delayedPrepare = false,
  failCancel = false,
) {
  const saved = ["window", "localStorage", "isTauri"].map(
    (name) =>
      [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const,
  );
  const online = Object.getOwnPropertyDescriptor(navigator, "onLine");
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
  let finishPrepare!: () => void, expire!: () => void, started!: () => void;
  const preparation = new Promise<void>((resolve) => {
    finishPrepare = resolve;
  });
  const fetching = new Promise<void>((resolve) => {
    started = resolve;
  });
  const commands: { command: string; requestId: string }[] = [];
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
      setTimeout: (callback: () => void, delay: number) => {
        assert.equal(delay, 10_000);
        expire = callback;
        return 1;
      },
      clearTimeout: () => {},
      dispatchEvent: () => true,
      __TAURI_INTERNALS__: {
        invoke: async (
          command: string,
          { requestId }: { requestId: string },
        ) => {
          commands.push({ command, requestId });
          if (command === "provider_models_prepare")
            return delayedPrepare ? preparation : undefined;
          if (command === "provider_models_fetch") {
            started();
            return new Promise(() => {});
          }
          if (command === "provider_models_cancel") {
            if (failCancel) throw new Error("host unavailable");
            return true;
          }
          if (command === "provider_models_release") return true;
          assert.fail(`Unexpected command: ${command}`);
        },
      },
    },
  });
  t.after(() => {
    for (const [name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
    if (online) Object.defineProperty(navigator, "onLine", online);
    else Reflect.deleteProperty(navigator, "onLine");
  });
  return { commands, fetching, finishPrepare, expire: () => expire() };
}
const options = { protocol: "ollama" as const, authMode: "none" as const };
const url = "http://127.0.0.1:1234/v1";
function soon<T>(promise: Promise<T>) {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error("Native cancellation did not settle")),
        250,
      );
    }),
  ]).finally(() => clearTimeout(timer));
}

test("Native cancellation releases exactly the prepared request without waiting for the model receipt", async (t) => {
  const f = nativeFixture(t);
  const controller = new AbortController();
  const pending = checkModelProvider(url, "", controller.signal, options);
  await f.fetching;
  controller.abort("user");
  await assert.rejects(soon(pending));
  assert.deepEqual(
    f.commands.map((item) => item.command),
    [
      "provider_models_prepare",
      "provider_models_fetch",
      "provider_models_cancel",
      "provider_models_release",
    ],
  );
  assert.equal(new Set(f.commands.map((item) => item.requestId)).size, 1);
  assert.match(f.commands[0].requestId, /^[a-f0-9-]{36}$/);
});

test("Native timeout exits loading and never saves a cancelled model catalogue", async (t) => {
  const f = nativeFixture(t);
  const valid = {
    version: 1 as const,
    name: "Fixture",
    baseUrl: url,
    ...options,
    model: "fixture-model",
  };
  const connection = newModelProfileConnection(valid);
  writeProviderConnections([connection]);
  const states: ConnectionState[] = [],
    requestRef = { current: null as AbortController | null };
  const pending = testProviderConnection({
    valid,
    apiKey: "",
    credentialRef: connection.credentialRef!,
    connections: [connection],
    requestRef,
    setConnection: (state) => states.push(state),
  });
  await f.fetching;
  f.expire();
  await soon(pending);
  assert.equal(states.at(-1)?.kind, "cancelled");
  assert.match(states.at(-1)!.message, /超时/);
  assert.equal(requestRef.current, null);
  assert.deepEqual(readModelCatalogs(), []);
});

test("an already aborted discovery never enters Native IPC", async (t) => {
  const f = nativeFixture(t);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(checkModelProvider(url, "", controller.signal, options));
  assert.deepEqual(f.commands, []);
});

test("cancelling a pending preparation settles promptly and releases its late receipt without fetching", async (t) => {
  const f = nativeFixture(t, true);
  const controller = new AbortController();
  const pending = checkModelProvider(url, "", controller.signal, options);
  controller.abort("user");
  await assert.rejects(soon(pending));
  f.finishPrepare();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(
    f.commands.map((item) => item.command),
    ["provider_models_prepare", "provider_models_release"],
  );
});

test("a failed Native cancellation is reported as an error, rather than confirmed cancellation", async (t) => {
  const f = nativeFixture(t, false, true);
  const valid = {
    version: 1 as const,
    name: "Fixture",
    baseUrl: url,
    ...options,
    model: "fixture-model",
  };
  const connection = newModelProfileConnection(valid);
  const states: ConnectionState[] = [],
    requestRef = { current: null as AbortController | null };
  const pending = testProviderConnection({
    valid,
    apiKey: "",
    credentialRef: connection.credentialRef!,
    connections: [connection],
    requestRef,
    setConnection: (state) => states.push(state),
  });
  await f.fetching;
  requestRef.current!.abort("user");
  await soon(pending);
  assert.equal(states.at(-1)?.kind, "error");
  assert.match(states.at(-1)!.message, /未能确认原生请求已取消/);
  assert.equal(f.commands.at(-1)?.command, "provider_models_release");
});
