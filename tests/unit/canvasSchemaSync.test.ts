import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

const script = new URL(
  "../../scripts/agent/sync-canvas-schema.mjs",
  import.meta.url,
);

for (const code of ["EACCES", "ENOENT"]) {
  test(`canvas schema sync ${code === "ENOENT" ? "creates missing output" : "preserves output on read denial"}`, () => {
    const result = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "--eval",
        `import assert from "node:assert/strict";
         import fs from "node:fs/promises";
         const originalRead = fs.readFile;
         const writes = [];
         fs.readFile = async (url, ...args) => {
           if (String(url).endsWith("/vendor/canvas-agent/src/canvas/atomic-schema.ts")) {
             throw Object.assign(new Error("synthetic read failure"), {code: ${JSON.stringify(code)}});
           }
           return originalRead(url, ...args);
         };
         fs.writeFile = async (url, text) => { writes.push({url: String(url), text}); };
         const sync = import(${JSON.stringify(script.href)});
         if (${JSON.stringify(code)} === "EACCES") {
           await assert.rejects(sync, {code: "EACCES"});
           assert.equal(writes.length, 0);
         } else {
           await sync;
           assert.equal(writes.length, 1);
           assert.ok(writes[0].text.startsWith("// Generated from src/domain/canvasOperationSchema.ts"));
         }`,
      ],
      { encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);
  });
}
