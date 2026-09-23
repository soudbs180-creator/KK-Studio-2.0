/**
 * 本地插件公共契约（自包含类型）。
 *
 * 真源：vendor/canvas-plugins/sdk/src/types.ts（上游公开契约的镜像子集）。
 * 本文件只保留本项目渲染层实际使用的字段，宿主能力（ai 生成等）保持兼容签名。
 */

import type { ComponentType, ReactNode } from "react";

export type PluginPosition = { x: number; y: number };

/** 插件节点元数据：扁平字段袋，内容惯例写入 content。 */
export type PluginNodeMetadata = Record<string, unknown> & {
  content?: string;
};

export interface PluginNodeData {
  id: string;
  type: string;
  title: string;
  position: PluginPosition;
  width: number;
  height: number;
  metadata?: PluginNodeMetadata;
}

export interface PluginConnection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
}

/** 主题令牌：插件 UI 跟随宿主明暗主题。 */
export interface PluginTheme {
  canvas: {
    background: string;
    dot: string;
    line: string;
    selectionStroke: string;
    selectionFill: string;
  };
  node: {
    label: string;
    fill: string;
    panel: string;
    stroke: string;
    activeStroke: string;
    placeholder: string;
    text: string;
    muted: string;
    faint: string;
  };
  toolbar: {
    panel: string;
    border: string;
    item: string;
    itemHover: string;
    activeBg: string;
    activeText: string;
  };
}

/** 与 Agent 同级的画布操作指令（复用 agentTypes.CanvasAgentOp）。 */
export type { CanvasAgentOp as PluginAgentOp } from "../agent/agentTypes.ts";

export interface PluginStorage {
  get: <T = unknown>(key: string) => Promise<T | null>;
  set: (key: string, value: unknown) => Promise<void>;
  remove: (key: string) => Promise<void>;
}

export interface PluginNodeContext {
  node: PluginNodeData;
  theme: PluginTheme;
  scale: number;
  isSelected: boolean;
  updateMetadata: (patch: PluginNodeMetadata) => void;
  updateNode: (
    patch: Partial<Pick<PluginNodeData, "title" | "width" | "height">>,
  ) => void;
  getNode: (id: string) => PluginNodeData | null;
  getNodes: () => PluginNodeData[];
  getConnections: () => PluginConnection[];
  getUpstream: () => PluginNodeData[];
  getDownstream: () => PluginNodeData[];
  applyOps: (ops: import("../agent/agentTypes.ts").CanvasAgentOp[]) => void;
  emit: (event: string, payload?: unknown) => void;
  on: (event: string, handler: (payload: unknown) => void) => () => void;
  /** 宿主生成能力（模型/密钥由宿主注入）。 */
  ai: PluginAi;
  openPanel: () => void;
  closePanel: () => void;
  storage: PluginStorage;
}

export interface PluginAi {
  generateImage: (
    prompt: string,
    options?: { signal?: AbortSignal; references?: string[]; model?: string },
  ) => Promise<{ images: string[] }>;
  generateVideo: (
    prompt: string,
    options?: { signal?: AbortSignal; references?: string[]; model?: string },
  ) => Promise<{ url: string; mimeType: string }>;
  generateText: (
    prompt: string,
    options?: { signal?: AbortSignal; model?: string },
  ) => Promise<{ text: string }>;
}

export interface PluginNodeToolbarItem {
  id: string;
  title: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
}

export type PluginNodeContentProps = { ctx: PluginNodeContext };

export interface PluginNodeDefinition {
  type: string;
  title: string;
  icon: ReactNode;
  description?: string;
  defaultSize: { width: number; height: number };
  defaultMetadata?: PluginNodeMetadata;
  showInCreateMenu?: boolean;
  Content?: ComponentType<PluginNodeContentProps>;
  toolbar?: (ctx: PluginNodeContext) => PluginNodeToolbarItem[];
  onDoubleClick?: (ctx: PluginNodeContext) => boolean;
  resource?: (node: PluginNodeData) => {
    kind: "image" | "video" | "audio" | "text";
    text?: string;
    url?: string;
  } | null;
}

export interface PluginApp {
  version: string;
  emit: (event: string, payload?: unknown) => void;
  on: (event: string, handler: (payload: unknown) => void) => () => void;
  injectCSS: (css: string, key?: string) => () => void;
}

export type PluginRuntime = PluginApp & {
  React: typeof import("react");
  jsx: typeof import("react").createElement;
  Fragment: typeof import("react").Fragment;
};

export interface CanvasPlugin {
  id: string;
  name: string;
  version: string;
  description?: string;
  css?: string;
  nodes: PluginNodeDefinition[];
  setup?: (app: PluginApp) => void | (() => void);
}

export type CanvasPluginFactory = (runtime: PluginRuntime) => CanvasPlugin;

/** 已安装插件记录（持久化）。 */
export interface InstalledPlugin {
  id: string;
  name: string;
  version: string;
  description?: string;
  url: string;
  source: string;
  enabled: boolean;
  official?: boolean;
  local?: boolean;
}
