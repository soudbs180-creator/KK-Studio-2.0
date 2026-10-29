import {
  canvasPorts,
  submitPorts,
  type AppTaskCoordinationParams,
} from "./app/taskPorts.ts";
import React, {
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type SetStateAction,
} from "react";
import { appVersion } from "./runtime/appInfo";
import TopBar from "./components/TopBar";
import CanvasCollectionsPanels from "./components/CanvasCollectionsPanels";
import { effectiveTags, splitCollectionTags } from "./domain/collectionTags";
import { normalizeTags } from "./domain/assets";
import Sidebar from "./components/Sidebar";
import { useProjectLibrary } from "./features/projects/index.ts";
import type { ModelSelection } from "./features/models/index.ts";
import { homeModelSelection } from "./domain/modelSelection";
import { useSidebarLayout } from "./components/useSidebarLayout";
import Canvas from "./components/Canvas";
import ConversationPanel from "./components/ConversationPanel";
import DeferredPanelBoundary from "./components/DeferredPanelBoundary";
import Modal from "./components/Modal";
import TaskExecutionApproval from "./components/TaskExecutionApproval";
import StartPage from "./components/StartPage";
import { ensureTemplates } from "./features/skills/index.ts";
import {
  createSkillRegistry,
  applySkillInstructions,
  SKILLS_CHANGED_EVENT,
  type SkillRecord,
} from "./features/skills/index.ts";
import {
  createProject,
  projectChatView,
  emptyDraft,
  snapshotWriteBlockReason,
  type CreationDraft,
  type CreationProject,
  type CreateProjectInput,
  type ChatItem,
  type ChatItemDraft,
} from "./features/creation/index.ts";
import { updateProjectChatView } from "./features/agent/index.ts";
import { sameJson } from "./features/creation/index.ts";
import {
  agentConnection,
  readPermissionMode,
  subscribeAgentPreferences,
  type AgentBridge,
} from "./features/agent/index.ts";
import { googleAgentConnection } from "./features/agent/index.ts";
import { appendToActiveAgentDraft } from "./features/agent/index.ts";

import { pluginLoader } from "./features/plugins/index.ts";
import { injectPluginCss, setPluginRuntime } from "./features/plugins/index.ts";
import type { PluginAi } from "./features/plugins/index.ts";
import { createAgentHost } from "./features/agent/index.ts";
import { desktopAgentLifecycle } from "./features/agent/index.ts";
import {
  clearSentPendingDraft,
  configureAgentProxy,
  sendProjectAgentMessage,
} from "./features/agent/index.ts";
import { prepareAgentAttachments } from "./features/agent/index.ts";
import { codexGenerationPrompt } from "./features/agent/index.ts";
import {
  createStageOrchestrator,
  type StageOrchestrator,
} from "./features/agent/index.ts";
import type { AgentCanvasBinding } from "./components/canvas/useAgentCanvasView";
import { CanvasImageCommandContext } from "./features/creation/index.ts";
import { ImageLightbox as ImageLightbox } from "./features/image-edit/index.ts";
import { useNativeTaskRecovery } from "./features/creation/index.ts";
import { useCreationStorage } from "./features/creation/index.ts";
import { useAssetArchive } from "./features/creation/index.ts";
import CreationStorageNotice from "./components/CreationStorageNotice";
import { createProjectCanvas } from "./domain/projectCanvas";
import {
  parseModelProvider,
  MODEL_PROVIDER_STORAGE_KEY,
} from "./domain/modelProvider";
import {
  loadProviderConnectionsDurable,
  persistProviderConnectionsDurable,
  readProviderConnections,
} from "./features/creation/index.ts";
import { getGenerationProgressLabels } from "./domain/uiGovernance";
import { recoverInterruptedTasks } from "./features/creation/index.ts";
import { taskRetryAvailability } from "./features/creation/index.ts";
import { reconcileNativeTasks } from "./features/creation/index.ts";
import { useTaskExecution, rootItemId } from "./features/creation/index.ts";
import { useImageCommandSubmission } from "./features/creation/index.ts";

import { initialAssets, initialSubjects, type Asset } from "./domain/assets";
import {
  BASE_CANVAS_ITEMS,
  type CanvasCollectionItem,
} from "./domain/canvasItems";
import {
  SETTINGS_STORAGE_KEY,
  parseSettings,
  DEFAULT_SETTINGS,
  type SettingsPreferences,
} from "./domain/settings";
import { useLocalWorkflows } from "./features/comfyui/index.ts";
// App owns lazy panel styles before the final screen overrides.
import "./components/assets/assets.css";
import "./components/settings/plugin-manager.css";
import "./components/settings/settings.css";
import "./styles/shortcuts.css";
import "./styles/workspace.css";
import "./styles/sidebar.css";
import "./styles/account-popup.css";
import "./styles/catalog-pages.css";
import "./styles/extensions.css";
// Keep Figma-scoped conversation geometry after the legacy workspace rules.
import "./styles/conversation-panel.css";
import "./styles/model-picker.css";
import "./styles/design-surface.css";

const PromptLibraryPanel = lazy(
  () => import("./components/PromptLibraryPanel"),
);
const AssetPanel = lazy(() => import("./components/assets/AssetPanel"));
const SettingsPanel = lazy(() => import("./components/settings/SettingsPanel"));
const LibraryPage = lazy(() => import("./components/LibraryPage"));
const CatalogPanel = lazy(() => import("./components/CatalogPanel"));
const SkillsPage = lazy(() => import("./components/SkillsPage"));
const ShortcutsPanel = lazy(() => import("./components/ShortcutsPanel"));
const InfoPanel = lazy(() => import("./components/InfoPanel"));
const TaskWorkbench = lazy(() => import("./components/TaskWorkbench"));

function validateHomeCodexPreconditions(
  input: CreateProjectInput,
  submitLocked: boolean,
  saveState: string,
): string | undefined {
  if (submitLocked) return "正在开始创作，请稍候。";
  if (!["saved", "saving"].includes(saveState))
    return "请先处理项目读取或保存提示，当前未提交生成。";
  if (!input.prompt.trim() || input.prompt.length > 4000)
    return "请输入 1 至 4,000 字的创作提示词。";
  if (input.privacyMode && input.privacyMode !== "byok_local")
    return "当前隐私模式不允许 Codex 账号调用，草稿与参考图已保留。";
  if (!navigator.onLine) return "当前离线，草稿与参考图已保留。";
  const state = agentConnection.getState();
  if (state.sending || state.preparing || state.pendingApproval)
    return "请先完成或停止当前 Agent 任务，再开始新项目。";
  return undefined;
}

function getModalTitle(modal: string): string {
  switch (modal) {
    case "search":
      return "搜索";
    case "prompts":
      return "提示词库";
    case "settings":
      return "设置";
    case "assets":
      return "资产管理";
    case "shortcuts":
      return "快捷按键";
    case "tasks":
      return "任务列表";
    default:
      return "使用说明";
  }
}

function resolveConversationDisabledReason(
  creation: Parameters<typeof snapshotWriteBlockReason>[0],
  saveState: string,
): string | undefined {
  return (
    snapshotWriteBlockReason(creation) ??
    (saveState === "saved" || saveState === "saving"
      ? undefined
      : "请先处理项目读取或保存提示，当前暂不可编辑或执行。")
  );
}

function resolveConversationDraft(
  saveState: string,
  activeProject: CreationProject | undefined,
  selectedChat: ChatItem | undefined,
): CreationDraft | undefined {
  if (saveState === "read_only" && activeProject && selectedChat) {
    return {
      ...activeProject.composerDraft,
      prompt: selectedChat.draft.text ?? selectedChat.draft.prompt ?? "",
      attachments: selectedChat.draft.attachments ?? [],
      model: selectedChat.draft.model ?? "",
      modelSelection: selectedChat.draft.modelSelection,
      conversationChannel: selectedChat.draft.conversationChannel ?? "direct",
    };
  }
  return activeProject?.composerDraft;
}

function useAppSkills() {
  const [skillRegistry] = useState(() => {
    const registry = createSkillRegistry();
    if (!registry.persistenceWarning) ensureTemplates(registry, false);
    return registry;
  });
  const [, refreshSkills] = useState(0);
  useEffect(() => {
    try {
      if (!skillRegistry.persistenceWarning) ensureTemplates(skillRegistry);
      skillRegistry.persistPending();
    } catch (error) {
      console.warn("[App] Failed to persist pending skills:", error);
    }
  }, [skillRegistry]);
  useEffect(() => {
    const syncSkills = () => refreshSkills((value) => value + 1);
    window.addEventListener(SKILLS_CHANGED_EVENT, syncSkills);
    return () => window.removeEventListener(SKILLS_CHANGED_EVENT, syncSkills);
  }, []);
  return skillRegistry;
}

function useHomeModelConfig() {
  const [providerVersion, setProviderVersion] = useState(0);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const native = await loadProviderConnectionsDurable();
        if (!active) return;
        if (native) {
          setProviderVersion((value) => value + 1);
        } else {
          const local = readProviderConnections();
          if (local.length > 0) {
            await persistProviderConnectionsDurable(local);
          }
        }
      } catch (error) {
        console.warn(
          "[App] Failed to synchronize durable provider connections:",
          error,
        );
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const syncProvider = () => setProviderVersion((value) => value + 1);
    window.addEventListener("kk:model-provider-changed", syncProvider);
    return () =>
      window.removeEventListener("kk:model-provider-changed", syncProvider);
  }, []);
  return useMemo(() => {
    void providerVersion;
    try {
      const profile = parseModelProvider(
        localStorage.getItem(MODEL_PROVIDER_STORAGE_KEY),
      ).profile;
      const connection = readProviderConnections().find(
        (item) =>
          Boolean(item.model?.trim()) &&
          item.state !== "disabled" &&
          item.capabilities.modalities.includes("image"),
      );
      const model = profile.model.trim() || connection?.model?.trim() || "";
      return { model, configured: Boolean(model) };
    } catch (error) {
      console.warn("[App] Failed to resolve home model config:", error);
      return { model: "", configured: false };
    }
  }, [providerVersion]);
}

function useAppAgentState() {
  const agentPermission = useSyncExternalStore(
    subscribeAgentPreferences,
    readPermissionMode,
  );
  const agentState = useSyncExternalStore(
    agentConnection.subscribe,
    agentConnection.getState,
  );
  const desktopAgentState = useSyncExternalStore(
    desktopAgentLifecycle.subscribe,
    desktopAgentLifecycle.getState,
  );
  return { agentPermission, agentState, desktopAgentState };
}

function useActiveProjectConversation(
  creation: Parameters<typeof snapshotWriteBlockReason>[0],
  saveState: string,
  activeProject: CreationProject | undefined,
) {
  const conversationDisabledReason = resolveConversationDisabledReason(
    creation,
    saveState,
  );
  const selectedChat = activeProject?.activeChatId
    ? activeProject.chats?.[activeProject.activeChatId]
    : undefined;
  const conversationDraft = resolveConversationDraft(
    saveState,
    activeProject,
    selectedChat,
  );
  return { conversationDisabledReason, selectedChat, conversationDraft };
}

function useAppTaskCoordination(params: AppTaskCoordinationParams) {
  const {
    creationRef,
    updateProject,
    commitCreation,
    persistence,
    activeProjectIdRef,
    replaceCanvasItems,
    setAssets,
    homeModelConfig,
    saveState,
    onOpenSettingsProviders,
    onNavigateToWorkspace,
  } = params;

  const execution = useTaskExecution({
    creationRef,
    updateProject,
    commitCreation,
    persistence,
    activeProjectIdRef,
    replaceCanvasItems,
    setAssets,
    openSettingsProviders: onOpenSettingsProviders,
  });

  useNativeTaskRecovery(
    creationRef,
    execution.taskControllers,
    commitCreation,
    saveState === "saved" || saveState === "saving",
  );

  const submission = useImageCommandSubmission({
    creationRef,
    activeProjectIdRef,
    persistence,
    ...submitPorts(homeModelConfig),
    executeTask: execution.executeTask,
    cancelTask: execution.cancelTask,
    commitCreation,
    replaceCanvasItems,
    onNavigateToWorkspace,
    onOpenSettingsProviders,
  });

  return {
    ...execution,
    ...submission,
  };
}

export default function App() {
  const [active, setActive] = useState("landing");
  const activePageRef = useRef(active);
  activePageRef.current = active;
  const [extensionView, setExtensionView] = useState<
    "skills" | "connectors" | "partners"
  >("skills");
  const [partnerProjectId, setPartnerProjectId] = useState<string | null>(null);
  const [workspaceVisited, setWorkspaceVisited] = useState(false);
  useEffect(() => {
    if (active === "workspace") setWorkspaceVisited(true);
  }, [active]);
  const [modal, setModal] = useState("");
  const [likesOpen, setLikesOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [activeCollection, setActiveCollection] = useState<"likes" | "tags">(
    "likes",
  );
  const [collectionActivation, setCollectionActivation] = useState({
    likes: 0,
    tags: 0,
  });
  const [settingsSection, setSettingsSection] = useState("general");
  const sidebar = useSidebarLayout();
  const chatCoversCanvas =
    sidebar.surface === "phone" ||
    (sidebar.surface === "tablet" && window.innerWidth < 960);
  const [chat, setChat] = useState(true);
  const [mobileChat, setMobileChat] = useState(false);
  const [assets, setAssets] = useState(initialAssets);
  const skillRegistry = useAppSkills();
  const assetArchive = useAssetArchive(setAssets);
  const [subjects, setSubjects] = useState(initialSubjects);
  const workflows = useLocalWorkflows();
  const persistence = useCreationStorage(
    recoverInterruptedTasks,
    reconcileNativeTasks,
  );
  const { creation, creationRef, commitCreation } = persistence;
  const saveState = persistence.state;
  const saveStateRef = useRef(saveState);
  saveStateRef.current = saveState;
  const homeCodexStarting = useRef(false);
  const homeModelConfig = useHomeModelConfig();
  const activeProjectIdRef = useRef<string | null>(creation.activeProjectId);
  activeProjectIdRef.current = creation.activeProjectId;
  const projectLibrary = useProjectLibrary(persistence, () => open("projects"));
  const activeProject = projectLibrary.activeProject;
  const [canvasItems, setCanvasItems] = useState<CanvasCollectionItem[]>(
    () => activeProject?.items ?? BASE_CANVAS_ITEMS,
  );
  const canvasItemsRef = useRef(canvasItems);
  canvasItemsRef.current = canvasItems;
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set());
  const [likedIds, setLikedIds] = useState<Set<string>>(() => new Set());

  function replaceCanvasItems(
    action: SetStateAction<CanvasCollectionItem[]>,
  ): CanvasCollectionItem[] {
    const next =
      typeof action === "function" ? action(canvasItemsRef.current) : action;
    canvasItemsRef.current = next;
    setCanvasItems(next);
    return next;
  }

  function updateProject(
    id: string,
    update: (project: CreationProject) => CreationProject,
  ): void {
    const current = creationRef.current;
    const next = {
      ...current,
      projects: current.projects.map((project) =>
        project.id === id ? update(project) : project,
      ),
    };
    commitCreation(next);
  }

  const {
    cancelTask,
    pauseTask,
    resumeTask,
    retryTask,
    regenerateImageTask,
    pendingApproval,
    pendingApprovalTask,
    resolveTaskApproval,
    savingResultTaskIds,
    canPauseTask,
    submitImageCommand,
    submitLock,
  } = useAppTaskCoordination({
    creationRef,
    updateProject,
    commitCreation,
    persistence,
    activeProjectIdRef,
    replaceCanvasItems,
    setAssets,
    homeModelConfig,
    saveState,
    onOpenSettingsProviders: () => {
      setSettingsSection("providers");
      setModal("settings");
    },
    onNavigateToWorkspace: () => {
      setActive("workspace");
      setChat(true);
    },
  });

  const { conversationDisabledReason, selectedChat, conversationDraft } =
    useActiveProjectConversation(creation, saveState, activeProject);
  const latestProjectTask = activeProject?.tasks.at(-1);
  const generationProgress = getGenerationProgressLabels({
    task: latestProjectTask,
    saveState,
    resultSaving: savingResultTaskIds.has(latestProjectTask?.id ?? ""),
  });
  const [imagePreview, setImagePreview] = useState<{
    source: CanvasCollectionItem;
    title: string;
  }>();
  useEffect(() => setImagePreview(undefined), [activeProject?.id]);

  const { agentPermission, agentState, desktopAgentState } = useAppAgentState();

  useEffect(() => {
    replaceCanvasItems(activeProject?.items ?? BASE_CANVAS_ITEMS);
    setFavoriteIds(new Set(activeProject?.favoriteIds ?? []));
    setLikedIds(new Set(activeProject?.likedIds ?? []));
  }, [creation.activeProjectId, persistence.loadEpoch]);

  function updateHomeDraft(
    draft: CreationDraft,
    changes?: Partial<CreationDraft>,
  ): void {
    const next = {
      ...creationRef.current,
      homeDraft: {
        ...(changes ? creationRef.current.homeDraft : draft),
        ...changes,
        updatedAt: Date.now(),
      },
    };
    commitCreation(next, changes);
  }
  function applySkillToHome(record: SkillRecord): string {
    const draft = creationRef.current.homeDraft;
    try {
      updateHomeDraft({
        ...draft,
        prompt: applySkillInstructions(draft.prompt, record),
        updatedAt: Date.now(),
      });
      return "Skill 已应用到首页草稿。";
    } catch (error) {
      console.warn("[App] Failed to apply skill to home draft:", error);
      return "应用失败：Skill 指令与当前草稿合计超过 4000 字，原草稿未改变。";
    }
  }
  function applyPartnerToHome(instructions: string): string {
    const blocked = persistence.getWriteBlockReason();
    if (blocked) return blocked;
    const project = partnerProjectId
      ? creationRef.current.projects.find(
          (item) => item.id === partnerProjectId,
        )
      : undefined;
    if (partnerProjectId && !project) return "原项目已不可用，未修改草稿。";
    if (project && creationRef.current.activeProjectId !== project.id)
      return "原项目已不是当前项目，未修改草稿。";
    if (project) {
      // The active composer acknowledges its source; inactive Agent drafts
      // cannot receive instructions or redirect them into the API draft.
      for (const draftKey of [
        JSON.stringify([project.id, project.activeChatId ?? null]),
        `google-${project.id}`,
      ]) {
        const result = appendToActiveAgentDraft(draftKey, instructions);
        if (result.handled) {
          if (result.applied) setActive("workspace");
          return result.message;
        }
      }
    }
    const draft = project?.composerDraft ?? creationRef.current.homeDraft;
    const prompt = [draft.prompt.trim(), instructions]
      .filter(Boolean)
      .join("\n\n");
    if (prompt.length > 4000)
      return "应用失败：角色说明与草稿合计超过 4000 字，原草稿未改变。";
    if (project)
      updateProject(project.id, (current) => ({
        ...current,
        composerDraft: {
          ...current.composerDraft,
          prompt,
          updatedAt: Date.now(),
        },
        updatedAt: Date.now(),
      }));
    else updateHomeDraft({ ...draft, prompt, updatedAt: Date.now() });
    setActive(project ? "workspace" : "landing");
    return "协作角色已加入草稿，请选择本次任务的模型。";
  }
  function applySkillToProject(record: SkillRecord): string {
    const project = creationRef.current.projects.find(
      (item) => item.id === creationRef.current.activeProjectId,
    );
    if (!project) return "当前没有可应用的项目草稿。";
    try {
      updateProject(project.id, (current) => ({
        ...current,
        composerDraft: {
          ...current.composerDraft,
          prompt: applySkillInstructions(current.composerDraft.prompt, record),
          updatedAt: Date.now(),
        },
        updatedAt: Date.now(),
      }));
      return "Skill 已应用到项目草稿。";
    } catch (error) {
      console.warn("[App] Failed to apply skill to project draft:", error);
      return "应用失败：Skill 指令与当前项目草稿合计超过 4000 字，原草稿未改变。";
    }
  }
  function updateCanvasItems(
    action: SetStateAction<CanvasCollectionItem[]>,
  ): void {
    const projectId = activeProject?.id;
    if (projectId) {
      const project = creationRef.current.projects.find(
        (project) => project.id === projectId,
      );
      if (!project) return;
      const next =
        typeof action === "function" ? action(project.items) : action;
      if (activeProjectIdRef.current === projectId) replaceCanvasItems(next);
      updateProject(projectId, (project) => ({
        ...project,
        items: next,
        updatedAt: Date.now(),
      }));
    } else if (activeProjectIdRef.current === null) replaceCanvasItems(action);
  }
  function renameCanvasItem(id: string, title: string): void {
    updateCanvasItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, title, updatedAt: Date.now() } : item,
      ),
    );
  }

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
  async function executeHomeCodexProject(
    input: CreateProjectInput,
    selection: ModelSelection,
  ): Promise<string | undefined> {
    const previousProjectId = creationRef.current.activeProjectId;
    const draftAtStart = creationRef.current.homeDraft;
    const attachments = input.attachments.map((item) => ({ ...item }));
    submitLock.current = true;
    homeCodexStarting.current = true;
    try {
      codexGenerationPrompt(input.prompt, selection, input.outputCount);
      // Validate immutable originals locally before creating a project or a turn.
      await prepareAgentAttachments(attachments, {
        signal: new AbortController().signal,
      });
      if (
        activePageRef.current !== "landing" ||
        creationRef.current.activeProjectId !== previousProjectId
      )
        return "页面或项目已切换，当前未提交；首页草稿仍保留。";
      const created = createProject({
        prompt: input.prompt.trim(),
        model: "",
        modelSelection: selection,
        kind: "image",
        attachments,
        privacyMode: input.privacyMode,
        outputCount: input.outputCount,
      });
      // Keep an unsent Agent draft in the project if connection or send fails.
      const project = updateProjectChatView(created, () => ({
        ...created,
        composerDraft: {
          ...created.composerDraft,
          prompt: input.prompt.trim(),
          pendingAgent: true,
          conversationChannel: "codex" as const,
        },
      }));
      commitCreation({
        ...creationRef.current,
        projects: [project, ...creationRef.current.projects],
        activeProjectId: project.id,
      });
      activeProjectIdRef.current = project.id;
      const transitionToWorkspace = () => {
        if (
          creationRef.current.activeProjectId !== project.id ||
          activePageRef.current !== "landing"
        )
          return;
        activePageRef.current = "workspace";
        setActive("workspace");
        setChat(true);
        replaceCanvasItems(project.items);
      };
      if (
        typeof document !== "undefined" &&
        "startViewTransition" in document
      ) {
        const transition = (
          document as Document & {
            startViewTransition: (cb: () => void) => {
              updateCallbackDone: Promise<void>;
            };
          }
        ).startViewTransition(transitionToWorkspace);
        await transition.updateCallbackDone;
      } else {
        transitionToWorkspace();
      }
      agentConnection.syncProject();
      await persistence.flush();
      const ownsProject = () =>
        creationRef.current.activeProjectId === project.id &&
        activePageRef.current === "workspace";
      if (!ownsProject()) return "项目已切换，当前未发送；原项目草稿仍保留。";
      configureAgentProxy(
        agentConnection,
        import.meta.env.VITE_KK_AGENT_PROXY === "1",
      );
      await desktopAgentLifecycle.connect();
      if (!ownsProject()) return "项目已切换，当前未发送；原项目草稿仍保留。";
      const currentProject = project;
      const result = await agentConnection.sendMessage(input.prompt.trim(), {
        selection,
        outputCount: input.outputCount,
        attachments,
        canvasSource: { nodeId: project.items[0].id, kind: "image" },
        isTemporary: Boolean(
          currentProject?.activeChatId &&
          currentProject.chats?.[currentProject.activeChatId]?.isTemporary,
        ),
      });
      if (!result.ok) return result.error ?? "发送未确认，草稿仍保留。";
      updateProject(project.id, (current) =>
        clearSentPendingDraft(
          current,
          project.composerDraft,
          project.activeChatId,
        ),
      );
      if (creationRef.current.homeDraft === draftAtStart)
        updateHomeDraft(emptyDraft());
      await persistence.flush();
      return undefined;
    } catch (error) {
      return error instanceof Error
        ? error.message
        : "无法连接 Codex，草稿仍保留。";
    } finally {
      homeCodexStarting.current = false;
      submitLock.current = false;
    }
  }

  async function handleCreateProject(
    input: CreateProjectInput,
  ): Promise<string | undefined> {
    const selection = homeModelSelection(input);
    if (selection.source === "api")
      return submitImageCommand({
        origin: "home",
        input: {
          ...input,
          model: selection.model,
          providerConnectionId: selection.connectionId,
        },
      });
    const error = validateHomeCodexPreconditions(
      input,
      submitLock.current,
      saveStateRef.current,
    );
    if (error) return error;
    return executeHomeCodexProject(input, selection);
  }
  async function handleSendMessage(message: string): Promise<boolean | string> {
    const project = creationRef.current.projects.find(
      (project) => project.id === activeProjectIdRef.current,
    );
    if (!project) return false;
    const error = await submitImageCommand({
      origin: "chat",
      input: {
        prompt: message,
        model: project.model,
        providerConnectionId: project.composerDraft.providerConnectionId,
        kind: project.kind,
        attachments: project.composerDraft.attachments,
        privacyMode: project.composerDraft.privacyMode,
        outputCount: project.composerDraft.outputCount,
      },
    });
    return error ?? true;
  }
  function handleProjectDraftChange(
    draft: CreationDraft,
    expected?: CreationDraft,
  ): void {
    if (!activeProject) return;
    const projectId = activeProject.id;
    const chatId = activeProject.activeChatId;
    const legacy = activeProject.chats === undefined && chatId === undefined;
    const legacyDraft = activeProject.composerDraft;
    updateProject(projectId, (project) => {
      if (legacy) {
        if (
          creationRef.current.version !== 2 ||
          project.chats !== undefined ||
          project.activeChatId !== undefined ||
          JSON.stringify(project.composerDraft) !==
            JSON.stringify(expected ?? legacyDraft)
        )
          return project;
        return {
          ...project,
          composerDraft: { ...draft, updatedAt: Date.now() },
          updatedAt: Date.now(),
        };
      }
      if (!chatId || !project.chats?.[chatId]) return project;
      const scoped = projectChatView({ ...project, activeChatId: chatId });
      if (
        expected &&
        !sameJson(
          {
            ...scoped.composerDraft,
            text:
              (scoped.composerDraft as ChatItemDraft).text ??
              scoped.composerDraft.prompt,
          },
          {
            ...expected,
            text: (expected as ChatItemDraft).text ?? expected.prompt,
          },
        )
      )
        return project;
      const updated = updateProjectChatView(scoped, (current) => ({
        ...current,
        composerDraft: { ...draft, updatedAt: Date.now() },
        updatedAt: Date.now(),
      }));
      return projectChatView({
        ...updated,
        activeChatId: project.activeChatId,
      });
    });
  }

  function handleProjectModelChange(
    model: string,
    selection?: ModelSelection,
  ): void {
    if (!activeProject) return;
    const updated = updateProjectChatView(activeProject, () => ({
      ...activeProject,
      model,
      kind:
        selection?.kind === "text" || selection?.kind === "image"
          ? selection.kind
          : activeProject.kind,
      composerDraft: {
        ...activeProject.composerDraft,
        model,
        modelSelection: selection ?? { source: "api", model },
        conversationChannel: "direct" as const,
        pendingAgent: undefined,
        providerConnectionId: selection?.connectionId,
        updatedAt: Date.now(),
      },
      items: activeProject.items.map((item) =>
        item.id === rootItemId(activeProject)
          ? {
              ...item,
              model,
              providerConnectionId: selection?.connectionId,
              generationSource: undefined,
              parameters: item.parameters
                ? { ...item.parameters, imageSize: undefined }
                : undefined,
              description: `${model} · 待执行`,
            }
          : item,
      ),
      updatedAt: Date.now(),
    }));
    commitCreation({
      ...creationRef.current,
      projects: creationRef.current.projects.map((project) =>
        project.id === updated.id ? updated : project,
      ),
    });
    replaceCanvasItems(updated.items);
  }
  function handleSelectChat(chatId: string): void {
    if (!activeProject) return;
    updateProject(activeProject.id, (proj) => ({
      ...proj,
      activeChatId: chatId,
      updatedAt: Date.now(),
    }));
  }

  function handleDeleteMessage(messageId: string): void {
    if (!activeProject) return;
    updateProject(activeProject.id, (project) => {
      const activeChatId = project.activeChatId;
      if (activeChatId && project.chats && project.chats[activeChatId]) {
        const chat = project.chats[activeChatId];
        return {
          ...project,
          chats: {
            ...project.chats,
            [activeChatId]: {
              ...chat,
              messages: chat.messages.filter((m) => m.id !== messageId),
              updatedAt: Date.now(),
            },
          },
          messages: project.messages.filter(
            (message) => message.id !== messageId,
          ),
          updatedAt: Date.now(),
        };
      }
      return {
        ...project,
        messages: project.messages.filter(
          (message) => message.id !== messageId,
        ),
        updatedAt: Date.now(),
      };
    });
  }
  function toggleLike(id: string): void {
    if (activeProject) {
      const next = new Set(activeProject.likedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setLikedIds(next);
      updateProject(activeProject.id, (project) => ({
        ...project,
        likedIds: [...next],
        updatedAt: Date.now(),
      }));
      return;
    }
    setLikedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function updateItemTags(id: string, tags: string[]): string | undefined {
    if (!activeProject) return "请选择一个本地项目，再保存标签。";
    try {
      const patch = splitCollectionTags(tags);
      const next = new Set(activeProject.favoriteIds);
      if (patch.favorite) next.add(id);
      else next.delete(id);
      setFavoriteIds(next);
      updateProject(activeProject.id, (project) => ({
        ...project,
        favoriteIds: [...next],
        items: project.items.map((item) =>
          item.id === id ? { ...item, tags: patch.tags } : item,
        ),
        updatedAt: Date.now(),
      }));
      const saved = creationRef.current.projects.find(
        (project) => project.id === activeProject.id,
      );
      if (saved) replaceCanvasItems(saved.items);
    } catch (error) {
      return error instanceof Error ? error.message : "标签未能保存，请重试。";
    }
  }
  function createTag(name: string): void {
    if (!activeProject) return;
    updateProject(activeProject.id, (project) => ({
      ...project,
      customTags: normalizeTags([...(project.customTags ?? []), name]),
      updatedAt: Date.now(),
    }));
  }
  function locate(id: string): void {
    open("workspace");
    requestAnimationFrame(() =>
      window.dispatchEvent(new CustomEvent("kk:focus-node", { detail: id })),
    );
  }
  function handleNewBlankProject(): string {
    if (saveStateRef.current !== "saved" && saveStateRef.current !== "saving") {
      projectLibrary.report("项目存储尚未就绪，请先处理保存或恢复提示。");
      return "";
    }
    const profile = parseModelProvider(
      localStorage.getItem(MODEL_PROVIDER_STORAGE_KEY),
    ).profile;
    const blank = createProject({
      prompt: "",
      model: profile.model || "kk-image-2",
      modelSelection: { source: "default", model: "", kind: "text" },
      kind: "image",
      attachments: [],
    });
    const nextProject: CreationProject = updateProjectChatView(blank, () => ({
      ...blank,
      name: "未命名项目",
      canvas: createProjectCanvas([]),
      items: [],
      messages: [],
      tasks: [],
      favoriteIds: [],
      likedIds: [],
    }));
    commitCreation({
      ...creationRef.current,
      projects: [nextProject, ...creationRef.current.projects],
      activeProjectId: nextProject.id,
    });
    replaceCanvasItems(nextProject.items);
    setActive("workspace");
    return nextProject.id;
  }
  function openSavedProject(id: string): void {
    if (
      !creationRef.current.projects.some(
        (project) => project.id === id && project.trashedAt === undefined,
      )
    )
      return;
    commitCreation({ ...creationRef.current, activeProjectId: id });
    setActive("workspace");
    setModal("");
  }
  useEffect(() => {
    const shortcut = (event: KeyboardEvent): void => {
      if (event.isComposing || event.defaultPrevented) return;
      if ((event.ctrlKey || event.metaKey) && event.key === ",") {
        event.preventDefault();
        setSettingsSection("general");
        setModal("settings");
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setModal("search");
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    let preferences: SettingsPreferences = DEFAULT_SETTINGS;
    try {
      preferences = parseSettings(
        localStorage.getItem(SETTINGS_STORAGE_KEY),
      ).preferences;
    } catch (error) {
      console.warn("[App] Failed to read settings preferences:", error);
      preferences = DEFAULT_SETTINGS;
    }
    const apply = () => {
      document.documentElement.dataset.accent = preferences.accent;
      document.documentElement.dataset.theme =
        preferences.theme === "system"
          ? media.matches
            ? "dark"
            : "light"
          : preferences.theme;
      document.documentElement.dataset.floatingLayout = String(
        preferences.floatingLayout,
      );
    };
    const listener = (event: Event) => {
      preferences = (event as CustomEvent<SettingsPreferences>).detail;
      apply();
    };
    apply();
    window.addEventListener("kk:settings-changed", listener);
    media.addEventListener("change", apply);
    return () => {
      window.removeEventListener("kk:settings-changed", listener);
      media.removeEventListener("change", apply);
    };
  }, []);
  function openSkillsView(view: string): void {
    setPartnerProjectId(
      active === "workspace" ? creationRef.current.activeProjectId : null,
    );
    const requestedView = view.split("/")[1];
    setExtensionView(
      requestedView === "partners"
        ? "partners"
        : requestedView === "connectors"
          ? "connectors"
          : "skills",
    );
    setActive("skills");
    setModal("");
  }

  function openChatView(): void {
    if (modal) {
      setModal("");
      setChat(true);
      setMobileChat(sidebar.narrow);
      return;
    }
    if (active === "workspace" && chat && (!sidebar.narrow || mobileChat)) {
      setChat(false);
      setMobileChat(false);
      return;
    }
    if (
      !creationRef.current.projects.some(
        (project) => project.id === activeProjectIdRef.current,
      )
    ) {
      handleNewBlankProject();
    } else {
      setActive("workspace");
    }
    setChat(true);
    setMobileChat(sidebar.narrow);
    setModal("");
  }

  function openCollectionView(view: string): void {
    if (!activeProject) {
      handleNewBlankProject();
    } else {
      setActive("workspace");
    }
    if (view === "likes") setLikesOpen(true);
    else setTagsOpen(true);
    const id = view === "likes" ? "likes" : "tags";
    setActiveCollection(id);
    setCollectionActivation((current) => ({
      ...current,
      [id]: current[id] + 1,
    }));
    setModal("");
  }

  function open(view: string): void {
    if (view === "skills" || view.startsWith("skills/")) {
      openSkillsView(view);
      return;
    }
    if (view === "new-project") {
      handleNewBlankProject();
      return;
    }
    if (view === "chat") {
      openChatView();
      return;
    }
    if (["favorites", "tags", "likes"].includes(view)) {
      openCollectionView(view);
      return;
    }
    if (view === "search") {
      setModal(view);
      return;
    }
    const target = view === "comfyui" ? "settings/comfy" : view;
    if (target === "settings" || target.startsWith("settings/")) {
      const requestedSection = target.split("/")[1];
      setSettingsSection(requestedSection || "general");
      setModal("settings");
      return;
    }
    if (
      [
        "landing",
        "workspace",
        "projects",
        "skills",
        "favorites",
        "likes",
        "search",
      ].includes(target)
    ) {
      if (["landing", "workspace", "projects", "skills"].includes(target)) {
        setMobileChat(false);
      }
      setActive(target);
      setModal("");
    } else {
      setModal(target);
    }
  }
  function add(items: Asset[], subject: boolean): void {
    (subject ? setSubjects : setAssets)((current) => {
      return Array.from(
        new Map([...current, ...items].map((item) => [item.id, item])).values(),
      );
    });
    if (!subject && activeProject) {
      const imported = items.filter(
        (item) => item.type === "image" && item.src,
      );
      if (imported.length)
        updateProject(activeProject.id, (project) => ({
          ...project,
          attachments: [
            ...project.attachments,
            ...imported.map((item) => ({
              id: item.id,
              assetId: item.id.startsWith("asset-") ? item.id : undefined,
              name: item.name,
              mime: "image/*",
              size: 0,
              dataUrl: item.src,
            })),
          ].slice(-4),
          composerDraft: {
            ...project.composerDraft,
            attachments: [
              ...project.composerDraft.attachments,
              ...imported.map((item) => ({
                id: item.id,
                assetId: item.id.startsWith("asset-") ? item.id : undefined,
                name: item.name,
                mime: "image/*",
                size: 0,
                dataUrl: item.src,
              })),
            ].slice(-4),
            updatedAt: Date.now(),
          },
          updatedAt: Date.now(),
        }));
    }
  }

  return (
    <div
      className="app"
      data-design-surface="desktop"
      data-responsive-surface={sidebar.surface}
      data-runtime-entry="src/main.tsx"
      data-runtime-mode={import.meta.env.MODE}
    >
      <TopBar
        onOpen={open}
        onToggleSidebar={sidebar.toggle}
        onToggleChat={() => open("chat")}
        newWindowDisabledReason="多窗口仓库协调尚未完成，暂不可新建窗口。"
        newChatDisabledReason="多聊天隔离尚未完成，暂不可新建聊天。"
        newTempChatDisabledReason="临时聊天的历史与记忆隔离尚未完成，暂不可用。"
      />
      <div className="app-body">
        {sidebar.narrow && !sidebar.collapsed && (
          <div className="sidebar-scrim" aria-hidden="true" />
        )}
        <Sidebar
          active={
            modal === "assets"
              ? "assets"
              : modal === "tasks"
                ? "tasks"
                : sidebar.surface === "phone" &&
                    active === "workspace" &&
                    mobileChat &&
                    chat
                  ? "chat"
                  : active
          }
          onNavigate={open}
          collapsed={sidebar.collapsed}
          narrow={sidebar.narrow}
          phone={sidebar.surface === "phone"}
          onCollapse={sidebar.toggle}
          projects={creation.projects}
          activeProjectId={creation.activeProjectId}
          canEditProjects={saveState === "saved" || saveState === "saving"}
          onCreateProject={handleNewBlankProject}
          onOpenProject={openSavedProject}
          projectActions={projectLibrary.actions}
        />
        <main className={"workspace " + (mobileChat ? "chat-mobile" : "")}>
          <CreationStorageNotice
            state={persistence.state}
            message={projectLibrary.message}
            hasRecoveryDraft={Boolean(persistence.recoveryDraft)}
            onRead={persistence.retryRead}
            onSave={persistence.retrySave}
            onDownload={persistence.downloadDraft}
          />
          {active === "landing" && (
            <StartPage
              onCreateProject={handleCreateProject}
              draft={creation.homeDraft}
              onDraftChange={updateHomeDraft}
              onOpenModel={() => open("settings/providers")}
              onOpenSkills={() => open("skills")}
              onOpenExtension={open}
              modelConfigured={homeModelConfig.configured}
              skills={skillRegistry.listRecords()}
              onApplySkill={applySkillToHome}
            />
          )}
          {(active === "workspace" || workspaceVisited) && (
            <div className="workspace-content" hidden={active !== "workspace"}>
              <CanvasImageCommandContext.Provider
                value={{
                  ...canvasPorts(activeProject?.items, persistence.flush),
                  updateItemTags,
                  createTag,
                  customTags: activeProject?.customTags ?? [],
                  favoriteIds,
                  updateItem: (id, patch) =>
                    updateCanvasItems((current) =>
                      current.map((item) =>
                        item.id === id ? { ...item, ...patch } : item,
                      ),
                    ),
                  deleteItem: (id) =>
                    updateCanvasItems((current) =>
                      current.filter((item) => item.id !== id),
                    ),
                  retryTask: (id) => {
                    if (activeProject) retryTask(activeProject.id, id);
                  },
                  regenerateTask: (id) => {
                    if (activeProject)
                      regenerateImageTask(activeProject.id, id);
                  },
                  openPreview: (id, title) => {
                    const source = activeProject?.items.find(
                      (item) => item.id === id,
                    );
                    if (source)
                      setImagePreview({ source, title: title ?? source.title });
                  },
                  submit: (input) =>
                    submitImageCommand({ origin: "canvas", input }),
                  cancel: cancelTask,
                  tasks: activeProject?.tasks ?? [],
                  model: activeProject?.model ?? "",
                  providerConnectionId:
                    activeProject?.composerDraft.providerConnectionId ??
                    activeProject?.tasks.at(-1)?.providerConnectionId ??
                    readProviderConnections().find(
                      (connection) =>
                        connection.baseUrl === activeProject?.providerBaseUrl &&
                        connection.credentialRef ===
                          activeProject?.providerCredentialRef,
                    )?.id,
                  textModel:
                    readProviderConnections().find(
                      (connection) =>
                        connection.capabilities.modalities.includes("text") &&
                        (!activeProject?.providerCredentialRef ||
                          connection.credentialRef ===
                            activeProject.providerCredentialRef),
                    )?.model ?? "",
                  models: [
                    ...new Set(
                      [
                        activeProject?.model,
                        ...readProviderConnections().map(
                          (connection) => connection.model,
                        ),
                      ].filter((model): model is string => Boolean(model)),
                    ),
                  ],
                  disabledReason: activeProject
                    ? undefined
                    : "请先新建或打开项目，再提交图片生成。",
                  imageConfigured: homeModelConfig.configured,
                  configure: () => open("settings/providers"),
                }}
              >
                <Canvas
                  projectStatus={
                    activeProject && (
                      <div className="project-task-status" aria-live="polite">
                        {activeProject.name !== "未命名项目" && (
                          <strong title={activeProject.name}>
                            {activeProject.name}
                          </strong>
                        )}
                        {activeProject.tasks.slice(-1).map((task) => {
                          const retry = taskRetryAvailability(
                            task,
                            activeProject.tasks,
                          );
                          const retryReason = !retry.indices.length
                            ? retry.blockedReason
                            : undefined;
                          return (
                            <span
                              key={task.id}
                              className={`project-task-${task.status}`}
                            >
                              {generationProgress.taskLabel}
                              {task.status === "running" && (
                                <button
                                  className="ui-button"
                                  type="button"
                                  onClick={() => cancelTask(task.id)}
                                >
                                  取消
                                </button>
                              )}
                              {(task.status === "partial" ||
                                task.status === "failed" ||
                                task.status === "offline" ||
                                task.status === "cancelled" ||
                                task.status === "interrupted") && (
                                <button
                                  className="ui-button"
                                  type="button"
                                  disabled={!retry.indices.length}
                                  title={retryReason}
                                  aria-description={retryReason}
                                  onClick={() =>
                                    retryTask(activeProject.id, task.id)
                                  }
                                >
                                  重试
                                </button>
                              )}
                            </span>
                          );
                        })}
                        <span className="project-save-state">
                          {generationProgress.saveLabel}
                        </span>
                      </div>
                    )
                  }
                  key={`${activeProject?.id ?? "demo-canvas"}:${persistence.loadEpoch}`}
                  initialCanvas={activeProject?.canvas}
                  projectId={activeProject?.id}
                  agentViewRef={agentViewRef}
                  onAgentViewChange={() => agentConnection.pushState()}
                  onCanvasChange={
                    activeProject
                      ? (canvas) =>
                          updateProject(activeProject.id, (project) => ({
                            ...project,
                            canvas,
                            updatedAt: Date.now(),
                          }))
                      : undefined
                  }
                  onOpen={open}
                  onOpenTasks={() => setModal("tasks")}
                  tasks={activeProject?.tasks}
                  onCancelTask={cancelTask}
                  onRetryTask={(taskId) => {
                    if (activeProject) retryTask(activeProject.id, taskId);
                  }}
                  chatOpen={chat}
                  covered={chatCoversCanvas && mobileChat && chat}
                  onOpenChat={() => {
                    setChat(true);
                    setMobileChat(true);
                  }}
                  items={activeProject?.items ?? canvasItems}
                  onItemsChange={updateCanvasItems}
                  likedIds={likedIds}
                  onToggleLike={toggleLike}
                />
                {imagePreview && (
                  <ImageLightbox
                    key={imagePreview.source.id}
                    source={imagePreview.source}
                    title={imagePreview.title}
                    onClose={() => setImagePreview(undefined)}
                  />
                )}
              </CanvasImageCommandContext.Provider>
              <div className={"chat-container " + (!chat ? "chat-hidden" : "")}>
                <ConversationPanel
                  overlay={sidebar.narrow && mobileChat && chat}
                  onOpen={open}
                  project={activeProject}
                  readOnlyMessages={
                    saveState === "read_only"
                      ? selectedChat?.messages
                      : undefined
                  }
                  executionDisabledReason={conversationDisabledReason}
                  currentModel={activeProject?.model}
                  onSelectChat={handleSelectChat}
                  modelOptions={[
                    ...new Set(
                      [
                        activeProject?.model,
                        parseModelProvider(
                          localStorage.getItem(MODEL_PROVIDER_STORAGE_KEY),
                        ).profile.model,
                      ].filter((model): model is string => Boolean(model)),
                    ),
                  ]}
                  modelConfigured={homeModelConfig.configured}
                  onModelChange={handleProjectModelChange}
                  composerDraft={conversationDraft}
                  onDraftChange={handleProjectDraftChange}
                  onSend={activeProject ? handleSendMessage : undefined}
                  onDeleteMessage={
                    activeProject ? handleDeleteMessage : undefined
                  }
                  skills={skillRegistry.listRecords()}
                  onApplySkill={applySkillToProject}
                  voiceEnabled={active === "workspace" && chat}
                  agent={
                    activeProject
                      ? {
                          connected: agentState.status === "connected",
                          connectionRevision: agentState.connectionRevision,
                          conversation: agentState.conversation,
                          preparing: agentState.preparing,
                          connecting:
                            agentState.status === "connecting" ||
                            desktopAgentState.pending,
                          error: agentState.error || desktopAgentState.error,
                          usage: agentState.usage,
                          usageError: agentState.usageError,
                          onRefreshUsage: () => {
                            void agentConnection.refreshUsage();
                          },
                          models: agentState.models.map(
                            (model) => model.model || model.id,
                          ),
                          onConnect: (fresh) => {
                            void desktopAgentLifecycle
                              .connect(fresh)
                              .catch((error) => {
                                console.warn(
                                  "[App] desktopAgentLifecycle connect failed:",
                                  error,
                                );
                              });
                          },
                          sending: agentState.sending,
                          activity: agentState.activity,
                          messages: agentState.messages,
                          pendingApproval: agentState.pendingApproval,
                          permissionMode: agentPermission,
                          onPermissionModeChange: (mode) =>
                            agentConnection.setPermissionMode(mode),
                          canvasImages: activeProject.items.filter(
                            (item) => item.kind === "image" && item.assetId,
                          ),
                          onSend: async (message, attachments, selection) => {
                            const projectId = activeProject.id;
                            const currentProject =
                              creationRef.current.projects.find(
                                (project) => project.id === projectId,
                              );
                            const draftAtSend = currentProject?.composerDraft;
                            const result = await sendProjectAgentMessage(
                              agentConnection,
                              currentProject,
                              message,
                              attachments,
                              selection,
                            );
                            if (result.ok) {
                              updateProject(projectId, (project) =>
                                clearSentPendingDraft(project, draftAtSend),
                              );
                            }
                            return result;
                          },
                          onInterrupt: () => agentConnection.interrupt(),
                          onDecision: (decision) =>
                            agentConnection.resolveApproval(decision),
                        }
                      : undefined
                  }
                  onClose={() => {
                    const focusAtClose = document.activeElement;
                    setChat(false);
                    setMobileChat(false);
                    requestAnimationFrame(() => {
                      // Do not steal focus if the user has already moved into
                      // the canvas while React was closing the panel.
                      if (
                        document.activeElement === focusAtClose ||
                        document.activeElement === document.body
                      )
                        document
                          .querySelector<HTMLButtonElement>(".chat-reopen")
                          ?.focus({ preventScroll: true });
                    });
                  }}
                />
              </div>
            </div>
          )}
          {active === "skills" && (
            <DeferredPanelBoundary key="skills">
              <SkillsPage
                registry={skillRegistry}
                onApply={applySkillToHome}
                onOpenMcp={() => open("settings/mcp")}
                onOpenModels={() => open("settings/providers")}
                onApplyPartner={applyPartnerToHome}
                defaultView={extensionView}
              />
            </DeferredPanelBoundary>
          )}
          {active === "projects" && (
            <DeferredPanelBoundary key={active}>
              <LibraryPage
                key={active}
                view="projects"
                onOpen={open}
                projects={creation.projects}
                projectActions={projectLibrary.actions}
                onOpenProject={openSavedProject}
              />
            </DeferredPanelBoundary>
          )}
        </main>
      </div>
      <CanvasCollectionsPanels
        key={activeProject?.id ?? "empty"}
        items={canvasItems.map((item) => ({
          ...item,
          tags: effectiveTags(item.tags, favoriteIds.has(item.id)),
        }))}
        likedIds={likedIds}
        likesOpen={active === "workspace" && likesOpen}
        tagsOpen={active === "workspace" && tagsOpen}
        customTags={activeProject?.customTags ?? []}
        activation={collectionActivation}
        activePanel={activeCollection}
        onActivate={setActiveCollection}
        onCloseLikes={() => setLikesOpen(false)}
        onCloseTags={() => setTagsOpen(false)}
        onLocate={locate}
        onLike={toggleLike}
        onRename={renameCanvasItem}
        onUpdateTags={updateItemTags}
        onCreateTag={createTag}
      />
      {pendingApproval && pendingApprovalTask && (
        <TaskExecutionApproval
          task={pendingApprovalTask}
          gates={pendingApproval.gates}
          onApprove={() => resolveTaskApproval(true)}
          onCancel={() => resolveTaskApproval(false)}
        />
      )}
      {modal && (
        <Modal title={getModalTitle(modal)} onClose={() => setModal("")}>
          <DeferredPanelBoundary key={modal} onClose={() => setModal("")}>
            {modal === "search" ? (
              <CatalogPanel
                items={canvasItems.map((item) => ({
                  ...item,
                  tags: effectiveTags(item.tags, favoriteIds.has(item.id)),
                }))}
                assets={[...assets, ...subjects]}
                onOpen={open}
                projects={projectLibrary.projects}
                onOpenProject={openSavedProject}
                onLocate={locate}
              />
            ) : modal === "prompts" ? (
              <PromptLibraryPanel
                target={
                  active === "workspace" && activeProject
                    ? "图片对话草稿"
                    : "首页草稿"
                }
                onClose={() => setModal("")}
                onApply={(text) => {
                  const project =
                    active === "workspace" ? activeProject : undefined;
                  const draft =
                    project?.composerDraft ?? creationRef.current.homeDraft;
                  const prompt = [draft.prompt.trimEnd(), text]
                    .filter(Boolean)
                    .join("\n\n");
                  if (prompt.length > 4000)
                    return "加入后超过 4,000 字符，请先精简草稿或选择更短的提示词。";
                  if (project)
                    updateProject(project.id, (current) => ({
                      ...current,
                      composerDraft: {
                        ...current.composerDraft,
                        prompt,
                        updatedAt: Date.now(),
                      },
                      updatedAt: Date.now(),
                    }));
                  else
                    updateHomeDraft({
                      ...draft,
                      prompt,
                      updatedAt: Date.now(),
                    });
                }}
              />
            ) : modal === "shortcuts" ? (
              <ShortcutsPanel onClose={() => setModal("")} />
            ) : modal === "settings" ? (
              <SettingsPanel
                key={settingsSection}
                initialSection={settingsSection}
                saveState={saveState}
                revision={creation.revision}
                projects={creation.projects}
                registry={skillRegistry}
                workflows={workflows}
                onClose={() => setModal("")}
              />
            ) : modal === "assets" ? (
              <AssetPanel
                onClose={() => setModal("")}
                archive={assetArchive}
                assets={assets}
                subjects={subjects}
                onAdd={add}
              />
            ) : modal === "tasks" ? (
              <TaskWorkbench
                project={activeProject}
                stageWriteDisabledReason={
                  saveState === "saved" || saveState === "saving"
                    ? undefined
                    : "项目尚未保存成功，阶段操作暂不可用；请先处理项目恢复提示。"
                }
                onStageDecision={async (projectId, input) => {
                  stageOrchestrator.decideStage(input, projectId);
                  await persistence.flush();
                }}
                onRetryStage={async (
                  projectId,
                  planId,
                  stageIndex,
                  revision,
                ) => {
                  stageOrchestrator.retryStage(
                    planId,
                    stageIndex,
                    revision,
                    projectId,
                  );
                  await persistence.flush();
                }}
                onRequestPlanApproval={async (
                  projectId,
                  planId,
                  stageIndex,
                  revision,
                ) => {
                  stageOrchestrator.requestStageApproval(
                    planId,
                    stageIndex,
                    "plan",
                    revision,
                    projectId,
                  );
                  await persistence.flush();
                }}
                onCommentsChange={(reviewComments) => {
                  if (activeProject)
                    updateProject(activeProject.id, (project) => ({
                      ...project,
                      reviewComments,
                      updatedAt: Date.now(),
                    }));
                }}
                onClose={() => setModal("")}
                onConfigure={() => open("settings/providers")}
                onCancelTask={cancelTask}
                onPauseTask={pauseTask}
                canPauseTask={canPauseTask}
                onResumeTask={resumeTask}
                onRetryTask={(taskId) => {
                  if (activeProject) retryTask(activeProject.id, taskId);
                }}
                onRetryOutput={(taskId, index) => {
                  if (activeProject) retryTask(activeProject.id, taskId, index);
                }}
              />
            ) : (
              <InfoPanel
                view={modal}
                onClose={() => setModal("")}
                onConfigure={() => open("settings/providers")}
              />
            )}
          </DeferredPanelBoundary>
        </Modal>
      )}
    </div>
  );
}
import "./styles/interaction.css";
import "./styles/motion.css";

import "./styles/catalog.css";
import "./styles/task-workbench.css";
import "./styles/stage-workbench.css";

import "./styles/feature-parity.css";
// Screen layout is the final owner; imports in components execute earlier.
import "./styles/responsive.css";
import "./styles/responsive-content.css";
import "./styles/composer.css";
import "./styles/tokenized-composer.css";
import "./styles/page-templates.css";
import "./styles/canvas-compare.css";
import "./styles/image-edit.css";
import "./styles/image-selection.css";
import "./styles/canvas-composer-screen.css";
import "./styles/desktop-titlebar.css";
