import {
  capabilityTaskReferenceSchema,
  imageCapabilitySchema,
} from "../../../packages/creation-contracts/index.ts";
import {
  CapabilityRegistryError,
  type CapabilityExecutor,
} from "./capabilityRegistry.ts";

/** Host task identity and operation are authority, not JSON sent by a caller. */
export function imageTaskCapability(
  id: string,
  version: string,
): CapabilityExecutor {
  return async (input, context, adapter) => {
    const ref = capabilityTaskReferenceSchema.parse(input);
    const task = context.preparedTask;
    const spec = imageCapabilitySchema.safeParse(task?.imageCapability);
    if (
      !task ||
      !spec.success ||
      task.kind !== "image" ||
      task.status !== "queued" ||
      task.submissionState !== "intent" ||
      task.id !== ref.taskId ||
      context.projectId !== ref.projectId ||
      spec.data.capabilityId !== id ||
      spec.data.version !== version ||
      adapter.id !== `${id}/${spec.data.adapter}`
    )
      throw new CapabilityRegistryError(
        "invalid_task_reference",
        "能力任务或版本引用不匹配，未提交。",
      );
    const submitted = await context.tasks.submit(ref.projectId, task);
    if (submitted.id !== task.id)
      throw new CapabilityRegistryError(
        "invalid_task_identity",
        "能力任务身份发生变化。",
      );
    return task.id;
  };
}
