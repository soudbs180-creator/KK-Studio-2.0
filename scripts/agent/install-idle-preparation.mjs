import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The upstream service is locally vendored. Keep the bounded integration
// in tracked source and apply it before agent:build; reject unexpected edits.
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(
  process.argv[2] || path.join(here, "../../vendor/canvas-agent"),
);
const target = path.join(root, "src/server/http.ts");
const helper = path.join(root, "src/server/kk-idle-conversation.ts");
const source = await fs.readFile(target, "utf8");
const template = await fs.readFile(
  path.join(here, "prepareIdleConversation.ts"),
  "utf8",
);
const existing = await fs.readFile(helper, "utf8").catch((error) => {
  if (error.code !== "ENOENT") throw error;
  return null;
});
if (existing !== null && existing !== template)
  throw new Error(
    "Agent idle-preparation helper has local edits; reconcile before building.",
  );
const eol = source.includes("\r\n") ? "\r\n" : "\n";
const importLine =
  'import { prepareIdleConversation } from "./kk-idle-conversation.js";';
const anchor =
  '    app.post("/agent/codex/threads/new", codexMutation(async (req, res) => {';
const route =
  `    // KK Studio: prepare only the expected empty session under the Codex mutation lock.
    app.post("/agent/codex/conversation/prepare", codexMutation(async (req, res) => {
        const result = await prepareIdleConversation(req.body, {
            hasClient: (clientId) => session.hasClient(clientId),
            conversation: () => session.conversationStateSnapshot,
            begin: (clientId) => {
                session.beginConversation({ sourceClientId: clientId });
                setActiveThread("", { emptyThread: true, draftThread: true, sourceClientId: clientId }, true);
            },
            prepare: (clientId, mode) => prepareDraftThread(clientId, mode),
        });
        res.status(result.status).json(result.body);
    }));
`.replaceAll("\n", eol);
let updated = source;
if (source.includes('"/agent/codex/conversation/prepare"')) {
  if (!source.includes(route) || !source.includes(importLine))
    throw new Error(
      "Agent preparation route differs from the reviewed integration.",
    );
} else {
  if (
    source.split(anchor).length !== 2 ||
    !source.includes("function codexMutation(")
  )
    throw new Error(
      "Unsupported Agent source: safe preparation anchor/lock missing.",
    );
  updated = `${importLine}${eol}${source.replace(anchor, route + anchor)}`;
}
await fs.writeFile(helper, template);
if (updated !== source) await fs.writeFile(target, updated);
console.log("Agent conditional idle preparation: installed and verified.");
