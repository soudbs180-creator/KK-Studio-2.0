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
const SHA256 = /^[a-f0-9]{64}$/;
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

/** 目录可由 usedInModules 显式指向，或由组件名与目录名归一化后匹配。 */
export function matchesOssDir(record, dir, vendoredRoot) {
  const prefix = `${vendoredRoot}/${dir}`;
  const paths = Array.isArray(record.usedInModules) ? record.usedInModules : [];
  if (
    paths.some(
      (item) =>
        typeof item === "string" &&
        (item === prefix || item.startsWith(`${prefix}/`)),
    )
  )
    return true;
  return slug(record.name) === slug(dir);
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
    const matches = records.filter(({ record }) =>
      matchesOssDir(record, dir, vendoredRoot),
    );
    if (matches.length === 0) {
      issues.push(
        `${target}: missing attribution entry in ${ATTRIBUTIONS_FILE}`,
      );
      continue;
    }
    if (matches.length > 1) {
      issues.push(
        `${target}: ambiguous attribution (${matches.length} matching records)`,
      );
      continue;
    }
    const { record, restricted } = matches[0];
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

function readPin(root, pin) {
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
  if (!content.length || sha256(content) !== pin.sha256)
    throw new Error("evidence SHA-256 mismatch or empty file");
  return content;
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
      pin(admission.licenseFile),
      admission.dependencies.map(pin),
      admission.inputs.map(pin),
      admission.implementation.map(pin),
    ]),
  );
}

function verifyAdmission(root, target, record) {
  const admission = record.admission;
  if (
    !admission ||
    typeof admission.commit !== "string" ||
    !/^(?!0+$)[a-f0-9]{40}$/.test(admission.commit) ||
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
  const license = readPin(root, admission.licenseFile).toString("utf8");
  if (/GNU (?:AFFERO |LESSER )?GENERAL PUBLIC LICENSE/i.test(license))
    throw new Error("license evidence contains a non-permissive license");
  for (const entry of [
    ...admission.dependencies,
    ...admission.inputs,
    ...admission.implementation,
  ])
    readPin(root, entry);
  if (
    !admission.implementation.every((entry) =>
      entry.path.startsWith(`${target}/`),
    )
  )
    throw new Error("implementation evidence must be under the component");

  const rawReceipt = readPin(root, admission.receipt).toString("utf8");
  let receipt;
  try {
    receipt = JSON.parse(rawReceipt);
  } catch {
    throw new Error("malformed run/parity receipt JSON");
  }
  if (
    receipt?.admissionSha256 !== admissionFingerprint(record) ||
    !["upstream", "candidate"].every(
      (field) =>
        nonempty(receipt.runs?.[field]?.command) &&
        receipt.runs[field].exitCode === 0,
    ) ||
    !Array.isArray(receipt.cases) ||
    receipt.cases.length === 0
  )
    throw new Error("malformed or stale run/parity receipt");
  const inputs = new Set(admission.inputs.map((entry) => entry.path));
  const cases = new Set();
  for (const test of receipt.cases) {
    if (
      !nonempty(test?.id) ||
      cases.has(test.id) ||
      !inputs.has(test.input) ||
      !nonempty(test.criteria) ||
      test.result !== "PASS" ||
      !test.upstream?.path ||
      test.upstream.path === test.candidate?.path
    )
      throw new Error("invalid or incomplete parity case");
    cases.add(test.id);
    readPin(root, test.upstream);
    readPin(root, test.candidate);
  }
}

function verifyLegacy(root, target) {
  if (!LEGACY_COMPONENTS.has(target))
    throw new Error(
      "legacy status is restricted to the named baseline components",
    );
  const git = (...args) =>
    execFileSync(
      "git",
      ["--no-optional-locks", "--literal-pathspecs", ...args],
      {
        cwd: root,
        stdio: ["ignore", "pipe", "ignore"],
      },
    );
  let changed;
  try {
    changed =
      git(
        "diff",
        "--no-ext-diff",
        "--no-textconv",
        "--name-only",
        LEGACY_BASE,
        "--",
        target,
      ).length ||
      git("ls-files", "--others", "--exclude-standard", "--", target).length;
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
      const records = ledger.attributions.filter(
        (record) =>
          ledger.policy.isolatableIntegrationTypes.includes(
            record.integrationType,
          ) && record.usedInModules.includes(target),
      );
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
