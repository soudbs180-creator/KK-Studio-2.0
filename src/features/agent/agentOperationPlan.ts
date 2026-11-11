import type { CanvasAgentOp, CanvasAgentSnapshot } from "./agentTypes.ts";
import {
  agentNodeTypeToKind,
  applyAgentOpsToItems,
  buildAgentSnapshot,
} from "./agentCanvas.ts";
import type { CreationProject } from "../creation/index.ts";

export interface AgentOperationPlan {
  ops: CanvasAgentOp[];
  descriptions: string[];
  snapshot: CanvasAgentSnapshot | null;
}

/** Preview uses the same item reducer as execution; no providers or persistence run here. */
export function prepareAgentOperationPlan(
  input: CanvasAgentOp[],
  project: CreationProject | undefined,
  snapshot: CanvasAgentSnapshot | null,
): AgentOperationPlan {
  let items = structuredClone(project?.items ?? []);
  const descriptions: string[] = [];
  const ops = structuredClone(input).map((original): CanvasAgentOp => {
    let op = original;
    if (op.type === "delete_node" && !op.ids && !op.id && op.nodeType) {
      const type = op.nodeType.includes(":")
        ? op.nodeType
        : agentNodeTypeToKind(op.nodeType);
      op = {
        type: "delete_node",
        ids:
          snapshot?.nodes
            .filter((node) => node.type === type)
            .map((node) => node.id) ?? [],
      };
    }
    if (
      op.type === "delete_connections" &&
      (op.all || op.id === "*" || op.ids?.includes("*"))
    ) {
      op = {
        type: "delete_connections",
        ids: snapshot?.connections.map((edge) => edge.id) ?? [],
      };
    }
    if (op.type === "add_node" && !op.id)
      op.id = "planned-" + crypto.randomUUID();
    if (op.type === "run_generation") {
      const nodeId = op.nodeId;
      const node = items.find((item) => item.id === nodeId);
      op = {
        ...op,
        model: op.model ?? node?.model,
        prompt: op.prompt ?? node?.prompt ?? node?.description,
      };
    }
    descriptions.push(describeAgentOperation(op, buildAgentSnapshot(items)));
    if (
      ![
        "run_generation",
        "select_nodes",
        "set_viewport",
        "canvas_operation",
      ].includes(op.type)
    )
      items = applyAgentOpsToItems(items, [op]).items;
    return op;
  });
  return { ops, descriptions, snapshot };
}

export function operationSnapshotIdentity(
  snapshot: CanvasAgentSnapshot | null,
): string {
  return JSON.stringify([snapshot?.nodes ?? [], snapshot?.connections ?? []]);
}

export function describeAgentOperation(
  op: CanvasAgentOp,
  snapshot: CanvasAgentSnapshot | null,
): string {
  const nodeLabel = (id: string) => {
    const node = snapshot?.nodes.find((item) => item.id === id);
    return node ? `${node.title}（${id}）` : id;
  };
  function describeDeletion(
    op: Extract<CanvasAgentOp, { type: "delete_node" }>,
  ) {
    const type = op.nodeType?.includes(":")
      ? op.nodeType
      : agentNodeTypeToKind(op.nodeType);
    const ids =
      op.ids ??
      (op.id
        ? [op.id]
        : op.nodeType
          ? (snapshot?.nodes
              .filter((node) => node.type === type)
              .map((node) => node.id) ?? [])
          : []);
    return `删除 ${ids.length} 个节点：${ids.map(nodeLabel).join("、") || "未指定"}`;
  }
  function describeGeneration(
    op: Extract<CanvasAgentOp, { type: "run_generation" }>,
  ) {
    const node = snapshot?.nodes.find((item) => item.id === op.nodeId);
    return `生成 ${nodeLabel(op.nodeId)} · ${op.mode ?? node?.type ?? "待创建节点"} · 模型 ${op.model ?? node?.metadata.model ?? "节点配置"}`;
  }
  switch (op.type) {
    case "canvas_operation":
      return `画布原子操作 ${op.operation.op}：${JSON.stringify(op.operation.payload)}`;
    case "delete_node":
      return describeDeletion(op);
    case "delete_connections":
      return `删除连线：${op.all ? `当前全部 ${snapshot?.connections.length ?? 0} 条` : (op.ids ?? [op.id ?? "未指定"]).join("、")}`;
    case "run_generation":
      return describeGeneration(op);
    case "add_node":
      return `新建 ${op.title ?? op.nodeType ?? "节点"}（${op.id ?? "自动分配 ID"}）${op.metadata?.model ? ` · 模型 ${op.metadata.model}` : ""}`;
    case "update_node":
      return `更新 ${nodeLabel(op.id)}：${Object.keys(op.patch ?? {})
        .concat(Object.keys(op.metadata ?? {}))
        .join("、")}`;
    case "connect_nodes":
      return `连接 ${nodeLabel(op.fromNodeId)} → ${nodeLabel(op.toNodeId)}`;
    case "select_nodes":
      return `选择 ${op.ids.map(nodeLabel).join("、")}`;
    case "set_viewport":
      return `调整视口：${JSON.stringify(op.viewport)}`;
  }
}
