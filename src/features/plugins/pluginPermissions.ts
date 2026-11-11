import type {
  CapabilityPermission,
  PermissionPort,
  PluginManifest,
} from "../../../packages/creation-contracts/index.ts";
import type { PluginNodeContext } from "./pluginTypes.ts";
import { createLogger } from "../../runtime/logger.ts";

const audit = createLogger("plugin-permissions");

export class PluginPermissionError extends Error {
  readonly code = "PERMISSION_DENIED";
  constructor(reason: string) {
    super(reason);
    this.name = "PluginPermissionError";
  }
}

export function createPluginPermissionPort(
  manifest: PluginManifest,
  grants: readonly CapabilityPermission[],
  active: () => boolean,
): PermissionPort {
  const subjectId = manifest.id;
  const declared = new Set(manifest.permissions);
  const granted = new Set(grants);
  return {
    check(request) {
      if (request.subjectId !== subjectId || !active())
        return { allowed: false, reason: "插件身份无效或已停用。" };
      if (!declared.has(request.permission) || !granted.has(request.permission))
        return {
          allowed: false,
          reason: `插件未获授权：${request.permission}`,
        };
      return { allowed: true };
    },
  };
}

export function createRestrictedPluginContext(
  context: PluginNodeContext,
  subjectId: string,
  permissions: PermissionPort,
): PluginNodeContext {
  function guard<A extends unknown[], R>(
    permission: CapabilityPermission,
    fn: (...args: A) => R,
  ) {
    return (...args: A): R => {
      const decision = permissions.check({ subjectId, permission });
      if (!decision.allowed) {
        audit.warn("插件调用被拒绝", { subjectId, permission });
        throw new PluginPermissionError(decision.reason);
      }
      return fn(...args);
    };
  }
  return {
    ...context,
    updateMetadata: guard("canvas:write", context.updateMetadata),
    updateNode: guard("canvas:write", context.updateNode),
    getNode: guard("canvas:read", context.getNode),
    getNodes: guard("canvas:read", context.getNodes),
    getConnections: guard("canvas:read", context.getConnections),
    getUpstream: guard("canvas:read", context.getUpstream),
    getDownstream: guard("canvas:read", context.getDownstream),
    applyOps: guard("canvas:write", context.applyOps),
    emit: (event, payload) => context.emit(`${subjectId}:${event}`, payload),
    on: (event, handler) => context.on(`${subjectId}:${event}`, handler),
    ai: {
      generateImage: guard("ai:generate", context.ai.generateImage),
      generateVideo: guard("ai:generate", context.ai.generateVideo),
      generateText: guard("ai:generate", context.ai.generateText),
    },
    storage: {
      get<T>(key: string) {
        return guard("storage:own", () => context.storage.get<T>(key))();
      },
      set: guard("storage:own", context.storage.set.bind(context.storage)),
      remove: guard(
        "storage:own",
        context.storage.remove.bind(context.storage),
      ),
    },
  };
}
