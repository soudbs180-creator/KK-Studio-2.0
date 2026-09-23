/**
 * 插件节点定义注册表：插件激活时登记其节点类型，宿主据此渲染/列入创建菜单。
 */

import type { PluginNodeDefinition } from "./pluginTypes.ts";

interface RegisteredNode {
  pluginId: string;
  definition: PluginNodeDefinition;
}

const registry = new Map<string, RegisteredNode>();

export function registerPluginNodes(
  pluginId: string,
  nodes: PluginNodeDefinition[],
): void {
  for (const definition of nodes) {
    if (!definition.type || !definition.Content) continue;
    registry.set(definition.type, { pluginId, definition });
  }
}

export function unregisterPluginNodes(pluginId: string): void {
  for (const [type, entry] of registry) {
    if (entry.pluginId === pluginId) registry.delete(type);
  }
}

export function getPluginNodeDefinition(
  type: string,
): PluginNodeDefinition | null {
  return registry.get(type)?.definition ?? null;
}

export function listPluginNodeDefinitions(): Array<{
  pluginId: string;
  definition: PluginNodeDefinition;
}> {
  return [...registry.values()].map((entry) => entry);
}

export function hasPluginNodeType(type: string): boolean {
  return registry.has(type);
}
