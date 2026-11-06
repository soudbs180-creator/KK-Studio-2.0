import fs from "node:fs/promises";

function normalize(text) {
  return text.replaceAll("\r\n", "\n");
}

async function writeIfChanged(url, next) {
  const normalized = normalize(next);
  try {
    if (normalize(await fs.readFile(url, "utf8")) === normalized) return;
  } catch {
    // The generated file is absent and needs to be created.
  }
  await fs.writeFile(url, normalized);
}

const source = await fs.readFile(
  new URL("../../src/domain/canvasOperationSchema.ts", import.meta.url),
  "utf8",
);
const schema = source
  .replace(
    'import { CANVAS_REFERENCE_SLOTS } from "./canvasItems.ts";',
    'const CANVAS_REFERENCE_SLOTS = ["主体", "风格", "材质", "构图", "Mask"] as const;',
  )
  .replace('from "./blueprintNode.ts"', 'from "./blueprint-schema.js"');
await writeIfChanged(
  new URL(
    "../../vendor/canvas-agent/src/canvas/atomic-schema.ts",
    import.meta.url,
  ),
  "// Generated from src/domain/canvasOperationSchema.ts by scripts/agent/sync-canvas-schema.mjs.\n" +
    schema,
);

await writeIfChanged(
  new URL(
    "../../vendor/canvas-agent/src/canvas/blueprint-schema.ts",
    import.meta.url,
  ),
  await fs.readFile(
    new URL("../../src/domain/blueprintNode.ts", import.meta.url),
    "utf8",
  ),
);
