import assert from "node:assert/strict";
import test from "node:test";
import { providerChannel } from "../../src/domain/modelChannels.ts";
import { modelProviderSchema } from "../../src/domain/modelProvider.ts";
import { providerConnectionSchema } from "../../src/domain/providerConnections.ts";
import { newModelProfileConnection } from "../../src/features/creation/providerRegistry.ts";
import { resolveModelProviderConnection } from "../../src/components/settings/modelProviderSettingsState.ts";

test("legacy channels use actual endpoint identity, never provider names", () => {
  for (const baseUrl of [
    "http://127.0.0.1:8080/v1",
    "http://localhost:11434/v1",
    "http://[::1]:1234/v1",
  ])
    assert.equal(providerChannel({ baseUrl }), "local");
  assert.equal(
    providerChannel({ baseUrl: "https://api.openai.com/v1/" }),
    "official",
  );
  assert.equal(
    providerChannel({ baseUrl: "https://api.anthropic.com/v1" }),
    "official",
  );
  for (const baseUrl of [
    "https://openai.example/v1",
    "https://api.openai.com.evil.test/v1",
    "https://api.openai.com/custom",
    "https://api.openai.com/v1?key=secret",
  ])
    assert.equal(providerChannel({ baseUrl }), "relay");
  assert.equal(
    providerChannel({
      baseUrl: "https://custom.example/v1",
      channel: "official",
    }),
    "official",
  );
  assert.equal(
    providerChannel({ baseUrl: "http://localhost:8080/v1", channel: "relay" }),
    "local",
  );
});

test("channel and bounded priority survive profile and connection validation", () => {
  const input = {
    version: 1,
    name: "Custom",
    baseUrl: "https://custom.example/v1",
    model: "image-a",
    channel: "relay",
    priority: 3,
  };
  const profile = modelProviderSchema.parse(input);
  assert.equal(profile.channel, "relay");
  assert.equal(profile.priority, 3);
  const connection = providerConnectionSchema.parse(
    newModelProfileConnection(profile),
  );
  assert.equal(connection.channel, "relay");
  assert.equal(connection.priority, 3);
  const existing = {
    ...connection,
    id: "saved-account",
    credentialRef: "saved-vault",
    channel: "official" as const,
    priority: 8,
  };
  const edited = resolveModelProviderConnection(
    { ...profile, connectionId: existing.id },
    existing.credentialRef!,
    [existing],
  );
  assert.equal(edited.id, existing.id);
  assert.equal(edited.credentialRef, existing.credentialRef);
  assert.equal(edited.channel, "relay");
  assert.equal(edited.priority, 3);
  for (const priority of [-1, 1.5, 10_000, NaN, Infinity]) {
    assert.equal(
      modelProviderSchema.safeParse({ ...input, priority }).success,
      false,
    );
    assert.equal(
      providerConnectionSchema.safeParse({ ...connection, priority }).success,
      false,
    );
  }
});
