import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  ATTRIBUTIONS_FILE,
  admissionFingerprint,
  checkAttributionLedger,
  checkOssAttributions,
  evaluateOssAttributions,
  isAllowedLicense,
  isDeniedLicense,
  matchesOssDir,
} from "../../scripts/governance/oss-attributions.mjs";

const ROOT = "src/integrations/oss";
const MIT_LICENSE = fs.readFileSync(
  new URL("../../vendor/canvas-proxy/LICENSE", import.meta.url),
);

function makeLedger() {
  return {
    version: 1,
    policy: {
      vendoredRoot: ROOT,
      allowedLicenses: [
        "MIT",
        "Apache-2.0",
        "BSD-2-Clause",
        "BSD-3-Clause",
        "ISC",
      ],
      deniedLicenseFamilies: ["AGPL", "GPL", "LGPL"],
      deniedLicenses: ["AGPL-3.0", "LGPL-3.0"],
      integrationTypes: ["vendored", "adapter", "inspired"],
      isolatableIntegrationTypes: ["vendored", "adapter"],
    },
    attributions: [],
    restrictedReferences: [],
  };
}

function makeRecord(overrides = {}) {
  return {
    name: "example-lib",
    author: "Example Org",
    repoUrl: "https://github.com/example/example-lib",
    license: "MIT",
    integrationType: "vendored",
    usedInModules: ["src/integrations/oss/example-lib"],
    note: "unit test fixture",
    ...overrides,
  };
}

function withRecords(ledger, records, restricted = []) {
  return {
    ...ledger,
    attributions: records,
    restrictedReferences: restricted,
  };
}

function makeTempRepo(records, restricted = []) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kk-oss-gate-"));
  execFileSync("git", ["init", "--quiet"], { cwd: root });
  fs.mkdirSync(path.join(root, "config"), { recursive: true });
  fs.mkdirSync(path.join(root, ROOT, "example-lib"), { recursive: true });
  fs.writeFileSync(
    path.join(root, ATTRIBUTIONS_FILE),
    JSON.stringify(withRecords(makeLedger(), records, restricted), null, 2),
  );
  return root;
}

function cleanup(root) {
  fs.rmSync(root, { recursive: true, force: true });
}

test("R-OSS: a valid ledger passes structural validation", () => {
  assert.deepEqual(checkAttributionLedger(makeLedger()), []);
});

test("R-OSS: the seven required attribution fields are enforced", () => {
  const ledger = withRecords(makeLedger(), [makeRecord({ author: "" })]);
  assert.match(checkAttributionLedger(ledger).join("\n"), /\.author/);
  const missingPaths = withRecords(makeLedger(), [
    makeRecord({ usedInModules: "not-an-array" }),
  ]);
  assert.match(
    checkAttributionLedger(missingPaths).join("\n"),
    /usedInModules/,
  );
});

test("R-OSS: repoUrl must be https and names must be unique", () => {
  const badUrl = withRecords(makeLedger(), [
    makeRecord({ repoUrl: "http://example.com/x" }),
  ]);
  assert.match(checkAttributionLedger(badUrl).join("\n"), /repoUrl/);
  const duplicate = withRecords(makeLedger(), [
    makeRecord(),
    makeRecord({ usedInModules: [ROOT] }),
  ]);
  assert.match(checkAttributionLedger(duplicate).join("\n"), /duplicate name/);
});

test("R-OSS: policy version and allowlist must stay intact", () => {
  const badVersion = { ...makeLedger(), version: 2 };
  assert.match(checkAttributionLedger(badVersion).join("\n"), /version/);
  const noAllowlist = makeLedger();
  noAllowlist.policy.allowedLicenses = [];
  assert.match(
    checkAttributionLedger(noAllowlist).join("\n"),
    /allowedLicenses/,
  );
});

test("R-OSS: AGPL/GPL/LGPL detection covers family variants", () => {
  const policy = makeLedger().policy;
  for (const license of [
    "AGPL-3.0",
    "GPL-3.0-or-later",
    "LGPL-2.1",
    "GNU AGPL v3",
  ])
    assert.equal(isDeniedLicense(license, policy), true, license);
  for (const license of ["MIT", "Apache-2.0", "ISC", "BSD-3-Clause"])
    assert.equal(isDeniedLicense(license, policy), false, license);
  assert.equal(isAllowedLicense("MIT", policy), true);
  assert.equal(isAllowedLicense("MPL-2.0", policy), false);
});

test("R-OSS: zero isolated components passes", () => {
  assert.deepEqual(evaluateOssAttributions([], makeLedger()), []);
});

test("R-OSS: a correctly attributed MIT component passes", () => {
  const ledger = withRecords(makeLedger(), [makeRecord()]);
  assert.deepEqual(evaluateOssAttributions(["example-lib"], ledger), []);
});

test("R-OSS: an unregistered oss directory fails", () => {
  const ledger = withRecords(makeLedger(), [makeRecord()]);
  assert.match(
    evaluateOssAttributions(["rogue-lib"], ledger).join("\n"),
    /missing attribution/,
  );
});

test("R-OSS: non-permissive licenses fail at ledger level", () => {
  for (const license of ["AGPL-3.0", "GPL-3.0", "LGPL-3.0"]) {
    const ledger = withRecords(makeLedger(), [makeRecord({ license })]);
    assert.match(
      evaluateOssAttributions(["example-lib"], ledger).join("\n"),
      /non-permissive/,
    );
  }
});

test("R-OSS: restricted AGPL/LGPL projects must never be vendored", () => {
  const ledger = withRecords(
    makeLedger(),
    [],
    [
      makeRecord({
        name: "CodexPlusPlus",
        license: "AGPL-3.0",
        integrationType: "inspired",
        usedInModules: [],
      }),
    ],
  );
  const issues = evaluateOssAttributions(["CodexPlusPlus"], ledger).join("\n");
  assert.match(issues, /copying or bundling/);
  assert.match(issues, /non-permissive/);
});

test("R-OSS: inspired-only records may not place source under oss/", () => {
  const ledger = withRecords(makeLedger(), [
    makeRecord({ integrationType: "inspired" }),
  ]);
  assert.match(
    evaluateOssAttributions(["example-lib"], ledger).join("\n"),
    /must not place source/,
  );
});

test("R-OSS: licenses outside the allowlist are rejected", () => {
  const ledger = withRecords(makeLedger(), [
    makeRecord({ license: "MPL-2.0" }),
  ]);
  assert.match(
    evaluateOssAttributions(["example-lib"], ledger).join("\n"),
    /outside policy.allowedLicenses/,
  );
});

test("R-OSS: vendored entries must cite an oss directory", () => {
  const ledger = withRecords(makeLedger(), [
    makeRecord({ usedInModules: ["src/features/somewhere"] }),
  ]);
  assert.match(
    evaluateOssAttributions([], ledger).join("\n"),
    /must cite src\/integrations\/oss\/<dir>/,
  );
});

test("R-OSS: directory matching accepts explicit usedInModules paths", () => {
  assert.equal(
    matchesOssDir(makeRecord({ name: "different" }), "example-lib", ROOT),
    true,
  );
  assert.equal(matchesOssDir(makeRecord(), "other-lib", ROOT), false);
});

test("R-OSS: the shipped ledger retains historical references and named legacy components", () => {
  const ledger = JSON.parse(
    fs.readFileSync(path.resolve(ATTRIBUTIONS_FILE), "utf8"),
  );
  assert.deepEqual(checkAttributionLedger(ledger), []);
  assert.deepEqual(
    ledger.attributions
      .filter((entry) => entry.legacy)
      .flatMap((entry) => entry.usedInModules)
      .sort(),
    ["vendor/canvas-agent", "vendor/canvas-plugins", "vendor/canvas-proxy"],
  );
  assert.equal(ledger.restrictedReferences.length, 3);
  assert.ok(
    ledger.attributions.every((entry) => entry.license === "MIT"),
    "historical attributions retain MIT",
  );
});

function writeFixture(root, file, content) {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), content);
  return {
    path: file,
    sha256: createHash("sha256").update(content).digest("hex"),
  };
}

function saveRecord(root, record) {
  writeFixture(
    root,
    ATTRIBUTIONS_FILE,
    JSON.stringify(withRecords(makeLedger(), [record])),
  );
}

function admitFixture(root, integrationType = "vendored") {
  const record = makeRecord({ integrationType });
  const target = `${ROOT}/example-lib`;
  const evidence = "docs/changes/2026-11-25-fixture/evidence";
  const input = writeFixture(
    root,
    "tests/fixtures/oss-test.json",
    '{"input":4}',
  );
  record.admission = {
    commit: "1234567890abcdef".repeat(2) + "12345678",
    version: "1.0.0",
    licenseFile: writeFixture(root, `${target}/LICENSE`, MIT_LICENSE),
    dependencies: [
      writeFixture(root, `${target}/package.json`, '{"dependencies":{}}'),
    ],
    inputs: [input],
    implementation: [
      writeFixture(
        root,
        `${target}/index.js`,
        "export const twice = (x) => 2 * x;\n",
      ),
    ],
  };
  const receipt = {
    admissionSha256: admissionFingerprint(record),
    runs: {
      upstream: { command: "fixture upstream 4", exitCode: 0 },
      candidate: { command: "fixture candidate 4", exitCode: 0 },
    },
    cases: [
      {
        id: "double",
        input: input.path,
        criteria: "integer output equals 8",
        upstream: writeFixture(root, `${evidence}/upstream.txt`, "8"),
        candidate: writeFixture(root, `${evidence}/candidate.txt`, "8"),
        result: "PASS",
      },
    ],
  };
  saveReceipt(root, record, receipt, `${evidence}/receipt.json`);
  return { record, receipt };
}

function saveReceipt(
  root,
  record,
  receipt,
  file = record.admission.receipt.path,
) {
  receipt.admissionSha256 = admissionFingerprint(record);
  record.admission.receipt = writeFixture(root, file, JSON.stringify(receipt));
  saveRecord(root, record);
}

test("R-OSS: filesystem gate passes for pinned vendored and adapter fixtures", () => {
  const root = makeTempRepo([]);
  try {
    for (const type of ["vendored", "adapter"]) {
      admitFixture(root, type);
      assert.deepEqual(checkOssAttributions(root), { scanned: 1, issues: [] });
    }
  } finally {
    cleanup(root);
  }
});

test("R-OSS: attribution alone or an unknown legacy flag cannot admit a component", () => {
  const root = makeTempRepo([makeRecord()]);
  try {
    assert.match(
      checkOssAttributions(root).issues.join("\n"),
      /admission requires/,
    );
    saveRecord(root, makeRecord({ legacy: true }));
    assert.match(
      checkOssAttributions(root).issues.join("\n"),
      /legacy status is restricted/,
    );
    fs.mkdirSync(path.join(root, "vendor", "unknown"), { recursive: true });
    assert.match(
      checkOssAttributions(root).issues.join("\n"),
      /vendor\/unknown: missing attribution/,
    );
  } finally {
    cleanup(root);
  }
});

test("R-OSS: stale receipts cannot omit another tracked or unignored runtime file", () => {
  const root = makeTempRepo([]);
  try {
    const { record, receipt } = admitFixture(root);
    const tracked = writeFixture(
      root,
      `${ROOT}/example-lib/other.js`,
      "export {};",
    );
    execFileSync("git", ["add", "--", tracked.path], { cwd: root });
    const untracked = writeFixture(
      root,
      `${ROOT}/example-lib/config.json`,
      "{}",
    );
    writeFixture(root, ".gitignore", "node_modules/\n");
    writeFixture(
      root,
      `${ROOT}/example-lib/node_modules/cache.js`,
      "export {};",
    );
    for (const pin of [tracked, untracked]) {
      assert.match(
        checkOssAttributions(root).issues.join("\n"),
        /unpinned component file/,
      );
      record.admission.implementation.push(pin);
      saveReceipt(root, record, receipt);
    }
    assert.deepEqual(checkOssAttributions(root), { scanned: 1, issues: [] });
    writeFixture(root, tracked.path, "export const updated = true;");
    assert.match(
      checkOssAttributions(root).issues.join("\n"),
      /SHA-256 mismatch/,
    );
  } finally {
    cleanup(root);
  }
});

test("R-OSS: the license file name and text must support the declared SPDX license", () => {
  const root = makeTempRepo([]);
  try {
    const { record, receipt } = admitFixture(root);
    const original = record.admission.licenseFile.path;
    record.admission.licenseFile = writeFixture(
      root,
      original,
      "MIT License\nArbitrary text.",
    );
    saveReceipt(root, record, receipt);
    assert.match(
      checkOssAttributions(root).issues.join("\n"),
      /does not support declared SPDX license/,
    );
    fs.unlinkSync(path.join(root, original));
    record.admission.licenseFile = writeFixture(
      root,
      `${ROOT}/example-lib/settings.txt`,
      MIT_LICENSE,
    );
    saveReceipt(root, record, receipt);
    assert.match(
      checkOssAttributions(root).issues.join("\n"),
      /named LICENSE|COPYING|NOTICE/,
    );
    fs.unlinkSync(path.join(root, record.admission.licenseFile.path));
    record.admission.licenseFile = writeFixture(root, original, MIT_LICENSE);
    record.license = "ISC";
    saveReceipt(root, record, receipt);
    assert.match(
      checkOssAttributions(root).issues.join("\n"),
      /does not support declared SPDX license/,
    );
  } finally {
    cleanup(root);
  }
});

test("R-OSS: stale dependencies and missing run artifacts fail the gate", () => {
  const root = makeTempRepo([]);
  try {
    const { record, receipt } = admitFixture(root);
    writeFixture(
      root,
      record.admission.dependencies[0].path,
      '{"dependencies":{"other":"1.0.0"}}',
    );
    assert.match(
      checkOssAttributions(root).issues.join("\n"),
      /SHA-256 mismatch/,
    );
    admitFixture(root);
    fs.unlinkSync(path.join(root, receipt.cases[0].candidate.path));
    assert.match(
      checkOssAttributions(root).issues.join("\n"),
      /evidence file.*unavailable/,
    );
  } finally {
    cleanup(root);
  }
});

test("R-OSS: path escapes, mismatched pins, and an empty parity receipt fail the gate", () => {
  const root = makeTempRepo([]);
  try {
    const { record } = admitFixture(root);
    record.admission.inputs[0].path = "tests/fixtures/../../private.txt";
    saveRecord(root, record);
    assert.match(
      checkOssAttributions(root).issues.join("\n"),
      /expected a repository file path/,
    );
    const fixed = admitFixture(root);
    fixed.record.admission.version = "1.0.1";
    saveRecord(root, fixed.record);
    assert.match(
      checkOssAttributions(root).issues.join("\n"),
      /malformed or stale/,
    );
    fixed.receipt.admissionSha256 = admissionFingerprint(fixed.record);
    fixed.receipt.cases = [];
    fixed.record.admission.receipt = writeFixture(
      root,
      fixed.record.admission.receipt.path,
      JSON.stringify(fixed.receipt),
    );
    saveRecord(root, fixed.record);
    assert.match(
      checkOssAttributions(root).issues.join("\n"),
      /malformed or stale/,
    );
  } finally {
    cleanup(root);
  }
});

test("R-OSS: filesystem gate fails when attribution is missing", () => {
  const root = makeTempRepo([]);
  try {
    assert.match(
      checkOssAttributions(root).issues.join("\n"),
      /missing attribution/,
    );
  } finally {
    cleanup(root);
  }
});

test("R-OSS: filesystem gate fails for an AGPL component", () => {
  const root = makeTempRepo([makeRecord({ license: "AGPL-3.0" })]);
  try {
    assert.match(
      checkOssAttributions(root).issues.join("\n"),
      /non-permissive/,
    );
  } finally {
    cleanup(root);
  }
});

test("R-OSS: a missing ledger file fails the gate", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kk-oss-gate-"));
  try {
    assert.match(
      checkOssAttributions(root).issues.join("\n"),
      /missing attribution ledger/,
    );
  } finally {
    cleanup(root);
  }
});

test("R-OSS: loose source files under the oss root are rejected", () => {
  const root = makeTempRepo([makeRecord()]);
  try {
    fs.writeFileSync(path.join(root, ROOT, "stray.ts"), "export {};\n");
    assert.match(
      checkOssAttributions(root).issues.join("\n"),
      /named component directory/,
    );
  } finally {
    cleanup(root);
  }
});
