import {
  createImageCapabilityRegistry,
  type CapabilityExecutionContext,
} from "../capabilities/index.ts";
import type {
  CreationTask,
  ImageCapabilityId,
} from "../../../packages/creation-contracts/index.ts";

export async function dispatchImageCapability(options: {
  projectId: string;
  task: CreationTask;
  submit: () => Promise<string | undefined>;
  registry?: ReturnType<typeof createImageCapabilityRegistry>;
  enabled?: Partial<Record<ImageCapabilityId, boolean>>;
  onDispatch?: CapabilityExecutionContext["onDispatch"];
}) {
  const spec = options.task.imageCapability;
  if (!spec) throw new Error("能力任务缺少声明，未提交。");
  const registry =
    options.registry ?? createImageCapabilityRegistry(options.enabled);
  return registry.run(
    spec.capabilityId,
    { projectId: options.projectId, taskId: options.task.id },
    {
      projectId: options.projectId,
      preparedTask: options.task,
      platform: "web",
      versionRange: spec.version,
      availableAdapters: [`${spec.capabilityId}/${spec.adapter}`],
      modelTraits: [],
      resources: [],
      permissions: ["ai:generate", "asset:read", "asset:write"],
      onDispatch: options.onDispatch,
      tasks: {
        async submit(projectId, task) {
          if (projectId !== options.projectId || task !== options.task)
            throw new Error("能力任务已变化，未提交。");
          const error = await options.submit();
          if (error) throw new Error(error);
          return task;
        },
      },
    },
  );
}
