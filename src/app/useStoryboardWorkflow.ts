import { useRef } from "react";
import { canScheduleConnection } from "../domain/providerConnections.ts";
import {
  runStoryboardPipeline,
  storyboardToCanvas,
} from "../features/workflows/index.ts";
import {
  readProviderConnections,
  waitForCreationTask,
  type CreationProject,
  type CreationSnapshot,
} from "../features/creation/index.ts";
import type {
  ContinuityConstraint,
  Storyboard,
} from "../domain/storyboardPipeline.ts";
import type { CanvasCollectionItem } from "../domain/canvasItems.ts";
import type { CanvasImageRequest } from "../runtime/canvasCommandRuntime.tsx";

export function useStoryboardWorkflow(options: {
  creationRef: { current: CreationSnapshot };
  updateProject: (
    id: string,
    update: (project: CreationProject) => CreationProject,
  ) => void;
  replaceCanvasItems: (items: CanvasCollectionItem[]) => unknown;
  submit: (
    request: { origin: "canvas"; input: CanvasImageRequest },
    onAccepted?: (taskId: string) => void,
  ) => Promise<string | undefined>;
  cancelTask: (id: string) => void;
  flush: () => Promise<void>;
  disabledReason?: string;
}) {
  const current = useRef(options);
  const origins = useRef(
    new WeakMap<
      Storyboard,
      { projectId: string; chatId?: string; namespace: string }
    >(),
  );
  current.current = options;
  const requireProject = (id?: string, chatId?: string) => {
    const o = current.current;
    if (o.disabledReason) throw new Error(o.disabledReason);
    const p = o.creationRef.current.projects.find(
      (p) => p.id === o.creationRef.current.activeProjectId,
    );
    if (
      !p ||
      (id && p.id !== id) ||
      (chatId !== undefined && p.activeChatId !== chatId)
    )
      throw new Error("项目或聊天已切换，请在原项目继续");
    return p;
  };
  return {
    async run(
      script: string,
      constraints: ContinuityConstraint[],
      signal: AbortSignal,
    ) {
      const project = requireProject(),
        chatId = project.activeChatId;
      const connection = readProviderConnections().find(
        (c) => canScheduleConnection(c, "text", "generate") && c.model,
      );
      if (!connection) throw new Error("请先在模型设置中配置文本模型");
      const model = connection.model!;
      const result = await runStoryboardPipeline({
        script,
        constraints,
        signal,
        assets: project.items
          .filter((item) => item.assetId)
          .map((item) => ({ id: item.assetId!, name: item.title })),
        generate: async (prompt, signal) => {
          requireProject(project.id, chatId);
          const node: CanvasCollectionItem = {
            id: `storyboard-source-${crypto.randomUUID()}`,
            kind: "text",
            title: "分镜编排请求",
            description: "小说 / 剧本转分镜",
            prompt,
            model,
            providerConnectionId: connection.id,
          };
          current.current.updateProject(project.id, (p) => ({
            ...p,
            items: [...p.items, node],
          }));
          await current.current.flush();
          signal.throwIfAborted();
          requireProject(project.id, chatId);
          let taskId = "";
          const error = await current.current.submit(
            {
              origin: "canvas",
              input: {
                sourceItemId: node.id,
                prompt,
                model,
                providerConnectionId: connection.id,
                count: 1,
                signal,
              },
            },
            (id) => {
              taskId = id;
            },
          );
          if (error || !taskId) throw new Error(error ?? "模型任务未受理");
          const task = await waitForCreationTask({
            getProject: () => {
              try {
                return requireProject(project.id, chatId);
              } catch {
                return undefined;
              }
            },
            taskId,
            signal,
            cancel: current.current.cancelTask,
          });
          await current.current.flush();
          const text = task.outputs?.find(
            (o) => o.status === "succeeded",
          )?.text;
          if (!text) throw new Error("模型任务没有返回文本结果");
          return text;
        },
      });
      origins.current.set(result.storyboard, {
        projectId: project.id,
        chatId,
        namespace: crypto.randomUUID(),
      });
      return result;
    },
    async apply(storyboard: Storyboard) {
      const origin = origins.current.get(storyboard);
      if (!origin) throw new Error("分镜来源已失效，请重新打开原项目生成");
      const project = requireProject(origin.projectId, origin.chatId);
      if (project.activeChatId !== origin.chatId)
        throw new Error("聊天已切换，请在原聊天继续");
      const additions = storyboardToCanvas(storyboard, origin.namespace);
      const existing = additions.items.filter((item) =>
        project.items.some((i) => i.id === item.id),
      );
      if (existing.length === additions.items.length) {
        await current.current.flush();
        return;
      }
      if (existing.length) throw new Error("部分分镜已存在，请先在画布核对");
      current.current.updateProject(project.id, (p) => ({
        ...p,
        items: [...p.items, ...additions.items],
        canvas: {
          ...p.canvas,
          positions: { ...p.canvas.positions, ...additions.canvas.positions },
          edges: [...p.canvas.edges, ...additions.canvas.edges],
        },
        updatedAt: Date.now(),
      }));
      current.current.replaceCanvasItems(
        current.current.creationRef.current.projects.find(
          (p) => p.id === project.id,
        )!.items,
      );
      await current.current.flush();
    },
  };
}
