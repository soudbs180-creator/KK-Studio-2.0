import { useRef, useState } from "react";
import {
  readLocalWorkflows,
  writeLocalWorkflows,
  type WorkflowRecord,
} from "./workflowRegistry";

/** Publish the list only after persistence accepts the same records. */
export function useLocalWorkflows() {
  const [records, setRecords] = useState(readLocalWorkflows);
  const latest = useRef(records);
  function commit(next: WorkflowRecord[]): void {
    writeLocalWorkflows(next);
    latest.current = next;
    setRecords(next);
  }
  return {
    records,
    onSave: (workflow: WorkflowRecord) =>
      commit([
        workflow,
        ...latest.current.filter((item) => item.id !== workflow.id),
      ]),
    onDelete: (workflow: WorkflowRecord) =>
      commit(latest.current.filter((item) => item.id !== workflow.id)),
  };
}
