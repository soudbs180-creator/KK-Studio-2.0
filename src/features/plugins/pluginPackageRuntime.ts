import { createElement, useEffect, useRef } from "react";
import type { CapabilityPermission } from "../../../packages/creation-contracts/index.ts";
import type { CanvasPlugin, PluginNodeContentProps } from "./pluginTypes.ts";
import type { VerifiedPluginPackage } from "./pluginPackage.ts";
import {
  createPluginPermissionPort,
  createRestrictedPluginContext,
} from "./pluginPermissions.ts";
import { mountPluginSandbox } from "./pluginSandbox.ts";

/** Experimental Web T1 only. Production loading remains disabled pending review. */
export function createPackagePlugin(
  pkg: VerifiedPluginPackage,
  options: {
    enabled: boolean;
    platform: "web" | "desktop";
    grants: readonly CapabilityPermission[];
    active: () => boolean;
  },
): CanvasPlugin {
  const { manifest, files } = pkg;
  if (!options.enabled)
    throw new Error("插件沙箱仍在验证中，当前未执行插件代码。");
  if (options.platform !== "web" || manifest.runtime !== "iframe")
    throw new Error("当前平台未提供该隔离运行时，插件未执行。");
  if (
    manifest.contributes.capabilities.length ||
    manifest.contributes.adapters.length ||
    manifest.contributes.skills.length
  )
    throw new Error("当前包运行时只接受节点贡献，其他贡献尚未接线。");
  const permissions = createPluginPermissionPort(
    manifest,
    options.grants,
    options.active,
  );
  function Content({ ctx }: PluginNodeContentProps) {
    const ref = useRef<HTMLIFrameElement>(null);
    const context = useRef(ctx);
    context.current = ctx;
    useEffect(() => {
      if (!ref.current) return;
      return mountPluginSandbox(
        ref.current,
        files[manifest.entry!],
        () =>
          createRestrictedPluginContext(
            context.current,
            manifest.id,
            permissions,
          ),
        options.active,
      );
    }, []);
    return createElement("iframe", {
      ref,
      title: manifest.name,
      sandbox: "allow-scripts",
      allow:
        "camera 'none'; microphone 'none'; geolocation 'none'; clipboard-read 'none'; clipboard-write 'none'; display-capture 'none'; usb 'none'; payment 'none'",
      style: { width: "100%", height: "100%", border: 0 },
    });
  }
  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    nodes: manifest.contributes.nodes.map((node) => ({
      type: node.type,
      title: node.title,
      icon: null,
      defaultSize: { width: node.width, height: node.height },
      Content,
    })),
  };
}
