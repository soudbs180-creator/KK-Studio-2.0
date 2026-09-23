import assert from "node:assert/strict";
import test from "node:test";
import { prepareIdleConversation } from "../../scripts/agent/prepareIdleConversation.ts";

for (const reason of [
  "disconnected",
  "stale",
  "existing",
  "preparing",
] as const) {
  test(`actual service preparation handler rejects ${reason} before any mutation`, async () => {
    let mutations = 0;
    const state = {
      revision: reason === "stale" ? 2 : 1,
      conversationId: "c",
      threadId: reason === "existing" ? "t" : "",
      status: reason === "preparing" ? "preparing" : "idle",
    };
    const result = await prepareIdleConversation(
      { clientId: "client", expectedConversationId: "c", expectedRevision: 1 },
      {
        hasClient: () => reason !== "disconnected",
        conversation: () => state,
        begin: () => {
          mutations++;
        },
        prepare: async () => {
          mutations++;
        },
      },
    );
    assert.equal(result.status, 409);
    assert.equal(mutations, 0);
    assert.equal(result.body.state, state);
  });
}
