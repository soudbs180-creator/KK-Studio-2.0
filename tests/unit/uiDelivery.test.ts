import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { stringify } from "yaml";
import {
  checkUiDelivery,
  uiEvidenceFingerprint,
} from "../../scripts/governance/ui-delivery.mjs";

const path = "src/components/settings/settings.css";
const dependency = "src/styles/tokens.css";
const change = "docs/changes/2026-11-21-pen-ui-delivery/";
const mapping = change + "ui-map.yaml";
const verification = change + "verification.md";
const uiBlob = "a".repeat(40);
const tokenBlob = "b".repeat(40);
const hash = "c".repeat(64);
const row = {
  id: "settings.disclosure",
  route: "/settings",
  locator: "details > summary",
  nodes: ["gSHZ5"],
  files: [path],
  dependencies: [dependency],
};
const pen = {
  documentId: "b1c8c2e7-1733-4af4-843e-5c7962ed3f49",
  readbackSha256: hash,
};

function fixture(
  component = row,
  inputs: Record<string, string> = { [path]: uiBlob, [dependency]: tokenBlob },
  platforms = ["desktop", "web"],
) {
  const artifacts = new Map<string, string>();
  const evidence: Record<string, { status: string; sha256: string }> = {};
  const sections = [];
  for (const platform of platforms) {
    const section = platform + "-" + component.id.replaceAll(".", "-");
    const relative = "evidence/" + section + ".json";
    const proof = JSON.stringify({
      mappingId: component.id,
      platform,
      versionBindingSha256: uiEvidenceFingerprint(pen, component, inputs),
      rawEvidenceSha256: hash,
      entrySha256: hash,
      launch: "npm run test:ui",
      url: "http://127.0.0.1:1423/",
      passed: 2,
      failed: 0,
    });
    artifacts.set(change + relative, proof);
    evidence[platform] = {
      status: "verified",
      sha256: createHash("sha256").update(proof).digest("hex"),
    };
    sections.push("## " + section + "\n\n证据文件 " + relative + "\n");
  }
  return {
    map: { version: 1, pen, inputs, mappings: [{ ...component, evidence }] },
    artifacts,
    report: sections.join("\n"),
  };
}

const current = fixture();
const readBlob = (name: string): string | undefined =>
  ({ [path]: uiBlob, [dependency]: tokenBlob })[name];
const check = (
  record = current.map,
  blob = readBlob,
  report = current.report,
  baseExists = () => false,
  artifacts = current.artifacts,
  changedUi = path,
) =>
  checkUiDelivery(
    [changedUi, mapping, verification, ...artifacts.keys()],
    (name) =>
      name === mapping
        ? stringify(record)
        : name === verification
          ? report
          : (artifacts.get(name) ?? ""),
    blob,
    baseExists,
  );

test("changing a shared input requires evidence for each dependent mapping", () => {
  const shared = fixture({
    ...row,
    id: "shared.tokens",
    files: [dependency],
  });
  const map = {
    ...current.map,
    mappings: [...shared.map.mappings, ...current.map.mappings],
  };
  assert.match(
    check(
      map,
      readBlob,
      shared.report,
      undefined,
      shared.artifacts,
      dependency,
    ).join("\n"),
    /runtime evidence missing for src\/components\/settings\/settings.css/,
  );
  assert.deepEqual(
    check(
      map,
      readBlob,
      shared.report + "\n" + current.report,
      undefined,
      new Map([...shared.artifacts, ...current.artifacts]),
      dependency,
    ),
    [],
  );
});

test("current Pen mapping, checked-in platform proof and dependencies pass", () => {
  assert.deepEqual(check(), []);
  for (const input of [
    "src/domain/settings.ts",
    "mobile/src/storage/schemaPrimitives.ts",
  ])
    assert.deepEqual(
      checkUiDelivery(
        [input],
        () => "",
        () => undefined,
      ),
      [],
    );
});

test("visible changes need a new package and live node keys", () => {
  for (const input of [
    path,
    "src/components/settings/SettingsSectionData.ts",
    "src/features/commands/slashCommandRegistry.ts",
    "src/features/models/modelPresentation.ts",
    "src/features/models/modelMenuEntries.ts",
    "mobile/src/ui/colorTokens.generated.json",
  ]) {
    assert.match(
      checkUiDelivery(
        [input],
        () => "",
        () => undefined,
      ).join(),
      /lacks a current Pen mapping/,
    );
  }
  const noNode = {
    ...current.map,
    mappings: [{ ...current.map.mappings[0], nodes: [] }],
  };
  assert.match(check(noNode).join(), /invalid UI receipt at mappings/);
  assert.match(
    check(undefined, undefined, undefined, () => true).join(),
    /new change package/,
  );
});

test("mapping-specific receipts must exist and match their digest", () => {
  assert.match(check(undefined, undefined, "").join(), /missing.*desktop.*web/);
  assert.match(
    check(undefined, undefined, undefined, undefined, new Map()).join(),
    /missing.*desktop.*web/,
  );
  const artifacts = new Map(current.artifacts);
  const desktop = change + "evidence/desktop-settings-disclosure.json";
  artifacts.set(desktop, artifacts.get(desktop) + " ");
  assert.match(
    check(undefined, undefined, undefined, undefined, artifacts).join(),
    /missing.*desktop/,
  );

  const another = {
    ...current.map,
    mappings: [{ ...current.map.mappings[0], id: "other.disclosure" }],
  };
  assert.match(check(another).join(), /missing.*desktop.*web/);
});

test("changing route, locator, Pen or dependency invalidates the old receipt", () => {
  for (const changed of [{ route: "/another" }, { locator: "[id=other]" }]) {
    const remapped = {
      ...current.map,
      mappings: [{ ...current.map.mappings[0], ...changed }],
    };
    assert.match(check(remapped).join(), /missing.*desktop.*web/);
  }
  const penChanged = {
    ...current.map,
    pen: { ...pen, readbackSha256: "d".repeat(64) },
  };
  assert.match(check(penChanged).join(), /missing.*desktop.*web/);
  const refreshed = {
    ...current.map,
    inputs: { ...current.map.inputs, [dependency]: uiBlob },
  };
  assert.match(check(refreshed, () => uiBlob).join(), /missing.*desktop.*web/);
  const omitted = { ...current.map, inputs: { [path]: uiBlob } };
  assert.match(check(omitted).join(), /invalid or duplicate UI mapping/);
});

test("recorded inputs must match actual Git blobs", () => {
  for (const stale of [path, dependency]) {
    const issues = check(current.map, (name) =>
      name === stale ? "d".repeat(40) : readBlob(name),
    );
    assert.ok(
      issues.some((issue) => issue.includes("stale or invalid input " + stale)),
    );
  }
});

test("Expo group routes and intentional removals remain representable", () => {
  const removed = "mobile/src/app/(workspace)/retired.tsx";
  const theme = "mobile/src/ui/theme.tsx";
  const mobile = fixture(
    { ...row, files: [removed], dependencies: [theme] },
    { [removed]: "deleted", [theme]: tokenBlob },
    ["mobile"],
  );
  assert.deepEqual(
    check(
      mobile.map,
      (name) => (name === theme ? tokenBlob : undefined),
      mobile.report,
      undefined,
      mobile.artifacts,
      removed,
    ),
    [],
  );
});
