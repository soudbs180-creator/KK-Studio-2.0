import test from "node:test";
import assert from "node:assert/strict";
import {
  saveModelCatalog,
  catalogForConnection,
  readModelCatalogs,
} from "../../src/features/models/modelCatalog.ts";

test("model catalogs retain legacy identity but never cross protocol or authentication scope", () => {
  const descriptors = ["window", "localStorage"].map(
    (name) =>
      [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const,
  );
  const data = new Map<string, string>();
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
  };
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: storage, dispatchEvent: () => true },
  });
  try {
    const connection = {
      id: "same-account",
      baseUrl: "http://127.0.0.1:1234/v1",
      credentialRef: "same-opaque-reference",
    };
    saveModelCatalog(connection, [{ id: "key-scope-model", kind: "text" }]);
    assert.equal(
      catalogForConnection({
        ...connection,
        protocol: "openai-chat",
        authMode: "api-key",
      }).length,
      1,
    );
    assert.equal(
      catalogForConnection({ ...connection, protocol: "anthropic" }).length,
      0,
    );
    assert.equal(
      catalogForConnection({ ...connection, authMode: "none" }).length,
      0,
    );
    const local = {
      ...connection,
      protocol: "ollama" as const,
      authMode: "none" as const,
    };
    saveModelCatalog(local, [{ id: "local-only-model", kind: "unknown" }]);
    assert.equal(readModelCatalogs()[0].protocol, "ollama");
    assert.equal(readModelCatalogs()[0].authMode, "none");
    assert.equal(catalogForConnection(local)[0].id, "local-only-model");
    assert.equal(catalogForConnection(connection).length, 0);
    assert.equal(JSON.stringify(data).includes("secret"), false);
  } finally {
    for (const [name, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  }
});
