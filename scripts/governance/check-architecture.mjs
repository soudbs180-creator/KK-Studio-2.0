import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { cruise } from "dependency-cruiser";
import extractTSConfig from "dependency-cruiser/config-utl/extract-ts-config";
import configuration from "../../config/architecture-rules.cjs";

const ids = Array.from({ length: 8 }, (_, i) => `R${i + 1}`);
const baselineFile = "config/architecture-baseline.json";
const feature = (file) => /^src\/features\/([^/]+)\//.exec(file)?.[1];
const businessModule = (file) =>
  /^(src|packages\/creation-contracts)\/.*\.[cm]?[jt]sx?$/.test(file);
const git = (root, ...args) =>
  execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
const sorted = (items) => [...new Set(items)].sort();
const rule = (items) => ({ count: items.length, items });

export async function collectArchitecture(root = process.cwd()) {
  root = path.resolve(root);
  const local = (file) =>
    (path.isAbsolute(file) ? path.relative(root, file) : file).replaceAll(
      "\\",
      "/",
    );
  const featureRoot = path.join(root, "src/features");
  const features = fs.existsSync(featureRoot)
    ? fs
        .readdirSync(featureRoot, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
    : [];
  const forbidden = [
    ...configuration.forbidden,
    ...features.map((name) => ({
      name: `R1/${name}`,
      severity: "error",
      from: { pathNot: `^src/features/${name}/` },
      to: {
        path: `^src/features/${name}/`,
        pathNot: `^src/features/${name}/index\\.ts$`,
      },
    })),
  ];
  const pluginRoot = path.join(root, "vendor/canvas-plugins");
  const inputs = ["src", "packages/creation-contracts"];
  if (fs.existsSync(pluginRoot))
    for (const entry of fs.readdirSync(pluginRoot, { withFileTypes: true })) {
      if (entry.isDirectory())
        inputs.push(`vendor/canvas-plugins/${entry.name}/src`);
    }
  const directories = inputs.filter((file) =>
    fs.existsSync(path.join(root, file)),
  );
  if (!directories.length)
    throw new Error("Architecture: no product sources found");
  const tsConfig = extractTSConfig(path.join(root, "tsconfig.json"));
  if (!tsConfig.options)
    throw new Error("Architecture: TypeScript configuration was not loaded");
  const { output } = await cruise(
    directories,
    {
      ...configuration.options,
      baseDir: root,
      tsConfig: { fileName: path.join(root, "tsconfig.json") },
      outputType: "json",
      validate: true,
      ruleSet: { forbidden },
    },
    configuration.resolveOptions,
    { tsConfig },
  );
  const graph = typeof output === "string" ? JSON.parse(output) : output;
  const items = Object.fromEntries(ids.map((id) => [id, new Set()]));
  for (const violation of graph.summary.violations) {
    items[violation.rule.name.split("/")[0]].add(
      `${local(violation.from)} => ${local(violation.to)}`,
    );
  }
  items.R4 = cyclicFeatureEdges(graph.modules, local);
  return {
    rules: Object.fromEntries(ids.map((id) => [id, rule(sorted(items[id]))])),
  };
}

function cyclicFeatureEdges(modules, local) {
  const cycles = new Set();
  const edges = new Map();
  for (const module of modules) {
    const from = local(module.source);
    for (const dependency of module.dependencies) {
      if (
        dependency.couldNotResolve &&
        /^(\.|@\/|src\/|packages\/)/.test(dependency.module)
      ) {
        throw new Error(
          `Architecture unresolved internal dependency: ${from} => ${dependency.module}`,
        );
      }
      const a = feature(from);
      const b = feature(local(dependency.resolved));
      if (a && b && a !== b) {
        if (!edges.has(a)) edges.set(a, new Set());
        edges.get(a).add(b);
      }
    }
  }
  // A feature edge is cyclic exactly when its target can reach its source.
  for (const [from, targets] of edges)
    for (const to of targets) {
      const pending = [to];
      const seen = new Set();
      while (pending.length) {
        const next = pending.pop();
        if (next === from) {
          cycles.add(`${from} => ${to}`);
          break;
        }
        if (seen.has(next)) continue;
        seen.add(next);
        pending.push(...(edges.get(next) ?? []));
      }
    }
  return cycles;
}

function validateBaseline(baseline) {
  if (
    !baseline?.rules ||
    Object.keys(baseline.rules).sort().join() !== ids.join()
  )
    throw new Error("Invalid architecture baseline rules");
  for (const id of ids) {
    const entry = baseline.rules[id];
    if (
      !Array.isArray(entry?.items) ||
      entry.items.some((item) => typeof item !== "string" || !item.trim()) ||
      entry.count !== entry.items.length ||
      new Set(entry.items).size !== entry.count
    ) {
      throw new Error(`Invalid architecture baseline ${id}`);
    }
  }
}

export function compareArchitecture(current, baseline, previousBaseline) {
  validateBaseline(current);
  validateBaseline(baseline);
  if (previousBaseline) validateBaseline(previousBaseline);
  const issues = [];
  const reductions = [];
  for (const id of ids) {
    const allowed = new Set(baseline.rules[id].items);
    for (const item of current.rules[id].items)
      if (!allowed.has(item))
        issues.push(`${id}: new architecture violation ${item}`);
    if (previousBaseline) {
      const previous = new Set(previousBaseline.rules[id].items);
      for (const item of allowed)
        if (!previous.has(item))
          issues.push(`Architecture baseline ${id} cannot grow: ${item}`);
    }
    const removed = baseline.rules[id].items.filter(
      (item) => !current.rules[id].items.includes(item),
    );
    if (removed.length)
      reductions.push(
        `${id}: remove ${removed.length} resolved entries from baseline`,
      );
  }
  return { issues, reductions };
}

export function findNewDuplicateModules(root, existing, added) {
  const candidates = sorted([...existing, ...added]).filter(
    (file) => businessModule(file) && fs.existsSync(path.join(root, file)),
  );
  const issues = [];
  for (const file of sorted(added).filter((file) =>
    candidates.includes(file),
  )) {
    if (/\/index\.[cm]?[jt]sx?$|\.d\.[cm]?ts$/.test(file)) continue;
    for (const other of candidates) {
      if (file === other || path.basename(file) !== path.basename(other))
        continue;
      const paired =
        (file.startsWith("src/domain/") && other.startsWith("src/features/")) ||
        (other.startsWith("src/domain/") && file.startsWith("src/features/"));
      if (
        paired &&
        fs
          .readFileSync(path.join(root, file), "utf8")
          .slice(0, 800)
          .includes(other) &&
        fs
          .readFileSync(path.join(root, other), "utf8")
          .slice(0, 800)
          .includes(file)
      )
        continue;
      issues.push(`${file} => ${other}`);
    }
  }
  return sorted(issues);
}

export async function checkArchitecture(
  root = process.cwd(),
  { baseRef } = {},
) {
  const baseline = JSON.parse(
    fs.readFileSync(path.join(root, baselineFile), "utf8"),
  );
  baseRef ??= process.env.ARCHITECTURE_BASE || process.env.GOVERNANCE_BASE;
  if (!baseRef) {
    try {
      baseRef = git(root, "rev-parse", "--verify", "refs/heads/main");
    } catch {
      baseRef = "origin/main";
    }
  }
  const baseSha = git(root, "rev-parse", "--verify", `${baseRef}^{commit}`);
  let previous;
  try {
    previous = JSON.parse(git(root, "show", `${baseSha}:${baselineFile}`));
  } catch (error) {
    if (git(root, "ls-tree", "--name-only", baseSha, "--", baselineFile))
      throw error;
  }
  const existing = git(root, "ls-tree", "-r", "--name-only", "-z", baseSha)
    .split("\0")
    .filter(Boolean);
  const oldPaths = new Set(existing);
  const added = sorted(
    git(root, "ls-files", "--cached", "--others", "--exclude-standard", "-z")
      .split("\0")
      .filter(
        (file) =>
          file && !oldPaths.has(file) && fs.existsSync(path.join(root, file)),
      ),
  );
  const current = await collectArchitecture(root);
  current.rules.R8 = rule(findNewDuplicateModules(root, existing, added));
  const result = compareArchitecture(current, baseline, previous);
  if (!previous) {
    const changes = git(
      root,
      "diff",
      "--name-only",
      baseSha,
      "--",
      "src",
      "packages",
      "vendor/canvas-plugins",
    );
    if (
      changes ||
      added.some((file) =>
        /^(src|packages|vendor\/canvas-plugins)\//.test(file),
      )
    )
      result.issues.push(
        "Initial architecture baseline requires unchanged product sources (bootstrap)",
      );
    if (baseline.commit !== baseSha)
      result.issues.push(
        "Initial architecture baseline commit must match the selected Git base",
      );
  }
  return { ...result, current, baseSha };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    const result = await checkArchitecture();
    result.issues.forEach((issue) => console.error(issue));
    result.reductions.forEach((message) => console.log(message));
    console.log(
      `Architecture: ${ids.map((id) => `${id}=${result.current.rules[id].count}`).join(", ")}; ${result.issues.length} violations.`,
    );
    process.exitCode = result.issues.length ? 1 : 0;
  } catch (error) {
    console.error(`Architecture: ${error.message}`);
    process.exitCode = 1;
  }
}
