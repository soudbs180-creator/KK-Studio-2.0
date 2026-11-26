/**
 * R-OSS attribution and admission evidence checks.
 *
 * The original license policy from TASK-OSS-GOVERNANCE-RULE-20261111 is the
 * basis for the gate. All checks are local and read-only.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";

export const ATTRIBUTIONS_FILE = "config/oss-attributions.json";
export const DEFAULT_VENDORED_ROOT = "src/integrations/oss";
export const INTEGRATION_TYPES = Object.freeze([
  "vendored",
  "adapter",
  "inspired",
]);
export const REQUIRED_FIELDS = Object.freeze([
  "name",
  "author",
  "repoUrl",
  "license",
  "integrationType",
  "usedInModules",
  "note",
]);

const DENIED_LICENSE_FAMILY = /AGPL|LGPL|GPL/i;
const MANAGED_ROOTS = [DEFAULT_VENDORED_ROOT, "vendor"];
const LEGACY_BASE = "e4383a1e323c895286d9f08fe901a27e341a10da";
const LEGACY_COMPONENTS = new Set([
  "vendor/canvas-agent",
  "vendor/canvas-plugins",
  "vendor/canvas-proxy",
]);
const ROOT_NOTICE = /^(?:README\.md|LICENSE(?:\.txt)?|NOTICE(?:\.txt)?)$/i;
const LICENSE_NAME = /^(?:LICENSE|LICENCE|COPYING|NOTICE)(?:[._-][\w.-]+)?$/i;
const SHA256 = /^[a-f0-9]{64}$/;
const GIT_SHA = /^(?!0+$)[a-f0-9]{40}$/;
const ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;
const CONTROL_STATES = [
  "default",
  "hover",
  "active",
  "selected",
  "disabled",
  "focus",
];
const BUSINESS_STATES = ["normal", "loading", "error", "disabled", "empty"];
const WIDTHS = [390, 1099, 1920];
const RUN_ROLES = ["upstream", "candidate"];
const PIN_PATH =
  /^(?:(?:src\/integrations\/oss|vendor|docs\/changes|tests\/fixtures)\/|package(?:-lock)?\.json$)/;

/** SPDX 许可是否属于传染性家族；白名单之外的写法同样按家族前缀拦截。 */
export function isDeniedLicense(license, policy = {}) {
  const value = String(license ?? "").trim();
  const explicit = Array.isArray(policy.deniedLicenses)
    ? policy.deniedLicenses
    : [];
  if (
    explicit.some((item) => String(item).toUpperCase() === value.toUpperCase())
  )
    return true;
  return DENIED_LICENSE_FAMILY.test(value);
}

/** 只有 policy.allowedLicenses 精确命中的许可才允许隔离引入。 */
export function isAllowedLicense(license, policy = {}) {
  const value = String(license ?? "").trim();
  const allowed = Array.isArray(policy.allowedLicenses)
    ? policy.allowedLicenses
    : [];
  return allowed.some(
    (item) => String(item).toUpperCase() === value.toUpperCase(),
  );
}

function slug(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** 组件归因必须在 usedInModules 中声明完整的一级目录。 */
export function matchesOssDir(record, dir, vendoredRoot) {
  return (
    Array.isArray(record.usedInModules) &&
    record.usedInModules.includes(`${vendoredRoot}/${dir}`)
  );
}

function componentAttributions(ledger, dir, vendoredRoot) {
  return ledger.attributions.filter(
    (record) =>
      ledger.policy.isolatableIntegrationTypes.includes(
        record.integrationType,
      ) && matchesOssDir(record, dir, vendoredRoot),
  );
}

/** 台账自身的结构与许可红线校验，不依赖文件系统。 */
export function checkAttributionLedger(ledger) {
  const issues = [];
  if (!ledger || typeof ledger !== "object" || Array.isArray(ledger))
    return [`${ATTRIBUTIONS_FILE}: ledger must be a JSON object`];
  if (ledger.version !== 1)
    issues.push(`${ATTRIBUTIONS_FILE}: unsupported ledger version`);
  const policy = ledger.policy;
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    issues.push(`${ATTRIBUTIONS_FILE}: missing policy object`);
    return issues;
  }
  if (policy.vendoredRoot !== DEFAULT_VENDORED_ROOT)
    issues.push(
      `${ATTRIBUTIONS_FILE}: policy.vendoredRoot must be ${DEFAULT_VENDORED_ROOT}`,
    );
  if (
    !Array.isArray(policy.allowedLicenses) ||
    policy.allowedLicenses.length === 0 ||
    policy.allowedLicenses.some((item) => typeof item !== "string")
  )
    issues.push(
      `${ATTRIBUTIONS_FILE}: policy.allowedLicenses must be a non-empty string array`,
    );
  if (
    !Array.isArray(policy.integrationTypes) ||
    INTEGRATION_TYPES.some((type) => !policy.integrationTypes.includes(type))
  )
    issues.push(
      `${ATTRIBUTIONS_FILE}: policy.integrationTypes must contain vendored, adapter and inspired`,
    );
  if (
    !Array.isArray(policy.isolatableIntegrationTypes) ||
    policy.isolatableIntegrationTypes.length !== 2 ||
    !policy.isolatableIntegrationTypes.includes("vendored") ||
    !policy.isolatableIntegrationTypes.includes("adapter")
  )
    issues.push(
      `${ATTRIBUTIONS_FILE}: policy.isolatableIntegrationTypes must list vendored/adapter`,
    );

  const names = new Set();
  for (const key of ["attributions", "restrictedReferences"]) {
    const records = ledger[key];
    if (!Array.isArray(records)) {
      issues.push(`${ATTRIBUTIONS_FILE}: ${key} must be an array`);
      continue;
    }
    records.forEach((record, index) => {
      const label = `${ATTRIBUTIONS_FILE}: ${key}[${index}]`;
      if (!record || typeof record !== "object" || Array.isArray(record)) {
        issues.push(`${label}: must be an object`);
        return;
      }
      for (const field of REQUIRED_FIELDS) {
        if (field === "usedInModules") {
          if (
            !Array.isArray(record.usedInModules) ||
            record.usedInModules.some((item) => typeof item !== "string")
          )
            issues.push(`${label}.usedInModules: must be a string array`);
        } else if (typeof record[field] !== "string" || !record[field].trim()) {
          issues.push(`${label}.${field}: must be a non-empty string`);
        }
      }
      if (typeof record.name === "string" && record.name.trim()) {
        const name = record.name.trim().toLowerCase();
        if (names.has(name))
          issues.push(`${label}: duplicate name ${record.name}`);
        names.add(name);
      }
      if (
        typeof record.integrationType === "string" &&
        !INTEGRATION_TYPES.includes(record.integrationType)
      )
        issues.push(
          `${label}: invalid integrationType ${record.integrationType}`,
        );
      if (
        typeof record.repoUrl === "string" &&
        !isSecureRepoUrl(record.repoUrl)
      )
        issues.push(`${label}.repoUrl: must be an https URL`);
    });
  }
  return issues;
}

function isSecureRepoUrl(value) {
  try {
    const url = new URL(value);
    return (
      /^https:\/\//i.test(value) &&
      url.protocol === "https:" &&
      url.pathname !== "/" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

/**
 * 核心判定（纯函数）：台账结构 → 台账级许可红线 → 目录级署名与许可。
 * @param {string[]} entries src/integrations/oss/ 下的一级组件目录名
 */
export function evaluateOssAttributions(entries, ledger, options = {}) {
  const issues = checkAttributionLedger(ledger);
  if (issues.length) return issues;
  const policy = ledger.policy;
  const vendoredRoot =
    options.vendoredRoot ?? policy.vendoredRoot ?? DEFAULT_VENDORED_ROOT;
  const isolatable = policy.isolatableIntegrationTypes;
  const records = [
    ...ledger.attributions.map((record) => ({ record, restricted: false })),
    ...ledger.restrictedReferences.map((record) => ({
      record,
      restricted: true,
    })),
  ];

  // 台账级：任何可隔离引入的记录必须宽松许可，且显式指向 oss/ 目录。
  for (const { record, restricted } of records) {
    const label = `${ATTRIBUTIONS_FILE}: ${record.name}`;
    if (restricted && isolatable.includes(record.integrationType))
      issues.push(
        `${label}: restricted reference must stay inspired, never vendored/adapter`,
      );
    if (!isolatable.includes(record.integrationType)) continue;
    if (isDeniedLicense(record.license, policy))
      issues.push(
        `${label}: non-permissive license ${record.license} must not be vendored`,
      );
    else if (!isAllowedLicense(record.license, policy))
      issues.push(
        `${label}: license ${record.license} is outside policy.allowedLicenses`,
      );
    if (
      !record.usedInModules.some((item) =>
        MANAGED_ROOTS.some((base) => item.startsWith(`${base}/`)),
      )
    )
      issues.push(
        `${label}: vendored entry must cite ${DEFAULT_VENDORED_ROOT}/<dir> or vendor/<dir> in usedInModules`,
      );
  }

  // 目录级：oss/ 下每个组件目录必须有唯一、宽松许可、非 inspired 的署名。
  for (const dir of entries) {
    const target = `${vendoredRoot}/${dir}`;
    const matches = componentAttributions(ledger, dir, vendoredRoot);
    if (matches.length === 0) {
      issues.push(
        `${target}: missing attribution entry in ${ATTRIBUTIONS_FILE}`,
      );
    }
    if (matches.length > 1) {
      issues.push(
        `${target}: ambiguous attribution (${matches.length} matching records)`,
      );
      continue;
    }
    // Research names explain a denial without ever granting directory admission.
    const diagnostics = matches.length
      ? [{ record: matches[0], restricted: false }]
      : records.filter(
          ({ record, restricted }) =>
            (restricted || !isolatable.includes(record.integrationType)) &&
            (matchesOssDir(record, dir, vendoredRoot) ||
              slug(record.name) === slug(dir)),
        );
    for (const { record, restricted } of diagnostics) {
      if (restricted)
        issues.push(
          `${target}: ${record.name} is ${record.license}; copying or bundling its source is forbidden, clean-room reimplementation only`,
        );
      if (isDeniedLicense(record.license, policy))
        issues.push(
          `${target}: non-permissive license ${record.license}; AGPL/GPL/LGPL must stay clean-room inspired`,
        );
      else if (!isAllowedLicense(record.license, policy))
        issues.push(
          `${target}: license ${record.license} is outside policy.allowedLicenses`,
        );
      if (!isolatable.includes(record.integrationType))
        issues.push(
          `${target}: ${record.integrationType} records must not place source under ${vendoredRoot}`,
        );
    }
  }
  return issues;
}

/** 列出隔离根下的一级组件目录；目录不存在视为零引入。 */
export function listOssDirs(root, vendoredRoot = DEFAULT_VENDORED_ROOT) {
  const base = path.join(root, vendoredRoot);
  if (!fs.existsSync(base)) return [];
  return fs
    .readdirSync(base, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, "en"));
}

const sha256 = (data) => createHash("sha256").update(data).digest("hex");
const nonempty = (value) =>
  typeof value === "string" && value.trim().length > 0;

function readPin(root, pin, allowEmpty = false) {
  if (
    typeof pin?.path !== "string" ||
    !PIN_PATH.test(pin.path) ||
    /[\\:]/.test(pin.path) ||
    Array.from(pin.path).some((character) => character.charCodeAt(0) < 32) ||
    pin.path
      .split("/")
      .some(
        (part) =>
          !part ||
          part === "." ||
          part === ".." ||
          /^(?:\.git|node_modules|\.tmp|user-data)$/i.test(part),
      ) ||
    typeof pin.sha256 !== "string" ||
    !SHA256.test(pin.sha256) ||
    (pin.text !== undefined && pin.text !== true)
  )
    throw new Error("expected a repository file path and SHA-256");
  const file = path.join(root, pin.path);
  if (fs.realpathSync(file) !== file || !fs.statSync(file).isFile())
    throw new Error("evidence must be a regular file without path aliases");
  const bytes = fs.readFileSync(file);
  const content =
    pin.text === true
      ? Buffer.from(bytes.toString("utf8").replaceAll("\r\n", "\n"))
      : bytes;
  if ((!allowEmpty && !content.length) || sha256(content) !== pin.sha256)
    throw new Error("evidence SHA-256 mismatch or empty file");
  return content;
}

function gitAt(root, ...args) {
  return execFileSync(
    "git",
    ["--no-optional-locks", "--literal-pathspecs", ...args],
    { cwd: root, stdio: ["ignore", "pipe", "ignore"] },
  );
}

function verifyLicense(root, pin, declared) {
  const content = readPin(root, pin).toString("utf8");
  if (!LICENSE_NAME.test(path.posix.basename(pin.path)))
    throw new Error(
      "license evidence must be a named LICENSE, COPYING or NOTICE file",
    );
  if (/GNU (?:AFFERO |LESSER )?GENERAL PUBLIC LICENSE/i.test(content))
    throw new Error("license evidence contains a non-permissive license");
  const text = content.replace(/\s+/g, " ").replace(/[“”]/g, '"').toLowerCase();
  const bsd = [
    "redistribution and use in source and binary forms",
    "redistributions of source code must retain",
    'and contributors "as is"',
  ];
  const endorsement =
    "may be used to endorse or promote products derived from this software";
  const markers = {
    mit: [
      "permission is hereby granted, free of charge",
      "the above copyright notice and this permission notice shall be included",
      'the software is provided "as is"',
    ],
    "apache-2.0": [
      "apache license version 2.0",
      "grant of patent license",
      "limitation of liability",
    ],
    "bsd-2-clause": bsd,
    "bsd-3-clause": [...bsd, endorsement],
    isc: [
      "permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted",
      "the above copyright notice and this permission notice appear in all copies",
      'the software is provided "as is"',
    ],
  };
  const spdx = declared.trim().toLowerCase();
  if (
    !markers[spdx]?.every((part) => text.includes(part)) ||
    (spdx === "bsd-2-clause" && text.includes(endorsement))
  )
    throw new Error("license text does not support declared SPDX license");
}

function verifyComponentPins(root, target, admission) {
  const pinned = new Set([
    admission.licenseFile.path,
    ...admission.dependencies.map((entry) => entry.path),
    ...admission.implementation.map((entry) => entry.path),
  ]);
  const files = gitAt(
    root,
    "ls-files",
    "-z",
    "--cached",
    "--others",
    "--exclude-standard",
    "--",
    target,
  )
    .toString("utf8")
    .split("\0");
  const unpinned = files.find((file) => file && !pinned.has(file));
  if (unpinned) throw new Error(`unpinned component file: ${unpinned}`);
}

function readJsonPin(root, pin, label) {
  const content = readPin(root, pin);
  try {
    return JSON.parse(content.toString("utf8"));
  } catch {
    throw new Error(`malformed ${label} JSON`);
  }
}

function verifyProvenance(root, record) {
  const { admission } = record;
  const host = new URL(record.repoUrl).hostname.replace(/\.$/, "");
  if (
    /(^|\.)(?:localhost|example|invalid|test|example\.(?:com|net|org))$/i.test(
      host,
    )
  )
    throw new Error("reserved upstream host");
  const checkout = readJsonPin(root, admission.provenance, "upstream checkout");
  if (
    checkout?.repoUrl !== record.repoUrl ||
    checkout.commit !== admission.commit ||
    checkout.version !== admission.version ||
    typeof checkout.tree !== "string" ||
    !GIT_SHA.test(checkout.tree)
  )
    throw new Error("upstream checkout identity does not match admission");
}

function planCases(admission) {
  const inputs = new Set(admission.inputs.map((pin) => pin.path));
  const coveredInputs = new Set();
  const flows = new Set();
  const cases = new Map();
  if (
    inputs.size !== admission.inputs.length ||
    !Array.isArray(admission.flows) ||
    !admission.flows.length
  )
    throw new Error("admission requires unique inputs and declared workflows");
  for (const flow of admission.flows) {
    if (
      typeof flow?.id !== "string" ||
      !ID.test(flow.id) ||
      flows.has(flow.id) ||
      !Array.isArray(flow.cases) ||
      !flow.cases.length
    )
      throw new Error("invalid or duplicate workflow");
    flows.add(flow.id);
    for (const test of flow.cases) {
      if (
        typeof test?.id !== "string" ||
        !ID.test(test.id) ||
        cases.has(test.id) ||
        !inputs.has(test.input)
      )
        throw new Error("invalid workflow case or unknown input");
      cases.set(test.id, test);
      coveredInputs.add(test.input);
    }
  }
  if (coveredInputs.size !== inputs.size)
    throw new Error("each locked input requires a declared workflow case");
  return { flows, cases };
}

function compareArtifacts(root, entry, comparison) {
  if (
    !entry.upstream?.path ||
    entry.upstream.path.toLowerCase() === entry.candidate?.path?.toLowerCase()
  )
    throw new Error("parity requires separate upstream and candidate outputs");
  if (comparison?.kind === "bytes")
    return readPin(root, entry.upstream, true).equals(
      readPin(root, entry.candidate, true),
    );
  if (comparison?.kind === "json" || comparison?.kind === "numeric-abs") {
    const upstream = readJsonPin(root, entry.upstream, "upstream output");
    const candidate = readJsonPin(root, entry.candidate, "candidate output");
    if (comparison.kind === "json")
      return (
        isDeepStrictEqual(upstream, candidate) &&
        (!Object.hasOwn(comparison, "expected") ||
          isDeepStrictEqual(upstream, comparison.expected))
      );
    const limit = comparison.maxDifference;
    if (Number.isFinite(limit) && limit >= 0)
      return (
        Number.isFinite(upstream) &&
        Number.isFinite(candidate) &&
        Math.abs(upstream - candidate) <= limit
      );
  }
  throw new Error("unsupported or invalid parity comparison");
}

function verifyUi(root, ui, evidence, workflows) {
  if (ui?.mode === "headless") {
    if (!nonempty(ui.reason)) throw new Error("headless reason required");
    if (evidence !== undefined)
      throw new Error("headless admission cannot declare UI evidence");
    return;
  }
  if (
    ui?.mode !== "interactive" ||
    !Array.isArray(ui.controls) ||
    !ui.controls.length ||
    !Array.isArray(ui.flows) ||
    !ui.flows.length ||
    !Array.isArray(evidence)
  )
    throw new Error("explicit UI applicability and UI evidence required");
  const expected = new Map(
    BUSINESS_STATES.map((state) => [`business.${state}`, { state }]),
  );
  for (const width of WIDTHS)
    expected.set(`layout.${width}`, { width, overflow: false });
  for (const flowId of ui.flows) {
    const id = `interaction.${flowId}`;
    if (!workflows.has(flowId) || expected.has(id))
      throw new Error("unknown or duplicate UI workflow");
    expected.set(id, { flowId, dispatched: true });
  }
  const controls = new Set();
  for (const control of ui.controls) {
    if (
      typeof control?.id !== "string" ||
      !ID.test(control.id) ||
      controls.has(control.id)
    )
      throw new Error("invalid or duplicate UI control");
    controls.add(control.id);
    const exceptions = new Set();
    if (
      control.notApplicable !== undefined &&
      !Array.isArray(control.notApplicable)
    )
      throw new Error("invalid UI state applicability");
    for (const entry of control.notApplicable ?? []) {
      if (
        !CONTROL_STATES.includes(entry?.state) ||
        entry.state === "default" ||
        exceptions.has(entry.state) ||
        !nonempty(entry.reason)
      )
        throw new Error("invalid UI state applicability");
      exceptions.add(entry.state);
    }
    for (const state of CONTROL_STATES)
      if (!exceptions.has(state))
        expected.set(`control.${control.id}.${state}`, {
          controlId: control.id,
          state,
        });
  }
  for (const probe of evidence) {
    if (!expected.has(probe?.id))
      throw new Error("unknown or duplicate UI evidence");
    const capture = readJsonPin(root, probe.observation, "UI observation");
    if (
      capture?.id !== probe.id ||
      !nonempty(capture.entryPoint) ||
      !nonempty(capture.action) ||
      !isDeepStrictEqual(capture.observed, expected.get(probe.id))
    )
      throw new Error(`UI observation differs: ${probe.id}`);
    expected.delete(probe.id);
  }
  if (expected.size)
    throw new Error(`missing UI evidence: ${expected.keys().next().value}`);
}

function verifyRunEvidence(root, receipt) {
  const { upstream, candidate } = receipt.runs;
  const logText = (run) =>
    readPin(root, run.log).toString("utf8").replaceAll("\r\n", "\n");
  if (
    logText(upstream) === logText(candidate) ||
    upstream.log.path.toLowerCase() === candidate.log.path.toLowerCase() ||
    upstream.log.sha256 === candidate.log.sha256
  )
    throw new Error("upstream and candidate require distinct raw run logs");

  const runIds = new Set();
  for (const role of RUN_ROLES) {
    const run = receipt.runs[role];
    const manifest = readJsonPin(root, run.manifest, `${role} run manifest`);
    if (
      manifest?.role !== role ||
      typeof manifest.runId !== "string" ||
      !ID.test(manifest.runId) ||
      runIds.has(manifest.runId) ||
      manifest.admissionSha256 !== receipt.admissionSha256 ||
      manifest.logSha256 !== run.log.sha256 ||
      !Array.isArray(manifest.cases)
    )
      throw new Error(`run manifest identity differs: ${role}`);
    runIds.add(manifest.runId);
    const pending = new Map(receipt.cases.map((entry) => [entry.id, entry]));
    for (const observed of manifest.cases) {
      const expected = pending.get(observed?.id);
      if (
        !expected ||
        observed.input !== expected.input ||
        !isDeepStrictEqual(observed.output, expected[role])
      )
        throw new Error(`run output binding differs: ${role}`);
      pending.delete(observed.id);
    }
    if (pending.size) throw new Error(`run manifest omits cases: ${role}`);
  }
}

/** Binds run evidence to the exact declared upstream and local input set. */
export function admissionFingerprint(record) {
  const admission = record.admission;
  const pin = (value) => [value.path, value.sha256, value.text === true];
  return sha256(
    JSON.stringify([
      record.repoUrl,
      record.license,
      admission.commit,
      admission.version,
      pin(admission.provenance),
      pin(admission.licenseFile),
      admission.dependencies.map(pin),
      admission.inputs.map(pin),
      admission.implementation.map(pin),
      admission.flows,
      admission.ui,
    ]),
  );
}

function verifyAdmission(root, target, record) {
  const admission = record.admission;
  if (
    !admission ||
    typeof admission.commit !== "string" ||
    !GIT_SHA.test(admission.commit) ||
    !nonempty(admission.version) ||
    !["dependencies", "inputs", "implementation"].every(
      (field) => Array.isArray(admission[field]) && admission[field].length,
    )
  )
    throw new Error(
      "admission requires a full upstream commit, version and pinned dependencies, inputs and implementation",
    );
  if (
    record.integrationType === "vendored" &&
    !admission.licenseFile?.path?.startsWith(`${target}/`)
  )
    throw new Error("vendored license evidence must be under the component");
  verifyLicense(root, admission.licenseFile, record.license);
  for (const entry of [...admission.dependencies, ...admission.inputs])
    readPin(root, entry);
  for (const entry of admission.implementation) readPin(root, entry, true);
  if (
    !admission.implementation.every((entry) =>
      entry.path.startsWith(`${target}/`),
    )
  )
    throw new Error("implementation evidence must be under the component");
  verifyComponentPins(root, target, admission);
  verifyProvenance(root, record);
  const { flows, cases } = planCases(admission);
  const receipt = readJsonPin(root, admission.receipt, "run/parity receipt");
  if (
    receipt?.admissionSha256 !== admissionFingerprint(record) ||
    !RUN_ROLES.every(
      (field) =>
        nonempty(receipt.runs?.[field]?.command) &&
        receipt.runs[field].exitCode === 0,
    ) ||
    !Array.isArray(receipt.cases) ||
    receipt.cases.length === 0
  )
    throw new Error("malformed or stale run/parity receipt");
  for (const test of receipt.cases) {
    const planned = cases.get(test?.id);
    if (!planned) throw new Error("unknown or duplicate receipt case");
    if (test.input !== planned.input)
      throw new Error("receipt case input does not match the plan");
    if (!compareArtifacts(root, test, planned.compare))
      throw new Error(`parity outputs differ: ${test.id}`);
    cases.delete(test.id);
  }
  if (cases.size)
    throw new Error(`missing receipt case: ${cases.keys().next().value}`);
  verifyRunEvidence(root, receipt);
  verifyUi(root, admission.ui, receipt.uiEvidence, flows);
}

function verifyLegacy(root, target) {
  if (!LEGACY_COMPONENTS.has(target))
    throw new Error(
      "legacy status is restricted to the named baseline components",
    );
  let changed;
  try {
    changed =
      gitAt(
        root,
        "diff",
        "--no-ext-diff",
        "--no-textconv",
        "--name-only",
        LEGACY_BASE,
        "--",
        target,
      ).length ||
      gitAt(root, "ls-files", "--others", "--exclude-standard", "--", target)
        .length;
  } catch {
    throw new Error("cannot compare the pinned legacy baseline");
  }
  if (changed)
    throw new Error(
      "legacy implementation changed; current admission evidence required",
    );
}

/** 供 scripts/check-governance.mjs 与独立 CLI 共用的只读检查。 */
export function checkOssAttributions(root = process.cwd()) {
  const file = path.join(root, ATTRIBUTIONS_FILE);
  if (!fs.existsSync(file))
    return {
      scanned: 0,
      issues: [`${ATTRIBUTIONS_FILE}: missing attribution ledger`],
    };
  let ledger;
  try {
    ledger = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return {
      scanned: 0,
      issues: [`${ATTRIBUTIONS_FILE}: invalid JSON`],
    };
  }
  const issues = checkAttributionLedger(ledger);
  if (issues.length) return { scanned: 0, issues };
  const canonicalRoot = fs.realpathSync(root);
  const targets = new Set();
  for (const vendoredRoot of MANAGED_ROOTS) {
    const base = path.join(canonicalRoot, vendoredRoot);
    if (!fs.existsSync(base)) continue;
    if (fs.realpathSync(base) !== base || !fs.statSync(base).isDirectory()) {
      issues.push(`${vendoredRoot}: managed root must be a real directory`);
      continue;
    }
    const dirs = listOssDirs(canonicalRoot, vendoredRoot);
    issues.push(...evaluateOssAttributions(dirs, ledger, { vendoredRoot }));
    for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
      if (
        (!entry.isDirectory() || entry.name.startsWith(".")) &&
        !(
          vendoredRoot === "vendor" &&
          entry.isFile() &&
          ROOT_NOTICE.test(entry.name)
        )
      )
        issues.push(
          `${vendoredRoot}/${entry.name}: source must live in a named component directory with attribution`,
        );
    }
    for (const dir of dirs) {
      const target = `${vendoredRoot}/${dir}`;
      targets.add(target);
      const records = componentAttributions(ledger, dir, vendoredRoot);
      if (records.length !== 1) {
        issues.push(
          `${target}: expected one explicit vendored/adapter attribution`,
        );
        continue;
      }
      try {
        const record = records[0];
        if (record.legacy === true) verifyLegacy(canonicalRoot, target);
        else verifyAdmission(canonicalRoot, target, record);
      } catch (error) {
        const message = error.code
          ? "evidence file or pinned baseline unavailable"
          : error.message;
        issues.push(`${target}: ${message}`);
      }
    }
  }
  for (const record of ledger.attributions)
    if (
      ledger.policy.isolatableIntegrationTypes.includes(
        record.integrationType,
      ) &&
      !record.usedInModules.some((module) => targets.has(module))
    )
      issues.push(
        `${record.name}: declared integration has no actual component directory`,
      );
  return { scanned: targets.size, issues: [...new Set(issues)] };
}

function parseRoot(args) {
  const index = args.indexOf("--root");
  if (index === -1) return process.cwd();
  const value = args[index + 1];
  if (!value)
    throw new Error(
      "Usage: node scripts/governance/oss-attributions.mjs [--root <dir>]",
    );
  return path.resolve(value);
}

function main() {
  try {
    const { scanned, issues } = checkOssAttributions(
      parseRoot(process.argv.slice(2)),
    );
    issues.forEach((issue) => console.error(issue));
    console.log(
      `OSS attributions: ${scanned} isolated components, ${issues.length} violations.`,
    );
    process.exitCode = issues.length ? 1 : 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main();
