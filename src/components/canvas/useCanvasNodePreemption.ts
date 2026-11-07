import { useCallback, useMemo } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { shadowEventBus } from "../../features/sync/index.ts";
import type { CanvasNodeItemProps } from "./canvasNodeItemComparator.ts";

export default function useCanvasNodePreemption({
  item,
  controls,
  onDelete,
  onItemsChange,
}: Pick<
  CanvasNodeItemProps,
  "item" | "controls" | "onDelete" | "onItemsChange"
>) {
  const isGenerating =
    (item.generationStatus as unknown as string) === "generating";

  const handlePreempt = useCallback(
    (reason: string = "designer_override") => {
      const taskId =
        (item as unknown as { taskId?: string; activeTaskId?: string })
          .taskId ||
        (item as unknown as { taskId?: string; activeTaskId?: string })
          .activeTaskId ||
        "unknown";
      const baseRev =
        item.node_rev ?? shadowEventBus.getNodeRevision(item.id) ?? 1;

      // 1. Emit shadow events
      shadowEventBus.emit({
        eventType: "agent.task.cancelled",
        targetNodeId: item.id,
        actor: "system",
        baseRev,
        newRev: baseRev,
        payload: { taskId, targetNodeId: item.id, reason },
      });

      const newRev = baseRev + 1;
      shadowEventBus.setNodeRevision(item.id, newRev);
      shadowEventBus.emit({
        eventType: "canvas.node.override",
        targetNodeId: item.id,
        actor: "designer",
        baseRev,
        newRev,
        payload: {
          targetNodeId: item.id,
          actor: "designer",
          taskId,
          overriddenState: "generating",
          reason,
        },
      });

      // 2. Invoke preemption backend if in Tauri
      if (isTauri()) {
        invoke("concurrency_preempt_node", {
          nodeId: item.id,
          actor: "designer",
        }).catch(() => {});
        if (taskId !== "unknown") {
          invoke("task_host_cancel", { taskId }).catch(() => {});
        }
      }

      // 3. Clear generationStatus and restore designer interactive control
      onItemsChange((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                generationStatus: undefined,
                node_rev: newRev,
                updatedAt: Date.now(),
              }
            : entry,
        ),
      );
    },
    [item, onItemsChange],
  );

  const handleDelete = useCallback(() => {
    if (isGenerating) {
      handlePreempt("designer_delete");
    }
    onDelete(item.id);
  }, [isGenerating, handlePreempt, onDelete, item.id]);

  const wrappedControls = useMemo(() => {
    if (!isGenerating) return controls;
    return {
      ...controls,
      startNodeDrag: (
        event: React.PointerEvent<HTMLDivElement>,
        id: string,
      ) => {
        if (id === item.id) {
          handlePreempt("designer_drag");
        }
        controls.startNodeDrag(event, id);
      },
      moveNodeWithKeyboard: (
        event: React.KeyboardEvent<HTMLDivElement>,
        id: string,
        onDeleteNode: () => void,
      ) => {
        if (id === item.id) {
          handlePreempt("designer_keyboard_move");
        }
        controls.moveNodeWithKeyboard(event, id, onDeleteNode);
      },
    };
  }, [controls, isGenerating, handlePreempt, item.id]);

  return { isGenerating, handlePreempt, handleDelete, wrappedControls };
}
