import { canvasImageReferenceLimit } from "../../features/models/imageModelCapabilities.ts";
import { readProviderConnections } from "../../features/creation/providerRegistry.ts";
import {
  CANVAS_REFERENCE_SLOTS,
  type CanvasCollectionItem,
  type CanvasReference,
} from "../../domain/canvasItems.ts";
import { cardLayout } from "../../domain/canvasGraph.ts";
import { availableCanvasReferenceSlots } from "../../domain/canvasReferenceLimits.ts";
import type { ModelSelection } from "../../domain/modelSelection";
import type { useCanvasNodeActions } from "./useCanvasNodeActions";
import type { Point } from "./canvasModel";

interface AddCanvasReferencesOptions {
  parentId: string;
  parent: Point;
  source: CanvasCollectionItem;
  references: CanvasReference[];
  existingReferences: CanvasReference[];
  defaultSelection?: ModelSelection;
  addNode: ReturnType<typeof useCanvasNodeActions>["addNode"];
  onConnect: (
    source: string,
    target: string,
    kind?: "reference" | "result",
  ) => void;
  onConnectionNotice: (message: string) => void;
  visibleWorldLeft?: number;
  visibleWorldRight?: number;
}

export function addCanvasReferences({
  parentId,
  parent,
  source,
  references,
  existingReferences,
  defaultSelection,
  addNode,
  onConnect,
  onConnectionNotice,
  visibleWorldLeft = 0,
  visibleWorldRight = Number.POSITIVE_INFINITY,
}: AddCanvasReferencesOptions): void {
  const limit = canvasImageReferenceLimit(
    source,
    readProviderConnections(),
    defaultSelection,
  );
  const available = availableCanvasReferenceSlots(
    source,
    existingReferences,
    limit,
  );
  const referenceWidth = cardLayout({
    ...source,
    referenceOnly: true,
  }).width;
  const maxStartX = Math.max(
    visibleWorldLeft,
    visibleWorldRight - referenceWidth,
  );
  const startX = Math.min(
    maxStartX,
    Math.max(visibleWorldLeft, parent.x - 520),
  );
  const occupied = new Set(
    existingReferences.map((reference) => reference.slot),
  );
  if (source.referenceSlot) occupied.add(source.referenceSlot);
  const rejectedSlots: string[] = [];
  let slotUnavailable = false;
  let added = 0;
  let capacitySkipped = false;
  references.forEach((reference) => {
    if (added >= available) {
      capacitySkipped = true;
      return;
    }
    const requestedSlot = reference.slot;
    if (requestedSlot === "Mask") {
      rejectedSlots.push("Mask");
      return;
    }
    if (requestedSlot && occupied.has(requestedSlot)) {
      rejectedSlots.push(requestedSlot);
      return;
    }
    const slot =
      requestedSlot && !occupied.has(requestedSlot)
        ? requestedSlot
        : CANVAS_REFERENCE_SLOTS.find(
            (value) => value !== "Mask" && !occupied.has(value),
          );
    if (!slot) {
      slotUnavailable = true;
      return;
    }
    occupied.add(slot);
    const id = addNode("image", {
      title: reference.title,
      description: "上传的参考图片",
      preview: reference.preview,
      assetId: reference.assetId,
      referenceSlot: slot,
      referenceOnly: true,
      select: false,
      position: {
        x: Math.min(
          maxStartX,
          Math.max(visibleWorldLeft, startX + (added % 2) * 24),
        ),
        y: parent.y + Math.floor(added / 2) * 430,
      },
    });
    onConnect(id, parentId, "reference");
    added += 1;
  });
  if (capacitySkipped) {
    onConnectionNotice(
      available > 0
        ? `当前模型还可接收 ${available} 张参考图，已添加前 ${available} 张有效参考图。`
        : `当前模型最多接收 ${limit} 张新增参考图，请先移除已有连接。`,
    );
  }
  if (rejectedSlots.length || slotUnavailable) {
    onConnectionNotice(
      rejectedSlots.includes("Mask")
        ? "Mask 必须通过图像编辑器绘制，不能上传普通参考图。"
        : rejectedSlots.length
          ? `${rejectedSlots.join("、")}槽已有参考图，请先移除后再上传。`
          : "没有可用的参考图槽位，请先移除已有参考图。",
    );
  }
}
