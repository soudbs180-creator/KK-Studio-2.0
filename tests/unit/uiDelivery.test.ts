import assert from "node:assert/strict";
import test from "node:test";
import { stringify } from "yaml";
import {
  checkUiDelivery,
  uiEvidenceFingerprint,
} from "../../scripts/governance/ui-delivery.mjs";

const path = "src/components/settings/settings.css";
const dependency = "src/styles/tokens.css";
const mapping = "docs/changes/2026-11-21-pen-ui-delivery/ui-map.yaml";
const verification = mapping.replace("ui-map.yaml", "verification.md");
const uiBlob = "a".repeat(40);
const tokenBlob = "b".repeat(40);
const hash = "c".repeat(64);
const evidence = { status: "verified", sha256: hash };
const mappingRow = {
  id: "settings.disclosure",
  route: "/settings",
  nodes: ["gSHZ5"],
  files: [path],
  dependencies: [dependency],
  evidence: { desktop: evidence, web: evidence },
};
const map = {
  version: 1,
  pen: {
    documentId: "b1c8c2e7-1733-4af4-843e-5c7962ed3f49",
    readbackSha256: hash,
  },
  mappings: [mappingRow],
  inputs: { [path]: uiBlob, [dependency]: tokenBlob },
};
const fingerprint = uiEvidenceFingerprint(map.pen, mappingRow, map.inputs);
const runtime = ["desktop", "web"]
  .map(
    (platform) =>
      "## " +
      platform +
      "-settings-disclosure\n\n证据 SHA-256 " +
      hash +
      "\n版本绑定 SHA-256 " +
      fingerprint +
      "\n",
  )
  .join("\n");
const blobs = new Map([
  [path, uiBlob],
  [dependency, tokenBlob],
]);
const check = (
  record = map,
  readBlob = (name: string) => blobs.get(name),
  report = runtime,
  baseExists = () => false,
) =>
  checkUiDelivery(
    [path, mapping, verification],
    (name) => (name === mapping ? stringify(record) : report),
    readBlob,
    baseExists,
  );

test("current Pen mapping, scoped runtime evidence and dependencies pass", () => {
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

test("visible changes need a new package and valid live node keys", () => {
  for (const input of [
    path,
    "src/components/settings/SettingsSectionData.ts",
    "mobile/src/ui/colorTokens.generated.json",
  ])
    assert.match(
      checkUiDelivery(
        [input],
        () => "",
        () => undefined,
      ).join(),
      /lacks a current Pen mapping/,
    );
  const noNode = { ...map, mappings: [{ ...mappingRow, nodes: [] }] };
  assert.match(check(noNode).join(), /invalid UI receipt at mappings/);
  assert.match(
    check(map, undefined, runtime, () => true).join(),
    /new change package/,
  );
});

test("platform proof belongs to the specific mapping and checked-in verification", () => {
  const pending = {
    ...map,
    mappings: [
      {
        ...mappingRow,
        evidence: {
          web: evidence,
          desktop: { status: "pending", sha256: hash },
        },
      },
    ],
  };
  assert.match(check(pending).join(), /missing.*desktop/);
  assert.match(check(map, undefined, "").join(), /missing.*desktop.*web/);
  const another = {
    ...map,
    mappings: [{ ...mappingRow, id: "other.disclosure" }],
  };
  assert.match(check(another).join(), /missing.*desktop.*web/);
});

test("existing evidence is invalid when changed source or shared inputs drift", () => {
  for (const stale of [path, dependency]) {
    const issues = check(map, (name) =>
      name === stale ? "d".repeat(40) : blobs.get(name),
    );
    assert.ok(
      issues.some((issue) => issue.includes("stale or invalid input " + stale)),
    );
  }
  const refreshedMap = {
    ...map,
    inputs: { ...map.inputs, [dependency]: uiBlob },
  };
  assert.match(
    check(refreshedMap, () => uiBlob).join(),
    /missing.*desktop.*web/,
  );
  const omitted = { ...map, inputs: { [path]: uiBlob } };
  assert.match(check(omitted).join(), /invalid or duplicate UI mapping/);
});

test("Expo group routes and intentional removals remain representable", () => {
  const removed = "mobile/src/app/(workspace)/retired.tsx";
  const theme = "mobile/src/ui/theme.tsx";
  const mapped = {
    ...map,
    mappings: [
      {
        ...mappingRow,
        files: [removed],
        dependencies: [theme],
        evidence: { mobile: evidence },
      },
    ],
    inputs: { [removed]: "deleted", [theme]: tokenBlob },
  };
  assert.deepEqual(
    checkUiDelivery(
      [removed, mapping, verification],
      (name) =>
        name === mapping
          ? stringify(mapped)
          : "## mobile-settings-disclosure\n\n证据 SHA-256 " +
            hash +
            "\n版本绑定 SHA-256 " +
            uiEvidenceFingerprint(
              mapped.pen,
              mapped.mappings[0],
              mapped.inputs,
            ),
      (name) => (name === theme ? tokenBlob : undefined),
    ),
    [],
  );
});
