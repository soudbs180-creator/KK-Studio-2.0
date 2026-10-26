import { canvasImageReferenceLimit } from "../../features/models/imageModelCapabilities.ts";
import { readProviderConnections } from "../../features/creation/providerRegistry.ts";
import {
  type CanvasCollectionItem,
  type CanvasReference,
} from "../../domain/canvasItems.ts";
import { cardLayout } from "../../domain/canvasGraph.ts";
import { availableCanvasReferenceSlots } from "../../domain/canvasReferenceLimits.ts";
import type { ModelSelection } from "../../domain/modelSelection";
import type { useCanvasNodeActions } from "./useCanvasNodeActions";
import type { Point } from "./canvasModel";

interface CanvasRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

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
  occupiedRects?: CanvasRect[];
}

const REFERENCE_CARD_GAP = 32;

function overlaps(first: CanvasRect, second: CanvasRect): boolean {
  return !(
    first.x + first.width + REFERENCE_CARD_GAP <= second.x ||
    second.x + second.width + REFERENCE_CARD_GAP <= first.x ||
    first.y + first.height + REFERENCE_CARD_GAP <= second.y ||
    second.y + second.height + REFERENCE_CARD_GAP <= first.y
  );
}

/** Add reference nodes in a collision-free group beside the target card. */
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
  occupiedRects = [],
}: AddCanvasReferencesOptions): string[] {
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
  const referenceLayout = cardLayout({
    ...source,
    referenceOnly: true,
  });
  const targetLayout = cardLayout(source);
  const targetRect: CanvasRect = {
    x: parent.x + targetLayout.left,
    y: parent.y,
    width: targetLayout.width,
    height: targetLayout.height,
  };
  const leftSpace = targetRect.x - visibleWorldLeft;
  const rightSpace = visibleWorldRight - (targetRect.x + targetRect.width);
  const side = rightSpace >= leftSpace ? "right" : "left";
  const sideStartX =
    side === "right"
      ? targetRect.x + targetRect.width + REFERENCE_CARD_GAP
      : targetRect.x - referenceLayout.width - REFERENCE_CARD_GAP;
  const sideSpace = Math.max(leftSpace, rightSpace);
  const columns = Math.max(
    1,
    Math.min(
      2,
      Math.floor(
        (sideSpace + REFERENCE_CARD_GAP) /
          (referenceLayout.width + REFERENCE_CARD_GAP),
      ),
    ),
  );
  const occupied: CanvasRect[] = [...occupiedRects, targetRect];
  const occupiedSlots = new Set(
    existingReferences.map((reference) => reference.slot),
  );
  if (source.referenceSlot) occupiedSlots.add(source.referenceSlot);
  const rejectedSlots: string[] = [];
  let added = 0;
  let capacitySkipped = false;
  const addedIds: string[] = [];

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
    if (requestedSlot && occupiedSlots.has(requestedSlot)) {
      rejectedSlots.push(requestedSlot);
      return;
    }
    const slot = requestedSlot;
    if (slot) occupiedSlots.add(slot);

    const baseIndex = existingReferences.length + added;
    let position: Point | undefined;
    for (let attempt = 0; attempt < 64 && !position; attempt += 1) {
      const index = baseIndex + attempt;
      const row = Math.floor(index / columns);
      const column = index % columns;
      const x =
        side === "right"
          ? sideStartX + column * (referenceLayout.width + REFERENCE_CARD_GAP)
          : sideStartX - column * (referenceLayout.width + REFERENCE_CARD_GAP);
      const candidate: CanvasRect = {
        x,
        y: parent.y + row * (referenceLayout.height + REFERENCE_CARD_GAP),
        width: referenceLayout.width,
        height: referenceLayout.height,
      };
      if (!occupied.some((rect) => overlaps(candidate, rect))) {
        position = { x: candidate.x, y: candidate.y };
        occupied.push(candidate);
      }
    }
    if (!position) {
      position = {
        x: sideStartX,
        y:
          parent.y +
          (existingReferences.length + added) *
            (referenceLayout.height + REFERENCE_CARD_GAP),
      };
      occupied.push({
        ...position,
        width: referenceLayout.width,
        height: referenceLayout.height,
      });
    }

    const id = addNode(reference.kind ?? "image", {
      title: reference.title,
      description:
        reference.kind === "audio"
          ? "上传的音频参考"
          : reference.kind === "video"
            ? "视频首帧/尾帧参考"
            : "上传的参考图片",
      preview: reference.preview,
      assetId: reference.assetId,
      referenceSlot: slot,
      referenceFrame: reference.frame,
      referenceOnly: true,
      select: false,
      position,
    });
    onConnect(id, parentId, "reference");
    addedIds.push(id);
    added += 1;
  });
  if (capacitySkipped) {
    onConnectionNotice(
      available > 0
        ? `当前模型还可接收 ${available} 张参考图，已添加前 ${available} 张有效参考图。`
        : `当前模型最多接收 ${limit} 张新增参考图，请先移除已有连接。`,
    );
  }
  if (rejectedSlots.length) {
    onConnectionNotice(
      rejectedSlots.includes("Mask")
        ? "Mask 必须通过图像编辑器绘制，不能上传普通参考图。"
        : `${rejectedSlots.join("、")}槽已有参考图，请先移除后再上传。`,
    );
  }
  return addedIds;
}
