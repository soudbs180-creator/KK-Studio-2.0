import { z } from "zod";
import {
  comfyApiWorkflowSchema,
  type WorkflowRecord,
} from "../../domain/comfyWorkflow.ts";
import {
  validateExecutableWorkflow,
  assertSafeWorkflowPayload,
} from "./queueWorkflow.ts";
const snapshotSchema = z.object({
  workflow: comfyApiWorkflowSchema,
  editorWorkflow: z.record(z.string(), z.unknown()),
});
export function readEditorSnapshot(
  value: unknown,
  record: WorkflowRecord,
): WorkflowRecord {
  assertSafeWorkflowPayload(value, 1024 * 1024);
  const snapshot = snapshotSchema.parse(value);
  const next = {
    ...record,
    ...snapshot,
    needsConversion: false,
    updatedAt: Date.now(),
  };
  validateExecutableWorkflow(next);
  return next;
}
