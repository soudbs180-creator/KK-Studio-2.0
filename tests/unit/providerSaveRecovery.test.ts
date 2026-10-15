import assert from "node:assert/strict";
import test from "node:test";
import {
  GOOGLE_CONNECTION_ID,
  GOOGLE_CREDENTIAL_REF,
  getGoogleCredential,
  saveGoogleApiKeyConnection,
} from "../../src/features/agent/googleAgentConfig.ts";
import { GOOGLE_API_BASE } from "../../src/features/agent/googleInteractions.ts";
import {
  loadApiKey,
  setSessionApiKey,
} from "../../src/features/creation/providerCredentials.ts";
import {
  clearProviderConnectionKey,
  ProviderSaveError,
} from "../../src/features/creation/providerSaveRecovery.ts";
import {
  loadProviderConnectionsDurable,
  loadProviderConnectionsDurableSnapshot,
  PROVIDER_CONNECTIONS_STORAGE_KEY,
  readProviderConnections,
} from "../../src/features/creation/providerRegistry.ts";

async function withDesktop(
  run: (fixture: {
    storage: Map<string, string>;
    vault: Map<string, string>;
    failWrite: () => void;
    failCredentialSet: (concurrentUpdate?: boolean) => void;
    failCache: (enabled?: boolean) => void;
    replaceNative: (connections: unknown[]) => void;
    replaceNativePayload: (connections: unknown) => void;
    nativeConnections: () => unknown[];
    nativePayload: () => unknown;
    nativeWrites: () => readonly string[];
  }) => Promise<void>,
) {
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  const storage = new Map<string, string>();
  const vault = new Map<string, string>();
  let connections: unknown[] = [];
  let payloadOverride: { value: unknown } | null = null;
  let revision = 1;
  let refuseWrite = false;
  let refuseCredentialSet = false;
  let concurrentUpdate = false;
  let refuseCache = false;
  const nativeWrites: string[] = [];
  setSessionApiKey("", GOOGLE_API_BASE, GOOGLE_CREDENTIAL_REF);
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: { protocol: "tauri:", hostname: "tauri.localhost" },
      navigator: {
        locks: {
          request: (
            _name: string,
            _options: unknown,
            run: () => Promise<unknown>,
          ) => run(),
        },
      },
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          if (refuseCache) throw new Error("synthetic cache unavailable");
          storage.set(key, value);
        },
        removeItem: (key: string) => storage.delete(key),
      },
      __TAURI_INTERNALS__: {
        invoke: async (command: string, args: Record<string, unknown> = {}) => {
          if (
            [
              "write_provider_config",
              "commit_provider_connection",
              "credential_set",
              "credential_delete",
            ].includes(command)
          )
            nativeWrites.push(command);
          if (command === "read_provider_config")
            return {
              status: "loaded",
              revision,
              connections: payloadOverride
                ? payloadOverride.value
                : connections,
            };
          if (command === "write_provider_config") {
            if (refuseWrite)
              throw new Error("conflict: synthetic stale revision");
            assert.equal(args.expectedRevision, revision);
            payloadOverride = null;
            connections = structuredClone(args.connections as unknown[]);
            return ++revision;
          }
          if (command === "commit_provider_connection") {
            if (refuseWrite)
              throw new Error("conflict: synthetic stale revision");
            assert.equal(args.expectedRevision, revision);
            const original = structuredClone(connections);
            payloadOverride = null;
            connections = structuredClone(args.connections as unknown[]);
            const ownedRevision = ++revision;
            if (refuseCredentialSet && (args.secret || args.clearSecret)) {
              if (concurrentUpdate) {
                connections = connections.map((item) => ({
                  ...(item as Record<string, unknown>),
                  model: "concurrent-model",
                }));
                revision++;
              }
              if (revision === ownedRevision) {
                connections = original;
                revision++;
              }
              throw new Error("credential: synthetic vault unavailable");
            }
            if (args.secret)
              vault.set(String(args.providerId), String(args.secret));
            if (args.clearSecret) vault.delete(String(args.providerId));
            return {
              revision: ownedRevision,
              credentialState: args.clearSecret
                ? "missing"
                : args.secret
                  ? "saved"
                  : "unchanged",
            };
          }
          if (command === "credential_get")
            return vault.get(String(args.providerId)) ?? null;
          if (command === "credential_set") {
            if (refuseCredentialSet) {
              if (concurrentUpdate) {
                connections = connections.map((item) => ({
                  ...(item as Record<string, unknown>),
                  model: "concurrent-model",
                }));
                revision++;
                // An independent observer must not change the compensation's owned CAS revision.
                await loadProviderConnectionsDurable({ publishCache: false });
              }
              throw new Error("synthetic credential write unavailable");
            }
            vault.set(String(args.providerId), String(args.secret));
            return true;
          }
          if (command === "credential_delete")
            return vault.delete(String(args.providerId));
          throw new Error(`Unexpected native command: ${command}`);
        },
      },
    },
  });
  try {
    await loadProviderConnectionsDurable();
    await run({
      storage,
      vault,
      failWrite: () => {
        refuseWrite = true;
      },
      failCredentialSet: (supersede = false) => {
        refuseCredentialSet = true;
        concurrentUpdate = supersede;
      },
      failCache: (enabled = true) => {
        refuseCache = enabled;
      },
      replaceNative: (next) => {
        payloadOverride = null;
        connections = structuredClone(next);
        revision++;
      },
      replaceNativePayload: (next) => {
        payloadOverride = { value: structuredClone(next) };
        revision++;
      },
      nativeConnections: () => connections,
      nativePayload: () =>
        payloadOverride ? payloadOverride.value : connections,
      nativeWrites: () => nativeWrites,
    });
  } finally {
    setSessionApiKey("", GOOGLE_API_BASE, GOOGLE_CREDENTIAL_REF);
    if (original) Object.defineProperty(globalThis, "window", original);
    else Reflect.deleteProperty(globalThis, "window");
  }
}

test("Google saved metadata survives authoritative native reload without storing the secret", async () => {
  await withDesktop(async ({ storage, nativeConnections }) => {
    await saveGoogleApiKeyConnection("synthetic-google-new");
    storage.clear();
    await loadProviderConnectionsDurable();
    assert.equal(readProviderConnections()[0]?.id, GOOGLE_CONNECTION_ID);
    assert.equal(
      readProviderConnections()[0]?.credentialRef,
      GOOGLE_CREDENTIAL_REF,
    );
    assert.equal(nativeConnections().length, 1);
    assert.equal(
      JSON.stringify([...storage.values()]).includes("synthetic-google-new"),
      false,
    );
  });
});

test("Google metadata recovery preserves an existing authoritative account instead of rewriting its model or health", async () => {
  await withDesktop(
    async ({ storage, vault, replaceNative, nativeConnections }) => {
      await saveGoogleApiKeyConnection("synthetic-google-existing");
      const authoritative = [
        {
          ...(nativeConnections()[0] as Record<string, unknown>),
          model: "custom-google-model",
          healthRevision: 42,
        },
      ];
      replaceNative(authoritative);
      storage.delete(PROVIDER_CONNECTIONS_STORAGE_KEY);
      const restored = await getGoogleCredential();
      assert.equal(restored.identity, "google-interactions:42");
      assert.deepEqual(nativeConnections(), authoritative);
      assert.equal(readProviderConnections()[0]?.model, "custom-google-model");
      assert.equal(
        vault.get(GOOGLE_CREDENTIAL_REF),
        "synthetic-google-existing",
      );
    },
  );
});

test("a committed save survives stale cache and repeated recovery without rewriting native stores", async () => {
  await withDesktop(
    async ({ storage, vault, failCache, nativePayload, nativeWrites }) => {
      await saveGoogleApiKeyConnection("synthetic-cache-before");
      const staleCache = storage.get(PROVIDER_CONNECTIONS_STORAGE_KEY);
      failCache();
      await assert.rejects(
        saveGoogleApiKeyConnection("synthetic-cache-after"),
        (error) =>
          error instanceof ProviderSaveError &&
          error.credentialState === "saved",
      );
      const committed = structuredClone(nativePayload());
      const writes = [...nativeWrites()];
      assert.equal(storage.get(PROVIDER_CONNECTIONS_STORAGE_KEY), staleCache);
      assert.equal(vault.get(GOOGLE_CREDENTIAL_REF), "synthetic-cache-after");

      failCache(false);
      for (let recovery = 0; recovery < 2; recovery++) {
        storage.delete(PROVIDER_CONNECTIONS_STORAGE_KEY);
        await getGoogleCredential();
        assert.deepEqual(nativePayload(), committed);
        assert.deepEqual(nativeWrites(), writes);
        assert.equal(vault.get(GOOGLE_CREDENTIAL_REF), "synthetic-cache-after");
        assert.equal(readProviderConnections()[0]?.id, GOOGLE_CONNECTION_ID);
        assert.equal(
          readProviderConnections()[0]?.credentialRef,
          GOOGLE_CREDENTIAL_REF,
        );
      }
      const nonSecretStores = JSON.stringify([
        nativePayload(),
        ...storage.values(),
      ]);
      assert.equal(nonSecretStores.includes("synthetic-cache-before"), false);
      assert.equal(nonSecretStores.includes("synthetic-cache-after"), false);
    },
  );
});

test("Google metadata recovery refuses an authoritative different identity without altering its entry", async () => {
  await withDesktop(async ({ storage, replaceNative, nativeConnections }) => {
    await saveGoogleApiKeyConnection("synthetic-google-existing");
    const authoritative = [
      {
        ...(nativeConnections()[0] as Record<string, unknown>),
        credentialRef: "other_opaque_account",
        model: "other-google-model",
      },
    ];
    replaceNative(authoritative);
    storage.delete(PROVIDER_CONNECTIONS_STORAGE_KEY);
    await assert.rejects(getGoogleCredential());
    assert.deepEqual(nativeConnections(), authoritative);
  });
});

test("a cache failure after clearing the vault reports the committed missing state", async () => {
  await withDesktop(async ({ vault, failCache }) => {
    await saveGoogleApiKeyConnection("synthetic-google-existing");
    const connection = readProviderConnections()[0]!;
    failCache();
    await assert.rejects(
      clearProviderConnectionKey(connection),
      (error) =>
        error instanceof ProviderSaveError &&
        (error as ProviderSaveError & { credentialState?: string })
          .credentialState === "missing",
    );
    assert.equal(vault.has(GOOGLE_CREDENTIAL_REF), false);
  });
});

test("a cache failure after saving a new key reports the committed saved state", async () => {
  await withDesktop(async ({ vault, failCache }) => {
    failCache();
    await assert.rejects(
      saveGoogleApiKeyConnection("synthetic-google-new"),
      (error) =>
        error instanceof ProviderSaveError &&
        (error as ProviderSaveError & { credentialState?: string })
          .credentialState === "saved",
    );
    assert.equal(vault.get(GOOGLE_CREDENTIAL_REF), "synthetic-google-new");
  });
});

test("credential write failure compensates only this save's metadata and preserves the old vault value", async () => {
  await withDesktop(
    async ({ storage, vault, failCredentialSet, nativeConnections }) => {
      await saveGoogleApiKeyConnection("synthetic-google-old");
      const previous = structuredClone(nativeConnections());
      const previousCache = storage.get(PROVIDER_CONNECTIONS_STORAGE_KEY);
      failCredentialSet();
      await assert.rejects(
        saveGoogleApiKeyConnection("synthetic-google-replacement"),
      );
      assert.equal(vault.get(GOOGLE_CREDENTIAL_REF), "synthetic-google-old");
      assert.deepEqual(nativeConnections(), previous);
      assert.equal(
        storage.get(PROVIDER_CONNECTIONS_STORAGE_KEY),
        previousCache,
      );
    },
  );
});

test("failed credential write cannot compensate over a concurrent native revision after an independent reload", async () => {
  await withDesktop(async ({ vault, failCredentialSet, nativeConnections }) => {
    await saveGoogleApiKeyConnection("synthetic-google-old");
    failCredentialSet(true);
    await assert.rejects(
      saveGoogleApiKeyConnection("synthetic-google-replacement"),
    );
    assert.equal(
      (nativeConnections()[0] as Record<string, unknown>).model,
      "concurrent-model",
    );
    assert.equal(vault.get(GOOGLE_CREDENTIAL_REF), "synthetic-google-old");
  });
});

test("Google native conflict rejects the save and preserves the previous credential and metadata", async () => {
  await withDesktop(async ({ storage, vault, failWrite }) => {
    await saveGoogleApiKeyConnection("synthetic-google-old");
    const previous = storage.get(PROVIDER_CONNECTIONS_STORAGE_KEY);
    failWrite();
    await assert.rejects(
      saveGoogleApiKeyConnection("synthetic-google-replacement"),
    );
    assert.equal(vault.get(GOOGLE_CREDENTIAL_REF), "synthetic-google-old");
    assert.equal(storage.get(PROVIDER_CONNECTIONS_STORAGE_KEY), previous);
  });
});

test("an authoritative empty native config clears stale browser connections", async () => {
  await withDesktop(async ({ storage }) => {
    // This valid stale record was saved by the browser, not by the native repository.
    storage.set(
      PROVIDER_CONNECTIONS_STORAGE_KEY,
      JSON.stringify([
        {
          id: "old-account",
          provider: "Old account",
          kind: "user_byok",
          displayName: "Old account",
          baseUrl: "https://old.example/v1",
          credentialRef: "opaque_old",
          model: "image-old",
          state: "active",
          concurrencyLimit: 1,
          capabilities: {
            modalities: ["image"],
            operations: ["generate"],
            async: false,
          },
        },
      ]),
    );
    await loadProviderConnectionsDurable();
    assert.equal(readProviderConnections().length, 0);
  });
});

for (const shape of ["all-invalid", "mixed-valid-invalid"] as const) {
  for (const operation of [
    "snapshot read",
    "published load",
    "Google restore",
    "Google save",
  ] as const) {
    test(`${operation} rejects ${shape} native metadata without changing native records, cache or vault`, async () => {
      await withDesktop(
        async ({
          storage,
          vault,
          replaceNative,
          nativeConnections,
          nativeWrites,
        }) => {
          await saveGoogleApiKeyConnection("synthetic-google-existing");
          const google = nativeConnections()[0] as Record<string, unknown>;
          const otherAccount = {
            ...google,
            id: "native-valid-other",
            provider: "Other provider",
            displayName: "Other provider",
            credentialRef: "native_valid_other",
          };
          const invalidGoogle = {
            ...google,
            concurrencyLimit: 0,
          };
          replaceNative(
            shape === "all-invalid"
              ? [invalidGoogle]
              : [otherAccount, invalidGoogle],
          );
          // Keep valid browser metadata so failed native hydration must not
          // erase a usable cache; Google recovery still has to read native.
          storage.set(
            PROVIDER_CONNECTIONS_STORAGE_KEY,
            JSON.stringify([otherAccount]),
          );
          vault.set("native_valid_other", "synthetic-other-existing");
          const previousNative = structuredClone(nativeConnections());
          const previousCache = new Map(storage);
          const previousVault = new Map(vault);
          const previousWrites = nativeWrites().length;
          let rejected = false;
          try {
            if (operation === "snapshot read")
              await loadProviderConnectionsDurableSnapshot();
            else if (operation === "published load")
              await loadProviderConnectionsDurable();
            else if (operation === "Google restore")
              await getGoogleCredential();
            else
              await saveGoogleApiKeyConnection("synthetic-google-replacement");
          } catch {
            rejected = true;
          }
          assert.deepEqual(
            nativeConnections(),
            previousNative,
            "Invalid native records must remain available for recovery",
          );
          assert.deepEqual(
            storage,
            previousCache,
            "A rejected native read must preserve the browser cache",
          );
          assert.deepEqual(
            vault,
            previousVault,
            "A rejected native read must preserve existing vault keys",
          );
          assert.equal(
            nativeWrites().length,
            previousWrites,
            "Invalid native metadata must block all native writes",
          );
          assert.equal(rejected, true, "Invalid native metadata must reject");
        },
      );
    });
  }
}

for (const payload of [null, { invalid: "synthetic-native-record" }]) {
  for (const publishCache of [false, true]) {
    test(`${publishCache ? "published load" : "snapshot read"} rejects native ${payload === null ? "null" : "object"} metadata without changing any store`, async () => {
      await withDesktop(
        async ({
          storage,
          vault,
          replaceNativePayload,
          nativePayload,
          nativeWrites,
        }) => {
          await saveGoogleApiKeyConnection("synthetic-google-existing");
          replaceNativePayload(payload);
          const previousNative = structuredClone(nativePayload());
          const previousCache = new Map(storage);
          const previousVault = new Map(vault);
          const previousWrites = nativeWrites().length;
          await assert.rejects(
            publishCache
              ? loadProviderConnectionsDurable()
              : loadProviderConnectionsDurableSnapshot(),
          );
          assert.deepEqual(nativePayload(), previousNative);
          assert.deepEqual(storage, previousCache);
          assert.deepEqual(vault, previousVault);
          assert.equal(nativeWrites().length, previousWrites);
        },
      );
    });
  }
}

test("a previously saved Google vault key restores missing metadata without replacing the key", async () => {
  await withDesktop(async ({ vault, nativeConnections }) => {
    vault.set(GOOGLE_CREDENTIAL_REF, "synthetic-google-existing");
    const restored = await getGoogleCredential();
    assert.equal(restored.apiKey, "synthetic-google-existing");
    assert.equal(
      readProviderConnections()[0]?.credentialRef,
      GOOGLE_CREDENTIAL_REF,
    );
    assert.equal(nativeConnections().length, 1);
    assert.equal(vault.get(GOOGLE_CREDENTIAL_REF), "synthetic-google-existing");
  });
});

test("desktop credential reads observe a key replaced by another window instead of a stale session cache", async () => {
  await withDesktop(async ({ vault }) => {
    vault.set(GOOGLE_CREDENTIAL_REF, "synthetic-google-old");
    assert.equal(
      await loadApiKey(GOOGLE_API_BASE, GOOGLE_CREDENTIAL_REF),
      "synthetic-google-old",
    );
    vault.set(GOOGLE_CREDENTIAL_REF, "synthetic-google-rotated");
    assert.equal(
      await loadApiKey(GOOGLE_API_BASE, GOOGLE_CREDENTIAL_REF),
      "synthetic-google-rotated",
    );
  });
});

test("desktop credential reads observe an externally cleared key without treating the old cache as saved", async () => {
  await withDesktop(async ({ vault }) => {
    vault.set(GOOGLE_CREDENTIAL_REF, "synthetic-google-old");
    await loadApiKey(GOOGLE_API_BASE, GOOGLE_CREDENTIAL_REF);
    vault.delete(GOOGLE_CREDENTIAL_REF);
    assert.equal(await loadApiKey(GOOGLE_API_BASE, GOOGLE_CREDENTIAL_REF), "");
  });
});
