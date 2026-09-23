import type { ModelSelection } from "./modelSelection.ts";
export type CanvasItemKind = "image" | "video" | "audio" | "text";

export const CANVAS_KIND_LABELS: Record<CanvasItemKind, string> = {
  image: "图片",
  video: "视频",
  audio: "音频",
  text: "文案",
};

export interface DemoResult {
  id: string;
  kind: CanvasItemKind;
  title: string;
  src?: string;
  poster?: string;
  text?: string;
  description: string;
  source: "demo" | "provider";
}

/** 插件节点负载：宿主以 kind=text 承载，内容/尺寸在插件元数据中。 */
export interface PluginItemPayload {
  /** 插件节点类型，形如 "sticky-note:note"。 */
  type: string;
  version?: string;
  width?: number;
  height?: number;
  /** 插件自有元数据（内容惯例写入 content）。 */
  metadata?: Record<string, unknown> & { content?: string };
}

export interface CanvasCollectionItem {
  providerConnectionId?: string;
  generationSource?: "codex";
  parameters?: CanvasParameters;
  id: string;
  title: string;
  description: string;
  kind: CanvasItemKind;
  plugin?: PluginItemPayload;
  prompt?: string;
  /** Selected model id; capability metadata is local until a provider reports it. */
  model?: string;
  /** Stable local archive identity, never a provider temporary URL. */
  assetId?: string;
  parentAssetId?: string;
  preview?: string;
  updatedAt?: number;
  result?: DemoResult;
  /** A generated image keeps its editor when it is used as a reference. */
  referenceMode?: boolean;
  /** Upload-only reference cards intentionally have no prompt editor. */
  referenceOnly?: boolean;
  referenceSlot?: "主体" | "风格" | "材质" | "构图" | "Mask";
  /** A reserved result card is visible while the local demo is loading. */
  generationStatus?: "pending" | "ready" | "error";
  generationIndex?: number;
}

export interface CanvasParameters {
  imageSize?: string;
  ratio: string;
  quality: string;
  duration: string;
  count: string;
  soundEnabled: boolean;
}

export interface CanvasKindCapabilities {
  maxReferences: number;
  label: string;
}

export interface CanvasModelCapability extends CanvasKindCapabilities {
  id: string;
  name: string;
}

/**
 * Frontend capability metadata. Provider responses can replace these values
 * later; keeping them on the card makes link limits deterministic in the
 * current local demo.
 */
export const CANVAS_MODEL_CAPABILITIES: Record<
  "image" | "video",
  CanvasModelCapability[]
> = {
  image: [
    {
      id: "kk-image-2",
      name: "kk Image 2",
      maxReferences: 4,
      label: "最多 4 张参考图",
    },
    {
      id: "kk-image-2-pro",
      name: "kk Image 2 Pro",
      maxReferences: 8,
      label: "最多 8 张参考图",
    },
    {
      id: "kk-image-2-lite",
      name: "kk Image 2 Lite",
      maxReferences: 2,
      label: "最多 2 张参考图",
    },
    {
      id: "kk-image-1",
      name: "kk Image 1",
      maxReferences: 1,
      label: "最多 1 张参考图",
    },
  ],
  video: [
    {
      id: "minimax-h3",
      name: "MiniMax H3",
      maxReferences: 1,
      label: "最多 1 张参考图",
    },
  ],
};

export const CANVAS_KIND_CAPABILITIES: Record<
  CanvasItemKind,
  CanvasKindCapabilities
> = {
  image: CANVAS_MODEL_CAPABILITIES.image[0],
  video: CANVAS_MODEL_CAPABILITIES.video[0],
  audio: { maxReferences: 0, label: "音频节点不接收图片参考图" },
  text: { maxReferences: 0, label: "文案节点不接收图片参考图" },
};

export function maxReferenceCount(item: CanvasCollectionItem): number {
  if (item.kind !== "image" && item.kind !== "video") return 0;
  const models = CANVAS_MODEL_CAPABILITIES[item.kind];
  return (
    models.find((model) => model.id === item.model || model.name === item.model)
      ?.maxReferences ?? models[0].maxReferences
  );
}

export function modelCapabilities(
  kind: CanvasItemKind,
): CanvasModelCapability[] {
  return kind === "image" || kind === "video"
    ? CANVAS_MODEL_CAPABILITIES[kind]
    : [];
}

export interface CanvasReference {
  id?: string;
  assetId?: string;
  parentAssetId?: string;
  title: string;
  preview?: string;
  /** Semantic slot from the five-slot reference workflow. */
  slot?: "主体" | "风格" | "材质" | "构图" | "Mask";
}

export interface NodeEditingProps {
  selected: boolean;
  onConfigure: () => void;
  onChange: (patch: Partial<CanvasCollectionItem>) => void;
  liked: boolean;
  onToggleLike: () => void;
  onExtraHeightChange: (height: number) => void;
  onDemoResult?: (result: DemoResult) => void;
  onDemoResults?: (results: DemoResult[]) => void;
  onGenerationStart?: (count: number) => void;
  onGenerationState?: (
    phase: "loading" | "success" | "error" | "cancelled" | "offline",
  ) => void;
  model?: string;
  onModelChange?: (model: string, selection?: ModelSelection) => void;
  references?: CanvasReference[];
  referenceLimit?: number;
  onAddReferences?: (references: CanvasReference[]) => void;
  onRemoveReference?: (connectionId: string) => void;
}

export const BASE_CANVAS_ITEMS: CanvasCollectionItem[] = [
  {
    id: "image",
    title: "图片创建卡片",
    description: "kk Image 2 · 1:1 · 1k",
    kind: "image",
  },
  {
    id: "video1",
    title: "视频卡片 1",
    description: "图片转视频工作流",
    kind: "video",
  },
  {
    id: "video2",
    title: "视频卡片 2",
    description: "图片转视频工作流",
    kind: "video",
  },
];
