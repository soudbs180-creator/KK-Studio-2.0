import { isLocalProviderUrl } from "./domain/providerUrl";
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
import { confirmAction } from "./runtime/confirmAction";
import TopBar from "./components/TopBar";
import CanvasCollectionsPanels from "./components/CanvasCollectionsPanels";
import { effectiveTags, splitCollectionTags } from "./domain/collectionTags";
import { normalizeTags } from "./domain/assets";
import Sidebar from "./components/Sidebar";
import type { ModelSelection } from "./features/models/modelSelection";
import { homeModelSelection } from "./domain/modelSelection";
import { useSidebarLayout } from "./components/useSidebarLayout";
import Canvas from "./components/Canvas";
import ConversationPanel from "./components/ConversationPanel";
import DeferredPanelBoundary from "./components/DeferredPanelBoundary";
import Modal from "./components/Modal";
import TaskExecutionApproval from "./components/TaskExecutionApproval";
import {
  requiredApprovalGates,
  type ApprovalGate,
} from "./domain/agentWorkflow";
import {
  SETTINGS_SECTIONS,
  type SettingsSection,
} from "./components/settings/SettingsSectionData";
import StartPage from "./components/StartPage";
import { ensureTemplates } from "./features/skills/templateSkills";
import {
  createSkillRegistry,
  applySkillInstructions,
  SKILLS_CHANGED_EVENT,
  type SkillRecord,
} from "./features/skills/skillRegistry";
import {
  createProject,
  projectHasUnsettledTasks,
  emptyDraft,
  type CreationDraft,
  type CreationProject,
  type CreationTask,
  type CreationTaskOutput,
  type CreateProjectInput,
} from "./features/creation/model";
import {
  agentConnection,
  readPermissionMode,
  subscribeAgentPreferences,
  type AgentBridge,
} from "./features/agent/agentConnection.ts";
import { googleAgentConnection } from "./features/agent/googleAgentConnection.ts";
import { appendToActiveAgentDraft } from "./features/agent/agentDraftActions";

import { pluginLoader } from "./features/plugins/pluginLoader.ts";
import {
  injectPluginCss,
  setPluginRuntime,
} from "./features/plugins/pluginRuntime.ts";
import type { PluginAi } from "./features/plugins/pluginTypes.ts";
import { createAgentHost } from "./features/agent/agentHost.ts";
import { desktopAgentLifecycle } from "./features/agent/desktopAgentLifecycle.ts";
import {
  clearSentPendingDraft,
  configureAgentProxy,
  sendProjectAgentMessage,
} from "./features/agent/homeAgentRecovery";
import { prepareAgentAttachments } from "./features/agent/agentAttachments.ts";
import { codexGenerationPrompt } from "./features/agent/codexGeneration.ts";
import { assertCanvasDeliveries } from "./features/agent/agentCanvas.ts";
import {
  createStageOrchestrator,
  type StageOrchestrator,
} from "./features/agent/orchestrator.ts";
import type { AgentCanvasBinding } from "./components/canvas/useAgentCanvasView";

function outputsForTask(task: CreationTask): CreationTaskOutput[] {
  const completed = new Set(
    task.completedOutputIndices?.length
      ? task.completedOutputIndices
      : Array.from(
          {
            length: Math.min(task.completedOutputs, task.requestedOutputs),
          },
          (_, index) => index,
        ),
  );
  return task.outputs?.length
    ? task.outputs
    : Array.from({ length: task.requestedOutputs }, (_, index) => ({
        index,
        status: completed.has(index)
          ? ("succeeded" as const)
          : ("waiting" as const),
        model: task.model,
        provider: task.providerName,
        createdAt: task.createdAt,
      }));
}
import {
  generateImages,
  GenerationProviderError,
} from "./features/creation/imageGeneration";
import {
  storeGeneratedAsset,
  hashPrompt,
} from "./features/creation/assetRepository";
import { readNativeAsset } from "./features/creation/nativeAssetAdapter";
import {
  appendImageTask,
  appendImageTaskResults,
  assertLiveTextTask,
  canvasImageAttachments,
  prepareImageTask,
  ImageTaskCommandError,
} from "./features/creation/imageTaskCommand";
import {
  CanvasImageCommandContext,
  type CanvasImageRequest,
} from "./features/creation/CanvasImageCommand";
import {
  prepareEditInputs,
  composeEditResult,
  composeNativeEditAsset,
} from "./features/image-edit/editTasks.ts";
import { compileEditPrompt } from "./features/image-edit/prompt.ts";
import { imageResultContext } from "./features/image-edit/context.ts";
import { ImageEditMappingError } from "./features/image-edit/imageProcessing.ts";
import { imageRegeneration } from "./features/image-edit/regeneration.ts";
import ImageLightbox from "./features/image-edit/ImageLightbox.tsx";
import { imageCapabilitiesForSelection } from "./features/models/imageModelCapabilities.ts";
import { generateText } from "./features/creation/textGeneration";
import { textTaskResult } from "./features/creation/textTaskResult";
import { useNativeTaskRecovery } from "./features/creation/useNativeTextRecovery";
import { useCreationStorage } from "./features/creation/useCreationStorage";
import { useAssetArchive } from "./features/creation/useAssetArchive";
import CreationStorageNotice from "./components/CreationStorageNotice";
import { createProjectCanvas } from "./domain/projectCanvas";
import {
  parseModelProvider,
  MODEL_PROVIDER_STORAGE_KEY,
} from "./domain/modelProvider";
import {
  loadProviderConnectionsDurable,
  markProviderConnectionFailure,
  markProviderConnectionHealthy,
  persistProviderConnectionsDurable,
  readProviderConnections,
} from "./features/creation/providerRegistry";
import {
  reserveProviderSubmissionAsync,
  assertSubmissionConnection,
  type ProviderSubmissionReservation,
  ProviderSubmissionError,
  taskProviderOptions,
  taskSubmissionBinding,
} from "./features/creation/providerSubmission";
import { mapWithConcurrency } from "./features/creation/generationQueue";
import { compileDesignPrompt } from "./features/creation/promptCompiler";
import {
  getDisabledReason,
  getGenerationUiState,
  getGenerationProgressLabels,
} from "./domain/uiGovernance";

/** Capacity failure hint: name connections the user can switch to right away. */
function capacitySwitchHint(currentId: string | undefined): string {
  const available = readProviderConnections().filter(
    (connection) =>
      connection.id !== currentId &&
      connection.state !== "disabled" &&
      connection.state !== "quarantined" &&
      connection.state !== "cooldown",
  );
  if (available.length === 0)
    return "当前没有其他可用连接，请稍后在设置中核对连接或模型。";
  return `当前可用连接：${available
    .slice(0, 3)
    .map((item) => item.displayName || item.provider)
    .join("、")}${
    available.length > 3 ? " 等" : ""
  }；可在设置中切换连接或模型后重试。`;
}

import {
  abortedAfterProviderSubmission,
  canRetryTask,
  mergeRetryTaskState,
  markArchiveFailuresUnknown,
  preserveAcceptedOutputsOnDeliveryFailure,
  recoverInterruptedTasks,
  retryBlockedOutputIndices,
  retryableOutputIndices,
  submissionMayHaveBeenAccepted,
} from "./features/creation/taskRecovery";
import { taskRetryAvailability } from "./features/creation/taskRetryAvailability";
import {
  cancelNativeTask,
  getNativeTask,
  reconcileNativeTasks,
  submitNativeTask,
  validateNativeTaskRecord,
  usesNativeTaskHost,
  type NativeTaskHostRecord,
} from "./features/creation/nativeTaskHost";

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
import {
  readLocalWorkflows,
  writeLocalWorkflows,
  type WorkflowRecord,
} from "./features/comfyui/workflowRegistry";
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
  const [settingsSection, setSettingsSection] =
    useState<SettingsSection>("general");
  const sidebar = useSidebarLayout();
  const chatCoversCanvas =
    sidebar.surface === "phone" ||
    (sidebar.surface === "tablet" && window.innerWidth < 960);
  const [chat, setChat] = useState(true);
  const [mobileChat, setMobileChat] = useState(false);
  const [assets, setAssets] = useState(initialAssets);
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
    } catch {
      // The Skill page will surface a storage error without blocking the shell.
    }
  }, [skillRegistry]);
  useEffect(() => {
    const syncSkills = () => refreshSkills((value) => value + 1);
    window.addEventListener(SKILLS_CHANGED_EVENT, syncSkills);
    return () => window.removeEventListener(SKILLS_CHANGED_EVENT, syncSkills);
  }, []);
  const assetArchive = useAssetArchive(setAssets);
  const [subjects, setSubjects] = useState(initialSubjects);
  const [localWorkflows, setLocalWorkflows] = useState<WorkflowRecord[]>(() =>
    readLocalWorkflows(),
  );
  const persistence = useCreationStorage(
    recoverInterruptedTasks,
    reconcileNativeTasks,
  );
  const { creation, creationRef, commitCreation } = persistence;
  const saveState = persistence.state;
  const saveStateRef = useRef(saveState);
  saveStateRef.current = saveState;
  const submitLock = useRef(false);
  const homeCodexStarting = useRef(false);
  const [providerVersion, setProviderVersion] = useState(0);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const native = await loadProviderConnectionsDurable();
        if (!active) return;
        if (native) {
          // Native durable config is authoritative; refresh derived views.
          setProviderVersion((value) => value + 1);
        } else {
          // First desktop run: migrate existing browser metadata untouched.
          const local = readProviderConnections();
          if (local.length > 0) {
            await persistProviderConnectionsDurable(local);
          }
        }
      } catch {
        // Keep the browser view on native failure; settings surface the error.
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  const homeModelConfig = useMemo(() => {
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
    } catch {
      return { model: "", configured: false };
    }
  }, [providerVersion]);
  function saveWorkflow(workflow: WorkflowRecord): void {
    setLocalWorkflows((current) => {
      const next = [
        workflow,
        ...current.filter((item) => item.id !== workflow.id),
      ];
      writeLocalWorkflows(next);
      return next;
    });
  }

  function hasArchivedOutputEvidence(
    task: Pick<CreationTask, "kind">,
    output: Pick<CreationTaskOutput, "assetId" | "text" | "status">,
  ): boolean {
    if (output.status !== "succeeded") return false;
    if (task.kind !== "text") return Boolean(output.assetId);
    return Boolean(
      output.text?.trim() &&
      new TextEncoder().encode(output.text).length <= 32768,
    );
  }
  function deleteWorkflow(workflow: WorkflowRecord): void {
    setLocalWorkflows((current) => {
      const next = current.filter((item) => item.id !== workflow.id);
      writeLocalWorkflows(next);
      return next;
    });
  }
  const taskControllers = useRef<Record<string, AbortController>>({});
  const [savingResultTaskIds, setSavingResultTaskIds] = useState(
    new Set<string>(),
  );
  useEffect(() => setSavingResultTaskIds(new Set()), [persistence.loadEpoch]);
  useNativeTaskRecovery(
    creationRef,
    taskControllers,
    commitCreation,
    saveState === "saved" || saveState === "saving",
  );
  const nativeTaskRecords = useRef<Record<string, NativeTaskHostRecord>>({});
  const nativeCancelRequested = useRef(new Set<string>());
  const pausedTaskIds = useRef(new Set<string>());
  const [pendingApproval, setPendingApproval] = useState<{
    projectId: string;
    taskId: string;
    gates: ApprovalGate[];
  } | null>(null);
  const pendingApprovalRef = useRef(pendingApproval);
  pendingApprovalRef.current = pendingApproval;
  const pendingApprovalTask = creation.projects
    .find((project) => project.id === pendingApproval?.projectId)
    ?.tasks.find((task) => task.id === pendingApproval?.taskId);
  const activeProject = creation.projects.find(
    (project) => project.id === creation.activeProjectId,
  );
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
  const activeProjectIdRef = useRef<string | null>(creation.activeProjectId);
  activeProjectIdRef.current = creation.activeProjectId;
  const [canvasItems, setCanvasItems] = useState<CanvasCollectionItem[]>(
    () => activeProject?.items ?? BASE_CANVAS_ITEMS,
  );
  const canvasItemsRef = useRef(canvasItems);
  canvasItemsRef.current = canvasItems;
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set());
  const [likedIds, setLikedIds] = useState<Set<string>>(() => new Set());
  function rootItemId(project: CreationProject): string | null {
    return (
      project.items.find((item) => item.id === `${project.id}-prompt`)?.id ??
      project.items.find((item) => item.kind === "image")?.id ??
      null
    );
  }
  useEffect(() => {
    replaceCanvasItems(activeProject?.items ?? BASE_CANVAS_ITEMS);
    setFavoriteIds(new Set(activeProject?.favoriteIds ?? []));
    setLikedIds(new Set(activeProject?.likedIds ?? []));
  }, [creation.activeProjectId, persistence.loadEpoch]);
  useEffect(() => {
    const syncProvider = () => setProviderVersion((value) => value + 1);
    window.addEventListener("kk:model-provider-changed", syncProvider);
    return () =>
      window.removeEventListener("kk:model-provider-changed", syncProvider);
  }, []);
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

  function updateHomeDraft(draft: CreationDraft): void {
    const next = {
      ...creationRef.current,
      homeDraft: { ...draft, updatedAt: Date.now() },
    };
    commitCreation(next);
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
    } catch {
      return "应用失败：Skill 指令与当前草稿合计超过 4000 字，原草稿未改变。";
    }
  }
  function applyPartnerToHome(instructions: string): string {
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
      for (const draftKey of [project.id, `google-${project.id}`]) {
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
    } catch {
      return "应用失败：Skill 指令与当前项目草稿合计超过 4000 字，原草稿未改变。";
    }
  }
  function replaceCanvasItems(
    action: SetStateAction<CanvasCollectionItem[]>,
  ): CanvasCollectionItem[] {
    const next =
      typeof action === "function" ? action(canvasItemsRef.current) : action;
    canvasItemsRef.current = next;
    setCanvasItems(next);
    return next;
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
        flush: () => persistence.flush(),
        commit: (project) => {
          updateProject(project.id, () => project);
          if (activeProjectIdRef.current === project.id)
            replaceCanvasItems(project.items);
        },
        generate: (node, prompt, signal) =>
          agentSubmitRef.current(node, prompt, signal),
        orchestrator: stageOrchestrator,
      }),
    [stageOrchestrator],
  );
  agentSubmitRef.current = async (node, prompt, signal) => {
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
    );
    return { taskId, error };
  };
  useEffect(() => {
    agentConnection.syncProject();
    googleAgentConnection.syncProject();
  }, [creation.activeProjectId]);
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
  async function executeTask(
    projectId: string,
    taskId: string,
    initialProject?: CreationProject,
    explicitRetry = false,
  ): Promise<void> {
    const project =
      initialProject ??
      creationRef.current.projects.find((item) => item.id === projectId);
    const task = project?.tasks.find((item) => item.id === taskId);
    if (!project || !task || taskControllers.current[taskId]) return;
    if (task.imageEdit) {
      const live =
        creationRef.current.projects.find((p) => p.id === projectId) ?? project;
      if (
        live.tasks.some(
          (other) =>
            other.id !== taskId &&
            other.imageEdit?.groupId === task.imageEdit?.groupId &&
            taskControllers.current[other.id],
        )
      )
        return;
      if (
        pendingApprovalRef.current &&
        pendingApprovalRef.current.taskId !== taskId
      )
        return;
    }
    if (
      task.status === "unknown" ||
      task.submissionState === "unknown" ||
      task.submissionState === "submitted"
    )
      return;
    const missingGates = requiredApprovalGates({
      privacyMode: task.privacyMode,
      requestedOutputs: task.requestedOutputs,
      providerBaseUrl: task.providerBaseUrl,
    }).filter((gate) => !task.approvedGates?.includes(gate));
    if (missingGates.length) {
      pendingApprovalRef.current = { projectId, taskId, gates: missingGates };
      setPendingApproval({ projectId, taskId, gates: missingGates });
      updateProject(projectId, (current) => ({
        ...current,
        tasks: current.tasks.map((item) =>
          item.id === taskId
            ? {
                ...item,
                status: "queued",
                error: "等待人工审批，尚未提交到供应商。",
              }
            : item,
        ),
      }));
      return;
    }
    const controller = new AbortController();
    taskControllers.current[taskId] = controller;
    const setResultSaving = (saving: boolean) => {
      if (
        taskControllers.current[taskId] !== controller ||
        (saving && controller.signal.aborted)
      )
        return;
      setSavingResultTaskIds((current) => {
        if (current.has(taskId) === saving) return current;
        const next = new Set(current);
        if (saving) next.add(taskId);
        else next.delete(taskId);
        return next;
      });
    };
    controller.signal.addEventListener("abort", () => setResultSaving(false), {
      once: true,
    });
    let terminalPublished = false;
    let terminalSaveFailed = false;
    const flushPublishedResult = async () => {
      try {
        await persistence.flush();
      } catch (error) {
        terminalSaveFailed = terminalPublished;
        throw error;
      }
    };
    let outputs = outputsForTask(task);
    const pendingIndices = outputs
      .filter((output) => output.status !== "succeeded")
      .map((output) => output.index);
    const createdItems: CanvasCollectionItem[] = [];
    const publishedItems = new Set<string>();
    const rejectedDeliveryIds = new Set<string>();
    const archiveFailureIndices = new Set<number>();
    const mappingFailures = new Map<number, string>();
    let deliveryErrorMessage: string | undefined;
    let durableSubmission = false;
    let providerRequestStarted = false;
    let nativeSubmissionStarted = false;
    const publish = (
      status: CreationTask["status"],
      error?: string,
      submissionState?: CreationTask["submissionState"],
    ): void => {
      if (taskControllers.current[taskId] !== controller) return;
      let acceptedResults: CanvasCollectionItem[] = [];
      updateProject(projectId, (current) => {
        const pendingResults = createdItems.filter(
          (item) =>
            !publishedItems.has(item.id) && !rejectedDeliveryIds.has(item.id),
        );
        const withResults = appendImageTaskResults(
          current,
          pendingResults,
          task.sourceItemId ?? rootItemId(current),
        );
        acceptedResults = [];
        for (const result of pendingResults) {
          try {
            assertCanvasDeliveries({
              items: [result],
              project: withResults,
              label: "生成产物",
              requireAssetId: result.kind !== "text",
            });
            acceptedResults.push(result);
          } catch (validationError) {
            rejectedDeliveryIds.add(result.id);
            deliveryErrorMessage =
              validationError instanceof Error
                ? validationError.message
                : "生成产物未通过画布交付校验。";
          }
        }
        if (deliveryErrorMessage) {
          outputs = preserveAcceptedOutputsOnDeliveryFailure(
            outputs,
            projectId,
            taskId,
            rejectedDeliveryIds,
            deliveryErrorMessage,
          );
        }
        const publishedStatus = deliveryErrorMessage ? "unknown" : status;
        terminalPublished =
          publishedStatus !== "running" && publishedStatus !== "queued";
        const publishedError = deliveryErrorMessage ?? error;
        const publishedSubmissionState = deliveryErrorMessage
          ? ("unknown" as const)
          : submissionState;
        const sourceItemId = task.sourceItemId ?? rootItemId(current);
        const nextProject = appendImageTaskResults(
          current,
          acceptedResults,
          sourceItemId,
        );
        const nextTasks = current.tasks.map((item) => {
          if (item.id === taskId)
            return {
              ...item,
              status: publishedStatus,
              error: publishedError,
              submissionState: publishedSubmissionState ?? item.submissionState,
              submittedAt:
                publishedSubmissionState === "submitted"
                  ? (item.submittedAt ?? Date.now())
                  : item.submittedAt,
              outputs: [...outputs],
              completedOutputs: outputs.filter(
                (output) => output.status === "succeeded",
              ).length,
              resultItemId: acceptedResults[0]?.id ?? item.resultItemId,
              updatedAt: Date.now(),
            };
          if (item.id !== task.retryOfTaskId) return item;
          const merged = mergeRetryTaskState({
            parent: { ...item, outputs: outputsForTask(item) },
            retry: {
              outputs,
              retryOutputIndices: task.retryOutputIndices,
              status: publishedStatus,
              submissionState: publishedSubmissionState,
              error: publishedError,
            },
          });
          return {
            ...item,
            ...merged,
            updatedAt: Date.now(),
          };
        });
        const sourceTasks = nextTasks.filter(
          (candidate) =>
            (candidate.sourceItemId ?? rootItemId(current)) === sourceItemId,
        );
        const sourceUncertain = sourceTasks.some(
          (candidate) =>
            candidate.status === "unknown" ||
            candidate.submissionState === "unknown" ||
            candidate.outputs?.some((output) => output.status === "unknown"),
        );
        const sourceRunning = sourceTasks.some(
          (candidate) =>
            candidate.status === "queued" ||
            candidate.status === "running" ||
            candidate.submissionState === "submitted",
        );
        const sourceFailed = sourceTasks.some(
          (candidate) =>
            candidate.status === "failed" || candidate.status === "offline",
        );
        const sourceGenerationStatus = sourceUncertain
          ? ("error" as const)
          : sourceRunning
            ? ("pending" as const)
            : sourceFailed
              ? ("error" as const)
              : undefined;
        return {
          ...nextProject,
          tasks: nextTasks,
          items: [
            ...current.items.map((item) =>
              item.id === sourceItemId
                ? {
                    ...item,
                    generationStatus: sourceGenerationStatus,
                  }
                : item,
            ),
            ...acceptedResults.filter(
              (result) => !current.items.some((item) => item.id === result.id),
            ),
          ],
          updatedAt: Date.now(),
        };
      });
      acceptedResults.forEach((item) => publishedItems.add(item.id));
      if (activeProjectIdRef.current === projectId) {
        const latest = creationRef.current.projects.find(
          (item) => item.id === projectId,
        );
        if (latest) replaceCanvasItems(latest.items);
      }
    };
    let reservation: ProviderSubmissionReservation | undefined;
    const nativeTaskHost = usesNativeTaskHost();
    const assertTextCurrent = () => {
      if (
        task.kind === "text" &&
        !navigator.onLine &&
        !isLocalProviderUrl(task.providerBaseUrl ?? "")
      )
        throw new Error("当前离线，未提交文本任务；草稿已保留。");
      if (task.kind === "text")
        assertLiveTextTask(
          creationRef.current.projects.find((item) => item.id === projectId),
          task,
        );
    };
    try {
      if (!task.providerBaseUrl)
        throw new Error("历史任务未记录供应商，请从当前输入重新提交。");
      if (!pendingIndices.length) {
        publish("succeeded");
        return;
      }
      const compiledPrompt =
        task.kind === "text" || task.imageEdit || task.imageEditContext
          ? task.prompt
          : compileDesignPrompt(task.prompt, {
              referenceRoles: task.attachments.map(
                (attachment) => attachment.role,
              ),
              referenceCount: task.attachments.length,
              outputCount: task.requestedOutputs,
            });
      const promptHash = await hashPrompt(compiledPrompt);
      if (controller.signal.aborted) throw new Error("任务已停止。");
      if (!nativeTaskHost)
        reservation = await reserveProviderSubmissionAsync(
          taskSubmissionBinding(task),
          { explicitRetry: explicitRetry || Boolean(task.retryOfTaskId) },
        );
      if (controller.signal.aborted) throw new Error("任务已停止。");
      assertTextCurrent();
      outputs = outputs.map((output) =>
        output.status === "succeeded"
          ? output
          : { ...output, status: "running", error: undefined },
      );
      // Keep the durable intent in the queued state while this write
      // completes. A restart here is safe to resume with the same identity.
      publish("queued", undefined, "intent");
      // A provider request cannot start until the task intent and stable
      // idempotency key have reached IndexedDB or the Tauri snapshot.
      await persistence.flush();
      if (nativeTaskHost) {
        if (controller.signal.aborted) throw new Error("任务已停止。");
        assertTextCurrent();
        const nativeConnection = assertSubmissionConnection(
          taskSubmissionBinding(task),
          {
            skipCapacity: true,
            explicitRetry: explicitRetry || Boolean(task.retryOfTaskId),
          },
        );
        const attachments = task.attachments.map((attachment) => {
          if (!attachment.assetId)
            throw new Error(
              "Desktop 参考图尚未归档到原生素材库，当前未提交原生任务。",
            );
          return { assetId: attachment.assetId, name: attachment.name };
        });
        nativeSubmissionStarted = true;
        let nativeRecord = await submitNativeTask({
          imageEditRequired: task.imageEdit
            ? true
            : task.imageEditContext
              ? false
              : undefined,
          kind: task.kind === "text" ? "text" : undefined,
          concurrencyLimit: nativeConnection?.concurrencyLimit,
          taskId: task.id,
          idempotencyKey: task.idempotencyKey,
          baseUrl: task.providerBaseUrl,
          protocol: task.providerProtocol,
          authMode: task.providerAuthMode,
          credentialRef: task.providerCredentialRef ?? "",
          model: task.model,
          prompt: compiledPrompt,
          outputIndices: pendingIndices,
          attachments,
          providerName: task.providerName,
          promptHash,
          size: task.imageSize,
          maskAssetId: task.imageEdit?.nativeMask
            ? task.imageEdit.maskAssetId
            : undefined,
        });
        durableSubmission = true;
        nativeRecord = validateNativeTaskRecord(
          nativeRecord,
          task,
          pendingIndices,
        );
        nativeTaskRecords.current[taskId] = nativeRecord;
        publish("running", undefined, "submitted");
        await persistence.flush();

        const applyNativeRecord = async (
          incoming: NativeTaskHostRecord,
        ): Promise<NativeTaskHostRecord> => {
          const record = validateNativeTaskRecord(
            incoming,
            task,
            pendingIndices,
          );
          nativeTaskRecords.current[taskId] = record;
          setResultSaving(
            record.status !== "unknown" &&
              record.outputs.some(
                (output) =>
                  output.status === "succeeded" &&
                  outputs.some(
                    (prior) =>
                      prior.index === output.index &&
                      prior.status !== "succeeded",
                  ),
              ),
          );
          const recordOutputs = new Map(
            record.outputs.map((output) => [output.index, output]),
          );
          for (const output of outputs) {
            const nativeOutput = recordOutputs.get(output.index);
            if (!nativeOutput) {
              if (hasArchivedOutputEvidence(task, output)) continue;
              if (record.status === "succeeded") {
                output.status = "unknown";
                output.error = "原生任务完成但未返回该输出的素材标识。";
              } else if (record.status === "failed") {
                output.status = "failed";
                output.error =
                  record.failure ?? "原生任务失败但未返回该输出回执。";
              }
              continue;
            }
            const priorOutput = { ...output };
            if (
              nativeOutput.status === "unknown" &&
              hasArchivedOutputEvidence(task, priorOutput)
            ) {
              output.status = "succeeded";
              output.assetId = priorOutput.assetId;
              output.text = priorOutput.text;
              output.error = undefined;
              continue;
            }
            const missingText =
              task.kind === "text" &&
              nativeOutput.status === "succeeded" &&
              !nativeOutput.text?.trim();
            if (missingText && hasArchivedOutputEvidence(task, priorOutput)) {
              output.status = "succeeded";
              output.assetId = priorOutput.assetId;
              output.text = priorOutput.text;
              output.error = undefined;
              continue;
            }
            output.status =
              nativeOutput.status === "pending"
                ? "running"
                : missingText
                  ? "unknown"
                  : nativeOutput.status;
            output.assetId = nativeOutput.assetId;
            output.text = nativeOutput.text ?? priorOutput.text;
            output.error = nativeOutput.error;
            if (missingText) {
              output.error = "原生任务完成但未返回文案正文。";
              continue;
            }
            if (
              nativeOutput.status === "failed" &&
              hasArchivedOutputEvidence(task, priorOutput)
            ) {
              output.status = "succeeded";
              output.assetId = priorOutput.assetId;
              output.text = priorOutput.text;
              output.error = undefined;
              continue;
            }
            if (
              task.kind !== "text" &&
              nativeOutput.status === "succeeded" &&
              !nativeOutput.assetId
            ) {
              if (hasArchivedOutputEvidence(task, priorOutput)) {
                output.status = "succeeded";
                output.assetId = priorOutput.assetId;
                output.text = priorOutput.text;
                output.error = undefined;
                continue;
              }
              output.status = "unknown";
              output.error = "原生任务完成但未返回该输出的素材标识。";
              continue;
            }
            if (
              record.status === "succeeded" &&
              nativeOutput.status === "pending"
            ) {
              if (hasArchivedOutputEvidence(task, priorOutput)) {
                output.status = "succeeded";
                output.assetId = priorOutput.assetId;
                output.text = priorOutput.text;
                output.error = undefined;
                continue;
              }
              output.status = "unknown";
              output.error = "原生任务完成但该输出没有终态回执。";
              continue;
            }
            if (
              record.status === "failed" &&
              nativeOutput.status === "pending"
            ) {
              if (hasArchivedOutputEvidence(task, priorOutput)) {
                output.status = "succeeded";
                output.assetId = priorOutput.assetId;
                output.text = priorOutput.text;
                output.error = undefined;
                continue;
              }
              output.status = "failed";
              output.error =
                record.failure ?? "原生任务失败但该输出没有终态回执。";
              continue;
            }
            if (
              record.status === "unknown" &&
              nativeOutput.status === "pending"
            ) {
              if (hasArchivedOutputEvidence(task, priorOutput)) {
                output.status = "succeeded";
                output.assetId = priorOutput.assetId;
                output.text = priorOutput.text;
                output.error = undefined;
                continue;
              }
              output.status = "unknown";
              output.error =
                record.failure ?? "原生任务输出回执状态不明，请先核对供应商。";
              continue;
            }
            if (task.kind === "text") {
              if (nativeOutput.status === "succeeded") {
                try {
                  const item = textTaskResult(
                    projectId,
                    task,
                    output.index,
                    nativeOutput.text ?? "",
                  );
                  if (!createdItems.some((existing) => existing.id === item.id))
                    createdItems.push(item);
                } catch {
                  output.status = "unknown";
                  output.error = "原生文本结果缺失或无效，请先核对任务。";
                }
              }
              continue;
            }
            if (nativeOutput.status !== "succeeded" || !nativeOutput.assetId)
              continue;
            try {
              const rawAsset = await readNativeAsset(nativeOutput.assetId);
              const asset = rawAsset
                ? await composeNativeEditAsset(
                    task,
                    rawAsset,
                    creationRef.current.projects.find((p) => p.id === projectId)
                      ?.tasks ?? [],
                  )
                : null;
              if (!asset) throw new Error("原生素材原件尚未找到。");
              output.assetId = asset.assetId;
              const id = `${projectId}-${taskId}-result-${output.index + 1}`;
              const item: CanvasCollectionItem = {
                id,
                title: `图片结果 ${output.index + 1}`,
                description: `${task.model} · 已归档 ${asset.assetId}`,
                kind: "image",
                prompt: task.prompt,
                model: task.model,
                providerConnectionId: task.providerConnectionId,
                imageEditDraft: task.imageEdit?.document,
                imageEditContext: imageResultContext(task, asset.assetId),
                assetId: asset.assetId,
                parentAssetId: asset.parentId,
                preview: asset.preview,
                generationStatus: "ready",
                updatedAt: Date.now(),
                result: {
                  id,
                  kind: "image",
                  title: `图片结果 ${output.index + 1}`,
                  src: asset.preview,
                  description: `来自 ${task.providerName ?? "已配置模型"} 的已归档图片结果`,
                  source: "provider",
                },
              };
              const existing = createdItems.findIndex(
                (candidate) => candidate.id === id,
              );
              if (existing >= 0) createdItems[existing] = item;
              else createdItems.push(item);
              setAssets((current) => {
                if (current.some((entry) => entry.id === asset.assetId))
                  return current;
                return [
                  ...current,
                  {
                    id: asset.assetId,
                    name: `AI 结果 ${current.length + 1}`,
                    type: "image" as const,
                    tag: "AI生成",
                    createdAt: asset.provenance.generatedAt,
                    src: asset.preview,
                    isAiGenerated: asset.isAiGenerated ?? true,
                    provider: asset.provenance.provider,
                    model: asset.provenance.model,
                    promptHash: asset.promptHash,
                    parentId: asset.parentId,
                    sourceTaskId: asset.sourceJobId,
                    providerConnectionId: asset.provenance.connectionId,
                    c2paPresent: asset.provenance.c2paPresent,
                    synthIdSignal: asset.provenance.synthIdSignal,
                    originCount: asset.origins?.length ?? 1,
                    sha256: asset.sha256,
                    source: asset.source ?? "provider",
                  },
                ];
              });
            } catch (error) {
              output.status =
                error instanceof ImageEditMappingError ? "failed" : "unknown";
              output.error =
                error instanceof ImageEditMappingError
                  ? error.message
                  : "原生任务已完成，但本地素材原件读取失败。";
            }
          }
          const uncertain =
            record.status === "unknown" ||
            outputs.some((output) => output.status === "unknown");
          const completed = outputs.filter(
            (output) => output.status === "succeeded",
          ).length;
          const terminal =
            record.status === "succeeded" || record.status === "failed";
          const completeArchivedEvidence =
            completed === task.requestedOutputs && terminal;
          const status = uncertain
            ? ("unknown" as const)
            : completeArchivedEvidence
              ? "succeeded"
              : record.status === "succeeded"
                ? completed === task.requestedOutputs
                  ? "succeeded"
                  : "partial"
                : record.status === "failed"
                  ? completed > 0
                    ? "partial"
                    : "failed"
                  : "running";
          publish(
            status,
            uncertain
              ? (outputs.find((output) => output.status === "unknown")?.error ??
                  record.failure ??
                  "原生任务受理状态不明，请先核对供应商；不会自动重复提交。")
              : terminal && status === "failed"
                ? (record.failure ?? "原生任务失败，可检查供应商后重试。")
                : undefined,
            uncertain || status === "running"
              ? uncertain
                ? "unknown"
                : "submitted"
              : "terminal",
          );
          await flushPublishedResult();
          setResultSaving(false);
          return record;
        };
        if (
          nativeCancelRequested.current.has(taskId) ||
          controller.signal.aborted
        ) {
          nativeCancelRequested.current.add(taskId);
          await cancelNativeTask(task.id).catch(() => undefined);
          nativeRecord = (await getNativeTask(task.id)) ?? {
            ...nativeRecord,
            status: "unknown",
            failure:
              "已请求取消原生任务，供应商最终状态仍需核对；不会普通重试。",
          };
          if (nativeRecord.status === "submitted")
            nativeRecord = {
              ...nativeRecord,
              status: "unknown",
              failure:
                "已请求取消原生任务，供应商最终状态仍需核对；不会普通重试。",
            };
          await applyNativeRecord(nativeRecord);
          return;
        }
        nativeRecord = await applyNativeRecord(nativeRecord);
        while (nativeRecord.status === "submitted") {
          if (controller.signal.aborted) {
            if (nativeCancelRequested.current.has(taskId)) {
              await applyNativeRecord({
                ...nativeRecord,
                status: "unknown",
                failure:
                  "已请求取消原生任务，供应商最终状态仍需核对；不会普通重试。",
              });
              return;
            }
            throw new Error("任务已停止。");
          }
          await new Promise((resolve) => window.setTimeout(resolve, 500));
          nativeRecord = (await getNativeTask(task.id)) ?? {
            ...nativeRecord,
            status: "unknown",
            failure:
              "Desktop TaskHost 中没有找到原任务记录，请先核对供应商；不会自动重复提交。",
          };
          nativeRecord = await applyNativeRecord(nativeRecord);
        }
        return;
      }
      publish("running", undefined, "submitted");
      await persistence.flush();
      durableSubmission = true;
      if (task.kind === "text") {
        const text = await generateText({
          prompt: task.prompt,
          model: task.model,
          providerBaseUrl: task.providerBaseUrl,
          protocol: task.providerProtocol,
          authMode: task.providerAuthMode,
          credentialRef: task.providerCredentialRef,
          idempotencyKey: task.idempotencyKey,
          signal: controller.signal,
          beforeRequest: () => {
            assertTextCurrent();
            reservation!.assertCurrent();
          },
          onRequestStart: () => {
            providerRequestStarted = true;
          },
          onText: (value) => {
            if (controller.signal.aborted) return;
            outputs[0] = { ...outputs[0], text: value };
            publish("running", undefined, "submitted");
          },
        });
        if (controller.signal.aborted) throw new Error("任务已停止。");
        createdItems.push(
          textTaskResult(projectId, task, outputs[0].index, text),
        );
        outputs[0] = {
          ...outputs[0],
          status: "succeeded",
          text,
          error: undefined,
        };
        publish("succeeded", undefined, "terminal");
        await flushPublishedResult();
        if (task.providerConnectionId && reservation?.healthUnchanged())
          markProviderConnectionHealthy(task.providerConnectionId);
        return;
      }
      const generated = await generateImages({
        prompt: compiledPrompt,
        model: task.model,
        attachments: task.attachments,
        signal: controller.signal,
        providerBaseUrl: task.providerBaseUrl,
        credentialRef: task.providerCredentialRef,
        count: pendingIndices.length,
        idempotencyKey: `${task.idempotencyKey}-remaining-${pendingIndices.join("-")}`,
        size: task.imageSize,
        maskAssetId: task.imageEdit?.nativeMask
          ? task.imageEdit.maskAssetId
          : undefined,
        beforeRequest: () => reservation!.assertCurrent(),
        onRequestStart: () => {
          providerRequestStarted = true;
        },
        onChunk: async (sources, offset) => {
          setResultSaving(true);
          const archived = await mapWithConcurrency(
            sources,
            2,
            async (source, sourceIndex) => {
              try {
                const protectedSource = await composeEditResult(
                  task,
                  source,
                  creationRef.current.projects.find((p) => p.id === projectId)
                    ?.tasks ?? [],
                  controller.signal,
                );
                return await storeGeneratedAsset({
                  source: protectedSource,
                  provider: task.providerName,
                  model: task.model,
                  sourceJobId: task.id,
                  connectionId: task.providerConnectionId,
                  promptHash,
                  parentId:
                    task.imageEdit?.sourceAssetId ??
                    task.attachments.find((attachment) => attachment.assetId)
                      ?.assetId,
                  tags: ["AI生成", task.providerName ?? ""],
                  signal: controller.signal,
                });
              } catch (error) {
                const target = pendingIndices[offset + sourceIndex];
                if (target != null) {
                  if (error instanceof ImageEditMappingError)
                    mappingFailures.set(target, error.message);
                  else archiveFailureIndices.add(target);
                }
                return null;
              }
            },
          );
          archived.forEach((asset, index) => {
            const target = pendingIndices[offset + index];
            if (!asset || target == null) return;
            outputs = outputs.map((output) =>
              output.index === target
                ? {
                    ...output,
                    status: "succeeded",
                    assetId: asset.assetId,
                    model: task.model,
                    provider: task.providerName,
                    promptHash,
                    error: undefined,
                    createdAt: Date.now(),
                  }
                : output,
            );
            const id = `${projectId}-${taskId}-result-${target + 1}`;
            createdItems.push({
              id,
              title: `图片结果 ${target + 1}`,
              description: `${task.model} · 已归档 ${asset.assetId}`,
              kind: "image",
              prompt: task.prompt,
              model: task.model,
              providerConnectionId: task.providerConnectionId,
              imageEditDraft: task.imageEdit?.document,
              imageEditContext: imageResultContext(task, asset.assetId),
              assetId: asset.assetId,
              parentAssetId: asset.parentId,
              preview: asset.preview,
              generationStatus: "ready",
              updatedAt: Date.now(),
              result: {
                id,
                kind: "image",
                title: `图片结果 ${target + 1}`,
                src: asset.preview,
                description: `来自 ${task.providerName ?? "已配置模型"} 的已归档图片结果`,
                source: "provider",
              },
            });
          });
          setAssets((current) => {
            const seen = new Set(current.map((asset) => asset.id));
            const additions = archived.flatMap((asset) => {
              if (!asset) return [];
              seen.add(asset.assetId);
              return [
                {
                  id: asset.assetId,
                  name:
                    current.find((item) => item.id === asset.assetId)?.name ??
                    `AI 结果 ${seen.size}`,
                  type: "image" as const,
                  tag: "AI生成",
                  createdAt: asset.provenance.generatedAt,
                  src: asset.preview,
                  isAiGenerated: asset.isAiGenerated ?? true,
                  provider: asset.provenance.provider,
                  model: asset.provenance.model,
                  promptHash: asset.promptHash,
                  parentId: asset.parentId,
                  sourceTaskId: asset.sourceJobId,
                  providerConnectionId: asset.provenance.connectionId,
                  c2paPresent: asset.provenance.c2paPresent,
                  synthIdSignal: asset.provenance.synthIdSignal,
                  originCount: asset.origins?.length ?? 1,
                  sha256: asset.sha256,
                  source: asset.source ?? "provider",
                },
              ];
            });
            return Array.from(
              new Map(
                [...current, ...additions].map((asset) => [asset.id, asset]),
              ).values(),
            );
          });
          publish("running");
          setResultSaving(false);
        },
      });
      if (controller.signal.aborted) throw new Error("任务已停止。");
      outputs = markArchiveFailuresUnknown(
        outputs,
        archiveFailureIndices,
        "供应商结果已返回，但本地素材归档失败；请先核对素材库，不会自动重复提交。",
      ).map((output) =>
        output.status === "succeeded" || output.status === "unknown"
          ? output
          : {
              ...output,
              status:
                durableSubmission &&
                generated.failure instanceof GenerationProviderError &&
                generated.failure.failureClass === "network"
                  ? "unknown"
                  : "failed",
              promptHash,
              error: mappingFailures.get(output.index) ?? "此项尚未归档。",
            },
      );
      const completed = outputs.filter(
        (output) => output.status === "succeeded",
      ).length;
      const status =
        completed === task.requestedOutputs
          ? "succeeded"
          : completed > 0
            ? "partial"
            : "failed";
      const generatedUncertain =
        durableSubmission &&
        generated.failure instanceof GenerationProviderError &&
        generated.failure.failureClass === "network";
      const archiveUncertain = outputs.some(
        (output) =>
          output.status === "unknown" &&
          archiveFailureIndices.has(output.index),
      );
      const finalStatus =
        generatedUncertain || archiveUncertain ? ("unknown" as const) : status;
      publish(
        finalStatus,
        archiveUncertain
          ? "供应商结果已返回，但本地素材归档失败；请先核对素材库，不会自动重复提交。"
          : generatedUncertain
            ? "供应商受理状态不明，请先核对供应商；为避免重复扣费，当前不会普通重试。"
            : status === "succeeded"
              ? undefined
              : generated.failure instanceof ProviderSubmissionError
                ? generated.failure.message
                : generated.failure instanceof GenerationProviderError &&
                    generated.failure.failureClass === "rate_limited"
                  ? `${generated.failure.message} ${capacitySwitchHint(
                      task.providerConnectionId,
                    )}`
                  : (mappingFailures.values().next().value ??
                    `${completed}/${task.requestedOutputs} 张已归档，可重试未归档结果。`),
        generatedUncertain || archiveUncertain ? "unknown" : "terminal",
      );
      await flushPublishedResult();
      if (task.providerConnectionId) {
        const failure = generated.failure;
        if (
          failure instanceof GenerationProviderError &&
          [
            "rate_limited",
            "unauthorized",
            "forbidden",
            "provider_unavailable",
            "network",
          ].includes(failure.failureClass)
        )
          markProviderConnectionFailure(
            task.providerConnectionId,
            {
              kind: failure.failureClass as
                | "rate_limited"
                | "unauthorized"
                | "forbidden"
                | "provider_unavailable"
                | "network",
              retryAfterSeconds: failure.retryAfterSeconds,
            },
            taskProviderOptions(task),
          );
        else if (
          !failure &&
          !archiveUncertain &&
          reservation?.healthUnchanged()
        )
          markProviderConnectionHealthy(
            task.providerConnectionId,
            taskProviderOptions(task),
          );
      }
    } catch (error) {
      // A failed project save cannot undo a completed generation receipt.
      if (terminalSaveFailed) return;
      const uncertain =
        abortedAfterProviderSubmission({
          durableSubmission,
          providerRequestStarted,
          nativeTaskHost,
          aborted: controller.signal.aborted,
        }) ||
        (nativeTaskHost &&
          submissionMayHaveBeenAccepted({
            durableSubmission,
            providerRequestStarted,
            nativeTaskHost,
            nativeSubmissionStarted,
          })) ||
        (durableSubmission &&
          (providerRequestStarted || nativeTaskHost) &&
          (error instanceof GenerationProviderError
            ? error.failureClass === "network"
            : !(error instanceof ProviderSubmissionError)));
      const nativeCancelUncertain =
        nativeTaskHost &&
        nativeCancelRequested.current.has(taskId) &&
        Boolean(nativeTaskRecords.current[taskId]);
      const paused = controller.signal.reason === "paused";
      const status =
        uncertain || nativeCancelUncertain
          ? ("unknown" as const)
          : paused
            ? "queued"
            : controller.signal.aborted
              ? "cancelled"
              : !navigator.onLine
                ? "offline"
                : "failed";
      const message =
        uncertain || nativeCancelUncertain
          ? "供应商受理状态不明，请先核对供应商；为避免重复扣费，当前不会普通重试。"
          : paused
            ? "已暂停；已归档结果保留，恢复只提交剩余输出。"
            : controller.signal.aborted
              ? "已取消任务，已归档结果保留。"
              : error instanceof Error
                ? error instanceof GenerationProviderError &&
                  error.failureClass === "rate_limited"
                  ? `${error.message} ${capacitySwitchHint(
                      task.providerConnectionId,
                    )}`
                  : error.message
                : "任务失败，请重试。";
      outputs = outputs.map((output) =>
        output.status === "succeeded"
          ? output
          : {
              ...output,
              status:
                uncertain || nativeCancelUncertain
                  ? "unknown"
                  : paused
                    ? "waiting"
                    : controller.signal.aborted
                      ? "cancelled"
                      : "failed",
              error: message,
            },
      );
      publish(
        status,
        message,
        uncertain || nativeCancelUncertain
          ? "unknown"
          : durableSubmission
            ? "terminal"
            : "intent",
      );
      await persistence.flush().catch(() => undefined);
      if (
        task.providerConnectionId &&
        reservation &&
        !controller.signal.aborted &&
        error instanceof GenerationProviderError &&
        [
          "rate_limited",
          "unauthorized",
          "forbidden",
          "provider_unavailable",
          "network",
        ].includes(error.failureClass)
      ) {
        markProviderConnectionFailure(
          task.providerConnectionId,
          {
            kind: error.failureClass as
              | "rate_limited"
              | "unauthorized"
              | "forbidden"
              | "provider_unavailable"
              | "network",
            retryAfterSeconds: error.retryAfterSeconds,
          },
          taskProviderOptions(task),
        );
      }
    } finally {
      setResultSaving(false);
      try {
        await reservation?.release();
      } catch {
        // A failed release cannot silently submit another request: the live
        // browser lock remains held until the task document terminates.
      }
      if (taskControllers.current[taskId] === controller)
        delete taskControllers.current[taskId];
      if (task.imageEdit && !controller.signal.aborted) {
        const latest = creationRef.current.projects.find(
          (p) => p.id === projectId,
        );
        const next = latest?.tasks.find(
          (t) =>
            t.id !== task.id &&
            t.imageEdit?.groupId === task.imageEdit?.groupId &&
            t.status === "queued" &&
            t.submissionState !== "submitted" &&
            t.submissionState !== "unknown",
        );
        if (next) void executeTask(projectId, next.id);
      }
    }
  }
  function cancelTask(taskId: string): void {
    for (const project of creationRef.current.projects) {
      const groupId = project.tasks.find((t) => t.id === taskId)?.imageEdit
        ?.groupId;
      if (groupId)
        updateProject(project.id, (current) => ({
          ...current,
          tasks: current.tasks.map((t) =>
            t.id !== taskId &&
            t.imageEdit?.groupId === groupId &&
            t.status === "queued"
              ? {
                  ...t,
                  status: "cancelled",
                  submissionState: "terminal",
                  error: "本轮区域重绘已取消，成功候选保留。",
                  outputs: t.outputs?.map((o) => ({
                    ...o,
                    status: "cancelled",
                  })),
                }
              : t,
          ),
        }));
    }
    pausedTaskIds.current.delete(taskId);
    const controller = taskControllers.current[taskId];
    if (controller) {
      if (usesNativeTaskHost()) {
        nativeCancelRequested.current.add(taskId);
        if (nativeTaskRecords.current[taskId])
          void cancelNativeTask(taskId).catch(() => undefined);
      }
      controller.abort("user");
      return;
    }
    const recovered = creationRef.current.projects
      .flatMap((project) => project.tasks)
      .find(
        (task) =>
          task.id === taskId &&
          (task.submissionState === "submitted" ||
            task.submissionState === "unknown"),
      );
    if (usesNativeTaskHost() && recovered) {
      void cancelNativeTask(taskId).catch(() => undefined);
      return;
    }
    const project = creationRef.current.projects.find((item) =>
      item.tasks.some((task) => task.id === taskId && task.status === "queued"),
    );
    if (!project) return;
    const sourceItemId =
      project.tasks.find((task) => task.id === taskId)?.sourceItemId ??
      rootItemId(project);
    updateProject(project.id, (current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === sourceItemId
          ? { ...item, generationStatus: undefined }
          : item,
      ),
      tasks: current.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: "cancelled",
              error: "任务已取消，已归档的成功结果保留。",
              outputs: outputsForTask(task).map((output) =>
                output.status === "succeeded"
                  ? output
                  : { ...output, status: "cancelled" },
              ),
              updatedAt: Date.now(),
            }
          : task,
      ),
    }));
    if (activeProjectIdRef.current === project.id) {
      const latest = creationRef.current.projects.find(
        (item) => item.id === project.id,
      );
      if (latest) replaceCanvasItems(latest.items);
    }
    if (pendingApproval?.taskId === taskId) setPendingApproval(null);
  }
  function resolveTaskApproval(approved: boolean): void {
    if (!pendingApproval) return;
    const project = creationRef.current.projects.find(
      (item) => item.id === pendingApproval.projectId,
    );
    if (!project) {
      setPendingApproval(null);
      return;
    }
    if (
      !approved &&
      project.tasks.find((task) => task.id === pendingApproval.taskId)
        ?.imageEdit
    ) {
      pendingApprovalRef.current = null;
      cancelTask(pendingApproval.taskId);
      setPendingApproval(null);
      return;
    }
    const nextProject: CreationProject = {
      ...project,
      items: approved
        ? project.items
        : project.items.map((item) =>
            item.id ===
            (project.tasks.find((task) => task.id === pendingApproval.taskId)
              ?.sourceItemId ?? rootItemId(project))
              ? { ...item, generationStatus: undefined }
              : item,
          ),
      tasks: project.tasks.map((task) =>
        task.id === pendingApproval.taskId
          ? {
              ...task,
              approvedGates: approved
                ? [
                    ...new Set([
                      ...(task.approvedGates ?? []),
                      ...pendingApproval.gates,
                    ]),
                  ]
                : [],
              status: approved ? "queued" : "cancelled",
              error: approved ? undefined : "人工审批已取消，未发送远程请求。",
              outputs: task.outputs?.map((output) => ({
                ...output,
                status: approved ? "waiting" : "cancelled",
              })),
              updatedAt: Date.now(),
            }
          : task,
      ),
    };
    updateProject(project.id, () => nextProject);
    if (activeProjectIdRef.current === project.id)
      replaceCanvasItems(nextProject.items);
    setPendingApproval(null);
    pendingApprovalRef.current = null;
    if (approved)
      void executeTask(project.id, pendingApproval.taskId, nextProject);
  }
  function pauseTask(taskId: string): void {
    pausedTaskIds.current.add(taskId);
    taskControllers.current[taskId]?.abort("paused");
  }
  function resumeTask(taskId: string): void {
    const project = creationRef.current.projects.find((item) =>
      item.tasks.some((task) => task.id === taskId),
    );
    if (!project || taskControllers.current[taskId]) return;
    pausedTaskIds.current.delete(taskId);
    void executeTask(project.id, taskId, project, true);
  }
  function regenerateImageTask(projectId: string, taskId: string): void {
    const project = creationRef.current.projects.find(
        (p) => p.id === projectId,
      ),
      task = project?.tasks.find((t) => t.id === taskId);
    if (
      !project ||
      !task ||
      task.kind !== "image" ||
      task.status !== "succeeded" ||
      project.tasks.some((t) => ["queued", "running"].includes(t.status))
    )
      return;
    const regenerated = imageRegeneration(task),
      next = {
        ...project,
        tasks: [...project.tasks, regenerated],
        updatedAt: Date.now(),
      };
    commitCreation({
      ...creationRef.current,
      projects: creationRef.current.projects.map((p) =>
        p.id === projectId ? next : p,
      ),
    });
    void executeTask(projectId, regenerated.id, next, true);
  }
  function retryTask(
    projectId: string,
    oldTaskId: string,
    outputIndex?: number,
  ): void {
    const project = creationRef.current.projects.find(
      (item) => item.id === projectId,
    );
    const oldTask = project?.tasks.find((item) => item.id === oldTaskId);
    if (!project || !oldTask || taskControllers.current[oldTaskId]) return;
    if (!canRetryTask(oldTask)) return;
    let rootTask = oldTask;
    let targetIndices = retryableOutputIndices(
      oldTask,
      outputsForTask(oldTask),
      outputIndex,
    );
    const visited = new Set<string>();
    while (rootTask.retryOfTaskId && !visited.has(rootTask.id)) {
      visited.add(rootTask.id);
      const parent = project.tasks.find(
        (candidate) => candidate.id === rootTask.retryOfTaskId,
      );
      if (!parent) break;
      targetIndices = targetIndices.map(
        (index) => rootTask.retryOutputIndices?.[index] ?? index,
      );
      rootTask = parent;
    }
    const rootOutputs = outputsForTask(rootTask);
    targetIndices = targetIndices.filter((index) =>
      retryableOutputIndices(rootTask, rootOutputs, index).includes(index),
    );
    const busyIndices = new Set(
      retryBlockedOutputIndices(project.tasks, rootTask.id),
    );
    targetIndices = targetIndices.filter((index) => !busyIndices.has(index));
    if (!targetIndices.length) return;
    if (!oldTask.providerBaseUrl) {
      commitCreation({
        ...creationRef.current,
        projects: creationRef.current.projects.map((item) =>
          item.id === projectId
            ? {
                ...item,
                composerDraft: {
                  ...item.composerDraft,
                  prompt: oldTask.prompt,
                  updatedAt: Date.now(),
                },
                updatedAt: Date.now(),
              }
            : item,
        ),
      });
      setSettingsSection("providers");
      setModal("settings");
      return;
    }
    const now = Date.now();
    const retry = {
      ...oldTask,
      id: `${projectId}-task-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      status: "queued" as const,
      error: undefined,
      resultItemId: undefined,
      completedOutputs: 0,
      submissionState: "intent" as const,
      submittedAt: undefined,
      requestedOutputs: targetIndices.length,
      estimatedCostUsd: undefined,
      outputs: Array.from(
        {
          length: targetIndices.length,
        },
        (_, index) => ({
          index,
          status: "waiting" as const,
          model: oldTask.model,
          provider: oldTask.providerName,
          createdAt: now,
        }),
      ),
      idempotencyKey:
        oldTask.status === "interrupted" && oldTask.submissionState === "intent"
          ? oldTask.idempotencyKey
          : `${projectId}-generation-${now.toString(36)}-retry-${oldTask.attempt + 1}`,
      batchId: `${oldTask.batchId ?? `${projectId}-batch`}-retry-${oldTask.attempt + 1}`,
      attempt: oldTask.attempt + 1,
      approvedGates: [],
      retryOfTaskId: rootTask.id,
      retryOutputIndices: targetIndices,
      createdAt: now,
      updatedAt: now,
    };
    const nextProject = {
      ...project,
      tasks: [...project.tasks, retry],
      items: project.items.map((item) =>
        item.id === (retry.sourceItemId ?? rootItemId(project))
          ? { ...item, generationStatus: "pending" as const }
          : item,
      ),
      updatedAt: now,
    };
    commitCreation({
      ...creationRef.current,
      projects: creationRef.current.projects.map((item) =>
        item.id === projectId ? nextProject : item,
      ),
    });
    if (activeProjectIdRef.current === projectId)
      replaceCanvasItems(nextProject.items);
    void executeTask(projectId, retry.id, nextProject);
  }
  async function submitImageCommand(
    request:
      | {
          origin: "home" | "chat" | "agent" | "plugin";
          input: CreateProjectInput;
        }
      | { origin: "canvas"; input: CanvasImageRequest },
    onAccepted?: (taskId: string) => void,
  ): Promise<string | undefined> {
    if (submitLock.current) return "正在提交图片任务，请稍候。";
    if (!["saved", "saving"].includes(persistence.state))
      return "请先处理项目读取或保存提示，当前未提交生成。";
    const projectId =
      request.origin === "home" ? undefined : activeProjectIdRef.current;
    const original = creationRef.current.projects.find(
      (project) => project.id === projectId,
    );
    if (request.origin !== "home" && !original) return "请先新建或打开项目。";
    const activeTask = original?.tasks.find(
      (task) => task.status === "queued" || task.status === "running",
    );
    const codexCanvas =
      request.origin === "canvas" &&
      original?.items.some(
        (item) =>
          item.id === request.input.sourceItemId &&
          item.generationSource === "codex",
      );
    const requestModel =
      request.origin === "canvas" ? request.input.model : request.input.model;
    let effectivePrompt = request.input.prompt;
    if (request.origin === "canvas" && request.input.imageEdit) {
      try {
        const compiled = compileEditPrompt(
          effectivePrompt,
          request.input.imageEdit.document,
        );
        if (!effectivePrompt.trim() && compiled.instructions.length)
          effectivePrompt = "按已确认的区域修改意见编辑图片。";
      } catch (error) {
        return error instanceof Error ? error.message : "区域引用无效。";
      }
    }
    const uiState = getGenerationUiState({
      prompt: effectivePrompt,
      inputValid: Boolean(effectivePrompt.trim()),
      modelConfigured:
        request.origin === "agent" || codexCanvas || homeModelConfig.configured,
      quotaAvailable: true,
      online: typeof navigator === "undefined" ? true : navigator.onLine,
      serviceConfigured:
        request.origin === "agent" ||
        codexCanvas ||
        (homeModelConfig.configured && Boolean(requestModel.trim())),
      taskStatus: activeTask
        ? activeTask.status === "queued"
          ? "queued"
          : "running"
        : undefined,
    });
    if (uiState !== "ready" && request.origin !== "agent")
      return getDisabledReason(uiState) ?? "当前任务暂不可提交。";
    const signal =
      request.origin === "canvas" ? request.input.signal : undefined;
    const draftAtStart = creationRef.current.homeDraft;
    submitLock.current = true;
    try {
      let sourceItemId = original
        ? (rootItemId(original) ?? undefined)
        : undefined;
      let input: CreateProjectInput;
      let editSource: CanvasCollectionItem | undefined;
      let sourceSignature: string | undefined;
      const canvasSignature = (project: CreationProject, id: string) =>
        JSON.stringify({
          items: project.items.filter(
            (item) =>
              item.id === id ||
              project.canvas.edges.some(
                (edge) =>
                  edge.target === id &&
                  edge.kind !== "result" &&
                  edge.source === item.id,
              ),
          ),
          edges: project.canvas.edges.filter(
            (edge) => edge.target === id && edge.kind !== "result",
          ),
        });
      if (request.origin === "canvas") {
        sourceItemId = request.input.sourceItemId;
        const source = original!.items.find((item) => item.id === sourceItemId);
        editSource = source;
        if (!source || (source.kind !== "image" && source.kind !== "text"))
          return "来源节点已删除或不支持，当前未提交生成。";
        sourceSignature = canvasSignature(original!, source.id);
        if (source.generationSource === "codex") {
          if (request.input.imageEdit?.document.regions.length)
            return "Codex 卡片暂不支持局部区域编辑，请选择支持编辑的 API 连接。";
          const validate = () => {
            if (signal?.aborted) return "已取消提交，草稿和参考图已保留。";
            const current = creationRef.current.projects.find(
              (project) => project.id === projectId,
            );
            if (!current || activeProjectIdRef.current !== projectId)
              return "项目已切换，当前未提交生成。";
            if (
              current.tasks.some(
                (task) => task.status === "queued" || task.status === "running",
              )
            )
              return "已有任务正在执行，当前未重复提交。";
            if (canvasSignature(current, source.id) !== sourceSignature)
              return "节点或参考图在检查期间发生变化，请重新提交；当前内容已保留。";
            return undefined;
          };
          const beforeRead = validate();
          if (beforeRead) return beforeRead;
          const attachments = await canvasImageAttachments(original!, source);
          if (source.kind === "text" && attachments.length)
            return "Codex 文本卡片暂不接收参考图片，请在右侧 Agent 面板提交。";
          const afterRead = validate();
          if (afterRead) return afterRead;
          return agentConnection.generateFromCanvas({
            nodeId: source.id,
            prompt: request.input.prompt,
            model: request.input.model,
            count: request.input.count,
            kind: source.kind,
            attachments: attachments.map((attachment) => ({
              ...attachment,
              canvasNodeId: attachment.id,
            })),
            signal,
            validate,
          });
        }
        input = {
          prompt: request.input.prompt,
          model: request.input.model,
          providerConnectionId: source.providerConnectionId,
          kind: source.kind,
          attachments:
            source.kind === "text"
              ? []
              : await canvasImageAttachments(original!, source),
          outputCount: request.input.count,
          privacyMode: original!.composerDraft.privacyMode,
          imageSize:
            source.kind === "text" || source.assetId
              ? undefined
              : source.parameters?.imageSize,
          imageOperation:
            request.input.imageEdit?.document.regions.length &&
            imageCapabilitiesForSelection(
              {
                source: "api",
                model: request.input.model,
                connectionId:
                  source.providerConnectionId ??
                  original!.composerDraft.providerConnectionId,
              },
              readProviderConnections(),
            ).operations.inpaint === "supported"
              ? "inpaint"
              : undefined,
        };
      } else input = structuredClone(request.input);
      if (signal?.aborted) return "已取消提交，草稿和参考图已保留。";
      // Connection preflight needs a non-empty prompt. Keep that placeholder
      // out of the real edit compiler: structured opinions belong to each crop.
      const connection = await prepareImageTask(
        { ...input, prompt: effectivePrompt },
        original,
      );
      const editRequest =
        request.origin === "canvas"
          ? (request.input.imageEdit ??
            (editSource?.assetId && editSource.kind === "image"
              ? { document: { width: 1, height: 1, regions: [] } }
              : undefined))
          : undefined;
      const editInputs =
        editRequest && editSource && original
          ? await prepareEditInputs(
              input,
              editSource,
              original,
              connection,
              editRequest,
              signal,
            )
          : [input];
      for (const editInput of editInputs)
        await prepareImageTask(editInput, original);
      if (signal?.aborted) return "已取消提交，草稿和参考图已保留。";
      const current = projectId
        ? creationRef.current.projects.find(
            (project) => project.id === projectId,
          )
        : undefined;
      if (projectId && (!current || activeProjectIdRef.current !== projectId))
        return "项目已切换，当前未提交生成。";
      if (
        current?.tasks.some(
          (task) => task.status === "queued" || task.status === "running",
        )
      )
        return "已有任务正在执行，当前未重复提交。";
      if (
        sourceSignature &&
        current &&
        canvasSignature(current, sourceItemId!) !== sourceSignature
      )
        return "节点或参考图在检查期间发生变化，请重新提交；当前内容已保留。";
      const base = current ?? createProject(input);
      sourceItemId ??= rootItemId(base) ?? undefined;
      const appended = appendImageTask(
        base,
        editInputs[0],
        connection,
        sourceItemId,
      );
      let nextProject = appended.project;
      for (const editInput of editInputs.slice(1))
        nextProject = appendImageTask(
          nextProject,
          editInput,
          connection,
          sourceItemId,
        ).project;
      if (request.origin === "chat")
        nextProject = {
          ...nextProject,
          prompt: input.prompt,
          attachments: input.attachments,
          composerDraft:
            current!.composerDraft.prompt === input.prompt
              ? { ...current!.composerDraft, prompt: "", updatedAt: Date.now() }
              : current!.composerDraft,
          messages: [
            ...current!.messages,
            {
              id: `${base.id}-message-${appended.task.id}`,
              role: "user",
              content: input.prompt,
              createdAt: Date.now(),
            },
          ],
        };
      commitCreation({
        ...creationRef.current,
        projects: current
          ? creationRef.current.projects.map((project) =>
              project.id === projectId ? nextProject : project,
            )
          : [nextProject, ...creationRef.current.projects],
        activeProjectId: current
          ? creationRef.current.activeProjectId
          : base.id,
        homeDraft:
          request.origin === "home" &&
          creationRef.current.homeDraft === draftAtStart
            ? emptyDraft()
            : creationRef.current.homeDraft,
      });
      if (!current || activeProjectIdRef.current === projectId)
        replaceCanvasItems(nextProject.items);
      if (!current) setActive("workspace");
      // The queued task and its stable idempotency key must survive a crash
      // before any provider request is allowed to start.
      await persistence.flush();
      if (
        signal?.aborted ||
        (projectId && activeProjectIdRef.current !== projectId)
      ) {
        cancelTask(appended.task.id);
        return "已取消提交，任务未发送。";
      }
      onAccepted?.(appended.task.id);
      void executeTask(nextProject.id, appended.task.id, nextProject);
      return undefined;
    } catch (error) {
      if (error instanceof ImageTaskCommandError && error.configure) {
        setSettingsSection("providers");
        setModal("settings");
      }
      return error instanceof Error
        ? error.message
        : "无法提交图片任务，当前草稿已保留。";
    } finally {
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
    if (submitLock.current) return "正在开始创作，请稍候。";
    if (!["saved", "saving"].includes(saveStateRef.current))
      return "请先处理项目读取或保存提示，当前未提交生成。";
    if (!input.prompt.trim() || input.prompt.length > 4000)
      return "请输入 1 至 4,000 字的创作提示词。";
    if (input.privacyMode && input.privacyMode !== "byok_local")
      return "当前隐私模式不允许 Codex 账号调用，草稿与参考图已保留。";
    if (!navigator.onLine) return "当前离线，草稿与参考图已保留。";
    const state = agentConnection.getState();
    if (state.sending || state.preparing || state.pendingApproval)
      return "请先完成或停止当前 Agent 任务，再开始新项目。";
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
      const project = {
        ...created,
        composerDraft: {
          ...created.composerDraft,
          prompt: input.prompt.trim(),
          pendingAgent: true,
          conversationChannel: "codex" as const,
        },
      };
      commitCreation({
        ...creationRef.current,
        projects: [project, ...creationRef.current.projects],
        activeProjectId: project.id,
      });
      activeProjectIdRef.current = project.id;
      activePageRef.current = "workspace";
      setActive("workspace");
      setChat(true);
      replaceCanvasItems(project.items);
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
      const result = await agentConnection.sendMessage(input.prompt.trim(), {
        selection,
        outputCount: input.outputCount,
        attachments,
        canvasSource: { nodeId: project.items[0].id, kind: "image" },
      });
      if (!result.ok) return result.error ?? "发送未确认，草稿仍保留。";
      updateProject(project.id, (current) => ({
        ...current,
        composerDraft: {
          ...current.composerDraft,
          prompt: "",
          attachments: [],
          pendingAgent: undefined,
        },
      }));
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
  function handleProjectDraftChange(draft: CreationDraft): void {
    if (!activeProject) return;
    updateProject(activeProject.id, (project) => ({
      ...project,
      composerDraft: { ...draft, updatedAt: Date.now() },
      updatedAt: Date.now(),
    }));
  }

  function handleProjectModelChange(
    model: string,
    selection?: ModelSelection,
  ): void {
    if (!activeProject) return;
    const updated = {
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
    };
    commitCreation({
      ...creationRef.current,
      projects: creationRef.current.projects.map((project) =>
        project.id === updated.id ? updated : project,
      ),
    });
    replaceCanvasItems(updated.items);
  }
  function handleDeleteMessage(messageId: string): void {
    if (!activeProject) return;
    updateProject(activeProject.id, (project) => ({
      ...project,
      messages: project.messages.filter((message) => message.id !== messageId),
      updatedAt: Date.now(),
    }));
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
    const profile = parseModelProvider(
      localStorage.getItem(MODEL_PROVIDER_STORAGE_KEY),
    ).profile;
    const blank = createProject({
      prompt: "",
      model: profile.model || "kk-image-2",
      kind: "image",
      attachments: [],
    });
    const nextProject: CreationProject = {
      ...blank,
      name: "未命名项目",
      canvas: createProjectCanvas([]),
      items: [],
      messages: [],
      tasks: [],
      favoriteIds: [],
      likedIds: [],
    };
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
    if (!creationRef.current.projects.some((project) => project.id === id))
      return;
    commitCreation({ ...creationRef.current, activeProjectId: id });
    setActive("workspace");
    setModal("");
  }
  function renameSavedProject(id: string, title: string): void {
    if (persistence.state !== "saved" && persistence.state !== "saving") return;
    const name = title.trim().slice(0, 120);
    if (!name) return;
    updateProject(id, (project) => ({
      ...project,
      name,
      updatedAt: Date.now(),
    }));
  }
  async function deleteSavedProject(id: string): Promise<void> {
    if (persistence.state !== "saved" && persistence.state !== "saving") return;
    const project = creationRef.current.projects.find((item) => item.id === id);
    if (!project) return;
    if (projectHasUnsettledTasks(project)) return;
    if (
      !(await confirmAction(
        `确定删除项目「${project.name}」？此操作会从本地项目库移除该项目。`,
      ))
    )
      return;
    const current = creationRef.current;
    const confirmedProject = current.projects.find((item) => item.id === id);
    if (
      !confirmedProject ||
      projectHasUnsettledTasks(confirmedProject) ||
      (saveStateRef.current !== "saved" && saveStateRef.current !== "saving")
    )
      return;
    commitCreation({
      ...current,
      projects: current.projects.filter((item) => item.id !== id),
      activeProjectId:
        current.activeProjectId === id ? null : current.activeProjectId,
    });
    if (current.activeProjectId === id) setActive("projects");
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
    } catch {
      // Browser storage can be denied; retain the default theme preferences.
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
  function open(view: string): void {
    if (view === "skills" || view.startsWith("skills/")) {
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
      return;
    }
    if (view === "new-project") {
      handleNewBlankProject();
      return;
    }
    if (view === "chat") {
      if (modal) {
        setModal("");
        setChat(true);
        setMobileChat(sidebar.narrow);
        return;
      }
      if (active === "workspace" && chat && (!sidebar.narrow || mobileChat)) {
        if (!sidebar.narrow) {
          setChat(false);
          setMobileChat(false);
          return;
        }
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
      return;
    }
    if (["favorites", "tags", "likes"].includes(view)) {
      if (!activeProject) {
        handleNewBlankProject();
      } else setActive("workspace");
      if (view === "likes") setLikesOpen(true);
      else setTagsOpen(true);
      const id = view === "likes" ? "likes" : "tags";
      setActiveCollection(id);
      setCollectionActivation((current) => ({
        ...current,
        [id]: current[id] + 1,
      }));
      setModal("");
      return;
    }
    if (view === "search") {
      setModal(view);
      return;
    }
    if (view === "settings" || view.startsWith("settings/")) {
      const requestedSection = view.split("/")[1];
      const sectionAlias: Record<string, SettingsSection> = {
        plugins: "mcp",
        extensions: "extensions",
        partners: "providers",
        codex: "providers",
        skills: "skill",
        skill: "skill",
        mcp: "mcp",
      };
      setSettingsSection(
        sectionAlias[requestedSection] ??
          SETTINGS_SECTIONS.find((item) => item.id === requestedSection)?.id ??
          "general",
      );
      setModal("settings");
      return;
    }
    if (
      [
        "landing",
        "workspace",
        "projects",
        "skills",
        "comfyui",
        "favorites",
        "likes",
        "search",
      ].includes(view)
    ) {
      if (
        ["landing", "workspace", "projects", "skills", "comfyui"].includes(view)
      )
        setMobileChat(false);
      setActive(view);
      setModal("");
    } else setModal(view);
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
          onRenameProject={renameSavedProject}
          onDeleteProject={deleteSavedProject}
        />
        <main className={"workspace " + (mobileChat ? "chat-mobile" : "")}>
          <CreationStorageNotice
            state={persistence.state}
            message={persistence.message}
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
                  items: activeProject?.items,
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
                  currentModel={activeProject?.model}
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
                  composerDraft={activeProject?.composerDraft}
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
                              .catch(() => undefined);
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
          {["projects", "comfyui"].includes(active) && (
            <DeferredPanelBoundary key={active}>
              <LibraryPage
                key={active}
                view={active as "projects" | "comfyui"}
                onOpen={open}
                projects={creation.projects}
                localWorkflows={localWorkflows}
                onSaveWorkflow={saveWorkflow}
                onDeleteWorkflow={deleteWorkflow}
                onRunWorkflow={(workflow) => {
                  setModal("tasks");
                  window.dispatchEvent(
                    new CustomEvent("kk:comfyui-workflow-requested", {
                      detail: workflow.id,
                    }),
                  );
                }}
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
        <Modal
          title={
            modal === "search"
              ? "搜索"
              : modal === "prompts"
                ? "提示词库"
                : modal === "settings"
                  ? "设置"
                  : modal === "assets"
                    ? "资产管理"
                    : modal === "shortcuts"
                      ? "快捷按键"
                      : modal === "tasks"
                        ? "任务列表"
                        : "使用说明"
          }
          onClose={() => setModal("")}
        >
          <DeferredPanelBoundary key={modal} onClose={() => setModal("")}>
            {modal === "search" ? (
              <CatalogPanel
                items={canvasItems.map((item) => ({
                  ...item,
                  tags: effectiveTags(item.tags, favoriteIds.has(item.id)),
                }))}
                assets={[...assets, ...subjects]}
                onOpen={open}
                projects={creation.projects}
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
                canPauseTask={(taskId) =>
                  Boolean(taskControllers.current[taskId])
                }
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
