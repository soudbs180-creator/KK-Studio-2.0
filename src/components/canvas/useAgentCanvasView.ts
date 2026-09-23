import {
  useEffect,
  useLayoutEffect,
  useRef,
  type MutableRefObject,
} from "react";
import { flushSync } from "react-dom";
import type { AgentCanvasView } from "../../features/agent/agentCanvasView";
import type { useCanvasControls } from "./useCanvasControls";

export type AgentCanvasBinding = { projectId: string; view: AgentCanvasView };

export function useAgentCanvasView(
  controls: ReturnType<typeof useCanvasControls>,
  projectId: string | undefined,
  binding: MutableRefObject<AgentCanvasBinding | null> | undefined,
  onChange: (() => void) | undefined,
) {
  const current = useRef(controls);
  current.current = controls;
  const notify = useRef(onChange);
  notify.current = onChange;
  useLayoutEffect(() => {
    if (!binding || !projectId) return;
    const entry: AgentCanvasBinding = {
      projectId,
      view: {
        getState: () => ({
          selectedNodeIds: [...current.current.selectedIds],
          viewport: { ...current.current.transform },
        }),
        selectNodes: (ids) =>
          flushSync(() => {
            current.current.cancelGesture();
            current.current.selectNodes(new Set(ids));
          }),
        setViewport: (viewport) =>
          flushSync(() => {
            current.current.cancelGesture();
            current.current.setTransform(viewport);
          }),
      },
    };
    binding.current = entry;
    return () => {
      if (binding.current === entry) binding.current = null;
    };
  }, [binding, projectId]);
  const selection = [...controls.selectedIds].sort().join("\n");
  useEffect(() => {
    const timer = setTimeout(() => notify.current?.(), 100);
    return () => clearTimeout(timer);
  }, [selection, controls.transform]);
}
