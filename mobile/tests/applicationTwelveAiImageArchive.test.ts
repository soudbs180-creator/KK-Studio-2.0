import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createMobileApplication } from "../src/application/application.ts";
import { MobileRepository } from "../src/storage/repository.ts";
import { createProviderClient } from "../src/services/providerClient.ts";
import { createIdentityClient } from "../src/services/identityClient.ts";

const png = new Uint8Array(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
    "base64",
  ),
);
test("12ai API bytes automatically archive with provider provenance and survive a cold local reopen without resubmission", async () => {
  const snapshots = new Map<string, string>();
  const originals = new Map<string, Uint8Array>();
  const hash = async (bytes: Uint8Array) =>
    createHash("sha256").update(bytes).digest("hex");
  let sequence = 0;
  let posts = 0;
  const id = () => `fixture-${++sequence}`;
  function open() {
    const sessionKeys = new Map<string, string>();
    return createMobileApplication({
      initialMode: "local",
      identityDigest: async (value) =>
        createHash("sha256").update(value).digest("hex"),
      now: Date.now,
      id,
      vault: (account) => ({
        get: async (key) => sessionKeys.get(`${account}/${key}`) ?? null,
        set: async (key, value) => {
          sessionKeys.set(`${account}/${key}`, value);
        },
        remove: async (key) => {
          sessionKeys.delete(`${account}/${key}`);
        },
      }),
      identity: (baseUrl) => createIdentityClient({ baseUrl }),
      repository: async (accountId) =>
        new MobileRepository({
          accountId,
          backend: {
            read: async (account) => snapshots.get(account) ?? null,
            compareAndSwap: async (account, revision, payload) => {
              const prior = snapshots.get(account);
              if ((prior ? JSON.parse(prior).revision : null) !== revision)
                return false;
              snapshots.set(account, payload);
              return true;
            },
          },
          originalStore: {
            read: async (account, asset) => {
              const bytes = originals.get(`${account}/${asset}`);
              assert.ok(bytes);
              return bytes.slice();
            },
            write: async (account, asset, bytes) => {
              originals.set(`${account}/${asset}`, bytes.slice());
            },
            remove: async (account, asset) => {
              originals.delete(`${account}/${asset}`);
            },
          },
          hash,
          id,
          now: Date.now,
        }),
      provider: (vault) =>
        createProviderClient({
          credentials: { read: (reference) => vault.get(reference) },
          fetch: async (url, init) => {
            posts++;
            assert.equal(
              String(url),
              "https://new.12ai.org/v1/images/generations",
            );
            assert.equal(init?.method, "POST");
            assert.equal(
              JSON.parse(String(init.body)).response_format,
              "b64_json",
            );
            return new Response(
              JSON.stringify({
                data: [{ b64_json: Buffer.from(png).toString("base64") }],
              }),
              {
                headers: {
                  "content-type": "application/json",
                  "x-request-id": "fixture-image-request",
                },
              },
            );
          },
        }),
    });
  }
  const app = open();
  await app.start();
  await app.createProject("Fixture 12ai image");
  const connectionId = await app.saveConnection(
    {
      name: "Fixture 12ai",
      baseUrl: "https://new.12ai.org",
      protocol: "openai-compatible",
      capabilities: { text: true, image: true },
    },
    "fixture-request-memory-only-key",
  );
  const project = app.getState().snapshot!.projects[0];
  await app.saveDraft(project.id, {
    ...project.composerDraft,
    kind: "image",
    model: "gpt-image-2",
    prompt: "Synthetic archival test only",
    providerConnectionId: connectionId,
  });
  await app.submit();
  const after = app.getState().snapshot!;
  const task = after.projects[0].tasks[0];
  const asset = after.assets[0];
  assert.equal(task.status, "succeeded");
  assert.equal(task.completedOutputs, 1);
  assert.equal(task.outputs![0].assetId, asset.id);
  assert.equal(asset.provenance.source, "provider");
  assert.equal(asset.provenance.taskId, task.id);
  assert.equal(asset.sha256, await hash(png));
  assert.deepEqual(await app.context().repo.readOriginal(asset.id), png);
  assert.equal(posts, 1);
  assert.ok(
    [...snapshots.values()].every(
      (value) => !value.includes("fixture-request-memory-only-key"),
    ),
  );

  const reopened = open();
  await reopened.start();
  const restored = reopened.getState().snapshot!;
  assert.equal(restored.projects[0].tasks[0].id, task.id);
  assert.equal(restored.projects[0].tasks[0].status, "succeeded");
  assert.equal(restored.assets[0].sha256, asset.sha256);
  assert.deepEqual(await reopened.context().repo.readOriginal(asset.id), png);
  assert.equal(
    await reopened.context().vault.get(restored.connections[0].credentialRef!),
    null,
  );
  assert.equal(posts, 1);
});
