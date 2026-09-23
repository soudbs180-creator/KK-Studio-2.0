import assert from "node:assert/strict";
import test from "node:test";
import { createAgentHost } from "../../src/features/agent/agentHost.ts";
import { createProject } from "../../src/features/creation/model.ts";
function harness() {
  let project = createProject({
    kind: "image",
    prompt: "test",
    model: "image-model",
    attachments: [],
  });
  const calls: Array<{ nodeId: string; prompt: string }> = [];
  const host = createAgentHost({
    getProject: () => project,
    commit: (next) => {
      project = next;
    },
    generate: async (node, prompt) => {
      calls.push({ nodeId: node.id, prompt });
      return { taskId: "task-1" };
    },
  });
  return { host, calls, getProject: () => project };
}

test("视口与多选由真实宿主执行并反映在下一次快照", async () => {
  const { getProject } = harness();
  const ids = getProject().items.map((item) => item.id);
  let selectedNodeIds: string[] = [];
  let viewport = { x: 0, y: 0, scale: 1 };
  const host = createAgentHost({
    getProject,
    commit: () => {},
    generate: async () => ({ taskId: "unused" }),
    getView: () => ({
      getState: () => ({ selectedNodeIds, viewport }),
      selectNodes: (next: string[]) => {
        selectedNodeIds = next;
      },
      setViewport: (next: typeof viewport) => {
        viewport = next;
      },
    }),
  });
  const result = await host.applyOps([
    { type: "select_nodes", ids },
    { type: "set_viewport", viewport: { x: 123, y: -45, k: 0.6 } },
  ]);
  assert.deepEqual(result.rejected, []);
  assert.equal(result.applied.length, 2);
  assert.deepEqual(host.getSnapshot()?.selectedNodeIds, ids);
  assert.deepEqual(host.getSnapshot()?.viewport, viewport);
  const bad = await host.applyOps([
    { type: "select_nodes", ids: ["missing"] },
    { type: "set_viewport", viewport: { x: Infinity, y: 0, scale: 1 } },
    { type: "set_viewport", viewport: { x: 0, y: 0, scale: 10 } },
  ]);
  assert.equal(bad.rejected.length, 3);
  assert.deepEqual(selectedNodeIds, ids);
  await host.applyOps([{ type: "select_nodes", ids: [] }]);
  assert.deepEqual(host.getSnapshot()?.selectedNodeIds, []);
});
test("同一毫秒的无 ID 新节点保持独立身份与布局", async (t) => {
  t.mock.method(Date, "now", () => 1234);
  const { host, getProject } = harness();
  const result = await host.applyOps([
    { type: "add_node", nodeType: "image" },
    { type: "add_node", nodeType: "image" },
  ]);
  assert.equal(result.applied.length, 2);
  assert.equal(result.rejected.length, 0);
  const items = getProject().items.slice(-2);
  assert.notEqual(items[0].id, items[1].id);
  assert.notDeepEqual(
    getProject().canvas.positions[items[0].id],
    getProject().canvas.positions[items[1].id],
  );
});
test("同批新建配置及提示词后生成，返回真实任务 ID", async () => {
  const { host, calls, getProject } = harness();
  const result = await host.applyOps([
    {
      type: "add_node",
      id: "prompt-1",
      nodeType: "text",
      metadata: { content: "优化后的产品图" },
    },
    {
      type: "add_node",
      id: "config-1",
      nodeType: "config",
      metadata: { generationMode: "image", prompt: "@[node:prompt-1]" },
    },
    { type: "connect_nodes", fromNodeId: "prompt-1", toNodeId: "config-1" },
    {
      type: "run_generation",
      nodeId: "config-1",
      mode: "image",
      prompt: "@[node:prompt-1]",
    },
  ]);
  assert.deepEqual(result.rejected, []);
  assert.deepEqual(calls, [{ nodeId: "config-1", prompt: "优化后的产品图" }]);
  assert.equal(
    getProject().items.find((x) => x.id === "config-1")?.kind,
    "image",
  );
  assert.deepEqual(result.tasks, [
    { taskId: "task-1", nodeId: "config-1", status: "queued" },
  ]);
});
test("纯更新、位置及连线操作会落地，删除节点清理悬空边", async () => {
  const { host, getProject } = harness();
  await host.applyOps([
    { type: "add_node", id: "a", nodeType: "text" },
    { type: "add_node", id: "b", nodeType: "text" },
  ]);
  await host.applyOps([
    {
      type: "update_node",
      id: "a",
      patch: { title: "已更新", position: { x: 300, y: 400 } },
    },
    { type: "connect_nodes", fromNodeId: "a", toNodeId: "b" },
  ]);
  assert.equal(getProject().items.find((x) => x.id === "a")?.title, "已更新");
  assert.deepEqual(getProject().canvas.positions.a, { x: 300, y: 400 });
  assert.ok(
    getProject().canvas.edges.some((x) => x.source === "a" && x.target === "b"),
  );
  await host.applyOps([{ type: "delete_node", id: "a" }]);
  assert.ok(!getProject().canvas.edges.some((x) => x.source === "a"));
});
test("生成错误原样回传；不支持的视频不调用 Provider", async () => {
  const { host, calls } = harness();
  const result = await host.applyOps([
    { type: "add_node", id: "v", nodeType: "video" },
    { type: "run_generation", nodeId: "v", mode: "video", prompt: "视频" },
  ]);
  assert.equal(calls.length, 0);
  assert.match(result.rejected[0].reason, /暂未/);
});

test("取消在途生成后，不再落地同批后续操作", async () => {
  let project = createProject({
    kind: "image",
    model: "gpt-image-1",
    prompt: "test",
    attachments: [],
  });
  const controller = new AbortController();
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const host = createAgentHost({
    getProject: () => project,
    commit: (next) => {
      project = next;
    },
    generate: async (_node, _prompt, signal) => {
      await pending;
      return signal?.aborted ? { error: "已取消" } : { taskId: "unexpected" };
    },
  });
  const run = host.applyOps(
    [
      { type: "add_node", id: "cancel-image", nodeType: "image" },
      { type: "run_generation", nodeId: "cancel-image", prompt: "test" },
      { type: "add_node", id: "late-node", nodeType: "text" },
    ],
    { signal: controller.signal },
  );
  controller.abort();
  release();
  const result = await run;
  assert.equal(result.tasks?.length, 0);
  assert.ok(!project.items.some((item) => item.id === "late-node"));
  assert.equal(result.rejected.length, 2);
});
