import assert from "node:assert/strict";
import test from "node:test";
import {
  LocalAccountProvider,
  detectOsUsername,
  initialsFromName,
  resetLocalAccountStateForTests,
  LOCAL_ACCOUNT_STORAGE_KEY,
  LOCAL_BUDGET_STORAGE_KEY,
} from "../../src/features/account/index.ts";

function installMemoryStorage(t: test.TestContext): Map<string, string> {
  const data = new Map<string, string>();
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => {
        data.set(key, value);
      },
      removeItem: (key: string) => {
        data.delete(key);
      },
    },
  });
  t.after(() => {
    resetLocalAccountStateForTests();
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  });
  return data;
}

test("detectOsUsername prefers USERNAME then USER", () => {
  assert.equal(detectOsUsername({ USERNAME: "Ada", USER: "Bob" }), "Ada");
  assert.equal(detectOsUsername({ USER: "Bob" }), "Bob");
  assert.equal(detectOsUsername({}), null);
});

test("initialsFromName covers latin and CJK", () => {
  assert.equal(initialsFromName("Ada Lovelace"), "AL");
  assert.equal(initialsFromName("创作者"), "创");
  assert.equal(initialsFromName(""), "本");
});

test("LocalAccountProvider seeds from OS username and persists edits", (t) => {
  const data = installMemoryStorage(t);
  const provider = new LocalAccountProvider({
    env: { USERNAME: "StudioUser" },
    readTokensUsed: () => 1200,
  });
  const first = provider.getProfile();
  assert.equal(first.displayName, "StudioUser");
  assert.equal(first.kind, "local");
  assert.equal(provider.authLabel(), "本地登录");
  assert.equal(provider.getSession().signedIn, true);
  assert.ok(data.get(LOCAL_ACCOUNT_STORAGE_KEY));

  const updated = provider.updateProfile({
    displayName: "  本地画家  ",
    bio: "本机创作",
  });
  assert.equal(updated.displayName, "本地画家");
  assert.equal(updated.bio, "本机创作");
  assert.equal(updated.avatarInitials, "本");
  assert.equal(provider.getProfile().displayName, "本地画家");

  const budget = provider.getUsageBudget();
  assert.equal(budget.mode, "local");
  assert.equal(budget.tokensUsed, 1200);
  assert.equal(budget.tokenBudget, null);

  const limited = provider.setTokenBudget(5000);
  assert.equal(limited.tokenBudget, 5000);
  assert.ok(data.get(LOCAL_BUDGET_STORAGE_KEY));
  assert.equal(provider.setTokenBudget(null).tokenBudget, null);
});

test("LocalAccountProvider reloads persisted profile from storage", (t) => {
  installMemoryStorage(t);
  const writer = new LocalAccountProvider({ env: { USERNAME: "First" } });
  writer.updateProfile({ displayName: "Saved Name" });
  const reader = new LocalAccountProvider({ env: { USERNAME: "Other" } });
  assert.equal(reader.getProfile().displayName, "Saved Name");
});
