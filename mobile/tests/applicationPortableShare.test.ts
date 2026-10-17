import test from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import { readFileSync } from "node:fs";
interface Probe {
  available: Promise<boolean>;
  created: number;
  written: string[];
  shared: number;
  afterWrite?: () => void;
}
declare global {
  var __kkPortableProbe: Probe | undefined;
}
async function portableShare(platform = "native") {
  const stubs: Record<string, string> = {
    "expo-file-system": `export const Paths={cache:'file:///cache'};export class File { constructor(){this.uri='file:///cache/fixture.txt'}create(){globalThis.__kkPortableProbe.created++}write(text){globalThis.__kkPortableProbe.written.push(text);globalThis.__kkPortableProbe.afterWrite?.()}}`,
    "expo-sharing": `export const isAvailableAsync=()=>globalThis.__kkPortableProbe.available;export const shareAsync=async()=>{globalThis.__kkPortableProbe.shared++};`,
    "expo-document-picker": `export const getDocumentAsync=async()=>({canceled:true});`,
    "expo-crypto": `export const randomUUID=()=>"test-uuid";`,
  };
  // Execute the real platform source; only unavailable OS/browser imports are replaced.
  const source = readFileSync(
    new URL(`../src/application/portableFiles.${platform}.ts`, import.meta.url),
    "utf8",
  );
  let output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  for (const [name, stub] of Object.entries(stubs))
    output = output.replaceAll(
      JSON.stringify(name),
      JSON.stringify(
        `data:text/javascript;base64,${Buffer.from(stub).toString("base64")}`,
      ),
    );
  output = output.replaceAll(
    JSON.stringify("../core/resultLimits.ts"),
    JSON.stringify(
      new URL("../src/core/resultLimits.ts", import.meta.url).href,
    ),
  );
  return import(
    `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`
  );
}
test("native portable export cannot write or share an old session payload after availability resolves", async () => {
  const { sharePortableText } = await portableShare();
  let release!: (available: boolean) => void,
    current = true;
  const probe: Probe = {
    available: new Promise((r) => (release = r)),
    created: 0,
    written: [],
    shared: 0,
  };
  globalThis.__kkPortableProbe = probe;
  const pending = sharePortableText(
    "Account A fixture payload",
    "kk-project.json",
    () => current,
    "application/json",
    64 * 1024 * 1024,
  );
  current = false;
  release(true);
  await assert.rejects(pending, /会话/);
  assert.equal(probe.created, 0);
  assert.deepEqual(probe.written, []);
  assert.equal(probe.shared, 0);
});
test("portable handoff rechecks session after preparing a cache resource", async () => {
  const { sharePortableText } = await portableShare();
  let current = true;
  const probe: Probe = {
    available: Promise.resolve(true),
    created: 0,
    written: [],
    shared: 0,
    afterWrite: () => {
      current = false;
    },
  };
  globalThis.__kkPortableProbe = probe;
  await assert.rejects(
    sharePortableText(
      "Fixture payload",
      "kk-library.json",
      () => current,
      "application/json",
    ),
    /会话/,
  );
  assert.equal(probe.created, 1);
  assert.equal(probe.written.length, 1);
  assert.equal(probe.shared, 0);
});
test("an unchanged valid session exports the full Unicode payload without truncation", async () => {
  const { sharePortableText } = await portableShare();
  const probe: Probe = {
    available: Promise.resolve(true),
    created: 0,
    written: [],
    shared: 0,
  };
  globalThis.__kkPortableProbe = probe;
  const payload = "测试字符".repeat(10000);
  await sharePortableText(
    payload,
    "kk-project.json",
    () => true,
    "application/json",
    64 * 1024 * 1024,
  );
  assert.deepEqual(probe.written, [payload]);
  assert.equal(probe.shared, 1);
});
test("web portable export blocks a session change before download handoff and revokes its resource", async () => {
  const { sharePortableText } = await portableShare("web");
  const originalDocument = Object.getOwnPropertyDescriptor(
      globalThis,
      "document",
    ),
    originalCreate = URL.createObjectURL,
    originalRevoke = URL.revokeObjectURL;
  let current = true,
    created = 0,
    clicked = 0,
    revoked = 0;
  URL.createObjectURL = () => {
    created++;
    current = false;
    return "blob:fixture";
  };
  URL.revokeObjectURL = () => {
    revoked++;
  };
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      createElement() {
        return {
          href: "",
          download: "",
          click() {
            clicked++;
          },
        };
      },
    },
  });
  try {
    await assert.rejects(
      sharePortableText(
        "Fixture payload",
        "kk-library.json",
        () => current,
        "application/json",
      ),
      /会话/,
    );
    assert.equal(created, 1);
    assert.equal(clicked, 0);
    assert.equal(revoked, 1);
    await assert.rejects(
      sharePortableText(
        "Fixture payload",
        "kk-library.json",
        () => false,
        "application/json",
      ),
      /会话/,
    );
    assert.equal(created, 1);
  } finally {
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    if (originalDocument)
      Object.defineProperty(globalThis, "document", originalDocument);
    else Reflect.deleteProperty(globalThis, "document");
  }
});
