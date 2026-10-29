import { createElement, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  createSubmissionLogic,
  useTaskExecution,
  storeGeneratedAsset,
  loadStoredAsset,
  listStoredAssets,
  createProject,
  emptySnapshot,
  normalizeCreationSnapshot,
  type CreationSnapshot,
  type CreationProject,
  type CreateProjectInput,
} from "../../src/features/creation/index.ts";
import { writeProviderConnections } from "../../src/integrations/providers/providerStore.ts";
import { saveModelCatalog } from "../../src/integrations/providers/modelCatalogRepository.ts";
import type {
  ImageCapabilitySpec,
  ImageCapabilityId,
} from "../../packages/creation-contracts/index.ts";

export async function start(
  spec: ImageCapabilitySpec,
  source: string,
  enabled: Partial<Record<ImageCapabilityId, boolean>> = {},
) {
  const asset = await storeGeneratedAsset({
    source,
    sourceKind: "upload",
    isAiGenerated: false,
    tags: ["original"],
  });
  spec = { ...spec, sourceAssetId: asset.assetId };
  const connection = {
    id: "comfy-capability",
    provider: "ComfyUI",
    displayName: "Fixture workflow",
    kind: "local_comfyui" as const,
    baseUrl: "http://127.0.0.1:8188",
    authMode: "none" as const,
    capabilities: {
      modalities: ["image" as const],
      operations: ["generate" as const],
      maxReferences: 1,
      maxOutputs: 16,
      async: true,
    },
    state: "active" as const,
    concurrencyLimit: 1,
  };
  writeProviderConnections([connection]);
  saveModelCatalog(connection, [
    { id: "image-fixture", kind: "image", source: "manual" },
  ]);
  const project = createProject({
    kind: "image",
    prompt: "Exact prompt\n保留原图",
    model: "image-fixture",
    attachments: [],
  });
  project.composerDraft.approvalMode = "auto";
  project.items[0] = {
    ...project.items[0],
    assetId: asset.assetId,
    src: asset.preview,
    kind: "image",
  };
  let snapshot: CreationSnapshot = {
    ...emptySnapshot(),
    projects: [project],
    activeProjectId: project.id,
  };
  let durable: CreationSnapshot | undefined;
  let submission: ReturnType<typeof createSubmissionLogic>;
  let execution: ReturnType<typeof useTaskExecution>;
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  let ready!: () => void;
  const mounted = new Promise<void>((resolve) => {
    ready = resolve;
  });
  function Harness() {
    const creationRef = useRef(snapshot);
    const activeProjectIdRef = useRef(project.id);
    const commitCreation = (value: CreationSnapshot) => {
      creationRef.current = value;
      snapshot = value;
    };
    const updateProject = (
      id: string,
      update: (p: CreationProject) => CreationProject,
    ) =>
      commitCreation({
        ...creationRef.current,
        projects: creationRef.current.projects.map((p) =>
          p.id === id ? update(p) : p,
        ),
      });
    const persistence = {
      state: "saved" as const,
      async flush() {
        durable = structuredClone(creationRef.current);
        localStorage.setItem("p6-fixture-snapshot", JSON.stringify(durable));
      },
    };
    execution = useTaskExecution({
      creationRef,
      activeProjectIdRef,
      commitCreation,
      updateProject,
      persistence,
      replaceCanvasItems: (value) =>
        typeof value === "function"
          ? value(creationRef.current.projects[0].items)
          : value,
      setAssets() {},
    });
    submission = createSubmissionLogic({
      imageCapabilities: enabled,
      creationRef,
      activeProjectIdRef,
      persistence,
      homeModelConfig: { model: "image-fixture", configured: true },
      executeTask: execution.executeTask,
      cancelTask: execution.cancelTask,
      commitCreation,
      replaceCanvasItems: () => creationRef.current.projects[0].items,
    });
    ready();
    return null;
  }
  root.render(createElement(Harness));
  await mounted;
  const input: CreateProjectInput = {
    kind: "image",
    model: "image-fixture",
    prompt: "Exact prompt\n保留原图",
    providerConnectionId: connection.id,
    attachments: [],
    imageCapability: spec,
    privacyMode: "local_only",
  };
  const reason = await submission!.submitImageCommand({
    origin: "plugin",
    input,
  });
  return {
    reason,
    snapshot: () => structuredClone(snapshot),
    reload: () =>
      normalizeCreationSnapshot(
        JSON.parse(localStorage.getItem("p6-fixture-snapshot")!),
      ),
    async assets() {
      return listStoredAssets({ limit: 100 });
    },
    original: () => loadStoredAsset(asset.assetId),
    cancel() {
      const task = snapshot.projects[0].tasks.at(-1);
      if (task) execution!.cancelTask(task.id);
    },
    close() {
      root.unmount();
      container.remove();
    },
  };
}
