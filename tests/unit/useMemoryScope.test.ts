import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { MemoryAgentPort } from "../../packages/creation-contracts/index.ts";
import { memoryService } from "../../src/features/memory/index.ts";
import { useMemory } from "../../src/features/memory/useMemory.ts";

function fixture() {
  let sends = 0;
  const port: MemoryAgentPort = {
    getState: () => ({
      status: "connected",
      connectionRevision: 1,
      sending: false,
      conversation: { threadId: "thread-p1", status: "ready" },
      messages: [],
    }),
    getProjectId: () => "p1",
    getExecutionBlockReason: () => undefined,
    sendMessage: async () => {
      sends += 1;
      return { ok: false, error: "explicit test stop before model execution" };
    },
  };
  let hook: ReturnType<typeof useMemory>;
  function mount(projectId = "p1") {
    function Harness() {
      hook = useMemory(() => {}, port, {
        namespace: `project:${projectId}`,
        projectId,
      });
      return null;
    }
    renderToStaticMarkup(createElement(Harness));
    return hook!;
  }
  return { mount, sends: () => sends };
}

test("disabling memory during a pending extraction preflight prevents the model request", async (t) => {
  const originalEnabled = memoryService.isEnabled;
  const originalMode = memoryService.storageMode;
  t.after(() => {
    memoryService.isEnabled = originalEnabled;
    memoryService.storageMode = originalMode;
  });
  let enabled = true;
  let release!: (mode: "isolated") => void;
  memoryService.isEnabled = () => enabled;
  memoryService.storageMode = () =>
    new Promise((resolve) => {
      release = resolve;
    });
  const { mount, sends } = fixture();
  const extraction = mount().extractWithCodex();
  enabled = false;
  release("isolated");
  await extraction;
  assert.equal(sends(), 0);
});

test("memory extraction rejects a UI project whose Agent still belongs to another project", async (t) => {
  const originalEnabled = memoryService.isEnabled;
  const originalMode = memoryService.storageMode;
  t.after(() => {
    memoryService.isEnabled = originalEnabled;
    memoryService.storageMode = originalMode;
  });
  memoryService.isEnabled = () => true;
  memoryService.storageMode = async () => "isolated";
  const { mount, sends } = fixture();
  await mount("p2").extractWithCodex();
  assert.equal(sends(), 0);
});
