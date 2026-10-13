import assert from "node:assert/strict";
import test from "node:test";
import {
  addProviderConnection,
  connectionFromModelProfile,
  newModelProfileConnection,
  readProviderConnections,
  writeProviderConnections,
} from "../../src/features/creation/providerRegistry.ts";
import {
  resolveProviderAuthMode,
  resolveProviderProtocol,
} from "../../src/domain/modelProvider.ts";
import {
  resolveModelProviderConnection,
  validateModelProviderProfile,
} from "../../src/components/settings/modelProviderSettingsState.ts";

const profile = {
  version: 1 as const,
  name: "Same provider",
  baseUrl: "https://same.example/v1",
  model: "image-same",
};
const derived = newModelProfileConnection(profile);
const opaque = { ...derived, id: "opaque-b", credentialRef: "vault_b" };

function withProviderStorage(run: () => void): void {
  const before = Object.getOwnPropertyDescriptor(globalThis, "window");
  const memory = new Map<string, string>();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => memory.get(key) ?? null,
        setItem: (key: string, value: string) => memory.set(key, value),
      },
    },
  });
  try {
    run();
  } finally {
    if (before) Object.defineProperty(globalThis, "window", before);
    else Reflect.deleteProperty(globalThis, "window");
  }
}

test("settings and execution resolve the edited protocol/auth/model on the selected opaque account", () => {
  withProviderStorage(() => {
    const current = {
      ...opaque,
      baseUrl: "http://127.0.0.1:11434/v1",
      protocol: "openai-compatible" as const,
      authMode: "api_key" as const,
    };
    writeProviderConnections([current]);
    const edited = {
      ...profile,
      baseUrl: current.baseUrl,
      connectionId: current.id,
      model: "claude-next",
      protocol: "anthropic-messages" as const,
      authMode: "none" as const,
    };
    const saved = resolveModelProviderConnection(edited, "vault_b", [current]);
    const executed = connectionFromModelProfile(edited);
    for (const connection of [saved, executed]) {
      assert.equal(connection.id, "opaque-b");
      assert.equal(connection.credentialRef, "vault_b");
      assert.equal(connection.model, "claude-next");
      assert.equal(connection.protocol, "anthropic-messages");
      assert.equal(connection.authMode, "none");
    }
  });
});

test("omitted legacy protocol/auth select their compatible defaults on both resolvers", () => {
  withProviderStorage(() => {
    const current = {
      ...opaque,
      baseUrl: "http://127.0.0.1:1234/v1",
      protocol: "gemini" as const,
      authMode: "none" as const,
    };
    writeProviderConnections([current]);
    const edited = {
      ...profile,
      baseUrl: current.baseUrl,
      connectionId: current.id,
    };
    const saved = resolveModelProviderConnection(edited, "vault_b", [current]);
    const executed = connectionFromModelProfile(edited);
    for (const connection of [saved, executed]) {
      assert.equal(connection.id, "opaque-b");
      assert.equal(connection.credentialRef, "vault_b");
      assert.equal(resolveProviderProtocol(connection), "openai-compatible");
      assert.equal(
        resolveProviderAuthMode(current.baseUrl, connection),
        "api_key",
      );
    }
  });
});

for (const changedField of ["protocol", "authMode"] as const) {
  test(`editing ${changedField} invalidates health and verification while retaining scheduler ownership`, () => {
    withProviderStorage(() => {
      const current = {
        ...opaque,
        baseUrl: "http://127.0.0.1:1234/v1",
        protocol: "openai-compatible" as const,
        authMode: "api_key" as const,
        state: "cooldown" as const,
        activeJobs: 1,
        activeLeaseIds: ["in-flight"],
        cooldownUntil: Date.now() + 60_000,
        healthRevision: 7,
        lastHealthCheckAt: "2026-10-13T00:00:00.000Z",
        verificationStatus: "verified" as const,
        lastSuccessfulGenerationAt: "2026-10-13T00:00:00.000Z",
      };
      writeProviderConnections([current]);
      addProviderConnection({
        ...current,
        ...(changedField === "protocol"
          ? { protocol: "gemini" as const }
          : { authMode: "none" as const }),
      });
      const saved = readProviderConnections()[0];
      assert.equal(saved.id, "opaque-b");
      assert.equal(saved.credentialRef, "vault_b");
      assert.equal(saved.healthRevision, 8);
      assert.equal(saved.lastHealthCheckAt, undefined);
      assert.equal(saved.verificationStatus, "unverified");
      assert.equal(saved.lastSuccessfulGenerationAt, undefined);
      assert.equal(saved.state, "cooldown");
      assert.equal(saved.activeJobs, 1);
      assert.deepEqual(saved.activeLeaseIds, ["in-flight"]);
      assert.equal(saved.cooldownUntil, current.cooldownUntil);
    });
  });
}

test("an edited account draft cannot replace an existing opaque identity with a derived credential", () => {
  const result = resolveModelProviderConnection(
    profile,
    derived.credentialRef!,
    [opaque],
  );
  assert.equal(result.id, derived.id);
  assert.equal(result.credentialRef, derived.credentialRef);
  assert.notEqual(result.id, opaque.id);
  assert.equal(opaque.credentialRef, "vault_b");
});

test("an ambiguous legacy account requires explicit selection even when one reference is derived", () => {
  let message = "";
  const report = (state: { message: string }) => {
    message = state.message;
  };
  assert.equal(
    validateModelProviderProfile(profile, report, [derived, opaque]),
    null,
  );
  assert.match(message, /明确选择账号/);
  assert.deepEqual(
    validateModelProviderProfile(
      { ...profile, connectionId: opaque.id },
      report,
      [derived, opaque],
    ),
    { ...profile, connectionId: opaque.id },
  );
  assert.equal(
    validateModelProviderProfile(
      { ...profile, connectionId: "removed" },
      report,
      [derived, opaque],
    ),
    null,
  );
});
