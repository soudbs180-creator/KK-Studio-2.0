import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import * as contracts from "../../packages/creation-contracts/index.ts";

function inpaint() {
  return {
    id: "image.inpaint",
    version: "1.0.0",
    title: "局部重绘",
    kind: "builtin",
    input: "image.inpaint.input",
    output: "image.inpaint.output",
    requires: { permissions: ["ai:generate", "asset:read", "asset:write"] },
    adapters: [
      {
        id: "image.inpaint/provider-api",
        kind: "provider-api",
        priority: 0,
        compat: "^1.1.0",
      },
    ],
    task: { progress: true, cancellable: true, resumable: false },
    lineage: {
      inputRoles: ["base", "mask", "reference"],
      relation: "derivedFrom",
    },
    platforms: ["desktop", "web"],
    degrade: "需要支持遮罩编辑的模型连接。",
    card: "docs/features/feat-035-image-edit.md",
  };
}
function parse(input: unknown) {
  assert.ok(
    "capabilityManifestSchema" in contracts,
    "business capability schema must be publicly exported",
  );
  return contracts.capabilityManifestSchema.safeParse(input);
}

test("business manifest validates inpaint and supplies declaration defaults without mutating input", () => {
  const input = inpaint();
  const before = structuredClone(input);
  const result = parse(input);
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.data.id, "image.inpaint");
  assert.deepEqual(result.data.requires.modelTraits, []);
  assert.deepEqual(result.data.requires.resources, []);
  assert.deepEqual(result.data.uses, []);
  assert.equal(result.data.enabled, true);
  assert.deepEqual(input, before);
});

test("manifest rejects malformed capability identity and semantic versions", () => {
  for (const id of [
    "inpaint",
    "Image.inpaint",
    "image..inpaint",
    "image.inpaint_unsafe",
    " image.inpaint",
  ])
    assert.equal(parse({ ...inpaint(), id }).success, false, id);
  for (const version of ["1", "1.2", "v1.2.3", "01.2.3", "1.2.3 ", "1.2.3-01"])
    assert.equal(parse({ ...inpaint(), version }).success, false, version);
  for (const version of ["1.2.3-beta.1", "1.2.3+build.7"])
    assert.equal(parse({ ...inpaint(), version }).success, true, version);
});

test("permissions reject undeclared powers, URL scopes and wildcards", () => {
  for (const permission of [
    "canvas:delete",
    "filesystem:write",
    "network:*",
    "network:https://api.example.test",
    "network:api.example.test/path",
    "network:user@host",
    "asset:read ",
  ])
    assert.equal(
      parse({ ...inpaint(), requires: { permissions: [permission] } }).success,
      false,
      permission,
    );
  for (const permission of [
    "canvas:read",
    "canvas:write",
    "ai:generate",
    "asset:read",
    "asset:write",
    "storage:own",
    "filesystem:read",
    "network:localhost",
    "network:127.0.0.1",
    "network:api.example.test",
  ])
    assert.equal(
      parse({ ...inpaint(), requires: { permissions: [permission] } }).success,
      true,
      permission,
    );
});

test("adapter compatibility uses the contract package version rather than the capability version", () => {
  const candidate = inpaint();
  candidate.version = "5.0.0";
  for (const compat of ["^1.0.0", ">=1.1.0 <2", "1.2.x", "*"])
    assert.equal(
      parse({ ...candidate, adapters: [{ ...candidate.adapters[0], compat }] })
        .success,
      true,
      compat,
    );
  for (const compat of ["^2.0.0", "<1.0.0", "1.1.x", ">=1.3.0", "bad", ""])
    assert.equal(
      parse({ ...candidate, adapters: [{ ...candidate.adapters[0], compat }] })
        .success,
      false,
      compat,
    );
  const packageJson = JSON.parse(
    fs.readFileSync("packages/creation-contracts/package.json", "utf8"),
  );
  assert.equal(contracts.CREATION_CONTRACTS_VERSION, packageJson.version);
});

test("adapters require a unique identity owned by the declared capability", () => {
  const candidate = inpaint();
  assert.equal(parse({ ...candidate, adapters: [] }).success, false);
  assert.equal(
    parse({
      ...candidate,
      adapters: [candidate.adapters[0], candidate.adapters[0]],
    }).success,
    false,
  );
  for (const id of [
    "provider-api",
    "image.upscale/provider-api",
    "image.inpaint/../unsafe",
  ])
    assert.equal(
      parse({ ...candidate, adapters: [{ ...candidate.adapters[0], id }] })
        .success,
      false,
      id,
    );
  assert.equal(
    parse({
      ...candidate,
      adapters: [{ ...candidate.adapters[0], priority: 0.5 }],
    }).success,
    false,
  );
});

test("a manifest can retain an older adapter when another supports this contract", () => {
  const candidate = inpaint();
  assert.equal(
    parse({
      ...candidate,
      adapters: [
        candidate.adapters[0],
        {
          id: "image.inpaint/comfyui",
          kind: "comfyui",
          priority: -1,
          compat: "^0.9.0",
        },
      ],
    }).success,
    true,
  );
});

test("uses rejects a local self-cycle, duplicate and malformed dependencies", () => {
  for (const uses of [
    ["image.inpaint"],
    ["image.generate", "image.generate"],
    ["image_generate"],
  ])
    assert.equal(parse({ ...inpaint(), uses }).success, false);
  assert.equal(
    parse({ ...inpaint(), uses: ["image.generate", "image.mask"] }).success,
    true,
  );
});

test("fallback pins a capability and a complete version", () => {
  for (const fallback of ["image.inpaint@1.0.0", "image.generate@2.1.0-beta.1"])
    assert.equal(parse({ ...inpaint(), fallback }).success, true, fallback);
  for (const fallback of [
    "image.generate",
    "image.generate@^1.0.0",
    "image.generate@v1.0.0",
    "image.generate@1.0",
  ])
    assert.equal(parse({ ...inpaint(), fallback }).success, false, fallback);
});

test("manifest refuses unknown fields instead of silently discarding possible secrets", () => {
  assert.equal(
    parse({ ...inpaint(), apiKey: "fixture-never-persist" }).success,
    false,
  );
  const candidate = inpaint();
  assert.equal(
    parse({
      ...candidate,
      requires: { ...candidate.requires, apiKey: "fixture" },
    }).success,
    false,
  );
  assert.equal(
    parse({
      ...candidate,
      adapters: [{ ...candidate.adapters[0], secret: "fixture" }],
    }).success,
    false,
  );
});

test("platform availability and degradation are explicit non-empty declarations", () => {
  for (const platforms of [[], ["android"], ["web", "web"]])
    assert.equal(parse({ ...inpaint(), platforms }).success, false);
  for (const degrade of ["", " "])
    assert.equal(parse({ ...inpaint(), degrade }).success, false);
  assert.equal(parse({ ...inpaint(), enabled: false }).success, true);
});

test("schema references and feature cards cannot be blank or escape their namespace", () => {
  for (const card of [
    "../private.md",
    "docs/features/../secrets.md",
    "docs/features/feat-035.md/../../secret",
    "https://example.test/card.md",
  ])
    assert.equal(parse({ ...inpaint(), card }).success, false, card);
  assert.equal(parse({ ...inpaint(), input: " " }).success, false);
  assert.equal(parse({ ...inpaint(), output: "" }).success, false);
  assert.equal(parse({ ...inpaint(), title: " " }).success, false);
});

test("time budgets cannot encode negative, infinite or zero work allowances", () => {
  const candidate = inpaint();
  for (const maxMs of [-1, 0, Infinity, NaN])
    assert.equal(
      parse({ ...candidate, task: { ...candidate.task, budget: { maxMs } } })
        .success,
      false,
    );
  assert.equal(
    parse({
      ...candidate,
      task: { ...candidate.task, budget: { maxMs: 30000 } },
    }).success,
    true,
  );
});

test("public ports and the old provider manifest compile without host or DOM types", (t) => {
  const parent = path.resolve(".tmp");
  fs.mkdirSync(parent, { recursive: true });
  const directory = fs.mkdtempSync(path.join(parent, "capability-types-"));
  t.after(() => {
    assert.equal(path.dirname(directory), parent);
    fs.rmSync(directory, { recursive: true, force: true });
  });
  const config = path.join(directory, "tsconfig.json");
  fs.writeFileSync(
    config,
    JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        lib: ["ES2022"],
        types: [],
        module: "ESNext",
        moduleResolution: "bundler",
        allowImportingTsExtensions: true,
        noEmit: true,
        strict: true,
        skipLibCheck: true,
      },
      files: [path.resolve("tests/fixtures/capabilityPorts.ts")],
    }),
  );
  execFileSync(
    process.execPath,
    ["node_modules/typescript/bin/tsc", "-p", config],
    { stdio: "pipe", encoding: "utf8", windowsHide: true },
  );
});
