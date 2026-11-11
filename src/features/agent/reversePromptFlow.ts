import { z } from "zod";
import type { CanvasCollectionItem } from "../../domain/canvasItems.ts";
import type { CreationProject } from "../creation/index.ts";
import { captionImage } from "../capabilities/index.ts";
import { waitForCreationTask } from "../creation/index.ts";

export const reversePromptFlowInputSchema = z.object({
  imageNodeId: z.string().optional(),
  attachmentId: z.string().optional(),
  prompt: z.string().optional(),
  autoRun: z.boolean().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  model: z.string().optional(),
  size: z.string().optional(),
  quality: z.string().optional(),
  count: z.number().optional(),
  seconds: z.string().optional(),
});

export type ReversePromptFlowInput = z.infer<
  typeof reversePromptFlowInputSchema
>;

export const getResultInputSchema = z.object({
  nodeId: z.string(),
  wait: z.boolean().optional(),
});

export type GetResultInput = z.infer<typeof getResultInputSchema>;

export interface ReversePromptFlowResult {
  ok: boolean;
  imageNodeId: string;
  textNodeId: string;
  configNodeId: string;
  prompt: string;
  connections: Array<{ fromNodeId: string; toNodeId: string }>;
  autoRun: boolean;
  taskId?: string;
}

export interface GetResultResponse {
  ok: boolean;
  nodeId: string;
  status: string;
  ready: boolean;
  result?: CanvasCollectionItem["result"];
  preview?: string;
  assetId?: string;
  error?: string;
  task?: {
    id: string;
    status: string;
    error?: string;
  };
}

export interface ReversePromptFlowOptions {
  generate?: (
    node: CanvasCollectionItem,
    prompt: string,
    signal?: AbortSignal,
    validate?: () => string | undefined,
  ) => Promise<{ taskId?: string; error?: string }>;
  signal?: AbortSignal;
  modelAllowlist?: string[] | (() => string[] | undefined);
}

/**
 * 校验并执行反推提示词流程搭建：
 * 1. 严格校验 imageNodeId / attachmentId，若指定图片节点不存在立即报错，绝不留下半截节点。
 * 2. 基于原图通过 vision.caption 能力得出反推提示词。
 * 3. 创建反推文本节点与生图配置节点，建立两条连线：原图 → 反推文本 → 生图节点。
 * 4. 若 autoRun 为 true，自动提交生成。
 */
export async function executeReversePromptFlowCore(
  project: CreationProject,
  rawInput: unknown,
  options?: ReversePromptFlowOptions,
): Promise<{ nextProject: CreationProject; result: ReversePromptFlowResult }> {
  const parsed = reversePromptFlowInputSchema.parse(rawInput ?? {});

  if (!parsed.imageNodeId && !parsed.attachmentId) {
    throw new Error("必须提供 imageNodeId 或 attachmentId");
  }

  let sourceImageNodeId = "";
  let newImageItem: CanvasCollectionItem | undefined;

  if (parsed.imageNodeId) {
    const existing = project.items.find((item) => item.id === parsed.imageNodeId);
    if (!existing) {
      throw new Error(`图片节点不存在：${parsed.imageNodeId}`);
    }
    sourceImageNodeId = existing.id;
  } else if (parsed.attachmentId) {
    const existing = project.items.find(
      (item) =>
        item.assetId === parsed.attachmentId ||
        item.id === parsed.attachmentId ||
        item.plugin?.metadata?.attachmentId === parsed.attachmentId,
    );
    if (existing) {
      sourceImageNodeId = existing.id;
    } else {
      const generatedId = `image-${crypto.randomUUID()}`;
      newImageItem = {
        id: generatedId,
        kind: "image",
        title: parsed.attachmentId,
        assetId: parsed.attachmentId,
        description: "附件图片",
        referenceOnly: true,
      };
      sourceImageNodeId = generatedId;
    }
  }

  const existingSource = project.items.find(
    (item) => item.id === sourceImageNodeId,
  );
  const caption = await captionImage({
    imageNodeId: sourceImageNodeId,
    attachmentId: parsed.attachmentId,
    prompt: parsed.prompt,
    title: existingSource?.title || newImageItem?.title,
    description: existingSource?.description || newImageItem?.description,
  });

  const textNodeId = `text-${crypto.randomUUID()}`;
  const configNodeId = `config-${crypto.randomUUID()}`;

  const currentPositions = project.canvas?.positions ?? {};
  const sourcePos = currentPositions[sourceImageNodeId] ?? { x: 0, y: 0 };
  const startX = parsed.x ?? sourcePos.x + 360;
  const startY = parsed.y ?? sourcePos.y;

  const textItem: CanvasCollectionItem = {
    id: textNodeId,
    kind: "text",
    title: "反推提示词",
    prompt: caption,
    description: caption,
    generationStatus: "ready",
    result: {
      id: `result-${textNodeId}`,
      kind: "text",
      title: "反推提示词",
      description: caption,
      text: caption,
      source: "provider",
    },
  };

  const configItem: CanvasCollectionItem = {
    id: configNodeId,
    kind: "image",
    title: "图片生成",
    description: caption,
    prompt: `@[node:${textNodeId}]`,
    model: parsed.model,
    generationStatus: parsed.autoRun ? "pending" : undefined,
    parameters: {
      ratio: parsed.size || "1:1",
      quality: parsed.quality || "standard",
      count: String(parsed.count || 1),
      duration: parsed.seconds || "5",
      soundEnabled: false,
    },
  };

  const nextPositions = { ...currentPositions };
  if (newImageItem) {
    nextPositions[newImageItem.id] = {
      x: parsed.x ?? 0,
      y: parsed.y ?? 0,
    };
  }
  nextPositions[textNodeId] = { x: startX, y: startY };
  nextPositions[configNodeId] = { x: startX + 360, y: startY };

  const edge1 = {
    id: `edge-${crypto.randomUUID()}`,
    source: sourceImageNodeId,
    target: textNodeId,
  };
  const edge2 = {
    id: `edge-${crypto.randomUUID()}`,
    source: textNodeId,
    target: configNodeId,
  };

  const nextEdges = [...(project.canvas?.edges ?? []), edge1, edge2];
  const nextItems = [...project.items];
  if (newImageItem) nextItems.push(newImageItem);
  nextItems.push(textItem, configItem);

  const nextProject: CreationProject = {
    ...project,
    items: nextItems,
    canvas: {
      ...(project.canvas ?? {
        viewport: { x: 0, y: 0, scale: 1 },
        positions: {},
        edges: [],
      }),
      positions: nextPositions,
      edges: nextEdges,
    },
    updatedAt: Date.now(),
  };

  let taskId: string | undefined;
  if (parsed.autoRun && options?.generate) {
    const genResult = await options.generate(
      configItem,
      caption,
      options.signal,
    );
    if (genResult.error) {
      throw new Error(genResult.error);
    }
    taskId = genResult.taskId;
  }

  const result: ReversePromptFlowResult = {
    ok: true,
    imageNodeId: sourceImageNodeId,
    textNodeId,
    configNodeId,
    prompt: caption,
    connections: [
      { fromNodeId: sourceImageNodeId, toNodeId: textNodeId },
      { fromNodeId: textNodeId, toNodeId: configNodeId },
    ],
    autoRun: Boolean(parsed.autoRun),
    ...(taskId ? { taskId } : {}),
  };

  return { nextProject, result };
}

/**
 * 校验并读取生成节点的结果与状态（只读）。
 */
export async function executeGetResultCore(
  project: CreationProject,
  rawInput: unknown,
  options?: {
    signal?: AbortSignal;
    getProject?: () => CreationProject | undefined;
  },
): Promise<GetResultResponse> {
  const parsed = getResultInputSchema.parse(rawInput ?? {});

  const node = project.items.find((item) => item.id === parsed.nodeId);
  if (!node) {
    throw new Error(`画布节点不存在：${parsed.nodeId}`);
  }

  let task = project.tasks
    ?.slice()
    .reverse()
    .find((t) => t.sourceItemId === node.id);

  if (
    parsed.wait &&
    task &&
    (task.status === "queued" || task.status === "running") &&
    options?.getProject
  ) {
    try {
      task = await waitForCreationTask({
        getProject: options.getProject,
        taskId: task.id,
        signal: options.signal ?? new AbortController().signal,
        cancel: () => {},
        timeoutMs: 5000,
      });
    } catch {
      task =
        options
          .getProject()
          ?.tasks?.slice()
          .reverse()
          .find((t) => t.sourceItemId === node.id) ?? task;
    }
  }

  const latestProject = options?.getProject?.() ?? project;
  const latestNode =
    latestProject.items.find((item) => item.id === parsed.nodeId) ?? node;
  const status =
    latestNode.generationStatus ??
    task?.status ??
    (latestNode.result ? "ready" : "idle");
  const ready = status === "ready" || status === "succeeded";

  return {
    ok: true,
    nodeId: latestNode.id,
    status,
    ready,
    result: latestNode.result,
    preview: latestNode.preview,
    assetId: latestNode.assetId,
    error:
      task?.error ||
      (latestNode.generationStatus === "error"
        ? latestNode.description || "生成失败"
        : undefined),
    task: task
      ? {
          id: task.id,
          status: task.status,
          error: task.error,
        }
      : undefined,
  };
}
