import assert from "node:assert/strict";
import test from "node:test";
import {
  applyKeyFailure,
  applyKeySuccess,
  comparePickerChannels,
  orderGroupMembers,
  parseModelRouteRef,
  selectCredentialKey,
} from "../../src/features/ai-gateway/providerPoolRouting.ts";

test("parses bare, provider-scoped, and group model selectors", () => {
  assert.deepEqual(parseModelRouteRef("deepseek-v4-pro"), {
    kind: "bare",
    model: "deepseek-v4-pro",
  });
  assert.deepEqual(parseModelRouteRef("kimi/kimi-k2-turbo"), {
    kind: "provider",
    providerId: "kimi",
    model: "kimi-k2-turbo",
  });
  assert.deepEqual(parseModelRouteRef("group/coding"), {
    kind: "group",
    groupId: "coding",
  });
});

test("group strategies order members for failover", () => {
  const members = [
    {
      channelId: "a",
      model: "m",
      weight: 10,
      remainingQuota: 1,
      avgFirstTokenMs: 900,
    },
    {
      channelId: "b",
      model: "m",
      weight: 90,
      remainingQuota: 9,
      avgFirstTokenMs: 200,
    },
  ];
  assert.deepEqual(
    orderGroupMembers(
      { id: "coding", strategy: "sequential", members },
      { nowMs: 1 },
    ).map((item) => item.channelId),
    ["a", "b"],
  );
  assert.deepEqual(
    orderGroupMembers(
      { id: "coding", strategy: "quota-first", members },
      { nowMs: 1 },
    ).map((item) => item.channelId),
    ["b", "a"],
  );
  assert.deepEqual(
    orderGroupMembers(
      { id: "coding", strategy: "speed-first", members },
      { nowMs: 1 },
    ).map((item) => item.channelId),
    ["b", "a"],
  );
  assert.deepEqual(
    orderGroupMembers(
      {
        id: "coding",
        strategy: "manual",
        members,
        manualChannelId: "b",
      },
      { nowMs: 1 },
    ).map((item) => item.channelId),
    ["b"],
  );
});

test("credential keys rotate with cooldown and sticky sessions", () => {
  const nowMs = 1_000_000;
  const keys = [
    {
      keyId: "k1",
      credentialRef: "ref-1",
      cooldownUntilMs: 0,
      quarantined: false,
      consecutiveFailures: 0,
    },
    {
      keyId: "k2",
      credentialRef: "ref-2",
      cooldownUntilMs: 0,
      quarantined: false,
      consecutiveFailures: 0,
    },
  ];
  assert.equal(
    selectCredentialKey({ keys, nowMs, stickyKeyId: "k2" })?.keyId,
    "k2",
  );
  assert.equal(
    selectCredentialKey({
      keys,
      nowMs,
      rotateEveryRequest: true,
      lastKeyId: "k1",
    })?.keyId,
    "k2",
  );
  const failed = applyKeyFailure(keys[0]!, {
    nowMs,
    cooldownMs: 60_000,
    quarantineThreshold: 2,
  });
  assert.equal(failed.consecutiveFailures, 1);
  assert.equal(failed.cooldownUntilMs, nowMs + 60_000);
  const dead = applyKeyFailure(failed, {
    nowMs: nowMs + 61_000,
    quarantineThreshold: 2,
  });
  assert.equal(dead.quarantined, true);
  assert.equal(applyKeySuccess(dead).quarantined, false);
});

test("picker channel priority prefers local before cloud relays", () => {
  assert.ok(comparePickerChannels("local", "relay") < 0);
  assert.ok(comparePickerChannels("account", "official") < 0);
});
