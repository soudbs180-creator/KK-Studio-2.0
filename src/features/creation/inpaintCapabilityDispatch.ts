import { isTauri } from "@tauri-apps/api/core";
import {
  capabilityTaskReferenceSchema,
  capabilityTaskIdSchema,
  type CreationTask,
} from "../../../packages/creation-contracts/index.ts";
import {
  CapabilityRegistry,
  inpaintCapabilityManifest,
  executeInpaintCapability,
  type CapabilityExecutionContext,
  type CapabilityParser,
} from "../capabilities/index.ts";

const registry = new CapabilityRegistry(
  new Map<string, CapabilityParser>([
    ["image.inpaint.task-reference", capabilityTaskReferenceSchema],
    ["creation.task-id", capabilityTaskIdSchema],
  ]),
);
registry.register(inpaintCapabilityManifest, executeInpaintCapability);

/** Bind the actual prepared task; JSON is never authority to replace its payload. */
export async function dispatchInpaintCapability(options: {
  projectId: string;
  task: CreationTask;
  adapter: "provider-api" | "comfyui";
  platform?: "desktop" | "web";
  submit: () => Promise<string | undefined>;
  onDispatch?: CapabilityExecutionContext["onDispatch"];
}): Promise<string> {
  return registry.run(
    "image.inpaint",
    { projectId: options.projectId, taskId: options.task.id },
    {
      projectId: options.projectId,
      preparedTask: options.task,
      platform: options.platform ?? (isTauri() ? "desktop" : "web"),
      modelTraits: [],
      resources: [],
      availableAdapters: [`image.inpaint/${options.adapter}`],
      permissions: ["ai:generate", "asset:read", "asset:write"],
      onDispatch:
        options.onDispatch ??
        (() => globalThis.performance?.mark("kk:capability:image.inpaint")),
      tasks: {
        submit: async (projectId, task) => {
          if (projectId !== options.projectId || task !== options.task)
            throw new Error("局部重绘任务已变化，未提交。");
          const reason = await options.submit();
          if (reason) throw new Error(reason);
          return task;
        },
      },
    },
  );
}
