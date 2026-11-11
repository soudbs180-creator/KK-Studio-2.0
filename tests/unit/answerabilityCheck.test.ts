import assert from "node:assert/strict";
import test from "node:test";
import { OntologyGraph } from "../../src/domain/ontologyGraph.ts";
import {
  createAnswerabilityPreInvocationGuard,
  validateAnswerability,
} from "../../src/domain/answerabilityCheck.ts";

test("answerability diagnoses missing entities, attributes, and paths", () => {
  const graph = new OntologyGraph();
  graph.addEntity({
    id: "alice",
    name: "Alice",
    type: "character",
    properties: { costume: null },
  });
  const result = validateAnswerability(
    "Alice in scene",
    ["alice", "scene"],
    graph,
    {
      requiredAttributes: { alice: ["costume", "hair"] },
      requiredRelations: [{ sourceId: "alice", targetId: "scene" }],
    },
  );
  assert.equal(result.answerable, false);
  assert.deepEqual(result.missingEntities, ["scene"]);
  assert.deepEqual(result.missingAttributes.alice, ["costume", "hair"]);
  assert.ok(result.diagnostics.some((item) => item.code === "ATTRIBUTE_NULL"));
  assert.ok(result.feasibilityScore < 1);
});

test("answerability permits generic prompts and complete explicit references", () => {
  const graph = new OntologyGraph();
  assert.equal(
    validateAnswerability("General text", [], graph).answerable,
    true,
  );
  graph.addEntity({
    id: "a",
    name: "A",
    type: "asset",
    properties: { costume: "coat" },
  });
  assert.equal(
    validateAnswerability("Use A", ["a"], graph, {
      requiredAttributes: { a: ["costume"] },
    }).answerable,
    true,
  );
});

test("production PreInvocation hook rejects missing prerequisites and permits read-only tools", () => {
  const graph = new OntologyGraph();
  const guard = createAnswerabilityPreInvocationGuard(graph);
  assert.equal(
    guard("generate_image", { prompt: "A", requiredEntities: ["a"] }).allow,
    false,
  );
  assert.equal(guard("list_assets", { requiredEntities: ["a"] }).allow, true);
});

test("required attributes cannot pass when the reader cannot inspect properties", () => {
  assert.equal(
    validateAnswerability(
      "A",
      ["a"],
      { hasEntity: () => true },
      {
        requiredAttributes: { a: ["costume"] },
      },
    ).answerable,
    false,
  );
});
