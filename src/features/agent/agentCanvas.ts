/**
 * Agent 画布桥：本项目画布模型 ↔ Agent 画布协议（快照/操作）。
 *
 * 操作 schema 与 applyCanvasAgentOps 对照上游
 * web/src/lib/canvas/canvas-agent-ops.ts（MIT）；本项目节点是
 * CanvasCollectionItem 卡片模型，位置/连线在 ProjectCanvas 中，
 * 因此翻译层独立维护 items / positions / edges 三份输出。
 */

import { cardLayout } from "../../domain/canvasGraph.ts";
import type { CanvasCollectionItem } from "../../domain/canvasItems.ts";
import type { Point } from "../../domain/canvasViewport.ts";
import type { ProjectCanvas } from "../../domain/projectCanvas.ts";
import type {
  CanvasAgentOp,
  CanvasAgentSnapshot,
  CanvasConnectionData,
  CanvasNodeData,
} from "./agentTypes.ts";

const NODE_TYPE_TO_KIND: Record<string, CanvasCollectionItem["kind"]> = {
  image: "image",
  video: "video",
  audio: "audio",
  text: "text",
};

const DEFAULT_VIEWPORT = { x: 0, y: 0, scale: 1 };

export function agentNodeTypeToKind(
  nodeType?: string,
): CanvasCollectionItem["kind"] {
  return NODE_TYPE_TO_KIND[nodeType ?? "text"] ?? "text";
}

export function itemKindToAgentNodeType(
  kind: CanvasCollectionItem["kind"],
): string {
  return kind;
}

/** 计算节点在 Agent 快照中的位置：优先项目已存位置，否则按初始布局推算。 */
export function resolveNodePosition(
  item: CanvasCollectionItem,
  positions: Record<string, Point>,
  index: number,
): Point {
  const stored = positions[item.id];
  if (stored) return { ...stored };
  const layout = cardLayout(item);
  return {
    x: 82 + (index % 2) * 650 - layout.left,
    y: 107 + Math.floor(index / 2) * 520,
  };
}

/** 计算节点在 Agent 快照中的尺寸（宽高）。 */
export function resolveNodeSize(item: CanvasCollectionItem): {
  width: number;
  height: number;
} {
  const layout = cardLayout(item);
  return { width: layout.width, height: layout.height };
}

/** 构建 Agent 画布快照（节点/连线/视口）。 */
export function buildAgentSnapshot(
  items: CanvasCollectionItem[],
  options?: {
    projectId?: string;
    title?: string;
    canvas?: ProjectCanvas;
    selectedNodeIds?: string[];
  },
): CanvasAgentSnapshot {
  const positions = options?.canvas?.positions ?? {};
  const nodes: CanvasNodeData[] = items.map((item, index) => {
    const position = resolveNodePosition(item, positions, index);
    const size = resolveNodeSize(item);
    return {
      id: item.id,
      type: item.plugin?.type ?? itemKindToAgentNodeType(item.kind),
      title: item.title || `${item.kind} 节点`,
      position,
      width: size.width,
      height: size.height,
      metadata: {
        description: item.description ?? "",
        prompt: item.prompt ?? "",
        model: item.model,
        providerConnectionId: item.providerConnectionId,
        generationSource: item.generationSource,
        text:
          item.result?.text ??
          (item.kind === "text" ? item.prompt : undefined) ??
          item.plugin?.metadata?.content ??
          "",
        referenceOnly: Boolean(item.referenceOnly),
        referenceSlot: item.referenceSlot,
        generationStatus: item.generationStatus,
        ...(item.plugin?.metadata ?? {}),
      },
    };
  });
  const connections: CanvasConnectionData[] = (
    options?.canvas?.edges ?? []
  ).map((edge) => ({
    id: edge.id,
    fromNodeId: edge.source,
    toNodeId: edge.target,
  }));
  return {
    projectId: options?.projectId ?? "",
    title: options?.title ?? "",
    nodes,
    connections,
    selectedNodeIds: options?.selectedNodeIds ?? [],
    viewport: options?.canvas?.viewport ?? DEFAULT_VIEWPORT,
  };
}

export interface AgentOpTranslation {
  items: CanvasCollectionItem[];
  /** 位置变更：nodeId → 新位置（Agent 坐标系）。 */
  positions: Record<string, Point>;
  /** 连线变更：仅 add/delete 连线（本项目画布组件持有 edges）。 */
  connections: {
    add: Array<{ id?: string; source: string; target: string }>;
    removeIds: string[];
  };
  applied: CanvasAgentOp[];
  rejected: Array<{ op: CanvasAgentOp; reason: string }>;
}

const DEFAULT_KIND_TITLES: Record<CanvasCollectionItem["kind"], string> = {
  image: "图片卡片",
  video: "视频卡片",
  audio: "音频卡片",
  text: "文案卡片",
};

function nodeMetadataString(
  metadata: Record<string, unknown> | undefined,
  ...keys: string[]
): string {
  if (!metadata) return "";
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value) return value;
  }
  return "";
}

/** 把 Agent 操作翻译到本项目画布模型（纯函数，宿主负责落地）。 */
export function applyAgentOpsToItems(
  items: CanvasCollectionItem[],
  ops: CanvasAgentOp[],
): AgentOpTranslation {
  let nextItems = items;
  const positions: Record<string, Point> = {};
  const connections: AgentOpTranslation["connections"] = {
    add: [],
    removeIds: [],
  };
  const applied: CanvasAgentOp[] = [];
  const rejected: Array<{ op: CanvasAgentOp; reason: string }> = [];

  (Array.isArray(ops) ? ops : []).forEach((op) => {
    if (!op?.type) return;
    switch (op.type) {
      case "add_node": {
        const metadata = op.metadata;
        const content = nodeMetadataString(
          metadata,
          "content",
          "text",
          "description",
        );
        const isPluginType =
          typeof op.nodeType === "string" && op.nodeType.includes(":");
        const kind = isPluginType
          ? "text"
          : agentNodeTypeToKind(
              op.nodeType === "config"
                ? nodeMetadataString(metadata, "generationMode", "mode") ||
                    "image"
                : op.nodeType,
            );
        const id = op.id || `added-${kind}-${crypto.randomUUID()}`;
        if (nextItems.some((item) => item.id === id)) {
          rejected.push({ op, reason: "节点 ID 已存在" });
          break;
        }
        const item: CanvasCollectionItem = {
          id,
          kind,
          providerConnectionId:
            nodeMetadataString(metadata, "providerConnectionId") || undefined,
          ...(isPluginType
            ? {
                plugin: {
                  type: String(op.nodeType),
                  width: op.width,
                  height: op.height,
                  metadata,
                },
              }
            : {}),
          title: op.title || DEFAULT_KIND_TITLES[kind],
          description: metadata
            ? nodeMetadataString(metadata, "description")
            : "",
          ...(content && kind === "text" && !isPluginType
            ? { prompt: content }
            : {}),
          ...(content && kind !== "text" ? { description: content } : {}),
          generationStatus: "pending",
          ...(nodeMetadataString(metadata, "prompt", "composerContent")
            ? {
                prompt: nodeMetadataString(
                  metadata,
                  "prompt",
                  "composerContent",
                ),
              }
            : {}),
          ...(nodeMetadataString(metadata, "model")
            ? { model: nodeMetadataString(metadata, "model") }
            : {}),
        };
        nextItems = [...nextItems, item];
        positions[id] = op.position ?? {
          x: op.x ?? 82 + ((nextItems.length - 1) % 2) * 650,
          y: op.y ?? 107 + Math.floor((nextItems.length - 1) / 2) * 520,
        };
        applied.push(op);
        break;
      }
      case "update_node": {
        if (!op.id) {
          rejected.push({ op, reason: "缺少节点 id" });
          break;
        }
        const patch = op.patch ?? {};
        const metadata = { ...patch.metadata, ...op.metadata };
        let found = false;
        nextItems = nextItems.map((item) => {
          if (item.id !== op.id) return item;
          found = true;
          const next: CanvasCollectionItem = { ...item };
          if (typeof metadata.prompt === "string")
            next.prompt = metadata.prompt;
          if (typeof metadata.model === "string") next.model = metadata.model;
          if (typeof metadata.providerConnectionId === "string")
            next.providerConnectionId = metadata.providerConnectionId;
          if (typeof patch.title === "string") next.title = patch.title;
          if (
            typeof patch.position?.x === "number" &&
            typeof patch.position?.y === "number"
          ) {
            positions[item.id] = { x: patch.position.x, y: patch.position.y };
          }
          const content = nodeMetadataString(metadata, "content", "text");
          const description = nodeMetadataString(metadata, "description");
          if (next.plugin) {
            const nextPlugin = {
              ...next.plugin,
              metadata: { ...(next.plugin.metadata ?? {}) },
            };
            if (typeof patch.width === "number") nextPlugin.width = patch.width;
            if (typeof patch.height === "number")
              nextPlugin.height = patch.height;
            if (content) nextPlugin.metadata.content = content;
            if (description && !content)
              nextPlugin.metadata.description = description;
            next.plugin = nextPlugin;
          } else {
            if (content && next.kind === "text") next.prompt = content;
            if (description) next.description = description;
            if (content && next.kind !== "text") next.description = content;
          }
          return next;
        });
        if (found) applied.push(op);
        else rejected.push({ op, reason: `节点 ${op.id} 不存在` });
        break;
      }
      case "delete_node": {
        const ids = new Set(
          op.ids ||
            (op.id
              ? [op.id]
              : typeof op.nodeType === "string" && op.nodeType.includes(":")
                ? items
                    .filter((item) => item.plugin?.type === op.nodeType)
                    .map((item) => item.id)
                : op.nodeType
                  ? items
                      .filter(
                        (item) =>
                          item.kind === agentNodeTypeToKind(op.nodeType),
                      )
                      .map((item) => item.id)
                  : []),
        );
        if (!ids.size) {
          rejected.push({ op, reason: "未指定要删除的节点" });
          break;
        }
        const before = nextItems.length;
        nextItems = nextItems.filter((item) => !ids.has(item.id));
        if (nextItems.length !== before) applied.push(op);
        else rejected.push({ op, reason: "节点不存在" });
        break;
      }
      case "delete_connections": {
        connections.removeIds.push(...(op.ids || (op.id ? [op.id] : [])));
        if (op.all) connections.removeIds.push("*");
        applied.push(op);
        break;
      }
      case "connect_nodes": {
        if (!op.fromNodeId || !op.toNodeId) {
          rejected.push({ op, reason: "缺少连线端点" });
          break;
        }
        const hasNodes =
          nextItems.some((item) => item.id === op.fromNodeId) &&
          nextItems.some((item) => item.id === op.toNodeId);
        if (!hasNodes) {
          rejected.push({ op, reason: "连线端点节点不存在" });
          break;
        }
        connections.add.push({
          id: op.id,
          source: op.fromNodeId,
          target: op.toNodeId,
        });
        applied.push(op);
        break;
      }
      case "set_viewport": {
        rejected.push({ op, reason: "Agent 调整视口暂未接入" });
        break;
      }
      case "select_nodes": {
        rejected.push({ op, reason: "Agent 选择节点暂未接入" });
        break;
      }
      case "run_generation": {
        // 由宿主接入生成流程（submitImageCommand），翻译层不落地。
        rejected.push({ op, reason: "生成由宿主接管（run_generation）" });
        break;
      }
      default:
        rejected.push({ op, reason: "未知操作类型" });
    }
  });

  return { items: nextItems, positions, connections, applied, rejected };
}

/** Agent 操作摘要（用于 UI 活动行）。 */
export function summarizeAgentOps(ops?: CanvasAgentOp[]): string {
  const counts = (Array.isArray(ops) ? ops : []).reduce<Record<string, number>>(
    (acc, op) => {
      if (!op?.type) return acc;
      acc[op.type] = (acc[op.type] || 0) + 1;
      return acc;
    },
    {},
  );
  const labels: Record<string, string> = {
    add_node: "新建节点",
    update_node: "更新节点",
    delete_node: "删除节点",
    delete_connections: "删除连线",
    connect_nodes: "连接节点",
    set_viewport: "调整视口",
    select_nodes: "选中节点",
    run_generation: "生成",
  };
  return Object.entries(counts)
    .map(([type, count]) => `${labels[type] ?? type} ${count}`)
    .join("，");
}
