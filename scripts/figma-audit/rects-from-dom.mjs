import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Builds the local rectangle baseline used by the L3 geometry audit.
//
// The Figma side of the comparison is the authored geometry of a node in the
// current snapshot; the local side is the measured client rect captured by the
// existing frame-accuracy harness. This script pairs them.
//
// Pairing is explicit: a selector-to-node map must be supplied, because a
// positional guess between two independently authored trees would silently
// compare the wrong elements.
//
// Usage:
//   node scripts/figma-audit/rects-from-dom.mjs \
//     --dom <after-preview-dom.json> \
//     --snapshot <figma-snapshot.json> \
//     --map <selector-to-node-map.json> \
//     [--state <state>]

const repository = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    if (!key?.startsWith("--")) throw new Error(`Invalid option ${key}`);
    options[key.slice(2)] = argv[index + 1];
  }
  return options;
}

// Derives a selector-to-node map by matching DOM selectors against Figma node
// names. This is a convenience for the common case where the DOM selector and
// the Figma layer carry the same name; anything ambiguous is reported instead
// of guessed.
export function deriveNodeMap(dom, snapshot, stateName) {
  const state = dom.states.find((entry) => entry.state === stateName);
  if (!state) throw new Error(`State "${stateName}" not found in DOM evidence`);
  const nodes = (snapshot.pages ?? []).flatMap((page) => page.nodes ?? []);
  const map = {};
  const ambiguous = [];
  for (const selector of Object.keys(state.elements)) {
    const bare = selector.replace(/^\./, "");
    const matches = nodes.filter((node) => node.name === bare);
    if (matches.length === 1) map[selector] = matches[0].id;
    else if (matches.length > 1)
      ambiguous.push({ selector, count: matches.length });
  }
  return { map, ambiguous };
}

export function rectsFromDom(dom, nodes, stateName) {
  const state = dom.states.find((entry) => entry.state === stateName);
  if (!state) throw new Error(`State "${stateName}" not found in DOM evidence`);
  const rects = {};
  for (const [selector, records] of Object.entries(state.elements)) {
    const rect = records[0]?.rect;
    if (!rect) continue;
    const nodeId = nodes[selector];
    if (!nodeId) continue;
    rects[selector] = {
      nodeId,
      source: rect,
      state: stateName,
    };
  }
  return rects;
}

function main() {
  const options = parseArguments(process.argv.slice(2));
  if (!options.dom || !options.snapshot) {
    console.error(
      "Usage: node scripts/figma-audit/rects-from-dom.mjs --dom <dom.json> --snapshot <snapshot.json> [--map <map.json>] [--state <state>]",
    );
    return 1;
  }
  const dom = JSON.parse(fs.readFileSync(options.dom, "utf8"));
  const snapshot = JSON.parse(fs.readFileSync(options.snapshot, "utf8"));
  const states = options.state
    ? [options.state]
    : dom.states.map((entry) => entry.state);

  const derived = options.map ? null : deriveNodeMap(dom, snapshot, states[0]);
  const nodes = options.map
    ? JSON.parse(fs.readFileSync(options.map, "utf8"))
    : derived.map;
  if (derived?.ambiguous.length) {
    console.error(
      `Ambiguous node matches need an explicit map: ${JSON.stringify(derived.ambiguous)}`,
    );
  }

  const output = {};
  const skipped = [];
  for (const state of states) {
    if (!dom.states.some((entry) => entry.state === state)) {
      skipped.push(`${state}（不在 DOM 证据中）`);
      continue;
    }
    if (!Object.keys(nodes).length) {
      skipped.push(`${state}（无节点映射）`);
      continue;
    }
    Object.assign(output, rectsFromDom(dom, nodes, state));
  }
  const target = path.join(repository, "docs", "reference", "figma-rects.json");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        ok: true,
        out: target,
        entries: Object.keys(output).length,
        skipped,
      },
      null,
      2,
    ),
  );
  return 0;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
)
  process.exitCode = main();
