import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as canvas from "../../src/domain/projectCanvas.ts";
import type { CanvasCollectionItem } from "../../src/domain/canvasItems.ts";

function harness() {
  const slots: { value?: unknown; deps?: unknown[] }[] = [];
  let cursor = 0;
  let fingerprints = 0;
  const effects: (() => void)[] = [];
  const changed = (before: unknown[] | undefined, after: unknown[]) =>
    !before || after.some((value, index) => !Object.is(value, before[index]));
  const react = {
    useRef(initial: unknown) {
      const index = cursor++;
      slots[index] ??= { value: { current: initial } };
      return slots[index].value;
    },
    useMemo(factory: () => unknown, deps: unknown[]) {
      const index = cursor++;
      if (changed(slots[index]?.deps, deps))
        slots[index] = { value: factory(), deps };
      return slots[index].value;
    },
    useEffect(effect: () => void, deps: unknown[]) {
      const index = cursor++;
      if (changed(slots[index]?.deps, deps)) effects.push(effect);
      slots[index] = { deps };
    },
  };
  const modules: Record<string, unknown> = {
    react,
    "../../domain/projectCanvas": {
      ...canvas,
      projectCanvasFingerprint: (value: canvas.ProjectCanvas | undefined) => {
        fingerprints++;
        return canvas.projectCanvasFingerprint(value);
      },
    },
  };
  const exports =
    {} as typeof import("../../src/components/canvas/useCanvasPersistence.ts");
  const source = readFileSync(
    new URL(
      "../../src/components/canvas/useCanvasPersistence.ts",
      import.meta.url,
    ),
    "utf8",
  );
  runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      exports,
      require: (id: string) => {
        assert(id in modules, `Unexpected dependency: ${id}`);
        return modules[id];
      },
    },
  );
  return {
    fingerprints: () => fingerprints,
    render(...args: Parameters<typeof exports.useCanvasPersistence>) {
      cursor = 0;
      exports.useCanvasPersistence(...args);
      effects.splice(0).forEach((effect) => effect());
    },
  };
}

const items: CanvasCollectionItem[] = [
  { id: "image", kind: "image", title: "Image", description: "" },
];

test("100 unrelated renders do not rescan the saved canvas fingerprint", () => {
  const fixture = harness();
  const initial = canvas.createProjectCanvas(items);
  const render = () =>
    fixture.render(
      initial,
      initial.positions,
      initial.edges,
      initial.viewport,
      initial.groups!,
      items,
      undefined,
    );
  render();
  const before = fixture.fingerprints();
  for (let index = 0; index < 100; index++) render();
  assert.equal(fixture.fingerprints() - before, 0);
});

test("every canvas preview still publishes, equal ACKs do not loop, and conflicting ACKs are repaired", () => {
  const fixture = harness();
  let saved = canvas.createProjectCanvas(items);
  const published: canvas.ProjectCanvas[] = [];
  const onChange = (value: canvas.ProjectCanvas) => published.push(value);
  fixture.render(
    saved,
    saved.positions,
    saved.edges,
    saved.viewport,
    saved.groups!,
    items,
    onChange,
  );
  for (let step = 1; step <= 100; step++) {
    const positions = { image: { x: step, y: 0 } };
    fixture.render(
      saved,
      positions,
      saved.edges,
      saved.viewport,
      saved.groups!,
      items,
      onChange,
    );
    saved = published.at(-1)!;
    fixture.render(
      saved,
      positions,
      saved.edges,
      saved.viewport,
      saved.groups!,
      items,
      onChange,
    );
  }
  assert.equal(published.length, 100);
  assert.equal(published[49].positions.image.x, 50);
  const positions = saved.positions;
  const equalAck = { ...saved, positions: { image: { y: 0, x: 100 } } };
  fixture.render(
    equalAck,
    positions,
    saved.edges,
    saved.viewport,
    saved.groups!,
    items,
    onChange,
  );
  assert.equal(published.length, 100);
  const conflicting = { ...saved, positions: { image: { x: 5, y: 0 } } };
  fixture.render(
    conflicting,
    positions,
    saved.edges,
    saved.viewport,
    saved.groups!,
    items,
    onChange,
  );
  assert.equal(published.length, 101);
  assert.equal(published.at(-1)!.positions.image.x, 100);
});

test("deleting a node still removes invalid positions, edges and group members before publishing", () => {
  const fixture = harness();
  const second = { ...items[0], id: "second" };
  const initial = canvas.createProjectCanvas([...items, second]);
  initial.edges = [{ id: "edge", source: "image", target: "second" }];
  initial.groups = [
    {
      id: "group",
      name: "Group",
      itemIds: ["image", "second"],
      borderColor: "#21a673",
      collapseMode: "info",
      layoutMode: "grid",
      createdAt: 1,
      updatedAt: 1,
    },
  ];
  const published: canvas.ProjectCanvas[] = [];
  const onChange = (value: canvas.ProjectCanvas) => published.push(value);
  fixture.render(
    initial,
    initial.positions,
    initial.edges,
    initial.viewport,
    initial.groups,
    [...items, second],
    onChange,
  );
  fixture.render(
    initial,
    initial.positions,
    initial.edges,
    initial.viewport,
    initial.groups,
    items,
    onChange,
  );
  const last = published.at(-1)!;
  assert.deepEqual(Object.keys(last.positions), ["image"]);
  assert.equal(last.edges.length, 0);
  assert.deepEqual(last.groups?.[0].itemIds, ["image"]);
  assert(!last.groups?.some((group) => group.itemIds.includes("second")));
});
