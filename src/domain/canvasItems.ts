import type { CanvasReference } from "../../packages/creation-contracts/index.ts";
import type { ImageEditContext, MaskDocument } from "./imageEdit.ts";
import type { ModelSelection } from "./modelSelection.ts";
import type { ComfyWorkflowCardState } from "./comfyWorkflow.ts";
export type { CanvasReference } from "../../packages/creation-contracts/index.ts";
export type CanvasItemKind = "image" | "video" | "audio" | "text";

export function comfyOutputSourceId(
  item: CanvasCollectionItem,
): string | undefined {
  if (!/^comfy-output-[a-f0-9]{24}$/.test(item.id)) return;
  const source =
    typeof item.comfyWorkflowSourceId === "string"
      ? item.comfyWorkflowSourceId
      : typeof item.description === "string" &&
          item.description.startsWith("ComfyUI · ")
        ? item.description.slice("ComfyUI · ".length)
        : undefined;
  return source && source.length <= 160 ? source : undefined;
}

export function removeCanvasItems(
  items: CanvasCollectionItem[],
  removedIds: Iterable<string>,
): CanvasCollectionItem[] {
  const ids = new Set(removedIds);
  const outputs = items.filter(
    (item) => ids.has(item.id) && /^comfy-output-[a-f0-9]{24}$/.test(item.id),
  );
  return items
    .filter((item) => !ids.has(item.id))
    .map((item) => {
      if (!item.comfyWorkflow) return item;
      const dismissed = outputs
        .filter((output) => comfyOutputSourceId(output) === item.id)
        .map((output) => output.id);
      return dismissed.length
        ? {
            ...item,
            comfyWorkflow: {
              ...item.comfyWorkflow,
              dismissedOutputIds: [
                ...new Set([
                  ...(item.comfyWorkflow.dismissedOutputIds ?? []),
                  ...dismissed,
                ]),
              ],
            },
          }
        : item;
    });
}

/** Stable semantic roles shared by upload, preview and canvas connections. */
export const CANVAS_REFERENCE_SLOTS = [
  "主体",
  "风格",
  "材质",
  "构图",
  "Mask",
] as const;
export type CanvasReferenceSlot = (typeof CANVAS_REFERENCE_SLOTS)[number];

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
  model?: string;
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
  comfyWorkflow?: ComfyWorkflowCardState;
  comfyWorkflowSourceId?: string;
  /** Monotonic revision number for concurrency control and EventBus synchronization */
  node_rev?: number;
  imageEditDraft?: MaskDocument;
  imageEditContext?: ImageEditContext;
  imageEditPrompt?: string;
  imageEditReferenceIds?: string[];
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
  tags?: string[];
  parentAssetId?: string;
  preview?: string;
  /** Natural media dimensions used to keep image cards proportional. */
  mediaWidth?: number;
  mediaHeight?: number;
  updatedAt?: number;
  result?: DemoResult;
  /** A generated image keeps its editor when it is used as a reference. */
  referenceMode?: boolean;
  /** Upload-only reference cards intentionally have no prompt editor. */
  referenceOnly?: boolean;
  referenceSlot?: CanvasReferenceSlot;
  referenceFrame?: "first" | "last";
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
      maxReferences: 2,
      label: "首帧与尾帧各 1 张参考图",
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

export interface NodeEditingProps {
  selected: boolean;
  /** Transient rendered-content state; never persisted in the project. */
  hasContent?: boolean;
  onContentReadyChange?: (ready: boolean) => void;
  generationActive?: boolean;
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
  onSwapReferenceFrames?: (firstId: string, lastId: string) => void;
}

export const BASE_CANVAS_ITEMS: CanvasCollectionItem[] = [
  {
    id: "image",
    title: "图片创建卡片",
    description: "kk Image 2 · 1:1 · 1K",
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
