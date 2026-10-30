import {
  capabilityManifestSchema,
  capabilityTaskReferenceSchema,
} from "../../../packages/creation-contracts/index.ts";
import {
  CapabilityRegistryError,
  type CapabilityExecutor,
} from "./capabilityRegistry.ts";

export const inpaintCapabilityManifest = capabilityManifestSchema.parse({
  id: "image.inpaint",
  version: "1.0.0",
  title: "局部重绘",
  kind: "builtin",
  input: "image.inpaint.task-reference",
  output: "creation.task-id",
  requires: { permissions: ["ai:generate", "asset:read", "asset:write"] },
  adapters: [
    {
      id: "image.inpaint/provider-api",
      kind: "provider-api",
      priority: 0,
      compat: "^1.1.0",
    },
    {
      id: "image.inpaint/comfyui",
      kind: "comfyui",
      priority: 0,
      compat: "^1.1.0",
    },
  ],
  task: { progress: true, cancellable: true, resumable: false },
  lineage: {
    inputRoles: ["base", "mask", "reference"],
    relation: "derivedFrom",
  },
  platforms: ["desktop", "web"],
  degrade: "需要现有图片编辑模型、归档原件和有效蒙版。",
  card: "docs/features/feat-035-image-mask-editing.md",
});

export const executeInpaintCapability: CapabilityExecutor = async (
  input,
  context,
) => {
  const reference = capabilityTaskReferenceSchema.parse(input);
  const task = context.preparedTask;
  if (
    !task ||
    reference.projectId !== context.projectId ||
    reference.taskId !== task.id ||
    task.kind !== "image" ||
    !task.imageEdit ||
    task.status !== "queued" ||
    task.submissionState !== "intent"
  )
    throw new CapabilityRegistryError(
      "invalid_task_reference",
      "局部重绘任务引用不匹配，未提交。",
    );
  const submitted = await context.tasks.submit(reference.projectId, task);
  if (submitted.id !== task.id)
    throw new CapabilityRegistryError(
      "invalid_task_identity",
      "局部重绘任务身份已变化。",
    );
  return submitted.id;
};
