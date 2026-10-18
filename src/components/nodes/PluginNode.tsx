import { useRef, useSyncExternalStore, type ReactNode } from "react";
import CanvasCollectionToolbar from "../canvas/CanvasCollectionToolbar";
import type {
  CanvasCollectionItem,
  NodeEditingProps,
  PluginItemPayload,
} from "../../domain/canvasItems";
import {
  getPluginNodeDefinition,
  getPluginNodesRevision,
  subscribePluginNodes,
} from "../../features/plugins/nodeRegistry";
import { pluginLoader } from "../../features/plugins/pluginLoader";
import { readPluginTheme } from "../../features/plugins/pluginRuntime";
import type {
  PluginConnection,
  PluginNodeContext,
  PluginNodeData,
} from "../../features/plugins/pluginTypes";
import "../../styles/plugin-nodes.css";

function pluginStorage(pluginId: string) {
  const prefix = `canvas-plugin:${pluginId}:`;
  return {
    async get<T = unknown>(key: string): Promise<T | null> {
      const raw = localStorage.getItem(prefix + key);
      if (raw === null) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },
    async set(key: string, value: unknown): Promise<void> {
      localStorage.setItem(prefix + key, JSON.stringify(value));
    },
    async remove(key: string): Promise<void> {
      localStorage.removeItem(prefix + key);
    },
  };
}

export default function PluginNode({
  item,
  editing,
  scale,
  onDelete,
}: {
  item: CanvasCollectionItem & { plugin: PluginItemPayload };
  editing: NodeEditingProps;
  scale: number;
  onDelete: () => void;
}) {
  const anchor = useRef<HTMLDivElement>(null);
  useSyncExternalStore(subscribePluginNodes, getPluginNodesRevision);
  const toolbarProps = {
    item,
    anchor,
    selected: editing.selected,
    hasContent: Boolean(editing.hasContent),
    liked: editing.liked,
    onLike: editing.onToggleLike,
    onDelete,
  };
  const definition = getPluginNodeDefinition(item.plugin.type);
  if (!definition || !definition.Content) {
    return (
      <>
        <div
          ref={anchor}
          className="plugin-node plugin-node-missing"
          data-plugin-type={item.plugin.type}
        >
          <span>插件未加载：{item.plugin.type}</span>
          <span className="plugin-node-missing-hint">
            请到设置 → 插件中安装或启用该插件
          </span>
        </div>
        <CanvasCollectionToolbar {...toolbarProps} />
      </>
    );
  }
  const bridge = pluginLoader.getBridge();
  const snapshot = bridge?.getSnapshot() ?? null;
  const snapshotNode = snapshot?.nodes.find((node) => node.id === item.id);
  const nodeData: PluginNodeData = {
    id: item.id,
    type: item.plugin.type,
    title: item.title,
    position: snapshotNode?.position ?? { x: 0, y: 0 },
    width:
      snapshotNode?.width ?? item.plugin.width ?? definition.defaultSize.width,
    height:
      snapshotNode?.height ??
      item.plugin.height ??
      definition.defaultSize.height,
    metadata: item.plugin.metadata ?? definition.defaultMetadata ?? {},
  };
  const theme = readPluginTheme();

  const ctx: PluginNodeContext = {
    node: nodeData,
    theme,
    scale,
    isSelected: editing.selected,
    updateMetadata(patch) {
      editing.onChange({
        plugin: {
          ...item.plugin,
          metadata: { ...(item.plugin.metadata ?? {}), ...patch },
        },
      });
    },
    updateNode(patch) {
      editing.onChange({
        title: patch.title ?? item.title,
        plugin: {
          ...item.plugin,
          width: patch.width ?? item.plugin.width,
          height: patch.height ?? item.plugin.height,
        },
      });
    },
    getNode(id) {
      return snapshot?.nodes.find((node) => node.id === id) ?? null;
    },
    getNodes() {
      return snapshot?.nodes ?? [];
    },
    getConnections(): PluginConnection[] {
      return (snapshot?.connections ?? []).map((connection) => ({
        id: connection.id,
        fromNodeId: connection.fromNodeId,
        toNodeId: connection.toNodeId,
      }));
    },
    getUpstream() {
      const upstream = new Set<string>();
      for (const connection of snapshot?.connections ?? []) {
        if (connection.toNodeId === item.id)
          upstream.add(connection.fromNodeId);
      }
      return (snapshot?.nodes ?? []).filter((node) => upstream.has(node.id));
    },
    getDownstream() {
      const downstream = new Set<string>();
      for (const connection of snapshot?.connections ?? []) {
        if (connection.fromNodeId === item.id)
          downstream.add(connection.toNodeId);
      }
      return (snapshot?.nodes ?? []).filter((node) => downstream.has(node.id));
    },
    applyOps(ops) {
      bridge?.applyOps(ops);
    },
    emit(event, payload) {
      pluginLoader.getBus().emit(event, payload);
    },
    on(event, handler) {
      return pluginLoader.getBus().on(event, handler);
    },
    ai: pluginLoader.getAi(),
    openPanel() {
      // 本项目画布无节点下方面板系统（与上游差异）。
    },
    closePanel() {
      // 本项目画布无节点下方面板系统（与上游差异）。
    },
    storage: pluginStorage(item.plugin.type.split(":")[0] || "plugin"),
  };

  const toolbarItems = definition.toolbar?.(ctx) ?? [];
  const actions = toolbarItems.map((toolbarItem) => (
    <button
      key={toolbarItem.id}
      type="button"
      className="kk-button kk-button--tertiary"
      title={toolbarItem.title}
      aria-pressed={toolbarItem.active}
      onClick={(event) => {
        event.stopPropagation();
        toolbarItem.onClick();
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      {toolbarItem.icon as ReactNode}
      <span>{toolbarItem.label}</span>
    </button>
  ));
  return (
    <>
      <div
        ref={anchor}
        className="plugin-node"
        data-plugin-type={item.plugin.type}
        data-canvas-no-zoom
      >
        <div className="plugin-node-content">
          <definition.Content ctx={ctx} />
        </div>
        {!editing.hasContent && editing.selected && actions.length > 0 && (
          <div className="plugin-node-empty-actions">{actions}</div>
        )}
      </div>
      <CanvasCollectionToolbar {...toolbarProps}>
        {actions}
      </CanvasCollectionToolbar>
    </>
  );
}
