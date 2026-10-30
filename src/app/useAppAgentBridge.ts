import React, { useEffect, useMemo, useRef } from "react";
import type { AgentCanvasBinding } from "../components/canvas/useAgentCanvasView";
import { type CanvasCollectionItem } from "../domain/canvasItems";
import {
  agentConnection,
  configureAgentProxy,
  createAgentHost,
  createStageOrchestrator,
  desktopAgentLifecycle,
  googleAgentConnection,
  type AgentBridge,
  type StageOrchestrator,
} from "../features/agent/index.ts";
import {
  readProviderConnections,
  snapshotWriteBlockReason,
  useCreationStorage,
  useImageCommandSubmission,
  type CreationProject,
} from "../features/creation/index.ts";
import type { PluginAi } from "../features/plugins/index.ts";
import {
  injectPluginCss,
  pluginLoader,
  setPluginRuntime,
} from "../features/plugins/index.ts";
import { appVersion } from "../runtime/appInfo";
import { type AppTaskCoordinationParams } from "./taskPorts.ts";

interface AppAgentBridgeParams extends Pick<
  AppTaskCoordinationParams,
  "creationRef" | "updateProject" | "replaceCanvasItems" | "saveState"
> {
  activeProjectIdRef: React.MutableRefObject<string | null>;
  persistence: ReturnType<typeof useCreationStorage>;
  saveStateRef: React.MutableRefObject<string>;
  homeCodexStarting: React.MutableRefObject<boolean>;
  activeProject: CreationProject | undefined;
  conversationDisabledReason: string | undefined;
  desktopAgentState: ReturnType<typeof desktopAgentLifecycle.getState>;
  submitImageCommand: ReturnType<
    typeof useImageCommandSubmission
  >["submitImageCommand"];
}
export function useAppAgentBridge({
  creationRef,
  activeProjectIdRef,
  updateProject,
  replaceCanvasItems,
  saveState,
  persistence,
  saveStateRef,
  homeCodexStarting,
  activeProject,
  conversationDisabledReason,
  desktopAgentState,
  submitImageCommand,
}: AppAgentBridgeParams) {
  const creation = persistence.creation;
  const stageOrchestrator = useMemo<StageOrchestrator>(
    () =>
      createStageOrchestrator({
        getProject: () =>
          creationRef.current.projects.find(
            (project) => project.id === activeProjectIdRef.current,
          ),
        commit: (project) => {
          if (
            saveStateRef.current !== "saved" &&
            saveStateRef.current !== "saving"
          )
            throw new Error("项目尚未保存成功，请先处理项目恢复提示。");
          updateProject(project.id, () => project);
          if (activeProjectIdRef.current === project.id)
            replaceCanvasItems(project.items);
        },
      }),
    [],
  );

  const agentSubmitRef = useRef<
    (
      node: CanvasCollectionItem,
      prompt: string,
      signal?: AbortSignal,
      validate?: () => string | undefined,
    ) => Promise<{ taskId?: string; error?: string }>
  >(async () => ({ error: "生成入口未就绪" }));
  const agentViewRef = useRef<AgentCanvasBinding | null>(null);
  const agentCanvasBridge = useMemo<AgentBridge>(
    () =>
      createAgentHost({
        getView: () =>
          agentViewRef.current?.projectId === activeProjectIdRef.current
            ? agentViewRef.current.view
            : null,
        getProject: () =>
          creationRef.current.projects.find(
            (item) => item.id === activeProjectIdRef.current,
          ),
        getProjects: () => creationRef.current.projects,
        getExecutionBlockReason: () =>
          persistence.getWriteBlockReason() ??
          snapshotWriteBlockReason(creationRef.current),
        flush: () => persistence.flush(),
        commit: (project) => {
          updateProject(project.id, () => project);
          if (activeProjectIdRef.current === project.id)
            replaceCanvasItems(project.items);
        },
        generate: (node, prompt, signal, validate) =>
          agentSubmitRef.current(node, prompt, signal, validate),
        orchestrator: stageOrchestrator,
      }),
    [stageOrchestrator],
  );
  agentSubmitRef.current = async (node, prompt, signal, validate) => {
    const project = creationRef.current.projects.find(
      (item) => item.id === activeProjectIdRef.current,
    );
    const model =
      node.model ||
      (node.kind === "text"
        ? readProviderConnections().find(
            (connection) =>
              connection.capabilities.modalities.includes("text") &&
              (!project?.providerCredentialRef ||
                connection.credentialRef === project.providerCredentialRef),
          )?.model
        : project?.model);
    if (!model) return { error: "请先在设置中配置对应的生成模型。" };
    let taskId: string | undefined;
    const error = await submitImageCommand(
      {
        origin: "canvas",
        input: {
          sourceItemId: node.id,
          prompt,
          model,
          count: 1,
          signal: signal ?? new AbortController().signal,
        },
      },
      (id) => {
        taskId = id;
      },
      validate,
    );
    return { taskId, error };
  };
  useEffect(() => {
    agentConnection.syncProject();
    googleAgentConnection.syncProject();
  }, [
    creation.activeProjectId,
    activeProject?.activeChatId,
    activeProject?.chats?.[activeProject.activeChatId ?? ""]?.mainAgent,
    conversationDisabledReason,
  ]);
  useEffect(() => {
    const timer = setTimeout(() => agentConnection.pushState(), 100);
    return () => clearTimeout(timer);
  }, [activeProject]);
  const pluginAi: PluginAi = {
    async generateImage(prompt, options) {
      const project = creationRef.current.projects.find(
        (item) => item.id === activeProjectIdRef.current,
      );
      if (!project) throw new Error("请先新建或打开项目后再使用插件生成。");
      const message = await submitImageCommand({
        origin: "plugin",
        input: {
          prompt,
          model: options?.model ?? project.model,
          kind: "image",
          attachments: [],
          privacyMode: project?.composerDraft.privacyMode,
          outputCount: 1,
        },
      });
      if (message) throw new Error(message);
      return { images: [] };
    },
    async generateVideo(prompt, options) {
      const project = creationRef.current.projects.find(
        (item) => item.id === activeProjectIdRef.current,
      );
      if (!project) throw new Error("请先新建或打开项目后再使用插件生成。");
      const message = await submitImageCommand({
        origin: "plugin",
        input: {
          prompt,
          model: options?.model ?? project.model,
          kind: "video",
          attachments: [],
          privacyMode: project?.composerDraft.privacyMode,
          outputCount: 1,
        },
      });
      if (message) throw new Error(message);
      return { url: "", mimeType: "video/mp4" };
    },
    generateText() {
      return Promise.reject(new Error("插件文本生成请通过对话面板执行"));
    },
  };
  useEffect(() => {
    agentConnection.setBridge(agentCanvasBridge);
    googleAgentConnection.setBridge(agentCanvasBridge);
    pluginLoader.setBridge(agentCanvasBridge);
    return () => {
      agentConnection.setBridge(null);
      googleAgentConnection.setBridge(null);
      pluginLoader.setBridge(null);
    };
  }, [agentCanvasBridge]);
  useEffect(() => {
    if (
      !homeCodexStarting.current &&
      (saveState === "saved" || saveState === "saving")
    )
      void desktopAgentLifecycle.ensure();
  }, [
    creation.activeProjectId,
    persistence.loadEpoch,
    saveState,
    agentCanvasBridge,
    desktopAgentState.pending,
  ]);
  useEffect(() => {
    if (
      creation.activeProjectId &&
      configureAgentProxy(
        agentConnection,
        import.meta.env.VITE_KK_AGENT_PROXY === "1",
      )
    ) {
      void agentConnection.connect();
    }
  }, [creation.activeProjectId]);
  useEffect(() => {
    setPluginRuntime({
      React: React as typeof import("react"),
      jsx: React.createElement,
      Fragment: React.Fragment,
      version: appVersion,
      emit: pluginLoader.getBus().emit,
      on: pluginLoader.getBus().on,
      injectCSS: injectPluginCss,
    });
    pluginLoader.setAi(pluginAi);
    void pluginLoader.ensurePluginsLoaded();
  }, []);

  return { agentViewRef, stageOrchestrator };
}
