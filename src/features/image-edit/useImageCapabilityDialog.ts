import { useContext, useEffect, useState } from "react";
import type { CanvasCollectionItem } from "../../domain/canvasItems.ts";
import {
  imageCapabilitySchema,
  type ImageCapabilityId,
} from "../../../packages/creation-contracts/index.ts";
import { CanvasImageCommandContext } from "../../runtime/canvasCommandRuntime.tsx";
import { readProviderConnections } from "../../integrations/providers/providerStore.ts";
import { readLocalWorkflows, type WorkflowRecord } from "../comfyui/index.ts";
import { imageCapabilityActionLabels } from "./imageCapabilityActions.ts";
import {
  capabilityFromWorkflow,
  standardImageCapability,
} from "./imageCapabilityWorkflow.ts";
import { readComfyImageModels } from "./comfyImageModels.ts";

export function useImageCapabilityDialog(
  source: CanvasCollectionItem,
  capabilityId: ImageCapabilityId,
) {
  const command = useContext(CanvasImageCommandContext);
  const [saved] = useState(() =>
    source.imageCapability?.capabilityId === capabilityId
      ? source.imageCapability
      : undefined,
  );
  const savedRecord: WorkflowRecord | undefined = saved
    ? {
        id: "canvas-image-capability",
        name: "已保存的画布配置",
        description: "原图保存的编辑工作流",
        source: "created",
        tags: [],
        createdAt: 0,
        updatedAt: 0,
        workflow: saved.workflow.nodes,
      }
    : undefined;
  const connections = readProviderConnections().filter(
    (connection) =>
      connection.kind === "local_comfyui" &&
      connection.authMode === "none" &&
      connection.state !== "disabled",
  );
  const [connectionId, setConnectionId] = useState(
    connections.find(
      (connection) =>
        connection.id ===
        (source.imageCapabilityConnectionId ?? source.providerConnectionId),
    )?.id ??
      connections[0]?.id ??
      "",
  );
  const connection = connections.find(
    (connection) => connection.id === connectionId,
  );
  const [records, setRecords] = useState(() => [
      ...(savedRecord ? [savedRecord] : []),
      ...readLocalWorkflows(),
    ]),
    [record, setRecord] = useState<WorkflowRecord | undefined>(savedRecord);
  const [models, setModels] = useState({
    checkpoints: [] as string[],
    upscaleModels: [] as string[],
    backgroundModels: [] as string[],
  });
  const [checkpoint, setCheckpoint] = useState(""),
    [upscaleModel, setUpscaleModel] = useState(""),
    [backgroundModel, setBackgroundModel] = useState("");
  const [padding, setPadding] = useState(
      saved?.capabilityId === "image.outpaint"
        ? saved.parameters
        : {
            left: 128,
            right: 128,
            top: 128,
            bottom: 128,
          },
    ),
    [scale, setScale] = useState<2 | 4>(
      saved?.capabilityId === "image.upscale" ? saved.parameters.scale : 2,
    );
  const [prompt, setPrompt] = useState(source.imageCapabilityPrompt ?? ""),
    [error, setError] = useState(""),
    [reading, setReading] = useState(false),
    [submitting, setSubmitting] = useState(false),
    [refresh, setRefresh] = useState(0);
  const task = command?.tasks
    .filter(
      (task) =>
        task.sourceItemId === source.id &&
        task.imageCapability?.capabilityId === capabilityId,
    )
    .at(-1);
  const running =
    submitting || task?.status === "queued" || task?.status === "running";
  const unresolved = command?.tasks.some(
    (task) =>
      task.sourceItemId === source.id &&
      task.imageCapability?.capabilityId === capabilityId &&
      (task.status === "unknown" || task.submissionState === "unknown"),
  );
  useEffect(() => {
    if (!connection?.baseUrl) return;
    const controller = new AbortController();
    setReading(true);
    setError("");
    void readComfyImageModels(connection.baseUrl, controller.signal)
      .then((models) => {
        setModels(models);
        setCheckpoint((value) =>
          models.checkpoints.includes(value)
            ? value
            : (models.checkpoints[0] ?? ""),
        );
        setUpscaleModel((value) =>
          models.upscaleModels.includes(value)
            ? value
            : (models.upscaleModels[0] ?? ""),
        );
        setBackgroundModel((value) =>
          models.backgroundModels.includes(value)
            ? value
            : (models.backgroundModels[0] ?? ""),
        );
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setError(
            `本地模型读取失败：${error instanceof Error ? error.message : String(error)}。请检查地址并允许应用来源。`,
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setReading(false);
      });
    return () => controller.abort();
  }, [connection?.id, connection?.baseUrl, refresh]);
  async function submit() {
    if (!command || !connection || !source.assetId || running || unresolved)
      return;
    setSubmitting(true);
    setError("");
    try {
      const parameters =
        capabilityId === "image.outpaint"
          ? padding
          : capabilityId === "image.upscale"
            ? { scale }
            : { layers: ["前景", "背景"] };
      const spec =
        record?.id === savedRecord?.id && saved
          ? imageCapabilitySchema.parse({
              ...saved,
              sourceAssetId: source.assetId,
              parameters:
                capabilityId === "image.layer-split"
                  ? saved.parameters
                  : parameters,
            })
          : record
            ? capabilityFromWorkflow(
                record.workflow,
                capabilityId,
                source.assetId,
                parameters,
              )
            : standardImageCapability(
                capabilityId,
                source.assetId,
                { checkpoint, upscaleModel, backgroundModel },
                parameters,
              );
      command.updateItem?.(source.id, {
        imageCapability: spec,
        imageCapabilityConnectionId: connection.id,
        imageCapabilityPrompt: prompt,
      });
      const failure = await command.submit({
        sourceItemId: source.id,
        providerConnectionId: connection.id,
        model: connection.model || "ComfyUI",
        prompt:
          prompt.trim() ||
          `按已配置工作流执行${imageCapabilityActionLabels[capabilityId]}。`,
        count: spec.workflow.outputNodeIds.length,
        imageCapability: spec,
        signal: new AbortController().signal,
      });
      if (failure) setError(failure);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setSubmitting(false);
    }
  }
  return {
    command,
    connections,
    connectionId,
    setConnectionId,
    connection,
    records,
    record,
    setRecord,
    setRecords,
    models,
    checkpoint,
    setCheckpoint,
    upscaleModel,
    setUpscaleModel,
    backgroundModel,
    setBackgroundModel,
    padding,
    setPadding,
    scale,
    setScale,
    prompt,
    setPrompt,
    error,
    setError,
    reading,
    task,
    running,
    unresolved,
    setRefresh,
    submit,
  };
}
