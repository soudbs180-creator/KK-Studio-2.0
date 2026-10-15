import assert from "node:assert/strict";
import test from "node:test";
import { apiMenuEntries } from "../../src/features/models/modelMenuEntries.ts";

function installStorage(value: string) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: () => value,
      setItem: () => undefined,
    },
  });
  return () => {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  };
}

test("image API rows show the exact verified model id before its family", () => {
  const restore = installStorage(
    JSON.stringify([
      {
        id: "doubao-connection",
        baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
        credentialRef: "vault-ref",
        fetchedAt: Date.now(),
        models: [
          {
            id: "doubao-seedream-4-5-250828-2k",
            kind: "image",
            family: "Seedream",
            variant: "2K",
          },
        ],
      },
    ]),
  );
  try {
    const entries = apiMenuEntries(
      [
        {
          id: "doubao-connection",
          provider: "doubao",
          kind: "user_byok",
          displayName: "豆包官方 API",
          baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
          credentialRef: "vault-ref",
          capabilities: { modalities: ["image"] },
          state: "active",
        },
      ] as Parameters<typeof apiMenuEntries>[0],
      undefined,
      "image",
      "",
    );
    assert.equal(entries[0]?.label, "doubao-seedream-4-5-250828-2k");
    assert.match(entries[0]?.detail ?? "", /Seedream/);
  } finally {
    restore();
  }
});

test("picker lists every exact model version and keeps duplicate routes separate", () => {
  const connections = ["a", "b"].map((id) => ({
    id,
    provider: "Same",
    kind: "user_byok",
    displayName: id,
    baseUrl: `https://${id}.example/v1`,
    credentialRef: id,
    capabilities: { modalities: ["image"] },
    state: "active",
  }));
  const restore = installStorage(
    JSON.stringify(
      connections.map((connection) => ({
        ...connection,
        fetchedAt: 1,
        models: ["aurora-2k-low", "aurora-2k-high", "aurora-4k-high"].map(
          (id) => ({ id, kind: "image", family: "Aurora" }),
        ),
      })),
    ),
  );
  try {
    const entries = apiMenuEntries(
      connections as Parameters<typeof apiMenuEntries>[0],
      undefined,
      "image",
      "",
    );
    assert.equal(entries.length, 6);
    assert.deepEqual(
      entries.map((item) => item.selection?.model),
      [
        "aurora-2k-low",
        "aurora-2k-high",
        "aurora-4k-high",
        "aurora-2k-low",
        "aurora-2k-high",
        "aurora-4k-high",
      ],
    );
    assert.equal(new Set(entries.map((item) => item.id)).size, 6);
  } finally {
    restore();
  }
});
