import assert from "node:assert/strict";
import test from "node:test";
import {
  getPluginNodeDefinition,
  getPluginNodesRevision,
  registerPluginNodes,
  subscribePluginNodes,
  unregisterPluginNodes,
} from "../../src/features/plugins/nodeRegistry.ts";

test("registry publishes complete registration and removal only when definitions change", () => {
  const pluginId = "registry-fixture";
  const definition = {
    type: "registry-fixture:card",
    title: "Fixture",
    icon: "fixture",
    defaultSize: { width: 200, height: 120 },
    Content: () => null,
  };
  const initial = getPluginNodesRevision();
  const events: Array<{ revision: number; present: boolean }> = [];
  const unsubscribe = subscribePluginNodes(() => {
    events.push({
      revision: getPluginNodesRevision(),
      present: getPluginNodeDefinition(definition.type) !== null,
    });
  });
  try {
    registerPluginNodes(pluginId, [definition]);
    assert.equal(getPluginNodeDefinition(definition.type), definition);
    assert.deepEqual(events, [{ revision: initial + 1, present: true }]);
    registerPluginNodes(pluginId, [definition]);
    registerPluginNodes(pluginId, []);
    unregisterPluginNodes("unrelated-fixture");
    assert.equal(getPluginNodesRevision(), initial + 1);
    assert.equal(events.length, 1);
    const replacement = { ...definition, title: "Updated fixture" };
    registerPluginNodes(pluginId, [replacement]);
    assert.equal(getPluginNodeDefinition(definition.type), replacement);
    unregisterPluginNodes(pluginId);
    assert.deepEqual(events, [
      { revision: initial + 1, present: true },
      { revision: initial + 2, present: true },
      { revision: initial + 3, present: false },
    ]);
    unsubscribe();
    registerPluginNodes(pluginId, [definition]);
    assert.equal(events.length, 3);
  } finally {
    unsubscribe();
    unregisterPluginNodes(pluginId);
  }
});
