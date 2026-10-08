import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import {
  catalogForConnection,
  parseCatalogModels,
  readModelCatalogs,
  saveModelCatalog,
} from "../../src/features/models/modelCatalog.ts";
import {
  assertSubmissionConnection,
  reserveProviderSubmission,
} from "../../src/features/creation/providerSubmission.ts";
import {
  connectionFromModelProfile,
  readProviderConnections,
  writeProviderConnections,
} from "../../src/features/creation/providerRegistry.ts";
import type { ImageModelCapabilities } from "../../src/domain/imageModelCapabilities.ts";
import { canConnectTarget } from "../../src/components/canvas/connectionRules.ts";
import type { CanvasCollectionItem } from "../../src/domain/canvasItems.ts";

const catalogKey = "kk-studio:model-catalog:v1";
const connection = {
  id: "account-a",
  baseUrl: "https://images.example.test/v1",
  credentialRef: "opaque-a",
  model: "image-exact-2k",
  capabilities: {
    modalities: ["image"],
    operations: ["generate", "edit", "inpaint", "outpaint"],
    maxReferences: 4,
  },
};

function browserStorage(t: TestContext) {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
  const target = new EventTarget();
  const replacements = {
    localStorage: storage,
    window: {
      localStorage: storage,
      dispatchEvent: target.dispatchEvent.bind(target),
    },
  };
  for (const [name, value] of Object.entries(replacements)) {
    const original = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, value });
    t.after(() => {
      if (original) Object.defineProperty(globalThis, name, original);
      else Reflect.deleteProperty(globalThis, name);
    });
  }
  return values;
}

test("reported image declarations preserve unsupported operations and zero reference allowance", () => {
  const [model] = parseCatalogModels({
    data: [
      {
        id: "image-exact-2k",
        capabilities: {
          modalities: ["image"],
          sizes: ["1024x1024"],
          image: {
            generate: true,
            edit: false,
            inpaint: false,
            outpaint: true,
            maxReferences: 0,
            maxGenerationCount: 2,
            apiKey: "fixture-secret",
          },
        },
      },
    ],
  });
  assert.deepEqual(model.image, {
    generate: true,
    edit: false,
    inpaint: false,
    outpaint: true,
    maxReferences: 0,
    maxGenerationCount: 2,
  });
  assert.equal(model.source, "reported");
  assert.equal(JSON.stringify(model).includes("fixture-secret"), false);
});

test("malformed capability values stay unknown instead of disabling or authorizing an operation", () => {
  const models = parseCatalogModels({
    data: [
      { id: "image-missing" },
      {
        id: "image-bad",
        capabilities: {
          image: {
            generate: "true",
            edit: 0,
            inpaint: null,
            outpaint: [],
            maxReferences: -1,
            maxGenerationCount: 1.5,
          },
        },
      },
      {
        id: "image-limits",
        capabilities: {
          image: {
            edit: false,
            maxReferences: 65,
            maxGenerationCount: 0,
          },
        },
      },
    ],
  });
  assert.equal(models[0].image, undefined);
  assert.equal(models[1].image, undefined);
  assert.deepEqual(models[2].image, { edit: false });
});

test("catalog saves and reloads only whitelisted capability metadata", (t) => {
  const storage = browserStorage(t);
  const [model] = parseCatalogModels({
    data: [
      {
        id: connection.model,
        capabilities: {
          modalities: ["image"],
          image: { edit: false, maxReferences: 0, maxGenerationCount: 1 },
        },
      },
    ],
  });
  saveModelCatalog(connection, [
    { ...model, source: "manual", apiKey: "fixture-secret" } as typeof model,
  ]);
  assert.equal(storage.get(catalogKey)?.includes("fixture-secret"), false);
  assert.deepEqual(readModelCatalogs()[0].models[0].image, {
    edit: false,
    maxReferences: 0,
    maxGenerationCount: 1,
  });
  assert.equal(readModelCatalogs()[0].models[0].source, "manual");
});

test("manual declarations survive reported refresh for the same exact account and model", (t) => {
  browserStorage(t);
  const [manual] = parseCatalogModels({
    data: [
      {
        id: connection.model,
        capabilities: {
          modalities: ["image"],
          image: { edit: false, maxGenerationCount: 2 },
        },
      },
    ],
  });
  saveModelCatalog(connection, [{ ...manual, source: "manual" }], true);
  saveModelCatalog(
    connection,
    parseCatalogModels({
      data: [
        {
          id: connection.model,
          capabilities: {
            modalities: ["image"],
            image: { edit: true, maxGenerationCount: 8 },
          },
        },
      ],
    }),
  );
  assert.deepEqual(catalogForConnection(connection)[0].image, {
    edit: false,
    maxGenerationCount: 2,
  });
});

test("same route in two accounts keeps separate declarations and identity edits invalidate old capabilities", (t) => {
  browserStorage(t);
  const [model] = parseCatalogModels({
    data: [
      {
        id: connection.model,
        capabilities: { modalities: ["image"], image: { edit: false } },
      },
    ],
  });
  saveModelCatalog(connection, [model]);
  const second = { ...connection, id: "account-b", credentialRef: "opaque-b" };
  const [other] = parseCatalogModels({
    data: [
      {
        id: connection.model,
        capabilities: { modalities: ["image"], image: { edit: true } },
      },
    ],
  });
  saveModelCatalog(second, [other]);
  assert.deepEqual(catalogForConnection(connection)[0].image, { edit: false });
  assert.deepEqual(catalogForConnection(second)[0].image, { edit: true });
  for (const changed of [
    { ...connection, credentialRef: "opaque-new" },
    { ...connection, baseUrl: "https://changed.example.test/v1" },
  ])
    assert.equal(catalogForConnection(changed)[0].image, undefined);
  assert.equal(
    catalogForConnection({ ...connection, model: "image-exact-4k" })[0].image,
    undefined,
  );
});

test("legacy v1 catalogs retain sizes while absent capability declarations remain unknown", (t) => {
  const storage = browserStorage(t);
  storage.set(
    catalogKey,
    JSON.stringify([
      {
        ...connection,
        fetchedAt: 1,
        models: [
          {
            id: connection.model,
            kind: "image",
            sizes: ["1024x1024"],
          },
        ],
      },
    ]),
  );
  const model = catalogForConnection(connection)[0];
  assert.deepEqual(model.sizes, ["1024x1024"]);
  assert.equal(model.image, undefined);
});

function submission(t: TestContext, image?: ImageModelCapabilities) {
  browserStorage(t);
  const provider = connectionFromModelProfile({
    version: 1,
    name: "capability fixture",
    baseUrl: connection.baseUrl,
    model: connection.model,
  });
  writeProviderConnections([provider]);
  saveModelCatalog(provider, [{ id: provider.model!, kind: "image", image }]);
  return {
    provider,
    binding: {
      id: provider.id,
      baseUrl: provider.baseUrl,
      credentialRef: provider.credentialRef,
      model: provider.model,
      kind: "image" as const,
      referenceCount: 0,
      outputCount: 1,
    },
  };
}

test("explicitly unsupported generate or edit is rejected by the shared submission gate", (t) => {
  const { binding, provider } = submission(t, { generate: true, edit: false });
  assert.doesNotThrow(() => assertSubmissionConnection(binding));
  assert.throws(
    () => assertSubmissionConnection({ ...binding, referenceCount: 1 }),
    /不支持/,
  );
  saveModelCatalog(provider, [
    {
      id: provider.model!,
      kind: "image",
      image: { generate: false, edit: true },
    },
  ]);
  assert.throws(() => assertSubmissionConnection(binding), /不支持/);
  assert.doesNotThrow(() =>
    assertSubmissionConnection({ ...binding, referenceCount: 1 }),
  );
});

test("model zero and tighter reference limits prevent submission without enlarging provider permission", (t) => {
  const { binding, provider } = submission(t, { maxReferences: 0 });
  assert.throws(
    () => assertSubmissionConnection({ ...binding, referenceCount: 1 }),
    /参考|不支持/,
  );
  saveModelCatalog(provider, [
    { id: provider.model!, kind: "image", image: { maxReferences: 1 } },
  ]);
  assert.doesNotThrow(() =>
    assertSubmissionConnection({ ...binding, referenceCount: 1 }),
  );
  assert.throws(
    () => assertSubmissionConnection({ ...binding, referenceCount: 2 }),
    /参考|不支持/,
  );
  saveModelCatalog(provider, [
    {
      id: provider.model!,
      kind: "image",
      image: { maxReferences: 8, edit: true },
    },
  ]);
  assert.throws(
    () => assertSubmissionConnection({ ...binding, referenceCount: 5 }),
    /参考|不支持/,
  );
  writeProviderConnections([
    {
      ...provider,
      capabilities: { ...provider.capabilities, operations: ["generate"] },
    },
  ]);
  assert.throws(
    () => assertSubmissionConnection({ ...binding, referenceCount: 1 }),
    /不支持/,
  );
});

test("model task output limit rejects excess outputs but does not mistake legacy HTTP limits for task limits", (t) => {
  const { binding, provider } = submission(t, { maxGenerationCount: 2 });
  assert.doesNotThrow(() =>
    assertSubmissionConnection({ ...binding, outputCount: 2 }),
  );
  assert.throws(
    () => assertSubmissionConnection({ ...binding, outputCount: 3 }),
    /数量|最多/,
  );
  saveModelCatalog(provider, [{ id: provider.model!, kind: "image" }]);
  assert.doesNotThrow(() =>
    assertSubmissionConnection({ ...binding, outputCount: 32 }),
  );
  assert.doesNotThrow(() =>
    assertSubmissionConnection({ ...binding, referenceCount: 1 }),
  );
});

test("lease recheck observes a late model declaration change before the next request", (t) => {
  const { binding, provider } = submission(t, { edit: true });
  const lease = reserveProviderSubmission({ ...binding, referenceCount: 1 });
  assert.equal(readProviderConnections()[0].activeJobs, 1);
  saveModelCatalog(provider, [
    { id: provider.model!, kind: "image", image: { edit: false } },
  ]);
  assert.throws(() => lease.assertCurrent(), /不支持/);
  lease.release();
  assert.equal(readProviderConnections()[0].activeJobs, 0);
});

test("canvas connection affordance refuses references beyond the exact model limit", (t) => {
  const { provider } = submission(t, { edit: true, maxReferences: 1 });
  const image = (id: string): CanvasCollectionItem => ({
    id,
    kind: "image",
    title: id,
    description: "",
  });
  const target = {
    ...image("target"),
    providerConnectionId: provider.id,
    model: provider.model,
  };
  const items = [image("source"), image("first"), target];
  assert.equal(canConnectTarget(items, [], "source", "target"), true);
  assert.equal(
    canConnectTarget(
      items,
      [
        {
          id: "first-edge",
          source: "first",
          target: "target",
          kind: "reference",
        },
      ],
      "source",
      "target",
    ),
    false,
  );
  assert.equal(
    canConnectTarget(
      [image("source"), { ...target, assetId: "archived-original" }],
      [],
      "source",
      "target",
    ),
    false,
  );
});

test("image declarations do not restrict a text model on the same account", (t) => {
  const { binding, provider } = submission(t, {
    generate: false,
    maxGenerationCount: 1,
  });
  saveModelCatalog(provider, [
    {
      id: "text-exact",
      kind: "text",
      image: { generate: false, maxGenerationCount: 1 },
    },
  ]);
  assert.doesNotThrow(() =>
    assertSubmissionConnection({
      ...binding,
      kind: "text",
      model: "text-exact",
      outputCount: 1,
    }),
  );
});

test("canvas reference permission counts the same archived asset once and still rejects an edit prohibition", (t) => {
  const { provider } = submission(t, { edit: true, maxReferences: 1 });
  const source: CanvasCollectionItem = {
    id: "source",
    kind: "image",
    title: "source",
    description: "",
    assetId: "shared-original",
  };
  const target = {
    ...source,
    id: "target",
    providerConnectionId: provider.id,
    model: provider.model,
  };
  assert.equal(
    canConnectTarget([source, target], [], source.id, target.id),
    true,
  );
  saveModelCatalog(provider, [
    { id: provider.model!, kind: "image", image: { edit: false } },
  ]);
  assert.equal(
    canConnectTarget([source, target], [], source.id, target.id),
    false,
  );
});

test("new canvas nodes without an explicit model use the current command selection for reference limits", (t) => {
  const { provider } = submission(t, { edit: false });
  const items: CanvasCollectionItem[] = [
    { id: "source", kind: "image", title: "source", description: "" },
    { id: "target", kind: "image", title: "target", description: "" },
  ];
  assert.equal(
    canConnectTarget(items, [], "source", "target", {
      source: "api",
      model: provider.model!,
      connectionId: provider.id,
    }),
    false,
  );
});
