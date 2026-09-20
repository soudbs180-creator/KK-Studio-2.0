import { useEffect, useRef, useState, type SetStateAction } from "react";
import TopBar from "./components/TopBar";
import Sidebar from "./components/Sidebar";
import { useSidebarLayout } from "./components/useSidebarLayout";
import Canvas from "./components/Canvas";
import ConversationPanel from "./components/ConversationPanel";
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
import {
  createProject,
  emptyDraft,
  type CreationDraft,
  type CreationProject,
  type CreationTask,
  type CreationTaskOutput,
  type CreateProjectInput,
} from "./features/creation/model";

function outputsForTask(task: CreationTask): CreationTaskOutput[] {
  return task.outputs?.length
    ? task.outputs
    : Array.from({ length: task.requestedOutputs }, (_, index) => ({
        index,
        status:
          task.status === "succeeded"
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
  canvasImageAttachments,
  prepareImageTask,
  ImageTaskCommandError,
} from "./features/creation/imageTaskCommand";
import {
  CanvasImageCommandContext,
  type CanvasImageRequest,
} from "./features/creation/CanvasImageCommand";
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
  reserveProviderSubmission,
  ProviderSubmissionError,
} from "./features/creation/providerSubmission";
import { mapWithConcurrency } from "./features/creation/generationQueue";
import { compileDesignPrompt } from "./features/creation/promptCompiler";

import {
  canRetryTask,
  recoverInterruptedTasks,
} from "./features/creation/taskRecovery";
import {
  cancelNativeTask,
  getNativeTask,
  reconcileNativeTasks,
  submitNativeTask,
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
import "./styles/workspace.css";
import "./styles/responsive.css";
import "./styles/sidebar.css";
import "./styles/account-popup.css";
import "./styles/catalog-pages.css";
// Keep Figma-scoped conversation geometry after the legacy workspace rules.
import "./styles/conversation-panel.css";
import "./styles/design-surface.css";
export default function App() {
  useEffect(() => {
    const updateDesignScale = (): void => {
      if (window.innerWidth <= 1200) {
        document.documentElement.style.removeProperty("--design-scale");
        document.documentElement.style.removeProperty("--design-offset-y");
        return;
      }
      const scale = Math.min(
        window.innerWidth / 1920,
        window.innerHeight / 1080,
      );
      document.documentElement.style.setProperty(
        "--design-scale",
        String(scale),
      );
      document.documentElement.style.setProperty(
        "--design-offset-y",
        `${Math.max(0, (window.innerHeight - 1080 * scale) / 2)}px`,
      );
    };
    updateDesignScale();
    window.addEventListener("resize", updateDesignScale);
    return () => window.removeEventListener("resize", updateDesignScale);
  }, []);
  const [active, setActive] = useState("landing");
  const [modal, setModal] = useState("");
  const [settingsSection, setSettingsSection] =
    useState<SettingsSection>("general");
  const sidebar = useSidebarLayout();
  const [chat, setChat] = useState(true);
  const [mobileChat, setMobileChat] = useState(false);
  const [assets, setAssets] = useState(initialAssets);
  const assetArchive = useAssetArchive(setAssets);
  const [subjects, setSubjects] = useState(initialSubjects);
  const persistence = useCreationStorage(
    recoverInterruptedTasks,
    reconcileNativeTasks,
  );
  const { creation, creationRef, commitCreation } = persistence;
  const saveState = persistence.state;
  const submitLock = useRef(false);
  const [providerVersion, setProviderVersion] = useState(0);
  const taskControllers = useRef<Record<string, AbortController>>({});
  const nativeTaskRecords = useRef<Record<string, NativeTaskHostRecord>>({});
  const nativeCancelRequested = useRef(new Set<string>());
  const pausedTaskIds = useRef(new Set<string>());
  const [pendingApproval, setPendingApproval] = useState<{
    projectId: string;
    taskId: string;
    gates: ApprovalGate[];
  } | null>(null);
  const pendingApprovalTask = creation.projects
    .find((project) => project.id === pendingApproval?.projectId)
    ?.tasks.find((task) => task.id === pendingApproval?.taskId);
  const activeProject = creation.projects.find(
    (project) => project.id === creation.activeProjectId,
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
    let durableSubmission = false;
    let providerRequestStarted = false;
    const publish = (
      status: CreationTask["status"],
      error?: string,
      submissionState?: CreationTask["submissionState"],
    ): void => {
      if (taskControllers.current[taskId] !== controller) return;
      updateProject(projectId, (current) => ({
        ...appendImageTaskResults(
          current,
          createdItems.filter((item) => !publishedItems.has(item.id)),
          task.sourceItemId ?? rootItemId(current),
        ),
        tasks: current.tasks.map((item) => {
          if (item.id === taskId)
            return {
              ...item,
              status,
              error,
              submissionState: submissionState ?? item.submissionState,
              submittedAt:
                submissionState === "submitted"
                  ? (item.submittedAt ?? Date.now())
                  : item.submittedAt,
              outputs: [...outputs],
              completedOutputs: outputs.filter(
                (output) => output.status === "succeeded",
              ).length,
              resultItemId: createdItems[0]?.id ?? item.resultItemId,
              updatedAt: Date.now(),
            };
          if (item.id !== task.retryOfTaskId) return item;
          const merged = outputsForTask(item).map((original) => {
            const index =
              task.retryOutputIndices?.indexOf(original.index) ?? -1;
            const replacement = index >= 0 ? outputs[index] : undefined;
            return replacement?.status === "succeeded"
              ? { ...replacement, index: original.index }
              : original;
          });
          const completed = merged.filter(
            (output) => output.status === "succeeded",
          ).length;
          return {
            ...item,
            outputs: merged,
            completedOutputs: completed,
            status:
              completed === item.requestedOutputs
                ? "succeeded"
                : completed > 0
                  ? "partial"
                  : item.status,
            error:
              completed === item.requestedOutputs
                ? undefined
                : `${completed}/${item.requestedOutputs} 张已归档，可重试未归档结果。`,
            updatedAt: Date.now(),
          };
        }),
        items: [
          ...current.items.map((item) =>
            item.id === (task.sourceItemId ?? rootItemId(current))
              ? {
                  ...item,
                  generationStatus:
                    status === "running"
                      ? ("pending" as const)
                      : status === "failed" || status === "offline"
                        ? ("error" as const)
                        : undefined,
                }
              : item,
          ),
          ...createdItems.filter(
            (result) =>
              !publishedItems.has(result.id) &&
              !current.items.some((item) => item.id === result.id),
          ),
        ],
        updatedAt: Date.now(),
      }));
      createdItems.forEach((item) => publishedItems.add(item.id));
      if (activeProjectIdRef.current === projectId) {
        const latest = creationRef.current.projects.find(
          (item) => item.id === projectId,
        );
        if (latest) replaceCanvasItems(latest.items);
      }
    };
    let reservation: ReturnType<typeof reserveProviderSubmission> | undefined;
    const nativeTaskHost = usesNativeTaskHost();
    try {
      if (!task.providerBaseUrl)
        throw new Error("历史任务未记录供应商，请从当前输入重新提交。");
      if (!pendingIndices.length) {
        publish("succeeded");
        return;
      }
      const compiledPrompt = compileDesignPrompt(task.prompt, {
        referenceCount: task.attachments.length,
        outputCount: task.requestedOutputs,
      });
      const promptHash = await hashPrompt(compiledPrompt);
      if (controller.signal.aborted) throw new Error("任务已停止。");
      if (!nativeTaskHost)
        reservation = reserveProviderSubmission(
          {
            id: task.providerConnectionId,
            baseUrl: task.providerBaseUrl,
            credentialRef: task.providerCredentialRef,
            referenceCount: task.attachments.length,
          },
          { explicitRetry: explicitRetry || Boolean(task.retryOfTaskId) },
        );
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
        const attachments = task.attachments.map((attachment) => {
          if (!attachment.assetId)
            throw new Error(
              "Desktop 参考图尚未归档到原生素材库，当前未提交原生任务。",
            );
          return { assetId: attachment.assetId, name: attachment.name };
        });
        let nativeRecord = await submitNativeTask({
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
        });
        nativeTaskRecords.current[taskId] = nativeRecord;
        publish("running", undefined, "submitted");
        await persistence.flush();
        durableSubmission = true;

        const applyNativeRecord = async (
          record: NativeTaskHostRecord,
        ): Promise<void> => {
          nativeTaskRecords.current[taskId] = record;
          const recordOutputs = new Map(
            record.outputs.map((output) => [output.index, output]),
          );
          for (const output of outputs) {
            const nativeOutput = recordOutputs.get(output.index);
            if (!nativeOutput) {
              if (record.status === "succeeded") {
                output.status = "unknown";
                output.error = "原生任务完成但未返回该输出的素材标识。";
              }
              continue;
            }
            output.status =
              nativeOutput.status === "pending"
                ? "running"
                : nativeOutput.status;
            output.assetId = nativeOutput.assetId;
            output.error = nativeOutput.error;
            if (nativeOutput.status !== "succeeded" || !nativeOutput.assetId)
              continue;
            try {
              const asset = await readNativeAsset(nativeOutput.assetId);
              if (!asset) throw new Error("原生素材原件尚未找到。");
              const id = `${projectId}-${taskId}-result-${output.index + 1}`;
              const item: CanvasCollectionItem = {
                id,
                title: `图片结果 ${output.index + 1}`,
                description: `${task.model} · 已归档 ${asset.assetId}`,
                kind: "image",
                prompt: task.prompt,
                model: task.model,
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
            } catch {
              output.status = "unknown";
              output.error = "原生任务已完成，但本地素材原件读取失败。";
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
          const status = uncertain
            ? ("unknown" as const)
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
              ? (record.failure ??
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
        await applyNativeRecord(nativeRecord);
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
          await applyNativeRecord(nativeRecord);
        }
        return;
      }
      publish("running", undefined, "submitted");
      await persistence.flush();
      durableSubmission = true;
      const generated = await generateImages({
        prompt: compiledPrompt,
        model: task.model,
        attachments: task.attachments,
        signal: controller.signal,
        providerBaseUrl: task.providerBaseUrl,
        credentialRef: task.providerCredentialRef,
        count: pendingIndices.length,
        idempotencyKey: `${task.idempotencyKey}-remaining-${pendingIndices.join("-")}`,
        beforeRequest: () => reservation!.assertCurrent(),
        onRequestStart: () => {
          providerRequestStarted = true;
        },
        onChunk: async (sources, offset) => {
          const archived = await mapWithConcurrency(
            sources,
            2,
            async (source) => {
              try {
                return await storeGeneratedAsset({
                  source,
                  provider: task.providerName,
                  model: task.model,
                  sourceJobId: task.id,
                  connectionId: task.providerConnectionId,
                  promptHash,
                  parentId: task.attachments.find(
                    (attachment) => attachment.assetId,
                  )?.assetId,
                  tags: ["AI生成", task.providerName ?? ""],
                  signal: controller.signal,
                });
              } catch {
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
      outputs = outputs.map((output) =>
        output.status === "succeeded"
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
              error: "此项尚未归档，可单项重试。",
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
      const finalStatus = generatedUncertain ? ("unknown" as const) : status;
      publish(
        finalStatus,
        generatedUncertain
          ? "供应商受理状态不明，请先核对供应商；为避免重复扣费，当前不会普通重试。"
          : status === "succeeded"
            ? undefined
            : generated.failure instanceof ProviderSubmissionError
              ? generated.failure.message
              : `${completed}/${task.requestedOutputs} 张已归档，可重试未归档结果。`,
        generatedUncertain ? "unknown" : "terminal",
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
        else if (!failure && reservation?.healthUnchanged())
          markProviderConnectionHealthy(task.providerConnectionId);
      }
    } catch (error) {
      const uncertain =
        durableSubmission &&
        (providerRequestStarted || nativeTaskHost) &&
        !controller.signal.aborted &&
        (error instanceof GenerationProviderError
          ? error.failureClass === "network"
          : !(error instanceof ProviderSubmissionError));
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
      reservation?.release();
      if (taskControllers.current[taskId] === controller)
        delete taskControllers.current[taskId];
    }
  }
  function cancelTask(taskId: string): void {
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
    let targetIndices = outputsForTask(oldTask)
      .filter(
        (output) =>
          output.status !== "succeeded" &&
          (outputIndex == null || output.index === outputIndex),
      )
      .map((output) => output.index);
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
    targetIndices = targetIndices.filter(
      (index) =>
        outputsForTask(rootTask).find((output) => output.index === index)
          ?.status !== "succeeded",
    );
    const busyIndices = new Set(
      project.tasks
        .filter(
          (candidate) =>
            candidate.retryOfTaskId === rootTask.id &&
            (candidate.status === "queued" || candidate.status === "running"),
        )
        .flatMap((candidate) => candidate.retryOutputIndices ?? []),
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
      estimatedCostUsd: targetIndices.length * 0.04,
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
      | { origin: "home" | "chat"; input: CreateProjectInput }
      | { origin: "canvas"; input: CanvasImageRequest },
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
    if (
      original?.tasks.some(
        (task) => task.status === "queued" || task.status === "running",
      )
    )
      return "当前项目还有进行中的任务，请等待完成或取消后提交。";
    const signal =
      request.origin === "canvas" ? request.input.signal : undefined;
    const draftAtStart = creationRef.current.homeDraft;
    submitLock.current = true;
    try {
      let sourceItemId = original
        ? (rootItemId(original) ?? undefined)
        : undefined;
      let input: CreateProjectInput;
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
        if (!source || source.kind !== "image")
          return "来源图片节点已删除，当前未提交生成。";
        sourceSignature = canvasSignature(original!, source.id);
        input = {
          prompt: request.input.prompt,
          model: request.input.model,
          kind: "image",
          attachments: await canvasImageAttachments(original!, source),
          outputCount: request.input.count,
          privacyMode: original!.composerDraft.privacyMode,
        };
      } else input = structuredClone(request.input);
      if (signal?.aborted) return "已取消提交，草稿和参考图已保留。";
      const connection = await prepareImageTask(input, original);
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
      const appended = appendImageTask(base, input, connection, sourceItemId);
      let nextProject = appended.project;
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

  function handleProjectModelChange(model: string): void {
    if (!activeProject) return;
    const updated = {
      ...activeProject,
      model,
      composerDraft: {
        ...activeProject.composerDraft,
        model,
        updatedAt: Date.now(),
      },
      items: activeProject.items.map((item) =>
        item.id === rootItemId(activeProject)
          ? { ...item, model, description: `${model} · 待执行` }
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
  function handleNewBlankProject(): void {
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
      canvas: createProjectCanvas(BASE_CANVAS_ITEMS),
      items: BASE_CANVAS_ITEMS.map((item) => ({
        ...item,
        model: item.kind === "image" ? blank.model : item.model,
      })),
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
    if (["search", "favorites", "likes"].includes(view)) {
      setModal(view);
      return;
    }
    if (view === "settings" || view.startsWith("settings/")) {
      setSettingsSection(
        SETTINGS_SECTIONS.find((item) => item.id === view.split("/")[1])?.id ??
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
      data-runtime-entry="src/main.tsx"
      data-runtime-mode={import.meta.env.MODE}
    >
      <TopBar
        onOpen={open}
        onToggleSidebar={sidebar.toggle}
        onToggleChat={() => setChat(!chat)}
      />
      <div className="app-body">
        <Sidebar
          active={active}
          onNavigate={open}
          collapsed={sidebar.collapsed}
          narrow={sidebar.narrow}
          onCollapse={sidebar.toggle}
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
              onOpenPlugins={() => open("settings/mcp")}
              defaultModel={(() => {
                void providerVersion;
                try {
                  return parseModelProvider(
                    localStorage.getItem(MODEL_PROVIDER_STORAGE_KEY),
                  ).profile.model;
                } catch {
                  return "";
                }
              })()}
            />
          )}
          <div className="workspace-content" hidden={active !== "workspace"}>
            {activeProject && (
              <div className="project-task-status" aria-live="polite">
                <strong>{activeProject.name}</strong>
                {activeProject.tasks.slice(-1).map((task) => (
                  <span key={task.id} className={`project-task-${task.status}`}>
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
                      <button type="button" onClick={() => cancelTask(task.id)}>
                        取消
                      </button>
                    )}
                    {(task.status === "partial" ||
                      task.status === "failed" ||
                      task.status === "offline" ||
                      task.status === "cancelled" ||
                      task.status === "interrupted") && (
                      <button
                        type="button"
                        onClick={() => retryTask(activeProject.id, task.id)}
                      >
                        重试
                      </button>
                    )}
                  </span>
                ))}
                <span className="project-save-state" aria-live="polite">
                  {saveState === "loading"
                    ? "读取中…"
                    : saveState === "saving"
                      ? "保存中…"
                      : saveState === "saved"
                        ? "已保存"
                        : "未保存 · 请查看恢复提示"}
                </span>
              </div>
            )}
            <CanvasImageCommandContext.Provider
              value={{
                submit: (input) =>
                  submitImageCommand({ origin: "canvas", input }),
                cancel: cancelTask,
                tasks: activeProject?.tasks ?? [],
                model: activeProject?.model ?? "",
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
              }}
            >
              <Canvas
                key={`${activeProject?.id ?? "demo-canvas"}:${persistence.loadEpoch}`}
                initialCanvas={activeProject?.canvas}
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
            </CanvasImageCommandContext.Provider>
            <div className={"chat-container " + (!chat ? "chat-hidden" : "")}>
              <ConversationPanel
                onOpen={open}
                project={activeProject}
                currentModel={activeProject?.model}
                modelOptions={[
                  ...new Set(
                    [
                      activeProject?.model,
                      "kk-image-2",
                      parseModelProvider(
                        localStorage.getItem(MODEL_PROVIDER_STORAGE_KEY),
                      ).profile.model,
                    ].filter((model): model is string => Boolean(model)),
                  ),
                ]}
                onModelChange={handleProjectModelChange}
                composerDraft={activeProject?.composerDraft}
                onDraftChange={handleProjectDraftChange}
                onSend={activeProject ? handleSendMessage : undefined}
                onDeleteMessage={
                  activeProject ? handleDeleteMessage : undefined
                }
                voiceEnabled={active === "workspace" && chat}
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
          {["projects", "skills", "comfyui"].includes(active) && (
            <LibraryPage
              key={active}
              view={active as "projects" | "skills" | "comfyui"}
              onOpen={open}
              projects={creation.projects}
              onOpenProject={(id) => {
                commitCreation({ ...creationRef.current, activeProjectId: id });
                setActive("workspace");
              }}
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
              onLocate={locate}
              onToggleFavorite={toggleFavorite}
              onToggleLike={toggleLike}
              onRename={renameCanvasItem}
            />
          ) : modal === "shortcuts" ? (
            <ShortcutsPanel onClose={() => setModal("")} />
          ) : modal === "settings" ? (
            <SettingsPanel
              initialSection={settingsSection}
              saveState={saveState}
              revision={creation.revision}
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
