import assert from "node:assert/strict";
import test from "node:test";
import {
  applyAgentOpsToItems,
  assertCanvasDelivery,
  buildAgentSnapshot,
  CanvasDeliveryContractError,
  collectRecentOutputs,
  itemKindToAgentNodeType,
  summarizeAgentOps,
  summarizeRecentOutputs,
} from "../../src/features/agent/agentCanvas.ts";
import type { CanvasCollectionItem } from "../../src/domain/canvasItems.ts";
import {
  createProjectCanvas,
  reconcileProjectCanvas,
} from "../../src/domain/projectCanvas.ts";
import type { CanvasAgentOp } from "../../src/features/agent/agentTypes.ts";
import type { CreationProject } from "../../src/features/creation/model.ts";

/**
 * Agent 画布桥：本项目卡片模型 ↔ Agent 快照/操作翻译。
 * 对照上游 web/src/lib/canvas/canvas-agent-ops.ts 的 add_node/update_node 等。
 */
const baseItems: CanvasCollectionItem[] = [
  {
    id: "image",
    title: "图片创建卡片",
    description: "kk Image 2",
    kind: "image",
  },
  { id: "video1", title: "视频卡片 1", description: "图转视频", kind: "video" },
];

test("buildAgentSnapshot 生成节点/连线/视口", () => {
  const canvas = createProjectCanvas(baseItems);
  const snapshot = buildAgentSnapshot(baseItems, {
    projectId: "proj-1",
    title: "我的项目",
    canvas,
  });
  assert.equal(snapshot.projectId, "proj-1");
  assert.equal(snapshot.title, "我的项目");
  assert.equal(snapshot.nodes.length, 2);
  assert.equal(snapshot.nodes[0].id, "image");
  assert.equal(snapshot.nodes[0].type, "image");
  assert.ok(snapshot.nodes[0].position.x >= 0);
  assert.equal(snapshot.nodes[0].metadata.description, "kk Image 2");
  assert.equal(snapshot.connections.length, 1);
  assert.equal(snapshot.connections[0].fromNodeId, "image");
  assert.deepEqual(snapshot.viewport, { x: 0, y: 0, scale: 1 });
});

test("add_node 翻译为新卡片（text→文案）", () => {
  const ops: CanvasAgentOp[] = [
    {
      type: "add_node",
      id: "added-text-1",
      nodeType: "text",
      title: "标题卡片",
      position: { x: 10, y: 20 },
      metadata: { content: "示例文案" },
    },
  ];
  const result = applyAgentOpsToItems(baseItems, ops);
  assert.equal(result.applied.length, 1);
  assert.equal(result.rejected.length, 0);
  assert.equal(result.items.length, 3);
  const added = result.items.find((item) => item.id === "added-text-1");
  assert.ok(added);
  assert.equal(added.kind, "text");
  assert.equal(added.title, "标题卡片");
  assert.equal(added.prompt, "示例文案");
  assert.deepEqual(result.positions["added-text-1"], { x: 10, y: 20 });
});

test("update_node 更新标题与位置", () => {
  const ops: CanvasAgentOp[] = [
    {
      type: "update_node",
      id: "video1",
      patch: { title: "新标题", position: { x: 5, y: 6 } },
      metadata: { description: "新描述" },
    },
  ];
  const result = applyAgentOpsToItems(baseItems, ops);
  const updated = result.items.find((item) => item.id === "video1");
  assert.equal(updated?.title, "新标题");
  assert.equal(updated?.description, "新描述");
  assert.deepEqual(result.positions["video1"], { x: 5, y: 6 });
});

test("update_node 节点不存在时拒绝", () => {
  const ops: CanvasAgentOp[] = [
    { type: "update_node", id: "ghost", patch: {} },
  ];
  const result = applyAgentOpsToItems(baseItems, ops);
  assert.equal(result.applied.length, 0);
  assert.equal(result.rejected.length, 1);
  assert.match(result.rejected[0].reason, /不存在/);
});

test("delete_node 按 id / nodeType 删除", () => {
  const byId = applyAgentOpsToItems(baseItems, [
    { type: "delete_node", id: "video1" },
  ]);
  assert.equal(byId.items.length, 1);
  const byType = applyAgentOpsToItems(baseItems, [
    { type: "delete_node", nodeType: "video" },
  ]);
  assert.equal(byType.items.length, 1);
});

test("delete_node 带插件 nodeType 只删除匹配插件节点", () => {
  const withPlugins: CanvasCollectionItem[] = [
    ...baseItems,
    {
      id: "plugin-a",
      kind: "text",
      title: "SVG",
      description: "",
      plugin: { type: "svg:vector", width: 320, height: 320 },
    },
    {
      id: "plugin-b",
      kind: "text",
      title: "Markdown",
      description: "",
      plugin: { type: "markdown:doc" },
    },
  ];
  const result = applyAgentOpsToItems(withPlugins, [
    { type: "delete_node", nodeType: "svg:vector" },
  ]);
  assert.equal(
    result.items.some((item) => item.id === "plugin-a"),
    false,
  );
  // 其他插件节点与普通 text 节点不受影响
  assert.ok(result.items.some((item) => item.id === "plugin-b"));
  assert.equal(result.items.length, 3);
});

test("update_node 插件节点合并 metadata 并接受宽高补丁", () => {
  const withPlugin: CanvasCollectionItem[] = [
    ...baseItems,
    {
      id: "plugin-a",
      kind: "text",
      title: "SVG",
      description: "",
      plugin: { type: "svg:vector", width: 320, height: 320 },
    },
  ];
  const result = applyAgentOpsToItems(withPlugin, [
    {
      type: "update_node",
      id: "plugin-a",
      patch: { width: 400, height: 300, title: "SVG 大图" },
      metadata: { content: "新内容" },
    },
  ]);
  const updated = result.items.find((item) => item.id === "plugin-a");
  assert.equal(updated?.title, "SVG 大图");
  assert.equal(updated?.plugin?.width, 400);
  assert.equal(updated?.plugin?.height, 300);
  assert.equal(updated?.plugin?.metadata?.content, "新内容");
});

test("connect_nodes 生成连线建议，端点不存在则拒绝", () => {
  const ok = applyAgentOpsToItems(baseItems, [
    { type: "connect_nodes", fromNodeId: "image", toNodeId: "video1" },
  ]);
  assert.equal(ok.connections.add.length, 1);
  assert.deepEqual(ok.connections.add[0], {
    id: undefined,
    source: "image",
    target: "video1",
  });
  const bad = applyAgentOpsToItems(baseItems, [
    { type: "connect_nodes", fromNodeId: "image", toNodeId: "ghost" },
  ]);
  assert.equal(bad.rejected.length, 1);
});

test("run_generation 由宿主接管（翻译层拒绝）", () => {
  const result = applyAgentOpsToItems(baseItems, [
    {
      type: "run_generation",
      nodeId: "image",
      mode: "image",
      prompt: "一只猫",
    },
  ]);
  assert.equal(result.applied.length, 0);
  assert.equal(result.rejected.length, 1);
  assert.match(result.rejected[0].reason, /宿主接管/);
});

test("summarizeAgentOps 输出中文摘要", () => {
  const summary = summarizeAgentOps([
    { type: "add_node", nodeType: "text" },
    { type: "add_node", nodeType: "image" },
    { type: "update_node", id: "image", patch: {} },
  ]);
  assert.match(summary, /新建节点 2/);
  assert.match(summary, /更新节点 1/);
});

test("itemKindToAgentNodeType 双向映射一致", () => {
  assert.equal(itemKindToAgentNodeType("image"), "image");
  assert.equal(itemKindToAgentNodeType("audio"), "audio");
});

function deliveryProject(): CreationProject {
  const items: CanvasCollectionItem[] = [
    {
      id: "source-1",
      title: "生成源节点",
      description: "来源",
      kind: "image",
    },
    {
      id: "result-1",
      title: "归档产物",
      description: "已归档",
      kind: "image",
      assetId: "asset-1",
      result: {
        id: "result-1",
        kind: "image",
        title: "归档产物",
        description: "已归档",
        src: "kk-asset:asset-1",
        source: "provider",
      },
    },
  ];
  const canvas = reconcileProjectCanvas(createProjectCanvas(items), items);
  return {
    id: "proj-delivery",
    name: "交付契约测试",
    kind: "image",
    prompt: "test",
    model: "test",
    attachments: [],
    items,
    canvas: {
      ...canvas,
      edges: [
        ...canvas.edges,
        {
          id: "result-edge",
          source: "source-1",
          target: "result-1",
          kind: "result",
        },
      ],
    },
    messages: [],
    tasks: [],
    favoriteIds: [],
    likedIds: [],
    composerDraft: {
      prompt: "",
      model: "",
      kind: "image",
      attachments: [],
      approvalMode: "auto",
      privacyMode: "byok_local",
      outputCount: 1,
      updatedAt: 0,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

test("assertCanvasDelivery 拒绝无 node_id / 无资产注册的交付", () => {
  const project = deliveryProject();
  assert.throws(
    () => assertCanvasDelivery({ nodeId: undefined, project }),
    CanvasDeliveryContractError,
  );
  assert.match(
    (() => {
      try {
        assertCanvasDelivery({ nodeId: undefined, project });
        return "";
      } catch (error) {
        return error instanceof Error ? error.message : "";
      }
    })(),
    /未携带 node_id/,
  );
  assert.throws(
    () => assertCanvasDelivery({ nodeId: "ghost", project }),
    /不存在/,
  );
  assert.throws(
    () => assertCanvasDelivery({ nodeId: "source-1", project }),
    /尚未注册素材资产/,
  );
  assert.doesNotThrow(() =>
    assertCanvasDelivery({ nodeId: "result-1", project }),
  );
});

test("collectRecentOutputs 按 result 连线收集已归档产物", () => {
  const project = deliveryProject();
  const outputs = collectRecentOutputs(project);
  assert.deepEqual(
    outputs.map((item) => item.id),
    ["result-1"],
  );
  assert.deepEqual(collectRecentOutputs(project, "source-1").length, 1);
  assert.deepEqual(collectRecentOutputs(project, "other-source").length, 0);
});

test("summarizeRecentOutputs 输出当轮产物摘要", () => {
  const project = deliveryProject();
  const summary = summarizeRecentOutputs(project);
  assert.match(summary, /本轮产物：image 1/);
  const empty = summarizeRecentOutputs({
    ...project,
    items: [],
    canvas: { ...project.canvas, edges: [] },
  });
  assert.match(empty, /本轮尚无已归档产物/);
});
