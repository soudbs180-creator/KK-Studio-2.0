import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { execFileSync, spawnSync } from "node:child_process";
import {
  collectArchitecture,
  compareArchitecture,
  checkArchitecture,
  findNewDuplicateModules,
} from "../../scripts/governance/check-architecture.mjs";

function fixture(t, files: Record<string, string>) {
  const parent = path.resolve(".tmp");
  fs.mkdirSync(parent, { recursive: true });
  const root = fs.mkdtempSync(path.join(parent, "architecture-"));
  const write = (name: string, content: string) => {
    const file = path.join(root, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };
  write(
    "tsconfig.json",
    JSON.stringify({
      compilerOptions: {
        baseUrl: ".",
        paths: { "@/*": ["src/*"] },
        moduleResolution: "bundler",
        module: "esnext",
        target: "es2022",
        allowImportingTsExtensions: true,
      },
      include: ["src", "packages"],
    }),
  );
  for (const [name, content] of Object.entries(files)) write(name, content);
  t.after(() => {
    assert.equal(path.dirname(fs.realpathSync(root)), fs.realpathSync(parent));
    fs.rmSync(root, { recursive: true, force: true });
  });
  return { root, write };
}

function baseline(rules = {}) {
  return {
    generatedAt: "2026-10-28",
    commit: "fixture",
    rules: Object.fromEntries(
      Array.from({ length: 8 }, (_, i) => {
        const id = `R${i + 1}`;
        const items = rules[id] ?? [];
        return [id, { count: items.length, items }];
      }),
    ),
  };
}

test("architecture accepts public feature entry points and internal implementation imports", async (t) => {
  const { root } = fixture(t, {
    "src/components/view.ts": 'export { value } from "@/features/b";',
    "src/features/b/index.ts": 'export { value } from "./private.ts";',
    "src/features/b/private.ts": "export const value = 1;",
    "src/features/capabilities/run.ts":
      'export type { Task } from "../../../packages/creation-contracts/ports.ts";',
    "packages/creation-contracts/ports.ts": "export type Task = string;",
  });
  const result = await collectArchitecture(root);
  assert.deepEqual(compareArchitecture(result, baseline()).issues, []);
});

test("architecture detects private feature references through every supported import form", async (t) => {
  const forms = [
    'import type { Value } from "@/features/b/private.ts"; export type V = Value;',
    'export type { Value } from "@/features/b/private";',
    'export const value = import("@/features/b/private.ts");',
    'export type V = import("@/features/b/private").Value;',
    'export const value = require("@/features/b/private.ts");',
    "export const value = import(`@/features/b/private.ts`);",
  ];
  const { root } = fixture(t, {
    "src/features/b/private.ts": "export type Value = string;",
    ...Object.fromEntries(
      forms.map((source, i) => [`src/components/form${i}.ts`, source]),
    ),
    "src/features/a/consumer.ts":
      'export type { Value } from "../b/private.ts";',
  });
  const result = await collectArchitecture(root);
  assert.equal(result.rules.R1.count, 7);
  for (let i = 0; i < forms.length; i++) {
    assert.ok(
      result.rules.R1.items.includes(
        `src/components/form${i}.ts => src/features/b/private.ts`,
      ),
    );
  }
  assert.equal(compareArchitecture(result, baseline()).issues.length, 7);
});

test("architecture rejects upward imports, capability dependencies, domain infrastructure and plugin host access", async (t) => {
  const { root } = fixture(t, {
    "src/components/view.ts": "export const value = 1;",
    "src/features/a/index.ts":
      'export { value } from "../../components/view.ts";',
    "src/integrations/service.ts":
      'export { value } from "../features/a/index.ts";',
    "src/features/capabilities/run.ts":
      'export { value } from "../a/index.ts";',
    "src/runtime/storage.ts": "export const value = 1;",
    "src/domain/model.ts":
      'export { value } from "../runtime/storage.ts"; import fs from "node:fs"; export { fs };',
    "src/domain/framework.ts": 'export type { ReactNode } from "react";',
    "packages/creation-contracts/ports.ts":
      'export { value } from "../../src/runtime/storage.ts";',
    "vendor/canvas-plugins/note/src/main.ts":
      'export { value } from "../../../../src/components/view.ts";',
  });
  const result = await collectArchitecture(root);
  for (const id of ["R2", "R3", "R5", "R6", "R7"])
    assert.ok(result.rules[id].count > 0, id);
  assert.match(result.rules.R6.items.join(), /react/);
  const errors = compareArchitecture(result, baseline()).issues.join("\n");
  for (const id of ["R2", "R3", "R5", "R6", "R7"])
    assert.match(errors, new RegExp(id));
});

test("architecture finds three-feature type cycles and new edges inside an existing cycle", async (t) => {
  const { root, write } = fixture(t, {
    "src/features/a/index.ts":
      'export type { B } from "../b/index.ts"; export type A = string;',
    "src/features/b/index.ts":
      'export type { C } from "../c/index.ts"; export type B = string;',
    "src/features/c/index.ts":
      'export type { A } from "../a/index.ts"; export type C = string;',
  });
  const before = await collectArchitecture(root);
  assert.deepEqual(before.rules.R4.items, ["a => b", "b => c", "c => a"]);
  write(
    "src/features/a/index.ts",
    'export type { B } from "../b/index.ts"; export type { C } from "../c/index.ts"; export type A = string;',
  );
  const after = await collectArchitecture(root);
  assert.match(
    compareArchitecture(after, {
      ...baseline(),
      rules: before.rules,
    }).issues.join(),
    /R4.*a => c/,
  );
});

test("architecture fails closed on unresolved internal imports", async (t) => {
  const { root } = fixture(t, {
    "src/components/view.ts":
      'export { value } from "@/features/missing/private.ts";',
  });
  await assert.rejects(() => collectArchitecture(root), /unresolved|resolve/i);
});

test("architecture follows TypeScript extension substitution rather than losing TSX dependencies", async (t) => {
  const { root } = fixture(t, {
    "src/components/view.ts":
      'export type { Value } from "../features/b/private.ts";',
    "src/features/b/private.tsx": "export type Value = string;",
  });
  const result = await collectArchitecture(root);
  assert.deepEqual(result.rules.R1.items, [
    "src/components/view.ts => src/features/b/private.tsx",
  ]);
});

test("product modules cannot bypass boundaries with a test-like filename", async (t) => {
  const { root } = fixture(t, {
    "src/components/view.ts":
      'export { value } from "../features/b/helper.test.ts";',
    "src/features/b/helper.test.ts": "export const value = 1;",
  });
  assert.equal((await collectArchitecture(root)).rules.R1.count, 1);
});

test("product modules cannot bypass boundaries inside a directory named dist", async (t) => {
  const { root } = fixture(t, {
    "src/components/view.ts":
      'export { value } from "../features/b/dist/private.ts";',
    "src/features/b/dist/private.ts": "export const value = 1;",
  });
  assert.equal((await collectArchitecture(root)).rules.R1.count, 1);
});

test("contracts stay independent of all host src layers including styles", async (t) => {
  const { root } = fixture(t, {
    "packages/creation-contracts/ports.ts":
      'import "../../src/styles/style.css"; export type { Model } from "../../src/domain/model.ts"; export { value } from "../../src/App.tsx";',
    "src/styles/style.css": "body { margin: 0; }",
    "src/domain/model.ts": "export type Model = string;",
    "src/App.tsx": "export const value = 1;",
  });
  assert.deepEqual((await collectArchitecture(root)).rules.R6.items, [
    "packages/creation-contracts/ports.ts => src/App.tsx",
    "packages/creation-contracts/ports.ts => src/domain/model.ts",
    "packages/creation-contracts/ports.ts => src/styles/style.css",
  ]);
});

test("renamed business modules are checked as new paths for duplicate names", async (t) => {
  const { root, write } = fixture(t, {
    "src/features/a/value.ts": "export const value = 1;",
    "src/features/b/other.ts": "export const value = 1;",
  });
  const git = (...args: string[]) =>
    execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
    });
  git("init", "--quiet");
  git("add", ".");
  git(
    "-c",
    "user.name=Architecture fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "commit",
    "--quiet",
    "-m",
    "fixture",
  );
  write("config/architecture-baseline.json", JSON.stringify(baseline()));
  git("add", ".");
  git(
    "-c",
    "user.name=Architecture fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "commit",
    "--quiet",
    "-m",
    "baseline",
  );
  const baseRef = git("rev-parse", "HEAD").trim();
  const source = path.join(root, "src/features/b/other.ts");
  const target = path.join(root, "src/features/b/value.ts");
  assert.ok(
    source.startsWith(root + path.sep) && target.startsWith(root + path.sep),
  );
  fs.renameSync(source, target);
  git("add", "-A");
  assert.match(
    (await checkArchitecture(root, { baseRef })).issues.join(),
    /R8.*b\/value.ts/,
  );
});

test("architecture compares identities rather than counts and reports reductions", () => {
  const old = baseline({ R1: ["old => private"] });
  assert.match(
    compareArchitecture(
      baseline({ R1: ["new => private"] }),
      old,
    ).issues.join(),
    /new => private/,
  );
  const reduced = compareArchitecture(baseline(), old);
  assert.deepEqual(reduced.issues, []);
  assert.ok(reduced.reductions.length > 0);
});

test("architecture rejects baseline growth, replacement, malformed counts and duplicate identities", () => {
  const previous = baseline({ R1: ["old => private"] });
  for (const candidate of [
    baseline({ R1: ["old => private", "new => private"] }),
    baseline({ R1: ["new => private"] }),
  ])
    assert.match(
      compareArchitecture(candidate, candidate, previous).issues.join(),
      /baseline.*R1|R1.*baseline/i,
    );
  const bad = baseline();
  bad.rules.R1.count = 1;
  assert.throws(() => compareArchitecture(baseline(), bad), /baseline/i);
  assert.throws(
    () => compareArchitecture(baseline(), baseline({ R1: ["same", "same"] })),
    /baseline/i,
  );
  assert.throws(
    () => compareArchitecture(baseline(), { rules: {} }),
    /baseline/i,
  );
});

test("new business modules reject duplicate basenames but preserve entry points, declarations and documented domain pairs", (t) => {
  const { root } = fixture(t, {
    "src/features/a/value.ts": "export const value = 1;",
    "src/features/b/value.ts": "export const value = 2;",
    "src/features/a/index.ts": "export {};",
    "src/features/b/index.ts": "export {};",
    "src/domain/schema.ts":
      "// src/features/b/schema.ts\nexport type Value = string;",
    "src/features/b/schema.ts": "// src/domain/schema.ts\nexport {};",
  });
  const existing = [
    "src/features/a/value.ts",
    "src/features/a/index.ts",
    "src/domain/schema.ts",
  ];
  const added = [
    "src/features/b/value.ts",
    "src/features/b/index.ts",
    "src/features/b/schema.ts",
    "src/features/b/env.d.ts",
  ];
  assert.deepEqual(findNewDuplicateModules(root, existing, added), [
    "src/features/b/value.ts => src/features/a/value.ts",
  ]);
});

test("initial baseline cannot whitelist product changes and Git history prevents later baseline growth", async (t) => {
  const { root, write } = fixture(t, {
    "src/features/a/index.ts": "export const value = 1;",
  });
  const git = (...args: string[]) =>
    execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
    });
  git("init", "--quiet");
  git("add", ".");
  git(
    "-c",
    "user.name=Architecture fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "commit",
    "--quiet",
    "-m",
    "fixture",
  );
  const baseRef = git("rev-parse", "HEAD").trim();
  const initial = { ...baseline(), commit: baseRef };
  write("config/architecture-baseline.json", JSON.stringify(initial));
  assert.deepEqual((await checkArchitecture(root, { baseRef })).issues, []);
  const cli = (ref: string) =>
    spawnSync(
      process.execPath,
      [path.resolve("scripts/governance/check-architecture.mjs")],
      {
        cwd: root,
        env: { ...process.env, ARCHITECTURE_BASE: ref },
        encoding: "utf8",
        windowsHide: true,
      },
    );
  assert.equal(cli(baseRef).status, 0);
  write(
    "src/components/view.ts",
    'export { value } from "../features/a/index.ts";',
  );
  assert.match(
    (await checkArchitecture(root, { baseRef })).issues.join(),
    /initial|bootstrap/i,
  );
  fs.rmSync(path.join(root, "src/components/view.ts"));
  git("add", ".");
  git(
    "-c",
    "user.name=Architecture fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "commit",
    "--quiet",
    "-m",
    "baseline",
  );
  const baselineRef = git("rev-parse", "HEAD").trim();
  write(
    "config/architecture-baseline.json",
    JSON.stringify(baseline({ R1: ["fake => private"] })),
  );
  assert.match(
    (await checkArchitecture(root, { baseRef: baselineRef })).issues.join(),
    /baseline.*R1|R1.*baseline/i,
  );
  const denied = cli(baselineRef);
  assert.equal(denied.status, 1);
  assert.match(denied.stderr, /baseline.*R1|R1.*baseline/i);
});
