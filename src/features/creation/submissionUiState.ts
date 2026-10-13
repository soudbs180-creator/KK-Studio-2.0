import type { CreateProjectInput, CreationProject } from "./model";
import type { CanvasImageRequest } from "./CanvasImageCommand";
import { readProviderConnections } from "./providerRegistry";
import { compileEditPrompt } from "../image-edit/prompt";
import {
  isStrictLoopbackProviderUrl,
  parseModelProvider,
  MODEL_PROVIDER_STORAGE_KEY,
} from "../../domain/modelProvider";
import { getGenerationUiState } from "../../domain/uiGovernance";

export type ImageSubmissionRequest =
  | { origin: "home" | "chat" | "agent" | "plugin"; input: CreateProjectInput }
  | { origin: "canvas"; input: CanvasImageRequest };

export function readHomeModelConfiguration() {
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
}

function submissionTarget(
  request: ImageSubmissionRequest,
  original?: CreationProject,
) {
  const source =
    request.origin === "canvas"
      ? original?.items.find((item) => item.id === request.input.sourceItemId)
      : undefined;
  const connectionId =
    request.origin === "canvas"
      ? (source?.providerConnectionId ??
        original?.composerDraft.providerConnectionId)
      : request.input.providerConnectionId;
  return {
    codex: source?.generationSource === "codex",
    text:
      request.origin === "canvas"
        ? source?.kind === "text"
        : request.input.kind === "text",
    endpoint:
      readProviderConnections().find((item) => item.id === connectionId)
        ?.baseUrl ??
      (request.origin === "canvas"
        ? original?.providerBaseUrl
        : (request.input.providerBaseUrl ?? original?.providerBaseUrl)),
  };
}

function effectivePrompt(request: ImageSubmissionRequest): string {
  const prompt = request.input.prompt;
  if (request.origin !== "canvas" || !request.input.imageEdit) return prompt;
  const compiled = compileEditPrompt(prompt, request.input.imageEdit.document);
  return !prompt.trim() && compiled.instructions.length
    ? "按已确认的区域修改意见编辑图片。"
    : prompt;
}

export function prepareImageSubmissionUi(
  request: ImageSubmissionRequest,
  original: CreationProject | undefined,
  configured: boolean,
) {
  const target = submissionTarget(request, original);
  const prompt = effectivePrompt(request);
  const active = original?.tasks.find(
    (task) => task.status === "queued" || task.status === "running",
  );
  const modelConfigured =
    request.origin === "agent" || target.codex || configured;
  const state = getGenerationUiState({
    prompt,
    inputValid: Boolean(prompt.trim()),
    modelConfigured,
    quotaAvailable: true,
    online:
      typeof navigator === "undefined" ||
      navigator.onLine ||
      (target.text && isStrictLoopbackProviderUrl(target.endpoint ?? "")),
    serviceConfigured:
      request.origin === "agent" ||
      target.codex ||
      (configured && Boolean(request.input.model.trim())),
    taskStatus:
      active?.status === "queued" ? "queued" : active ? "running" : undefined,
  });
  return { state, prompt };
}
