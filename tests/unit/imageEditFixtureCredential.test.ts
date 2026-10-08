import assert from "node:assert/strict";
import test from "node:test";
import {
  claimFixtureCredential,
  releaseFixtureCredential,
} from "../desktop/image-edit-credential.mjs";

test("image-edit fixture refuses existing credentials without claiming cleanup ownership", async () => {
  let owned: string | undefined;
  let deleted = false;
  const existing = "synthetic-existing-value";
  const invoke = async (command: string) => {
    if (command === "credential_get") return existing;
    deleted = true;
    return null;
  };
  await assert.rejects(async () => {
    owned = await claimFixtureCredential(invoke, "fixture-id");
  }, /existing credential/);
  if (owned) await releaseFixtureCredential(invoke, owned);
  assert.equal(owned, undefined);
  assert.equal(deleted, false);
  assert.equal(await invoke("credential_get"), existing);
});

test("image-edit fixture verifies owned credential removal and exposes cleanup failures", async () => {
  let value: string | null = null;
  let deleteFailure = false;
  let ignoreDelete = false;
  const invoke = async (command: string) => {
    if (command === "credential_get") return value;
    if (deleteFailure) throw new Error("synthetic vault unavailable");
    if (!ignoreDelete) value = null;
    return null;
  };
  const id = await claimFixtureCredential(invoke, "fixture-id");
  value = "synthetic-owned-value";
  deleteFailure = true;
  await assert.rejects(
    releaseFixtureCredential(invoke, id),
    /synthetic vault unavailable/,
  );
  assert.equal(value, "synthetic-owned-value");
  deleteFailure = false;
  ignoreDelete = true;
  await assert.rejects(releaseFixtureCredential(invoke, id), /not removed/);
  assert.equal(value, "synthetic-owned-value");
  ignoreDelete = false;
  await releaseFixtureCredential(invoke, id);
  assert.equal(value, null);
});
