import assert from "node:assert/strict";
import test from "node:test";
import { newModelProfileConnection } from "../../src/features/creation/providerRegistry.ts";
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
