import { expect, test, type Page } from "@playwright/test";
import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import ts from "typescript";

let fixtureScript: string;

test.beforeAll(async () => {
  const result = await build({
    stdin: {
      resolveDir: fileURLToPath(new URL("../..", import.meta.url)),
      loader: "tsx",
      contents: `
        import React from "react";
        import { createRoot } from "react-dom/client";
        import { flushSync } from "react-dom";
        import CanvasConnections from "./src/components/canvas/CanvasConnections";
        import CanvasNodeLayer from "./src/components/canvas/CanvasNodeLayer";
        import { useCanvasNodeLayerHandlers } from "./src/components/canvas/useCanvasNodeLayerHandlers";

        const metrics = globalThis.__canvasRenderMetrics = {
          geometry: [], connections: 0, pendingArrays: [],
        };
        const initialEdges = [
          { id: "ab", source: "a", target: "b", kind: "reference" },
          { id: "cd", source: "c", target: "d", kind: "reference" },
        ];
        let edges = initialEdges;
        let items = ["a", "b", "c", "d"].map((id) => ({
          id, kind: "image", title: id.toUpperCase(), description: "render fixture",
          mediaWidth: 1, mediaHeight: 1,
          result: { id: "result-" + id, kind: "image", title: id,
            description: "fixture", source: "provider" },
        }));
        let nodes = {
          a: { x: 0, y: 0 }, b: { x: 800, y: 100 },
          c: { x: 0, y: 600 }, d: { x: 800, y: 700 },
        };
        let transform = { x: 0, y: 0, scale: 1 };
        let visible = true;
        let selectedNode = null;
        let deleteHandler = removeEdge;
        const deletionReceipts = [];
        let mode = "connections";
        let handlers;
        let previousReferences;
        const noop = () => {};
        const addMenu = { menu: null, open: noop };
        const controls = () => ({
          nodes, transform, selectedNode: null, selectedIds: new Set(),
          dragging: null, dragRef: { current: null }, rightGesture: { current: null },
          addNode: () => "reserved", focusNodes: noop, setSelectedNode: noop,
          removeNode: noop, startNodeDrag: noop, moveNodeWithKeyboard: noop,
          setComposerExtraHeight: noop, viewport: { width: 1920, height: 1080 },
        });
        function removeEdge(id) {
          edges = edges.filter((edge) => edge.id !== id);
          render();
        }
        function References() {
          handlers = useCanvasNodeLayerHandlers({
            items, edges, controls: controls(), defaultSelection: undefined,
            onConnect: noop, onConnectionNotice: noop, onLocalGenerationSettled: noop,
          });
          return null;
        }
        function Fixture() {
          if (mode === "references") return <References />;
          if (mode === "layer") return <CanvasNodeLayer
            controls={controls()} items={items} edges={edges} showConnections={false}
            onItemsChange={noop} onLocalGenerationSettled={noop} likedIds={new Set()}
            onToggleLike={noop} onConfigure={noop} addMenu={addMenu} onConnect={noop}
            onConnectionNotice={noop} onDeleteConnection={removeEdge} />;
          return <div style={{ transform: "translate(" + transform.x + "px, " +
            transform.y + "px) scale(" + transform.scale + ")" }}>
            <CanvasConnections items={items} nodes={nodes} edges={edges}
              visible={visible} selectedNode={selectedNode} onDelete={deleteHandler} />
          </div>;
        }
        const root = createRoot(document.getElementById("fixture"));
        function render() { flushSync(() => root.render(<Fixture />)); }
        globalThis.canvasRenderingFixture = {
          render,
          mode(value) { mode = value; render(); },
          panZoom() { transform = { x: 90, y: 30, scale: 0.5 }; render(); },
          panFrames(count) {
            for (let index = 0; index < count; index++) {
              transform = { x: index, y: index, scale: 0.5 }; render();
            }
          },
          largeGraph(count) {
            const source = items[0];
            items = []; edges = []; nodes = {};
            for (let index = 0; index < count; index++) {
              const a = index === 0 ? "a" : "source-" + index;
              const b = index === 0 ? "b" : "target-" + index;
              items.push({ ...source, id: a }, { ...source, id: b });
              nodes[a] = { x: 0, y: index * 600 };
              nodes[b] = { x: 800, y: index * 600 };
              edges.push({ id: "edge-" + index, source: a, target: b });
            }
            render();
          },
          visibility(value) { visible = value; render(); },
          select(value) { selectedNode = value; render(); },
          replaceDeleteHandler(value) {
            deleteHandler = (id) => { deletionReceipts.push(value + ":" + id); removeEdge(id); };
            render();
          },
          deletions() { return deletionReceipts; },
          moveA() { nodes = { ...nodes, a: { x: 20, y: 30 } }; render(); },
          changeA(patch) { items = items.map((item) => item.id === "a" ? { ...item, ...patch } : item); render(); },
          addReference() { edges = [...edges, { id: "cb", source: "c", target: "b" }]; render(); },
          removeReference() { edges = edges.filter((edge) => edge.id !== "ab"); render(); },
          restoreEdge() { edges = [...edges, initialEdges[0]]; render(); },
          reset() { metrics.geometry = []; metrics.connections = 0; },
          hover(id) { flushSync(() => document.querySelector('[data-testid="' + id + '"]')
            .dispatchEvent(new PointerEvent("pointerover", { bubbles: true }))); },
          stats() { return { geometry: [...metrics.geometry], connections: metrics.connections,
            sharedPending: metrics.pendingArrays.length > 1 &&
              metrics.pendingArrays.every((entry) => entry === metrics.pendingArrays[0]) }; },
          references() {
            const refs = handlers.referencesFor("b");
            const same = refs === previousReferences;
            previousReferences = refs;
            return { same, values: refs };
          },
        };
        render();
      `,
    },
    bundle: true,
    platform: "browser",
    format: "iife",
    define: { "process.env.NODE_ENV": '"production"' },
    loader: { ".css": "empty" },
    write: false,
    logLevel: "silent",
    plugins: [
      {
        name: "observe-real-canvas-execution",
        setup(builder) {
          builder.onLoad(
            {
              filter:
                /(?:canvasGraph\.ts|CanvasConnections\.tsx|CanvasNodeItem\.tsx|CanvasNodeLayer\.tsx)$/,
            },
            async ({ path }) => {
              const source = await readFile(path, "utf8");
              const parsed = ts.createSourceFile(
                path,
                source,
                ts.ScriptTarget.Latest,
                true,
                path.endsWith("tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
              );
              const injections = parsed.statements.flatMap((statement) => {
                if (!ts.isFunctionDeclaration(statement) || !statement.body)
                  return [];
                const name = statement.name?.text;
                const observation =
                  name === "connectionGeometry"
                    ? "globalThis.__canvasRenderMetrics.geometry.push(edge.id);"
                    : name === "CanvasConnections"
                      ? "globalThis.__canvasRenderMetrics.connections++;"
                      : name === "CanvasNodeLayer"
                        ? "globalThis.__canvasRenderMetrics.pendingArrays = [];"
                        : name === "CanvasNodeItem"
                          ? "globalThis.__canvasRenderMetrics.pendingArrays.push(activeLocalResultIds);"
                          : "";
                return observation
                  ? [
                      {
                        index: statement.body.getStart(parsed) + 1,
                        observation,
                      },
                    ]
                  : [];
              });
              let contents = source;
              for (const { index, observation } of injections.reverse())
                contents =
                  contents.slice(0, index) +
                  observation +
                  contents.slice(index);
              return { contents, loader: path.endsWith("tsx") ? "tsx" : "ts" };
            },
          );
        },
      },
    ],
  });
  fixtureScript = result.outputFiles[0].text;
});

async function mount(page: Page): Promise<void> {
  await page.route("**/canvas-rendering-fixture", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><div id="fixture"></div>',
    }),
  );
  await page.goto("/canvas-rendering-fixture");
  await page.addScriptTag({ content: fixtureScript });
}

async function action(
  page: Page,
  name: string,
  value?: unknown,
): Promise<void> {
  await page.evaluate(
    ({ name, value }) => {
      const fixture = (
        window as unknown as {
          canvasRenderingFixture: Record<string, (value?: unknown) => void>;
        }
      ).canvasRenderingFixture;
      fixture[name](value);
    },
    { name, value },
  );
}

async function stats(page: Page) {
  return page.evaluate(() =>
    (
      window as unknown as {
        canvasRenderingFixture: {
          stats: () => {
            geometry: string[];
            connections: number;
            sharedPending: boolean;
          };
        };
      }
    ).canvasRenderingFixture.stats(),
  );
}

async function references(page: Page) {
  return page.evaluate(() =>
    (
      window as unknown as {
        canvasRenderingFixture: {
          references: () => {
            same: boolean;
            values: Array<{ id: string; title: string; preview?: string }>;
          };
        };
      }
    ).canvasRenderingFixture.references(),
  );
}

test("pan and edge hover retain cached geometry in real React renders", async ({
  page,
}, info) => {
  await mount(page);
  expect((await stats(page)).geometry).toEqual(["ab", "cd"]);
  await action(page, "reset");
  await action(page, "panZoom");
  await action(page, "hover", "ab");
  await expect(page.locator(".connection.is-active")).toHaveCount(1);
  const observed = await stats(page);
  await info.attach("pan-hover-counts", {
    body: JSON.stringify(observed),
    contentType: "application/json",
  });
  expect(observed.geometry).toEqual([]);
});

test("only incident edges invalidate for endpoint edits, deletion and undo", async ({
  page,
}) => {
  await mount(page);
  await action(page, "reset");
  await action(page, "moveA");
  expect((await stats(page)).geometry).toEqual(["ab"]);
  await expect(page.getByTestId("ab")).toHaveAttribute(
    "d",
    "M 400 220 C 580 220, 620 290, 800 290",
  );
  await action(page, "reset");
  await action(page, "changeA", { title: "Renamed A", mediaWidth: 2 });
  expect((await stats(page)).geometry).toEqual(["ab"]);
  await expect(
    page.getByRole("button", { name: "连接 Renamed A → B", exact: true }),
  ).toHaveAttribute("d", "M 400 125.5 C 580 125.5, 620 290, 800 290");
  await action(page, "changeA", {
    plugin: { type: "test:dimensions", width: 500, height: 200 },
  });
  await expect(page.getByTestId("ab")).toHaveAttribute(
    "d",
    "M 520 130 C 646 130, 674 290, 800 290",
  );
  await page
    .getByRole("button", { name: "连接 Renamed A → B", exact: true })
    .press("Delete");
  await expect(page.getByTestId("ab")).toHaveCount(0);
  await action(page, "restoreEdge");
  await expect(page.getByTestId("ab")).toHaveAttribute(
    "d",
    "M 520 130 C 646 130, 674 290, 800 290",
  );
});

test("reference derivations retain identity until their graph inputs change", async ({
  page,
}) => {
  await mount(page);
  await action(page, "mode", "references");
  expect((await references(page)).values.map((entry) => entry.id)).toEqual([
    "ab",
  ]);
  await action(page, "panZoom");
  expect((await references(page)).same).toBe(true);
  await action(page, "changeA", {
    title: "Updated source",
    preview: "preview-v2",
  });
  expect((await references(page)).values).toEqual([
    {
      id: "ab",
      assetId: undefined,
      title: "Updated source",
      preview: "preview-v2",
      kind: "image",
      frame: undefined,
      slot: undefined,
    },
  ]);
  await action(page, "addReference");
  expect((await references(page)).values.map((entry) => entry.id)).toEqual([
    "ab",
    "cb",
  ]);
  await action(page, "removeReference");
  expect((await references(page)).values.map((entry) => entry.id)).toEqual([
    "cb",
  ]);
});

test("one node layer shares one flattened pending-result collection", async ({
  page,
}) => {
  await mount(page);
  await action(page, "mode", "layer");
  await expect(page.locator("[data-canvas-node]")).toHaveCount(4);
  expect((await stats(page)).sharedPending).toBe(true);
});

test("200 independent edges avoid full geometry scans during 100 pan frames", async ({
  page,
}, info) => {
  await mount(page);
  await action(page, "largeGraph", 200);
  await expect(page.locator(".connection")).toHaveCount(200);
  await action(page, "reset");
  await action(page, "panFrames", 100);
  const afterPan = await stats(page);
  expect(afterPan.connections).toBe(100);
  expect(afterPan.geometry).toEqual([]);
  await action(page, "moveA");
  const afterMove = await stats(page);
  expect(afterMove.geometry).toEqual(["edge-0"]);
  await info.attach("large-graph-counts", {
    body: JSON.stringify({ edges: 200, panFrames: 100, afterPan, afterMove }),
    contentType: "application/json",
  });
});

test("memoized edges retain selection, focus and current delete callbacks", async ({
  page,
}) => {
  await mount(page);
  await action(page, "reset");
  await action(page, "select", "a");
  await expect(page.locator(".connection.is-related")).toHaveCount(1);
  await expect(page.locator(".connection-particles circle")).toHaveCount(3);
  await action(page, "visibility", false);
  await expect(page.locator(".connection-hit").first()).toHaveAttribute(
    "tabindex",
    "-1",
  );
  await action(page, "visibility", true);
  const edge = page.getByRole("button", { name: "连接 A → B", exact: true });
  await edge.focus();
  await expect(page.locator(".connection.is-active")).toHaveCount(1);
  await expect(page.getByTestId("connection-cut-ab")).toHaveAttribute(
    "tabindex",
    "0",
  );
  await edge.press("Escape");
  await expect(page.locator(".connection.is-active")).toHaveCount(0);
  await action(page, "replaceDeleteHandler", "latest");
  await edge.press("Delete");
  await expect(page.getByTestId("ab")).toHaveCount(0);
  const receipts = await page.evaluate(() =>
    (
      window as unknown as {
        canvasRenderingFixture: { deletions: () => string[] };
      }
    ).canvasRenderingFixture.deletions(),
  );
  expect(receipts).toEqual(["latest:ab"]);
  expect((await stats(page)).geometry).toEqual([]);
});
