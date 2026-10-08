import React, {
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
import Sidebar from "./components/Sidebar";
import type { ModelSelection } from "./features/models/modelSelection";
import { useSidebarLayout } from "./components/useSidebarLayout";
import Canvas from "./components/Canvas";
import ConversationPanel from "./components/ConversationPanel";
import PromptLibraryPanel from "./components/PromptLibraryPanel";
import Modal from "./components/Modal";
import TaskExecutionApproval from "./components/TaskExecutionApproval";
import {
  requiredApprovalGates,
  type ApprovalGate,
} from "./domain/agentWorkflow";
import AssetPanel from "./components/assets/AssetPanel";
import SettingsPanel from "./components/settings/SettingsPanel";
import {
  SETTINGS_SECTIONS,
  type SettingsSection,
} from "./components/settings/SettingsSectionData";
import LibraryPage from "./components/LibraryPage";
import CatalogPanel from "./components/CatalogPanel";
import StartPage from "./components/StartPage";
import SkillsPage, { ensureTemplates } from "./components/SkillsPage";
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

import { pluginLoader } from "./features/plugins/pluginLoader.ts";
import {
  injectPluginCss,
  setPluginRuntime,
} from "./features/plugins/pluginRuntime.ts";
import type { PluginAi } from "./features/plugins/pluginTypes.ts";
import { createAgentHost } from "./features/agent/agentHost.ts";
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
  markProviderConnectionFailure,
  markProviderConnectionHealthy,
  readProviderConnections,
} from "./features/creation/providerRegistry";
import {
  reserveProviderSubmissionAsync,
  assertSubmissionConnection,
  type ProviderSubmissionReservation,
  ProviderSubmissionError,
} from "./features/creation/providerSubmission";
import { mapWithConcurrency } from "./features/creation/generationQueue";
import { compileDesignPrompt } from "./features/creation/promptCompiler";
import { getDisabledReason, getGenerationUiState } from "./domain/uiGovernance";

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
import {
  cancelNativeTask,
  getNativeTask,
  reconcileNativeTasks,
  submitNativeTask,
  validateNativeTaskRecord,
  usesNativeTaskHost,
  type NativeTaskHostRecord,
} from "./features/creation/nativeTaskHost";

import ShortcutsPanel from "./components/ShortcutsPanel";
import InfoPanel from "./components/InfoPanel";
import TaskWorkbench from "./components/TaskWorkbench";
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
import "./styles/workspace.css";
import "./styles/sidebar.css";
import "./styles/account-popup.css";
import "./styles/catalog-pages.css";
// Keep Figma-scoped conversation geometry after the legacy workspace rules.
import "./styles/conversation-panel.css";
import "./styles/model-picker.css";
import "./styles/design-surface.css";
export default function App() {
  const [active, setActive] = useState("landing");
  const [modal, setModal] = useState("");
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
  const [providerVersion, setProviderVersion] = useState(0);
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
    const ids = new Set(canvasItems.map((item) => item.id));
    const removeMissing = (current: Set<string>): Set<string> => {
      const next = new Set([...current].filter((id) => ids.has(id)));
      return next.size === current.size ? current : next;
    };
    setFavoriteIds(removeMissing);
    setLikedIds(removeMissing);
  }, [canvasItems]);
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
      import.meta.env.VITE_KK_AGENT_PROXY === "1" &&
      creation.activeProjectId
    ) {
      agentConnection.setCredentials("/kk-agent", "");
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
      if (task.kind === "text" && !navigator.onLine)
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
              referenceCount: task.attachments.length,
              outputCount: task.requestedOutputs,
            });
      const promptHash = await hashPrompt(compiledPrompt);
      if (controller.signal.aborted) throw new Error("任务已停止。");
      if (!nativeTaskHost)
        reservation = await reserveProviderSubmissionAsync(
          {
            id: task.providerConnectionId,
            baseUrl: task.providerBaseUrl,
            credentialRef: task.providerCredentialRef,
            referenceCount: task.attachments.length,
            kind: task.kind === "text" ? "text" : "image",
            model: task.model,
            outputCount: task.requestedOutputs,
            operation: task.imageEdit?.nativeMask ? "inpaint" : undefined,
            localEdit: Boolean(task.imageEdit),
          },
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
          {
            id: task.providerConnectionId,
            baseUrl: task.providerBaseUrl,
            credentialRef: task.providerCredentialRef,
            referenceCount: task.attachments.length,
            kind: task.kind === "text" ? "text" : "image",
            model: task.model,
            outputCount: task.requestedOutputs,
            operation: task.imageEdit?.nativeMask ? "inpaint" : undefined,
            localEdit: Boolean(task.imageEdit),
          },
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
          kind: task.kind === "text" ? "text" : undefined,
          concurrencyLimit: nativeConnection?.concurrencyLimit,
          taskId: task.id,
          idempotencyKey: task.idempotencyKey,
          baseUrl: task.providerBaseUrl,
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
          await persistence.flush();
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
        await persistence.flush();
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
              error:
                mappingFailures.get(output.index) ??
                "此项尚未归档，可单项重试。",
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
                : (mappingFailures.values().next().value ??
                  `${completed}/${task.requestedOutputs} 张已归档，可重试未归档结果。`),
        generatedUncertain || archiveUncertain ? "unknown" : "terminal",
      );
      await persistence.flush();
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
          markProviderConnectionFailure(task.providerConnectionId, {
            kind: failure.failureClass as
              | "rate_limited"
              | "unauthorized"
              | "forbidden"
              | "provider_unavailable"
              | "network",
            retryAfterSeconds: failure.retryAfterSeconds,
          });
        else if (
          !failure &&
          !archiveUncertain &&
          reservation?.healthUnchanged()
        )
          markProviderConnectionHealthy(task.providerConnectionId);
      }
    } catch (error) {
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
                ? error.message
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
        markProviderConnectionFailure(task.providerConnectionId, {
          kind: error.failureClass as
            | "rate_limited"
            | "unauthorized"
            | "forbidden"
            | "provider_unavailable"
            | "network",
          retryAfterSeconds: error.retryAfterSeconds,
        });
      }
    } finally {
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
    const requestModel =
      request.origin === "canvas" ? request.input.model : request.input.model;
    let effectivePrompt = request.input.prompt;
    if (request.origin === "canvas" && request.input.imageEdit) {
      try {
        const compiled = compileEditPrompt(
          effectivePrompt,
          request.input.imageEdit.document,
        );
        if (!effectivePrompt.trim())
          effectivePrompt = compiled.instructions
            .map((i) => `${i.label}：${i.text}`)
            .join("\n");
      } catch (error) {
        return error instanceof Error ? error.message : "区域引用无效。";
      }
    }
    const uiState = getGenerationUiState({
      prompt: effectivePrompt,
      inputValid: Boolean(effectivePrompt.trim()),
      modelConfigured: request.origin === "agent" || homeModelConfig.configured,
      quotaAvailable: true,
      online: typeof navigator === "undefined" ? true : navigator.onLine,
      serviceConfigured:
        request.origin === "agent" ||
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
          if (
            original!.canvas.edges.some(
              (edge) =>
                edge.target === source.id &&
                edge.kind !== "result" &&
                original!.items.find((item) => item.id === edge.source)
                  ?.kind !== "text",
            ) ||
            source.assetId
          )
            return "Codex 卡片入口暂不接收参考图片，请选择支持编辑的 API 连接。";
          if (signal?.aborted) return "已取消提交";
          return agentConnection.generateFromCanvas({
            nodeId: source.id,
            prompt: request.input.prompt,
            model: request.input.model,
            count: request.input.count,
            kind: source.kind,
          });
        }
        input = {
          prompt: effectivePrompt,
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
      if (
        request.origin === "canvas" &&
        request.input.imageEdit &&
        !input.prompt.trim()
      ) {
        const compiled = compileEditPrompt(
          input.prompt,
          request.input.imageEdit.document,
        );
        input.prompt = compiled.instructions
          .map((i) => `${i.label}：${i.text}`)
          .join("\n");
      }
      if (signal?.aborted) return "已取消提交，草稿和参考图已保留。";
      const connection = await prepareImageTask(input, original);
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
    return submitImageCommand({ origin: "home", input });
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
  function toggleFavorite(id: string): void {
    if (activeProject) {
      const next = new Set(activeProject.favoriteIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setFavoriteIds(next);
      updateProject(activeProject.id, (project) => ({
        ...project,
        favoriteIds: [...next],
        updatedAt: Date.now(),
      }));
      return;
    }
    setFavoriteIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
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
    if (view === "new-project") {
      handleNewBlankProject();
      return;
    }
    if (view === "chat") {
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
      return;
    }
    if (["search", "favorites", "likes"].includes(view)) {
      setModal(view);
      return;
    }
    if (view === "settings" || view.startsWith("settings/")) {
      const requestedSection = view.split("/")[1];
      const sectionAlias: Record<string, SettingsSection> = {
        plugins: "mcp",
        extensions: "mcp",
        partners: "partners",
        skills: "skill",
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
            sidebar.surface === "phone" &&
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
              modelConfigured={homeModelConfig.configured}
              skills={skillRegistry.listRecords()}
              onApplySkill={applySkillToHome}
              defaultModel={homeModelConfig.model}
            />
          )}
          <div className="workspace-content" hidden={active !== "workspace"}>
            <CanvasImageCommandContext.Provider
              value={{
                items: activeProject?.items,
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
                  if (activeProject) regenerateImageTask(activeProject.id, id);
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
                      <strong title={activeProject.name}>
                        {activeProject.name}
                      </strong>
                      {activeProject.tasks.slice(-1).map((task) => (
                        <span
                          key={task.id}
                          className={`project-task-${task.status}`}
                        >
                          {task.status === "queued"
                            ? "排队中"
                            : task.status === "running"
                              ? "正在生成"
                              : task.status === "unknown"
                                ? "受理状态不明 · 请核对供应商"
                                : task.status === "partial"
                                  ? `部分完成（${task.completedOutputs}/${task.requestedOutputs}）`
                                  : task.status === "succeeded"
                                    ? "已完成"
                                    : task.status === "offline"
                                      ? "网络断开"
                                      : task.status === "cancelled"
                                        ? "已取消"
                                        : task.status === "interrupted"
                                          ? "上次任务未完成"
                                          : `失败：${task.error ?? "请重试"}`}
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
                              onClick={() =>
                                retryTask(activeProject.id, task.id)
                              }
                            >
                              重试
                            </button>
                          )}
                        </span>
                      ))}
                      <span className="project-save-state">
                        {saveState === "loading"
                          ? "读取中…"
                          : saveState === "saving"
                            ? "保存中…"
                            : saveState === "saved"
                              ? "已保存"
                              : "未保存 · 请查看恢复提示"}
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
                favoriteIds={favoriteIds}
                likedIds={likedIds}
                onToggleLike={toggleLike}
                onToggleFavorite={toggleFavorite}
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
                        connecting: agentState.status === "connecting",
                        error: agentState.error,
                        usage: agentState.usage,
                        usageError: agentState.usageError,
                        onRefreshUsage: () => {
                          void agentConnection.refreshUsage();
                        },
                        models: agentState.models.map(
                          (model) => model.model || model.id,
                        ),
                        onConnect: (fresh) => {
                          void agentConnection.connect(fresh);
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
                        onSend: (message, attachments) =>
                          // 不传 model：Codex 使用其账号默认模型（如 gpt-6-astra）。
                          // 项目模型是本地生成链路的模型，与 Codex 账号支持的模型集不同，
                          // 传过去会导致 ChatGPT 账号报 "model is not supported"。
                          agentConnection.sendMessage(message, { attachments }),
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
          {active === "skills" && (
            <SkillsPage
              registry={skillRegistry}
              onApply={applySkillToHome}
              onOpenMcp={() => open("settings/mcp")}
            />
          )}
          {["projects", "comfyui"].includes(active) && (
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
          )}
        </main>
      </div>
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
            ["search", "favorites", "likes"].includes(modal)
              ? "搜索与收藏"
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
          {["search", "favorites", "likes"].includes(modal) ? (
            <CatalogPanel
              initialTab={modal === "search" ? "全部" : "喜欢收藏"}
              items={canvasItems}
              assets={[...assets, ...subjects]}
              favoriteIds={favoriteIds}
              likedIds={likedIds}
              onClose={() => setModal("")}
              onOpen={open}
              projects={creation.projects}
              onOpenProject={openSavedProject}
              onLocate={locate}
              onToggleFavorite={toggleFavorite}
              onToggleLike={toggleLike}
              onRename={renameCanvasItem}
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
                  updateHomeDraft({ ...draft, prompt, updatedAt: Date.now() });
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
              onRetryStage={async (projectId, planId, stageIndex, revision) => {
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
import "./styles/page-templates.css";
import "./styles/canvas-compare.css";
import "./styles/image-edit.css";
