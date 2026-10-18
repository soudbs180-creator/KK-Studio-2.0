/**
 * 插件节点定义注册表：插件激活时登记其节点类型，宿主据此渲染/列入创建菜单。
 */

import type { PluginNodeDefinition } from "./pluginTypes.ts";

interface RegisteredNode {
  pluginId: string;
  definition: PluginNodeDefinition;
}

const registry = new Map<string, RegisteredNode>();
const listeners = new Set<() => void>();
let revision = 0;

export function subscribePluginNodes(listener: () => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function getPluginNodesRevision(): number {
  return revision;
}

function notify(): void {
  revision += 1;
  listeners.forEach((listener) => listener());
}

export function registerPluginNodes(
  pluginId: string,
  nodes: PluginNodeDefinition[],
): void {
  let changed = false;
  for (const definition of nodes) {
    if (!definition.type || !definition.Content) continue;
    const current = registry.get(definition.type);
    if (current?.pluginId === pluginId && current.definition === definition)
      continue;
    registry.set(definition.type, { pluginId, definition });
    changed = true;
  }
  if (changed) notify();
}

export function unregisterPluginNodes(pluginId: string): void {
  let changed = false;
  for (const [type, entry] of registry) {
    if (entry.pluginId === pluginId) {
      registry.delete(type);
      changed = true;
    }
  }
  if (changed) notify();
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
