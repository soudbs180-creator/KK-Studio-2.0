import assert from "node:assert/strict";
import test from "node:test";
import type { ProviderConnection } from "../../src/domain/providerConnections.ts";
import {
  addProviderConnection,
  connectionFromModelProfile,
  markProviderConnectionHealthy,
  markProviderConnectionUnverified,
  normalizeProviderConnection,
  readProviderConnections,
  writeProviderConnections,
} from "../../src/features/creation/providerRegistry.ts";

function withStorage(run: (storage: Map<string, string>) => void): void {
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    },
  });
  try {
    run(storage);
  } finally {
    if (original) Object.defineProperty(globalThis, "window", original);
    else Reflect.deleteProperty(globalThis, "window");
  }
}

function fixture(): ProviderConnection {
  return connectionFromModelProfile({
    version: 1,
    name: "fixture",
    baseUrl: "https://models.example.test/v1",
    model: "image-test",
  });
}

test("new and legacy connections are configured but unverified", () => {
  const connection = fixture();
  assert.equal(connection.verificationStatus, "unverified");
  const legacy = { ...connection };
  delete legacy.verificationStatus;
  const normalized = normalizeProviderConnection(legacy);
  assert.equal(normalized?.verificationStatus, "unverified");
  assert.equal(normalized?.lastSuccessfulGenerationAt, undefined);
});

test("model-list health does not create image verification", () => {
  withStorage(() => {
    const connection = fixture();
    writeProviderConnections([connection]);
    const saved = readProviderConnections()[0];
    assert.equal(saved.verificationStatus, "unverified");
    assert.equal(saved.lastSuccessfulGenerationAt, undefined);
  });
});

test("only the successful-generation health transition records verification", () => {
  withStorage(() => {
    const connection = fixture();
    writeProviderConnections([connection]);
    const before = readProviderConnections()[0];
    markProviderConnectionHealthy(connection.id);
    const verified = readProviderConnections()[0];
    assert.equal(verified.state, "active");
    assert.equal(verified.verificationStatus, "verified");
    assert.ok(verified.lastSuccessfulGenerationAt);
    assert.notEqual(
      verified.lastSuccessfulGenerationAt,
      before.lastSuccessfulGenerationAt,
    );
  });
});

test("saving the same identity preserves verification history and scheduler health", () => {
  withStorage(() => {
    const connection = fixture();
    writeProviderConnections([
      {
        ...connection,
        state: "cooldown",
        cooldownUntil: Date.now() + 60_000,
        verificationStatus: "verified",
        lastSuccessfulGenerationAt: "2026-09-18T12:00:00.000Z",
      },
    ]);
    const edited = { ...connection, displayName: "已编辑显示名" };
    const [saved] = addProviderConnection(edited);
    assert.equal(saved.displayName, "已编辑显示名");
    assert.equal(saved.state, "cooldown");
    assert.equal(saved.verificationStatus, "verified");
    assert.equal(saved.lastSuccessfulGenerationAt, "2026-09-18T12:00:00.000Z");
    assert.ok((saved.cooldownUntil ?? 0) > Date.now());
  });
});

test("changing identity clears verification and invalidates an in-flight lease", () => {
  withStorage(() => {
    const connection = fixture();
    writeProviderConnections([
      {
        ...connection,
        state: "cooldown",
        activeJobs: 1,
        activeLeaseIds: ["lease-1"],
        cooldownUntil: Date.now() + 60_000,
        healthRevision: 4,
        verificationStatus: "verified",
        lastSuccessfulGenerationAt: "2026-09-18T12:00:00.000Z",
      },
    ]);
    const [saved] = addProviderConnection({
      ...connection,
      model: "image-test-v2",
    });
    assert.equal(saved.model, "image-test-v2");
    assert.equal(saved.state, "cooldown");
    assert.equal(saved.activeJobs, 1);
    assert.deepEqual(saved.activeLeaseIds, ["lease-1"]);
    assert.equal(saved.verificationStatus, "unverified");
    assert.equal(saved.lastSuccessfulGenerationAt, undefined);
    assert.equal(saved.healthRevision, 5);
  });
});

test("changing or clearing a key explicitly invalidates prior verification", () => {
  withStorage(() => {
    const connection = fixture();
    writeProviderConnections([
      {
        ...connection,
        verificationStatus: "verified",
        lastSuccessfulGenerationAt: "2026-09-18T12:00:00.000Z",
        healthRevision: 3,
      },
    ]);
    const [saved] = markProviderConnectionUnverified(connection.id);
    assert.equal(saved.verificationStatus, "unverified");
    assert.equal(saved.lastSuccessfulGenerationAt, undefined);
    assert.equal(saved.healthRevision, 4);
  });
});
