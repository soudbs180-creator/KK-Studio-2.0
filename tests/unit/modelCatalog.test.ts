import assert from "node:assert/strict";
import test from "node:test";
import {
  parseCatalogModels,
  catalogForConnection,
  imageSizeOptions,
  readModelCatalogs,
  saveModelCatalog,
} from "../../src/features/models/modelCatalog.ts";

const catalogKey = "kk-studio:model-catalog:v1";
const ownedConnection = {
  id: "catalog-identity-fixture",
  baseUrl: "http://127.0.0.1:11434/v1",
  credentialRef: "opaque_catalog_fixture",
  protocol: "openai-chat" as const,
  authMode: "api-key" as const,
};

function withCatalogStorage(run: (values: Map<string, string>) => void): void {
  const descriptors = ["localStorage", "window"].map(
    (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const,
  );
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
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
    run(values);
  } finally {
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
}

test("模型目录只接收非敏感元数据，未知模型不虚构能力", () => {
  const models = parseCatalogModels({
    data: [
      { id: "new-model", api_key: "secret" },
      {
        id: "image-v2",
        capabilities: {
          modalities: ["image"],
          sizes: ["1024x1024", "1536x1024", "bad"],
        },
      },
      { id: "image-v2" },
    ],
  });
  assert.equal(models.length, 2);
  assert.equal(models[0].kind, "unknown");
  assert.deepEqual(models[1].sizes, ["1024x1024", "1536x1024"]);
  assert.equal(JSON.stringify(models).includes("secret"), false);
  assert.throws(() => parseCatalogModels({ models: [] }));
});
test("同名模型保留账号身份，换地址或凭据后旧目录失效", () => {
  const connection = {
    id: "a",
    baseUrl: "https://api.example/v1",
    credentialRef: "key-a",
    model: "old",
  };
  const catalog = {
    ...connection,
    fetchedAt: 1,
    models: [{ id: "new", kind: "image" as const }],
  };
  assert.equal(
    catalogForConnection(connection, [catalog]).some(
      (model) => model.id === "new",
    ),
    true,
  );
  assert.equal(
    catalogForConnection({ ...connection, credentialRef: "key-b" }, [
      catalog,
    ])[0].id,
    "old",
  );
});
test("尺寸与比例来自明确规格，不把 16:9 任意换算为供应商尺寸", () => {
  assert.deepEqual(
    imageSizeOptions({
      id: "x",
      kind: "image",
      sizes: ["1536x1024", "1024x1024"],
    }),
    [
      { size: "1536x1024", ratio: "3:2" },
      { size: "1024x1024", ratio: "1:1" },
    ],
  );
  assert.deepEqual(imageSizeOptions({ id: "unknown", kind: "image" }), []);
});

const identityChanges = [
  ["protocol", { protocol: "gemini" }],
  ["authMode", { authMode: "none" }],
] as const;

for (const [field, patch] of identityChanges) {
  for (const source of ["reported", "manual"] as const) {
    test(`changing ${field} makes the previous ${source} catalog unavailable`, () => {
      withCatalogStorage(() => {
        saveModelCatalog(ownedConnection, [
          { id: "discovered-only", kind: "text", source },
        ]);
        assert.deepEqual(
          catalogForConnection({ ...ownedConnection, ...patch }),
          [],
        );
      });
    });
  }
  test(`saving a changed ${field} cannot inherit a same-named model's old manual declaration`, () => {
    withCatalogStorage(() => {
      saveModelCatalog(
        ownedConnection,
        [
          {
            id: "shared-model",
            kind: "image",
            source: "manual",
            sizes: ["1024x1024"],
            image: { generate: true, maxGenerationCount: 4 },
          },
        ],
        true,
      );
      const changed = { ...ownedConnection, ...patch };
      saveModelCatalog(changed, [
        { id: "shared-model", kind: "text", source: "reported" },
      ]);
      const model = catalogForConnection(changed)[0];
      assert.equal(model.kind, "text");
      assert.equal(model.source, "reported");
      assert.equal(model.image, undefined);
      assert.equal(model.sizes, undefined);
      assert.deepEqual(catalogForConnection(ownedConnection), []);
    });
  });
}

test("omitted legacy protocol and authentication remain compatible with explicit defaults", () => {
  withCatalogStorage((values) => {
    values.set(
      catalogKey,
      JSON.stringify([
        {
          id: ownedConnection.id,
          baseUrl: ownedConnection.baseUrl,
          credentialRef: ownedConnection.credentialRef,
          fetchedAt: 1,
          models: [{ id: "legacy-model", kind: "text", source: "manual" }],
        },
      ]),
    );
    assert.equal(catalogForConnection(ownedConnection)[0].id, "legacy-model");
    assert.equal(catalogForConnection(ownedConnection)[0].source, "manual");
    assert.deepEqual(
      catalogForConnection({ ...ownedConnection, authMode: "none" }),
      [],
    );
  });
});

test("refreshing the same protocol and authentication retains manual declarations", () => {
  withCatalogStorage(() => {
    const connection = {
      ...ownedConnection,
      protocol: "anthropic" as const,
      authMode: "api-key" as const,
    };
    saveModelCatalog(
      connection,
      [
        {
          id: "manual-model",
          kind: "image",
          source: "manual",
          sizes: ["1536x1024"],
        },
      ],
      true,
    );
    saveModelCatalog(connection, [
      { id: "manual-model", kind: "unknown", source: "reported" },
    ]);
    const model = catalogForConnection(connection)[0];
    assert.equal(model.kind, "image");
    assert.equal(model.source, "manual");
    assert.deepEqual(model.sizes, ["1536x1024"]);
  });
});

test("catalog persistence restores protocol and authentication without copying secrets", () => {
  withCatalogStorage((values) => {
    const connection = {
      ...ownedConnection,
      protocol: "gemini" as const,
      authMode: "api-key" as const,
      apiKey: "synthetic-catalog-secret-must-not-persist",
    };
    saveModelCatalog(connection, [
      { id: "restored-model", kind: "text", source: "reported" },
    ]);
    const catalog = readModelCatalogs()[0];
    assert.equal(catalog.protocol, "gemini");
    assert.equal(catalog.authMode, "api-key");
    assert.equal(catalogForConnection(connection)[0].id, "restored-model");
    const raw = values.get(catalogKey)!;
    assert.equal(
      raw.includes("synthetic-catalog-secret-must-not-persist"),
      false,
    );
    assert.equal(raw.includes("apiKey"), false);
  });
});

test("invalid persisted protocol and authentication do not fall back to legacy defaults", () => {
  withCatalogStorage((values) => {
    for (const patch of [
      { protocol: "invalid" },
      { protocol: null },
      { authMode: "oauth" },
      { authMode: null },
      { authMode: "none", baseUrl: "https://remote.example/v1" },
    ]) {
      values.set(
        catalogKey,
        JSON.stringify([
          {
            ...ownedConnection,
            ...patch,
            fetchedAt: 1,
            models: [{ id: "invalid-catalog-model", kind: "text" }],
          },
        ]),
      );
      assert.deepEqual(readModelCatalogs(), []);
      assert.deepEqual(catalogForConnection(ownedConnection), []);
    }
  });
});

test("invalid save identity leaves the previously stored catalog untouched", () => {
  withCatalogStorage((values) => {
    saveModelCatalog(ownedConnection, [{ id: "retained-model", kind: "text" }]);
    const previous = values.get(catalogKey);
    for (const patch of [
      { protocol: "invalid" },
      { protocol: null },
      { authMode: "oauth" },
      { authMode: null },
      { authMode: "none", baseUrl: "https://remote.example/v1" },
    ]) {
      const invalid = { ...ownedConnection, ...patch } as unknown as Parameters<
        typeof saveModelCatalog
      >[0];
      assert.throws(() =>
        saveModelCatalog(invalid, [{ id: "must-not-save", kind: "image" }]),
      );
      assert.equal(values.get(catalogKey), previous);
    }
  });
});
