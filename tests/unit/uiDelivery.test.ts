import assert from "node:assert/strict";
import test from "node:test";
import { stringify } from "yaml";
import { checkUiDelivery } from "../../scripts/governance/ui-delivery.mjs";

const path = "src/components/settings/settings.css";
const dependency = "src/styles/tokens.css";
const mapping = "docs/changes/2026-11-21-pen-ui-delivery/ui-map.yaml";
const uiBlob = "a".repeat(40);
const tokenBlob = "b".repeat(40);
const map = {
  version: 1,
  pen: {
    documentId: "b1c8c2e7-1733-4af4-843e-5c7962ed3f49",
    readbackSha256: "c".repeat(64),
  },
  mappings: [
    {
      id: "settings.disclosure",
      route: "/settings",
      nodes: ["gSHZ5"],
      files: [path],
    },
  ],
  inputs: { [path]: uiBlob, [dependency]: tokenBlob },
  evidence: {
    desktop: {
      status: "verified",
      locator: "Desktop HTML accessibility tree receipt",
    },
    web: { status: "verified", locator: "Web production Edge receipt" },
  },
};
const blobs = new Map([
  [path, uiBlob],
  [dependency, tokenBlob],
]);
const check = (record = map, readBlob = (name: string) => blobs.get(name)) =>
  checkUiDelivery([path, mapping], () => stringify(record), readBlob);

test("an exact current UI mapping with both runtime receipts passes", () => {
  assert.deepEqual(check(), []);
  assert.deepEqual(
    checkUiDelivery(
      ["src/domain/settings.ts"],
      () => "",
      () => undefined,
    ),
    [],
  );
});

test("a UI change needs a changed map with real node keys and platform receipts", () => {
  assert.match(
    checkUiDelivery(
      [path],
      () => "",
      () => undefined,
    ).join(),
    /lacks a current Pen mapping/,
  );
  const noNode = { ...map, mappings: [{ ...map.mappings[0], nodes: [] }] };
  assert.match(check(noNode).join(), /invalid UI receipt at mappings/);
  const pending = {
    ...map,
    evidence: { ...map.evidence, desktop: { status: "pending", locator: "" } },
  };
  assert.match(check(pending).join(), /missing.*desktop/);
});

test("changes to tested source or declared shared inputs invalidate old evidence", () => {
  for (const stale of [path, dependency]) {
    const issues = check(map, (name) =>
      name === stale ? "d".repeat(40) : blobs.get(name),
    );
    assert.ok(
      issues.some((issue) => issue.includes("stale or invalid input " + stale)),
    );
  }
});

test("Expo group routes and intentional removals remain representable", () => {
  const removed = "mobile/src/app/(workspace)/retired.tsx";
  const receipt = {
    ...map,
    mappings: [{ ...map.mappings[0], files: [removed] }],
    inputs: { [removed]: "deleted" },
    evidence: {
      mobile: { status: "verified", locator: "Mobile entry regression" },
    },
  };
  assert.deepEqual(
    checkUiDelivery(
      [removed, mapping],
      () => stringify(receipt),
      () => undefined,
    ),
    [],
  );
});
