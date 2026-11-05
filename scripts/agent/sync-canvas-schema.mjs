import fs from "node:fs/promises";
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
await fs.writeFile(
  new URL(
    "../../vendor/canvas-agent/src/canvas/atomic-schema.ts",
    import.meta.url,
  ),
  "// Generated from src/domain/canvasOperationSchema.ts by scripts/agent/sync-canvas-schema.mjs.\n" +
    schema,
);

await fs.copyFile(
  new URL("../../src/domain/blueprintNode.ts", import.meta.url),
  new URL(
    "../../vendor/canvas-agent/src/canvas/blueprint-schema.ts",
    import.meta.url,
  ),
);
