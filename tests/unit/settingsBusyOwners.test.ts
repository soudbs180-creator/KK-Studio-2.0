import assert from "node:assert/strict";
import test from "node:test";
import { updateSettingsBusyOwners } from "../../src/components/settings/SettingsNavigationContext.ts";

test("finishing or unmounting one settings owner cannot unlock another pending operation", () => {
  const first = Symbol("MCP"),
    second = Symbol("plugin");
  let owners: ReadonlySet<symbol> = new Set();
  owners = updateSettingsBusyOwners(owners, true, first);
  owners = updateSettingsBusyOwners(owners, true, second);
  owners = updateSettingsBusyOwners(owners, false, second);
  assert.equal(owners.size, 1);
  assert.equal(owners.has(first), true);
  owners = updateSettingsBusyOwners(owners, false, second);
  assert.equal(owners.has(first), true);
  owners = updateSettingsBusyOwners(owners, false, first);
  assert.equal(owners.size, 0);
});
