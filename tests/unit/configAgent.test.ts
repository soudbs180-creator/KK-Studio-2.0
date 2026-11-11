import assert from "node:assert/strict";
import test from "node:test";
import {
  createConfigToolHost,
  type ConfigToolPorts,
} from "../../src/features/providers/configAgent.ts";
import {
  configPermission,
  parseConfigToolInput,
  safeConfigToolResult,
} from "../../src/domain/configTools.ts";
import { DEFAULT_LOCAL_CONNECTION } from "../../src/domain/providerConnections.ts";

function fixture() {
  let connections = structuredClone([DEFAULT_LOCAL_CONNECTION]);
  let revision = 1;
  const trace: string[] = [];
  const snapshots = new Map<string, unknown>();
  const ports: ConfigToolPorts = {
    read: async () => ({ connections: structuredClone(connections), revision }),
    write: async (next, expected) => {
      assert.equal(expected.revision, revision);
      trace.push("write");
      connections = structuredClone(next);
      revision++;
    },
    saveSnapshot: async (snapshot) => {
      trace.push("snapshot");
      snapshots.set(snapshot.id, structuredClone(snapshot));
    },
    loadSnapshot: async (id) => snapshots.get(id),
    capabilities: async () => [],
    requestCredential: async () => ({ status: "cancelled" }),
    testConnection: async () => ({ ok: true, modelCount: 1 }),
    notify: () => {
      trace.push("notice");
    },
  };
  const host = createConfigToolHost(ports);
  const draft = {
    version: 1,
    exportedAt: "2026-11-09T00:00:00.000Z",
    connections: [{ ...DEFAULT_LOCAL_CONNECTION, model: "new-model" }],
  };
  return { host, ports, draft, trace, snapshots, read: () => connections };
}

test("configuration proposal validates and diffs without writing", async () => {
  const f = fixture();
  const bad = await f.host.execute("kk_config_propose", {
    draft: { version: 2 },
  });
  assert.equal(bad.valid, false);
  const proposed = await f.host.execute("kk_config_propose", {
    draft: f.draft,
  });
  assert.equal(proposed.valid, true);
  assert.deepEqual(proposed.diff, {
    added: [],
    removed: [],
    updated: [{ id: "local-comfyui", fields: ["healthRevision", "model"] }],
  });
  assert.deepEqual(f.trace, []);
  assert.equal(f.read()[0].model, undefined);
});

test("apply snapshots first; rollback restores the exact previous connections and remains undoable", async () => {
  const f = fixture();
  const original = structuredClone(f.read());
  const proposed = await f.host.execute("kk_config_propose", {
    draft: f.draft,
  });
  const applied = await f.host.execute("kk_config_apply", {
    draft: f.draft,
    expectedVersion: proposed.version,
  });
  assert.deepEqual(f.trace, ["snapshot", "write", "notice"]);
  assert.equal(applied.permission, "L1");
  assert.equal(applied.message, "已修改，可撤销");
  assert.equal(f.read()[0].model, "new-model");
  const rolled = await f.host.execute("kk_config_rollback", {
    snapshotId: applied.snapshotId,
    expectedVersion: applied.version,
  });
  assert.deepEqual(f.read(), original);
  assert.equal(f.snapshots.size, 2);
  assert.notEqual(rolled.snapshotId, applied.snapshotId);
});

test("stale versions and failed snapshot storage cannot change configuration", async () => {
  const f = fixture();
  await assert.rejects(
    f.host.execute("kk_config_apply", {
      draft: f.draft,
      expectedVersion: "0000000000000000",
    }),
    /CONFIG_STALE/,
  );
  assert.deepEqual(f.trace, []);
  f.ports.saveSnapshot = async () => {
    throw new Error("quota");
  };
  const proposed = await f.host.execute("kk_config_propose", {
    draft: f.draft,
  });
  await assert.rejects(
    f.host.execute("kk_config_apply", {
      draft: f.draft,
      expectedVersion: proposed.version,
    }),
    /CONFIG_FAILED/,
  );
  assert.equal(f.read()[0].model, undefined);
});

test("permissions follow the decided levels including budget and allowed cloud reverse prompting", () => {
  for (const action of ["read", "connection.test"])
    assert.equal(configPermission(action), "L0");
  for (const action of [
    "config.write",
    "model.route",
    "canvas.edit",
    "prompt.edit",
    "image.reverse_prompt",
  ])
    assert.equal(configPermission(action), "L1");
  for (const action of [
    "model.download",
    "data.delete",
    "project.delete",
    "external.send",
    "agent.switch",
  ])
    assert.equal(configPermission(action), "L2");
  assert.equal(
    configPermission("generation.paid", { limitUsd: 10, spentUsd: 8 }, 2),
    "L1",
  );
  assert.equal(
    configPermission("generation.paid", { limitUsd: 10, spentUsd: 8 }, 3),
    "L2",
  );
  assert.equal(configPermission("generation.paid"), "L2");
  for (const action of ["credential.read", "source.edit", "unknown"])
    assert.equal(configPermission(action), "forbidden");
});

test("failed writes retain a recovery snapshot and never echo an upstream credential error", async () => {
  const f = fixture();
  f.ports.write = async () => {
    throw new Error("sk-FAKE-UPSTREAM-WRITE-ERROR-1234567890");
  };
  const proposed = await f.host.execute("kk_config_propose", {
    draft: f.draft,
  });
  const result = await f.host.execute("kk_config_apply", {
    draft: f.draft,
    expectedVersion: proposed.version,
  });
  assert.equal(result.status, "uncertain");
  assert.equal(result.code, "CONFIG_WRITE_FAILED");
  assert.ok(f.snapshots.has(String(result.snapshotId)));
  assert.equal(f.read()[0].model, undefined);
  assert.equal(JSON.stringify(result).includes("sk-FAKE"), false);
  assert.deepEqual(f.trace, ["snapshot"]);
});

test("duplicate drafts and busy connection edits do not replace existing configuration", async () => {
  const f = fixture();
  const duplicate = {
    ...f.draft,
    connections: [f.draft.connections[0], f.draft.connections[0]],
  };
  assert.equal(
    (await f.host.execute("kk_config_propose", { draft: duplicate })).valid,
    false,
  );
  f.read()[0].activeJobs = 1;
  const proposed = await f.host.execute("kk_config_propose", {
    draft: f.draft,
  });
  await assert.rejects(
    f.host.execute("kk_config_apply", {
      draft: f.draft,
      expectedVersion: proposed.version,
    }),
    /CONFIG_BUSY/,
  );
  assert.deepEqual(f.trace, []);
});

test("secrets and caller-supplied permission overrides never cross the configuration boundary", async () => {
  const f = fixture();
  const fake = "sk-FAKE-CONFIG-KEY-NEVER-LEAK-123456";
  for (const input of [
    { draft: { ...f.draft, apiKey: fake } },
    {
      draft: {
        ...f.draft,
        connections: [{ ...DEFAULT_LOCAL_CONNECTION, credentialRef: fake }],
      },
    },
  ]) {
    assert.throws(
      () => parseConfigToolInput("kk_config_propose", input),
      (error) => !String(error).includes(fake),
    );
  }
  assert.throws(() =>
    parseConfigToolInput("kk_config_apply", {
      draft: f.draft,
      expectedVersion: "0000000000000000",
      confirmed: true,
    }),
  );
  assert.throws(() =>
    safeConfigToolResult("kk_credential_request", {
      status: "provided",
      key: fake,
    }),
  );
  assert.deepEqual(
    await f.host.execute("kk_credential_request", {
      connectionId: "local-comfyui",
    }),
    { status: "cancelled" },
  );
  assert.ok(!JSON.stringify([...f.snapshots]).includes(fake));
});

test("credentials in URLs, private-key fields and decimal budget boundaries fail closed", () => {
  for (const draft of [
    {
      connections: [
        { baseUrl: "https://user:short-password@provider.invalid/v1" },
      ],
    },
    {
      connections: [
        { baseUrl: "https://provider.invalid/v1?api_key=short-secret" },
      ],
    },
    { privateKey: "opaque-private-key" },
  ])
    assert.throws(() => parseConfigToolInput("kk_config_propose", { draft }));
  assert.equal(
    configPermission("generation.paid", { limitUsd: 0.3, spentUsd: 0.1 }, 0.2),
    "L1",
  );
});

test("an AI draft cannot redirect an existing credential to another endpoint or auth protocol", async () => {
  const f = fixture();
  const original = f.read()[0];
  original.credentialRef = "existing-vault-ref";
  for (const change of [
    { baseUrl: "https://unapproved.invalid/v1" },
    { protocol: "anthropic" as const },
  ]) {
    const proposed = await f.host.execute("kk_config_propose", {
      draft: { ...f.draft, connections: [{ ...original, ...change }] },
    });
    assert.equal(
      proposed.valid,
      false,
      "old credentials must stay bound to the approved endpoint and protocol",
    );
  }
  const next = {
    ...original,
    id: "new-endpoint",
    baseUrl: "https://unapproved.invalid/v1",
    credentialRef: undefined,
  };
  const draft = { ...f.draft, connections: [next] };
  const proposal = await f.host.execute("kk_config_propose", { draft });
  assert.equal(proposal.valid, true);
  const applied = await f.host.execute("kk_config_apply", {
    draft,
    expectedVersion: proposal.version,
  });
  assert.equal(applied.status, "applied");
  assert.match(
    f.read().find((item) => item.id === "new-endpoint")!.credentialRef!,
    /^config-credential-[a-f0-9-]{36}$/,
  );
  assert.equal(f.read()[0].credentialRef, "existing-vault-ref");
});

test("existing legal connection IDs remain usable and protocol changes require a fresh host-owned reference", async () => {
  const f = fixture();
  f.read()[0].id = "provider:primary";
  f.read()[0].credentialRef = "existing-ref";
  assert.deepEqual(
    parseConfigToolInput("kk_connection_test", {
      connectionId: "provider:primary",
    }),
    { connectionId: "provider:primary" },
  );
  assert.equal(
    (
      await f.host.execute("kk_connection_test", {
        connectionId: "provider:primary",
      })
    ).ok,
    true,
  );
  const samePeer = {
    ...f.draft,
    connections: [
      { ...f.read()[0], model: "changed-model", credentialRef: undefined },
    ],
  };
  const samePeerProposal = await f.host.execute("kk_config_propose", {
    draft: samePeer,
  });
  await f.host.execute("kk_config_apply", {
    draft: samePeer,
    expectedVersion: samePeerProposal.version,
  });
  assert.equal(f.read()[0].credentialRef, "existing-ref");
  const draft = {
    ...f.draft,
    connections: [
      { ...f.read()[0], protocol: "anthropic", credentialRef: undefined },
    ],
  };
  const proposed = await f.host.execute("kk_config_propose", { draft });
  assert.equal(proposed.valid, true);
  await f.host.execute("kk_config_apply", {
    draft,
    expectedVersion: proposed.version,
  });
  assert.match(f.read()[0].credentialRef!, /^config-credential-[a-f0-9-]{36}$/);
  assert.notEqual(f.read()[0].credentialRef, "existing-ref");
});

test("inline credential text and unknown draft metadata are rejected before transport", () => {
  for (const draft of [
    {
      connections: [
        { displayName: "api_key=fixture_opaque_non_key_1234567890" },
      ],
    },
    { connections: [{ displayName: "password: short-secret" }] },
    { version: 1, extra: "not part of kk-provider-config" },
    { connections: [{ id: "test", unknownField: "not connection metadata" }] },
  ])
    assert.throws(() => parseConfigToolInput("kk_config_propose", { draft }));
});
