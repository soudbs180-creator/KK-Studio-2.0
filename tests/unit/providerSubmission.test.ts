import assert from "node:assert/strict";
import test from "node:test";
import { generateImages } from "../../src/features/creation/imageGeneration.ts";
import { setSessionApiKey } from "../../src/features/creation/providerCredentials.ts";
import {
  assertSubmissionConnection,
  reserveProviderSubmission,
  reserveProviderSubmissionAsync,
} from "../../src/features/creation/providerSubmission.ts";
import {
  connectionFromModelProfile,
  writeProviderConnections,
  readProviderConnections,
  markProviderConnectionFailure,
} from "../../src/features/creation/providerRegistry.ts";

test("submission gates preserve identity, capacity and health across reserve/release", (t) => {
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
    const connection = connectionFromModelProfile({
      version: 1,
      name: "fixture",
      baseUrl: "https://example.test/v1",
      model: "image-test",
    });
    const binding = {
      id: connection.id,
      baseUrl: connection.baseUrl,
      credentialRef: connection.credentialRef,
      referenceCount: 0,
    };
    for (const state of [
      "cooldown",
      "quarantined",
      "disabled",
      "degraded",
    ] as const) {
      writeProviderConnections([
        {
          ...connection,
          state,
          cooldownUntil: state === "cooldown" ? Date.now() + 60000 : undefined,
        },
      ]);
      assert.throws(() => reserveProviderSubmission(binding));
      assert.equal(readProviderConnections()[0].activeJobs, undefined);
    }
    writeProviderConnections([
      { ...connection, concurrencyLimit: 1, activeJobs: 1 },
    ]);
    assert.throws(() => reserveProviderSubmission(binding));
    assert.equal(readProviderConnections()[0].activeJobs, 1);
    writeProviderConnections([{ ...connection, concurrencyLimit: 1 }]);
    const lease = reserveProviderSubmission(binding);
    assert.equal(readProviderConnections()[0].activeJobs, 1);
    assert.throws(() => reserveProviderSubmission(binding));
    lease.assertCurrent();
    writeProviderConnections([
      { ...readProviderConnections()[0], state: "quarantined" },
    ]);
    assert.throws(() => lease.assertCurrent());
    lease.release();
    lease.release();
    assert.equal(readProviderConnections()[0].activeJobs, 0);
    assert.equal(readProviderConnections()[0].state, "quarantined");
    assert.equal(lease.healthUnchanged(), false);
    markProviderConnectionFailure(connection.id, { kind: "network" });
    assert.equal(readProviderConnections()[0].state, "quarantined");
    writeProviderConnections([{ ...connection, state: "degraded" }]);
    const retry = reserveProviderSubmission(binding, { explicitRetry: true });
    assert.equal(readProviderConnections()[0].state, "degraded");
    retry.release();
    t.mock.timers.enable({ apis: ["Date"], now: 2000000000000 });
    markProviderConnectionFailure(connection.id, { kind: "network" });
    const sameMillisecond = reserveProviderSubmission(binding, {
      explicitRetry: true,
    });
    markProviderConnectionFailure(connection.id, { kind: "network" });
    assert.equal(sameMillisecond.healthUnchanged(), false);
    sameMillisecond.release();
    writeProviderConnections([connection]);
    markProviderConnectionFailure(connection.id, {
      kind: "rate_limited",
      retryAfterSeconds: 5.0001,
    });
    assert.equal(readProviderConnections()[0].cooldownUntil, Date.now() + 5001);
    t.mock.timers.reset();
    writeProviderConnections([
      { ...connection, baseUrl: "https://different.test/v1" },
    ]);
    assert.throws(() => assertSubmissionConnection(binding));
    writeProviderConnections([]);
    assert.throws(() => assertSubmissionConnection(binding));
    writeProviderConnections([
      {
        ...connection,
        capabilities: { ...connection.capabilities, operations: ["generate"] },
      },
    ]);
    assert.throws(() =>
      assertSubmissionConnection({ ...binding, referenceCount: 1 }),
    );
    writeProviderConnections([connection]);
    const before = Date.now();
    markProviderConnectionFailure(connection.id, {
      kind: "rate_limited",
      retryAfterSeconds: 3600,
    });
    assert.ok(readProviderConnections()[0].cooldownUntil! >= before + 3600000);
    markProviderConnectionFailure(connection.id, { kind: "network" });
    assert.equal(readProviderConnections()[0].state, "cooldown");
    const deadline = readProviderConnections()[0].cooldownUntil;
    markProviderConnectionFailure(connection.id, {
      kind: "rate_limited",
      retryAfterSeconds: 5,
    });
    assert.equal(readProviderConnections()[0].cooldownUntil, deadline);
    writeProviderConnections([connection]);
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem: (key: string) => storage.get(key) ?? null,
          setItem: () => {
            throw new Error("quota");
          },
        },
      },
    });
    assert.throws(() => reserveProviderSubmission(binding), /占用状态/);
    assert.equal(readProviderConnections()[0].activeJobs, undefined);
  } finally {
    if (original) Object.defineProperty(globalThis, "window", original);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("stale leases cannot release a connection re-added with the same id", () => {
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
    const connection = connectionFromModelProfile({
      version: 1,
      name: "readd",
      baseUrl: "https://readd.example.test/v1",
      model: "image-test",
    });
    const binding = {
      id: connection.id,
      baseUrl: connection.baseUrl,
      credentialRef: connection.credentialRef,
      referenceCount: 0,
    };
    writeProviderConnections([connection]);
    const stale = reserveProviderSubmission(binding);
    writeProviderConnections([]);
    writeProviderConnections([{ ...connection, activeJobs: 1 }]);
    stale.release();
    assert.equal(readProviderConnections()[0].activeJobs, 1);
    assert.throws(() => stale.assertCurrent(), /占用已失效/);
  } finally {
    if (original) Object.defineProperty(globalThis, "window", original);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("coordinated reservations serialize browser windows and reclaim orphaned leases", async () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalNavigator = Object.getOwnPropertyDescriptor(
    globalThis,
    "navigator",
  );
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
  const tails = new Map<string, Promise<void>>();
  const held = new Set<string>();
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      locks: {
        request: async <T>(
          name: string,
          _options: { mode: "exclusive" },
          callback: () => Promise<T>,
        ) => {
          const previous = tails.get(name) ?? Promise.resolve();
          const run = previous.then(async () => {
            held.add(name);
            try {
              return await callback();
            } finally {
              held.delete(name);
            }
          });
          tails.set(
            name,
            run.then(
              () => undefined,
              () => undefined,
            ),
          );
          return run;
        },
        query: async () => ({ held: [...held].map((name) => ({ name })) }),
      },
    },
  });
  try {
    const connection = connectionFromModelProfile({
      version: 1,
      name: "coordinated",
      baseUrl: "https://coordinated.example.test/v1",
      model: "image-test",
    });
    const binding = {
      id: connection.id,
      baseUrl: connection.baseUrl,
      credentialRef: connection.credentialRef,
      referenceCount: 0,
    };
    writeProviderConnections([{ ...connection, concurrencyLimit: 1 }]);
    const results = await Promise.allSettled([
      reserveProviderSubmissionAsync(binding),
      reserveProviderSubmissionAsync(binding),
    ]);
    assert.equal(
      results.filter((item) => item.status === "fulfilled").length,
      1,
    );
    assert.equal(
      results.filter((item) => item.status === "rejected").length,
      1,
    );
    const lease = results.find((item) => item.status === "fulfilled")!;
    if (lease.status === "fulfilled") await lease.value.release();
    assert.equal(readProviderConnections()[0].activeJobs, 0);

    writeProviderConnections([
      {
        ...connection,
        concurrencyLimit: 1,
        activeJobs: 1,
        activeLeaseIds: ["crashed-tab-lease"],
      },
    ]);
    const recovered = await reserveProviderSubmissionAsync(binding);
    assert.equal(readProviderConnections()[0].activeJobs, 1);
    assert.equal(
      readProviderConnections()[0].activeLeaseIds?.includes(
        "crashed-tab-lease",
      ),
      false,
    );
    await recovered.release();
    assert.equal(readProviderConnections()[0].activeJobs, 0);
  } finally {
    if (originalWindow)
      Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
    if (originalNavigator)
      Object.defineProperty(globalThis, "navigator", originalNavigator);
    else Reflect.deleteProperty(globalThis, "navigator");
  }
});

test("batch rechecks the bound connection before the next HTTP request and retains completed results", async () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalNavigator = Object.getOwnPropertyDescriptor(
    globalThis,
    "navigator",
  );
  const originalFetch = globalThis.fetch;
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      setTimeout,
      clearTimeout,
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    },
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { onLine: true },
  });
  const connection = connectionFromModelProfile({
    version: 1,
    name: "chunk",
    baseUrl: "https://batch.example.test/v1",
    model: "image-test",
  });
  let requests = 0;
  globalThis.fetch = async () => {
    requests++;
    return new Response(
      JSON.stringify({
        data: Array.from({ length: 10 }, () => ({ b64_json: "aGVsbG8=" })),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };
  setSessionApiKey(
    "fixture-key",
    connection.baseUrl!,
    connection.credentialRef,
  );
  try {
    writeProviderConnections([connection]);
    const binding = {
      id: connection.id,
      baseUrl: connection.baseUrl,
      credentialRef: connection.credentialRef,
      referenceCount: 0,
    };
    const lease = reserveProviderSubmission(binding);
    const result = await generateImages({
      prompt: "fixture",
      model: "image-test",
      attachments: [],
      signal: new AbortController().signal,
      providerBaseUrl: connection.baseUrl,
      credentialRef: connection.credentialRef,
      count: 16,
      beforeRequest: lease.assertCurrent,
      onChunk: async () => {
        markProviderConnectionFailure(connection.id, { kind: "forbidden" });
      },
    });
    assert.equal(requests, 1);
    assert.equal(result.sources.length, 10);
    assert.match(result.failure!.message, /隔离/);
    assert.equal(lease.healthUnchanged(), false);
    lease.release();
    assert.equal(readProviderConnections()[0].state, "quarantined");
    assert.equal(readProviderConnections()[0].activeJobs, 0);
    writeProviderConnections([connection]);
    const clearLease = reserveProviderSubmission(binding);
    const cleared = await generateImages({
      prompt: "fixture",
      model: "image-test",
      attachments: [],
      signal: new AbortController().signal,
      providerBaseUrl: connection.baseUrl,
      credentialRef: connection.credentialRef,
      count: 16,
      beforeRequest: clearLease.assertCurrent,
      onChunk: async () => {
        setSessionApiKey("", connection.baseUrl!, connection.credentialRef);
      },
    });
    assert.equal(requests, 2);
    assert.equal(cleared.sources.length, 10);
    assert.match(cleared.failure!.message, /密钥已清除/);
    clearLease.release();
  } finally {
    setSessionApiKey("", connection.baseUrl!, connection.credentialRef);
    globalThis.fetch = originalFetch;
    if (originalWindow)
      Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
    if (originalNavigator)
      Object.defineProperty(globalThis, "navigator", originalNavigator);
    else Reflect.deleteProperty(globalThis, "navigator");
  }
});
