import { useMemo } from "react";
import { useApplication } from "../application/AppProvider.tsx";
import { getProposalWorkflows } from "../application/proposalWorkflows.ts";
export function useProposals() {
  const { app } = useApplication();
  return useMemo(() => getProposalWorkflows(app), [app]);
}
