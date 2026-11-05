import assert from "node:assert/strict";
import test from "node:test";
import { OntologyGraph } from "../../src/domain/ontologyGraph.ts";

function graph() {
  const result = new OntologyGraph();
  for (const id of ["c", "b", "a"])
    result.addEntity({ id, name: id, type: "asset", properties: {} });
  return result;
}

test("ontology computes deterministic DAG order and detects Tarjan cycles", () => {
  const result = graph();
  result.connect("a", "b").connect("b", "c");
  assert.deepEqual(result.topologicalSort().order, ["a", "b", "c"]);
  assert.equal(result.detectCycles().hasCycle, false);
  result.connect("c", "a");
  assert.deepEqual(result.detectCycles().stronglyConnectedComponents, [
    ["a", "b", "c"],
  ]);
  assert.equal(result.topologicalSort().success, false);
});

test("replacing a relation removes its old adjacency before indexing the new endpoints", () => {
  const result = graph();
  result.addRelation({
    id: "r",
    sourceId: "a",
    targetId: "b",
    predicate: "REFERENCES",
  });
  result.addRelation({
    id: "r",
    sourceId: "a",
    targetId: "c",
    predicate: "REFERENCES",
  });
  assert.equal(result.hasPath("a", "b"), false);
  assert.equal(result.hasPath("a", "c"), true);
  result.removeEntity("c");
  assert.equal(result.relationCount, 0);
});

test("ontology snapshots and caller objects cannot mutate the graph indexes or entity data", () => {
  const result = graph();
  const entity = {
    id: "d",
    name: "d",
    type: "asset",
    properties: { nested: { value: 1 } },
  };
  result.addEntity(entity);
  entity.properties.nested.value = 2;
  const snapshot = result.toJSON();
  (
    snapshot.entities.find((item) => item.id === "d")!.properties.nested as {
      value: number;
    }
  ).value = 3;
  assert.deepEqual(result.getEntity("d")!.properties.nested, { value: 1 });
});

test("failed ontology import preserves the existing graph", () => {
  const result = graph();
  const before = result.toJSON();
  assert.throws(() =>
    result.fromJSON({
      version: 1,
      entities: [],
      relations: [
        {
          id: "missing",
          sourceId: "a",
          targetId: "b",
          predicate: "REFERENCES",
        },
      ],
    }),
  );
  assert.deepEqual(result.toJSON(), before);
});
