import assert from "node:assert/strict";
import test from "node:test";
import { invoke } from "@tauri-apps/api/core";
import {
  requestConfigCredential,
  configuredCapabilityStatus,
  createBrowserConfigToolHost,
  CONFIG_SNAPSHOTS_KEY,
} from "../../src/features/providers/configAgentRuntime.ts";
import { PROVIDER_CONNECTIONS_STORAGE_KEY } from "../../src/integrations/providers/providerStore.ts";
import { DEFAULT_LOCAL_CONNECTION } from "../../src/domain/providerConnections.ts";

test("credential request without dialog is cancelled; a UI owner stores a fake key only through native credential_set", async () => {
  const target = new EventTarget();
  const fake = "sk-FAKE-CONFIG-POPUP-KEY-1234567890";
  const vault = new Map<string, string>();
  const events: string[] = [],
    logs: string[] = [];
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      __TAURI_INTERNALS__: {
        invoke: async (command: string, args: Record<string, string>) => {
          assert.equal(command, "credential_set");
          vault.set(args.providerId, args.secret);
          return true;
        },
      },
    },
  });
  try {
    assert.deepEqual(
      await requestConfigCredential(
        DEFAULT_LOCAL_CONNECTION,
        undefined,
        target,
      ),
      { status: "cancelled" },
    );
    target.addEventListener("kk:credential-request", (event) => {
      event.preventDefault();
      const detail = (event as CustomEvent).detail;
      events.push(JSON.stringify(detail));
      void invoke("credential_set", {
        providerId: detail.credentialRef,
        secret: fake,
      }).then(() => detail.respond("provided"));
    });
    const result = await requestConfigCredential(
      DEFAULT_LOCAL_CONNECTION,
      undefined,
      target,
    );
    assert.deepEqual(result, { status: "provided" });
    assert.deepEqual([...vault.values()], [fake]);
    logs.push(JSON.stringify(result));
    assert.ok(!JSON.stringify({ events, logs, result }).includes(fake));
  } finally {
    if (original) Object.defineProperty(globalThis, "window", original);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("credential cancellation aborts a dialog-owned request without returning any secret", async () => {
  const target = new EventTarget();
  target.addEventListener("kk:credential-request", (event) =>
    event.preventDefault(),
  );
  const controller = new AbortController();
  const pending = requestConfigCredential(
    DEFAULT_LOCAL_CONNECTION,
    controller.signal,
    target,
  );
  controller.abort();
  assert.deepEqual(await pending, { status: "cancelled" });
});

test("disabled connections are never reported as configured capability routes", async () => {
  const status = await configuredCapabilityStatus([
    { ...DEFAULT_LOCAL_CONNECTION, state: "disabled" },
  ]);
  assert.ok(
    status.every(
      (item) => item.status === "unavailable" && item.adapter === null,
    ),
  );
  const enabled = await configuredCapabilityStatus([DEFAULT_LOCAL_CONNECTION]);
  assert.equal(
    enabled.find((item) => item.capability === "image.inpaint")?.adapter,
    "image.inpaint/comfyui",
  );
  assert.ok(enabled.every((item) => item.liveStatus === "unknown"));
  const expired = await configuredCapabilityStatus([
    {
      ...DEFAULT_LOCAL_CONNECTION,
      state: "cooldown",
      cooldownUntil: Date.now() - 1000,
      capabilities: {
        modalities: ["text"],
        operations: ["chat"],
        async: false,
      },
    },
  ]);
  assert.equal(
    expired.find((item) => item.capability === "text.chat")?.status,
    "configured",
  );
});

function metadataRuntime(t: { after(fn: () => void): void }) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  let native = [
    { ...DEFAULT_LOCAL_CONNECTION, model: "old" },
    { ...DEFAULT_LOCAL_CONNECTION, id: "second", model: "old" },
  ];
  let revision = 1,
    writes = 0;
  const store = new Map<string, string>([
    [PROVIDER_CONNECTIONS_STORAGE_KEY, JSON.stringify(native)],
  ]);
  const locks: string[] = [];
  const held: Array<{ name: string }> = [];
  const target = Object.assign(new EventTarget(), {
    location: { protocol: "tauri:", hostname: "localhost" },
    navigator: {
      locks: {
        query: async () => ({ held }),
        request: async (
          name: string,
          _options: unknown,
          run: () => unknown,
        ) => {
          locks.push(name);
          return run();
        },
      },
    },
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
    },
    __TAURI_INTERNALS__: {
      invoke: async (command: string, args: Record<string, unknown> = {}) => {
        if (command === "read_provider_config")
          return {
            status: "loaded",
            revision,
            connections: structuredClone(native),
          };
        if (command === "write_provider_config") {
          assert.equal(args.expectedRevision, revision);
          native = structuredClone(args.connections as typeof native);
          writes++;
          return ++revision;
        }
        throw new Error("Unexpected native command");
      },
    },
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: target,
  });
  t.after(() => {
    if (descriptor) Object.defineProperty(globalThis, "window", descriptor);
    else Reflect.deleteProperty(globalThis, "window");
  });
  return {
    host: createBrowserConfigToolHost(),
    store,
    locks,
    held,
    get writes() {
      return writes;
    },
    get native() {
      return native;
    },
  };
}

test("native and cache normalization yield a stable apply version when optional verification is omitted", async (t) => {
  const f = metadataRuntime(t);
  const incoming: Partial<(typeof f.native)[1]> = { ...f.native[1] };
  delete incoming.verificationStatus;
  const draft = {
    version: 1,
    exportedAt: "2026-11-09T00:00:00.000Z",
    connections: [{ ...incoming, model: "new" }],
  };
  const proposed = await f.host.execute("kk_config_propose", { draft });
  const applied = await f.host.execute("kk_config_apply", {
    draft,
    expectedVersion: proposed.version,
  });
  assert.equal(applied.status, "applied");
  assert.equal(
    applied.version,
    (await f.host.execute("kk_config_get", {})).version,
  );
  assert.equal(
    (
      await f.host.execute("kk_config_rollback", {
        snapshotId: applied.snapshotId,
        expectedVersion: applied.version,
      })
    ).status,
    "restored",
  );
  assert.equal(f.native[1].model, "old");
});

test("live cache leases and actual slot locks block all configuration writes before snapshots", async (t) => {
  const f = metadataRuntime(t);
  const cached = structuredClone(f.native);
  cached[0].activeJobs = 1;
  cached[0].activeLeaseIds = ["live-lease"];
  f.store.set(PROVIDER_CONNECTIONS_STORAGE_KEY, JSON.stringify(cached));
  const draft = {
    version: 1,
    exportedAt: "2026-11-09T00:00:00.000Z",
    connections: [{ ...f.native[1], model: "new" }],
  };
  const proposed = await f.host.execute("kk_config_propose", { draft });
  await assert.rejects(
    f.host.execute("kk_config_apply", {
      draft,
      expectedVersion: proposed.version,
    }),
    /CONFIG_BUSY/,
  );
  assert.equal(f.writes, 0);
  assert.equal(f.store.has(CONFIG_SNAPSHOTS_KEY), false);
  assert.deepEqual(
    JSON.parse(f.store.get(PROVIDER_CONNECTIONS_STORAGE_KEY)!)[0]
      .activeLeaseIds,
    ["live-lease"],
  );
  f.store.set(PROVIDER_CONNECTIONS_STORAGE_KEY, JSON.stringify(f.native));
  f.held.push({
    name: "kk-studio:provider-slot:local-comfyui:another-live-lease",
  });
  await assert.rejects(
    f.host.execute("kk_config_apply", {
      draft,
      expectedVersion: (await f.host.execute("kk_config_get", {})).version,
    }),
    /CONFIG_BUSY/,
  );
  assert.equal(f.writes, 0);
  assert.ok(
    f.locks.includes("kk-studio:provider-save:v1") &&
      f.locks.includes("kk-studio:provider-registry-leases"),
  );
});

test("rollback never resurrects historical leases or overwrites newer health for unchanged connections", async (t) => {
  const f = metadataRuntime(t);
  const draft = {
    version: 1,
    exportedAt: "2026-11-09T00:00:00.000Z",
    connections: [{ ...f.native[1], model: "new" }],
  };
  const proposed = await f.host.execute("kk_config_propose", { draft });
  const applied = await f.host.execute("kk_config_apply", {
    draft,
    expectedVersion: proposed.version,
  });
  const current = JSON.parse(f.store.get(PROVIDER_CONNECTIONS_STORAGE_KEY)!);
  current[0] = {
    ...current[0],
    activeJobs: 0,
    activeLeaseIds: [],
    healthRevision: 3,
    verificationStatus: "verified",
    lastSuccessfulGenerationAt: "2026-11-09T01:00:00.000Z",
  };
  f.store.set(PROVIDER_CONNECTIONS_STORAGE_KEY, JSON.stringify(current));
  const version = (await f.host.execute("kk_config_get", {})).version;
  const rolled = await f.host.execute("kk_config_rollback", {
    snapshotId: applied.snapshotId,
    expectedVersion: version,
  });
  assert.equal(rolled.status, "restored");
  const restored = JSON.parse(f.store.get(PROVIDER_CONNECTIONS_STORAGE_KEY)!);
  assert.equal(restored[0].activeJobs, 0);
  assert.deepEqual(restored[0].activeLeaseIds, []);
  assert.equal(restored[0].healthRevision, 3);
  assert.equal(restored[0].verificationStatus, "verified");
  assert.equal(restored[1].model, "old");
});
