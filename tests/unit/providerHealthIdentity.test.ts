import assert from "node:assert/strict";
import test from "node:test";
import {
  markProviderConnectionFailure,
  markProviderConnectionHealthy,
  readProviderConnections,
  writeProviderConnections,
} from "../../src/features/creation/providerRegistry.ts";
import type { ProviderConnection } from "../../src/domain/providerConnections.ts";

const CONNECTION: ProviderConnection = {
  id: "byok-gate-1",
  provider: "验收",
  kind: "user_byok",
  displayName: "门禁验收",
  baseUrl: "https://api.example.com/v1",
  credentialRef: "cred-gate-1",
  model: "image-model",
  capabilities: {
    modalities: ["image"],
    operations: ["generate", "edit"],
    maxReferences: 4,
    maxOutputs: 4,
    async: false,
  },
  state: "active",
  concurrencyLimit: 2,
  verificationStatus: "verified",
};

function withStorage(run: () => void): void {
  const storage = new Map<string, string>();
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
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
    run();
  } finally {
    if (original) Object.defineProperty(globalThis, "window", original);
    else Reflect.deleteProperty(globalThis, "window");
  }
}

test("failure：expected 身份匹配时正常回写 cooldown", () => {
  withStorage(() => {
    writeProviderConnections([CONNECTION]);
    markProviderConnectionFailure(
      CONNECTION.id,
      { kind: "rate_limited", retryAfterSeconds: 15 },
      { baseUrl: CONNECTION.baseUrl, credentialRef: CONNECTION.credentialRef },
    );
    const updated = readProviderConnections().find(
      (item) => item.id === CONNECTION.id,
    );
    assert.equal(updated?.state, "cooldown");
    assert.ok(
      (updated?.cooldownUntil ?? 0) > Date.now() + 10_000,
      "retryAfter 生效",
    );
  });
});

test("failure：baseUrl 已变更的迟到回执不污染新配置", () => {
  withStorage(() => {
    writeProviderConnections([CONNECTION]);
    markProviderConnectionFailure(
      CONNECTION.id,
      { kind: "rate_limited" },
      { baseUrl: "https://old.example.com/v1", credentialRef: CONNECTION.credentialRef },
    );
    const updated = readProviderConnections().find(
      (item) => item.id === CONNECTION.id,
    );
    assert.equal(updated?.state, "active", "旧身份回执不得降级新配置");
    assert.equal(updated?.cooldownUntil, undefined);
  });
});

test("failure：credentialRef 已变更的迟到回执不污染新配置", () => {
  withStorage(() => {
    writeProviderConnections([CONNECTION]);
    markProviderConnectionFailure(
      CONNECTION.id,
      { kind: "unauthorized" },
      { baseUrl: CONNECTION.baseUrl, credentialRef: "cred-old" },
    );
    const updated = readProviderConnections().find(
      (item) => item.id === CONNECTION.id,
    );
    assert.equal(updated?.state, "active", "旧凭据身份回执不得隔离新配置");
  });
});

test("healthy：expected 身份匹配时恢复正常", () => {
  withStorage(() => {
    const degraded = { ...CONNECTION, state: "degraded" as const };
    writeProviderConnections([degraded]);
    markProviderConnectionHealthy(CONNECTION.id, {
      baseUrl: CONNECTION.baseUrl,
      credentialRef: CONNECTION.credentialRef,
    });
    const updated = readProviderConnections().find(
      (item) => item.id === CONNECTION.id,
    );
    assert.equal(updated?.state, "active");
  });
});

test("healthy：expected 身份不匹配的迟到成功回执不重置新配置", () => {
  withStorage(() => {
    const degraded = { ...CONNECTION, state: "degraded" as const };
    writeProviderConnections([degraded]);
    markProviderConnectionHealthy(CONNECTION.id, {
      baseUrl: "https://old.example.com/v1",
      credentialRef: CONNECTION.credentialRef,
    });
    const updated = readProviderConnections().find(
      (item) => item.id === CONNECTION.id,
    );
    assert.equal(updated?.state, "degraded", "旧身份成功回执不得重置新配置");
  });
});
