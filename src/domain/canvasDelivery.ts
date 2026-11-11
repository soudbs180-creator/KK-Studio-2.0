import type { CanvasCollectionItem } from "./canvasItems.ts";
import type { CreationProject } from "./creationTypes.ts";
/**
 * 交付契约：Agent 声称完成的产物必须携带可回填的 node_id 且节点已注册资产。
 * 违反契约即抛错（宿主拦截并回显原因），防止"口头完成、画布无物"。
 * 对标竞品 canvas-discipline 契约（无 node_id 不算交付完成）。
 */
export class CanvasDeliveryContractError extends Error {}

export function hasRegisteredCanvasDelivery(
  item: CanvasCollectionItem,
): boolean {
  if (item.result?.source !== "provider") return false;
  // Text delivery is validated by its content. A stale assetId must not make
  // an empty provider response look like a successful copy result.
  if (item.kind === "text") return Boolean(item.result.text?.trim());
  if (item.assetId) return true;
  return Boolean(item.result.src);
}

export function assertCanvasDelivery(input: {
  nodeId?: string;
  project: CreationProject;
  label?: string;
  requireAssetId?: boolean;
}): void {
  const label = input.label ?? "Agent 产物";
  if (!input.nodeId)
    throw new CanvasDeliveryContractError(
      `${label} 未携带 node_id，未登记到画布；本次交付不成立。`,
    );
  const item = input.project.items.find((entry) => entry.id === input.nodeId);
  if (!item)
    throw new CanvasDeliveryContractError(
      `${label} 指向的画布节点 ${input.nodeId} 不存在。`,
    );
  if (input.requireAssetId && !item.assetId)
    throw new CanvasDeliveryContractError(
      `${label} 节点 ${input.nodeId} 尚未注册素材资产，交付不成立。`,
    );
  if (!hasRegisteredCanvasDelivery(item))
    throw new CanvasDeliveryContractError(
      `${label} 节点 ${input.nodeId} 尚未注册素材资产，交付不成立。`,
    );
}

/** Commit-boundary guard for a batch of newly published Agent results. */
export function assertCanvasDeliveries(input: {
  items: CanvasCollectionItem[];
  project: CreationProject;
  label?: string;
  requireAssetId?: boolean;
}): void {
  for (const item of input.items)
    assertCanvasDelivery({
      nodeId: item.id,
      project: input.project,
      label: input.label,
      requireAssetId: input.requireAssetId,
    });
}
