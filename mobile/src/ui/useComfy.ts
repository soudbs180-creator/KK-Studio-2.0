import { useMemo } from "react";
import { useApplication } from "../application/AppProvider.tsx";
import { getComfyWorkflows } from "../application/comfyWorkflows.ts";
export function useComfy() {
  const { app } = useApplication();
  return useMemo(() => getComfyWorkflows(app), [app]);
}
