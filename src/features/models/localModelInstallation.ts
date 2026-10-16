import { invoke, isTauri } from "@tauri-apps/api/core";
import {
  localDirectoryGrantSchema,
  localInstallPlanSchema,
  localInstallSelectionSchema,
  localInstallStatusSchema,
  localRuntimeStatusSchema,
  localInstallationSummarySchema,
  localModelInspectionSchema,
  type LocalInstallSelection,
} from "../../domain/localModelInstallation.ts";

type Invoke = (
  command: string,
  args?: Record<string, unknown>,
) => Promise<unknown>;
/** Calls are explicit user actions; this bridge never probes, downloads or starts on import. */
export function createLocalModelInstallationBridge(
  call: Invoke,
  desktop: () => boolean,
) {
  const request = (command: string, args?: Record<string, unknown>) => {
    if (!desktop())
      throw new Error("本地模型安装需要桌面版；网页授权服务尚未接通。");
    return call(command, args);
  };
  const identity = (value: string) =>
    localDirectoryGrantSchema.shape.grantId.parse(value);
  return {
    async chooseDirectory() {
      const result = await request("local_model_choose_directory");
      return result === null ? null : localDirectoryGrantSchema.parse(result);
    },
    async prepare(grantId: string, selection: LocalInstallSelection) {
      return localInstallPlanSchema.parse(
        await request("local_model_prepare_install", {
          grantId: identity(grantId),
          selection: localInstallSelectionSchema.parse(selection),
        }),
      );
    },
    async install(operationId: string) {
      return localInstallStatusSchema.parse(
        await request("local_model_install", {
          operationId: identity(operationId),
        }),
      );
    },
    async cancel(operationId: string) {
      return localInstallStatusSchema.parse(
        await request("local_model_cancel", {
          operationId: identity(operationId),
        }),
      );
    },
    async status(operationId: string) {
      return localInstallStatusSchema.parse(
        await request("local_model_status", {
          operationId: identity(operationId),
        }),
      );
    },
    async current() {
      const result = await request("local_model_current");
      return result === null ? null : localInstallStatusSchema.parse(result);
    },
    async listInstalled() {
      const result = await request("local_model_list_installed");
      if (!Array.isArray(result) || result.length > 256)
        throw new Error("本地模型安装记录无效。");
      return result.map((value) => localInstallationSummarySchema.parse(value));
    },
    async inspect(installationId: string) {
      return localModelInspectionSchema.parse(
        await request("local_model_inspect", {
          installationId: identity(installationId),
        }),
      );
    },
    async associate(grantId: string, packageId: string) {
      localInstallSelectionSchema.parse({
        packageIds: [packageId],
        runtimeBackend: "cpu",
      });
      return localModelInspectionSchema.parse(
        await request("local_model_associate", {
          grantId: identity(grantId),
          packageId,
        }),
      );
    },
    async runtimeStatus() {
      const result = await request("local_model_runtime_status");
      return result === null ? null : localRuntimeStatusSchema.parse(result);
    },
    async start(installationId: string) {
      return localRuntimeStatusSchema.parse(
        await request("local_model_start", {
          installationId: identity(installationId),
        }),
      );
    },
    async stop(instanceId: string) {
      return localRuntimeStatusSchema.parse(
        await request("local_model_stop", { instanceId: identity(instanceId) }),
      );
    },
  };
}
export const localModelInstallation = createLocalModelInstallationBridge(
  invoke,
  isTauri,
);
