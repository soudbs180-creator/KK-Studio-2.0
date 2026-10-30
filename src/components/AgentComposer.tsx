import {
  cloneElement,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactElement,
} from "react";
import type { AgentConversationProps } from "./AgentConversationMessages";
import type ConversationComposer from "./ConversationComposer";
import useConversationAttachments from "./useConversationAttachments";
import { emptyDraft, type CreationDraft } from "../features/creation/index.ts";
import { loadStoredAsset } from "../features/creation/index.ts";
import {
  MAX_AGENT_ATTACHMENTS,
  MAX_AGENT_IMAGE_BYTES,
  type AgentDraftAttachment,
} from "../features/agent/index.ts";
import "../styles/agent-panel.css";
import {
  UseAgentComposerDraft as useAgentComposerDraft,
  type AgentDraftState,
} from "../features/agent/index.ts";

function decodeBase64ByteLength(dataUrl: string): number {
  const encoded = dataUrl.split(",")[1] ?? "";
  const padding = encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0;
  return encoded.length * 0.75 - padding;
}

function AgentReferenceSection({
  canvasImages,
  disabled,
  onSelect,
}: {
  canvasImages?: AgentConversationProps["canvasImages"];
  disabled: boolean;
  onSelect: (id: string) => void;
}) {
  const hasImages = Boolean(canvasImages?.length);
  return (
    <section className="agent-reference-region" aria-label="Agent 参考图">
      <div className="agent-reference-heading">
        <span>参考图</span>
        <span>可选 · 最多 6 张 · 单张 8 MiB</span>
      </div>
      <div className="agent-reference-picker">
        <select
          className="ui-select"
          aria-label="引用画布图片"
          value=""
          disabled={disabled || !hasImages}
          onChange={(event) => onSelect(event.target.value)}
        >
          <option value="">
            {hasImages ? "引用画布图片…" : "画布暂无已归档图片"}
          </option>
          {canvasImages?.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}

/** Share the composer while isolating Agent text and attachments from API drafts. */
export default function AgentComposer({
  agent,
  draftKey,
  draftState,
  active,
  composer,
  onDraftChange,
}: {
  agent?: AgentConversationProps;
  draftKey: string;
  draftState: AgentDraftState;
  active: boolean;
  composer: ReactElement<ComponentProps<typeof ConversationComposer>>;
  onDraftChange?: (patch: Partial<CreationDraft>) => void;
}) {
  const { input, update, appendInstructions, clearSentDraft } =
    useAgentComposerDraft(
      draftKey,
      Boolean(active && agent),
      draftState,
      composer.props.composerDraft?.prompt ?? "",
      onDraftChange ? (prompt) => onDraftChange({ prompt }) : undefined,
    );
  const [imageDrafts, setImageDrafts] = draftState.images;
  const initialAttachments = composer.props.composerDraft?.attachments ?? [];
  const attachments = onDraftChange
    ? initialAttachments
    : (imageDrafts[draftKey] ?? initialAttachments);
  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;
  const updateAttachments = (next: AgentDraftAttachment[]) => {
    onDraftChange?.({ attachments: next });
    setImageDrafts((current) => ({ ...current, [draftKey]: next }));
  };
  const [readingCanvas, setReadingCanvas] = useState(false);
  const [importErrors, setImportErrors] = draftState.errors;
  const importError = importErrors[draftKey];
  const setImportError = (error: string | null) =>
    setImportErrors((previous) => ({ ...previous, [draftKey]: error }));
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState<number | null>(null);
  const session = `${draftKey}:${agent?.connectionRevision ?? 0}:${active}`;
  const sessionRef = useRef(session);
  const generation = useRef(0);
  if (sessionRef.current !== session) {
    sessionRef.current = session;
    generation.current++;
  }
  useEffect(() => () => void generation.current++, []);
  const sendingRef = useRef<string | null>(null);
  useEffect(() => {
    sendingRef.current = null;
    setSubmitting(null);
    setFeedback("");
    setReadingCanvas(false);
  }, [session]);
  const { fileInput, addFiles, readingFiles } = useConversationAttachments({
    draftKey: session,
    attachments,
    maxAttachments: MAX_AGENT_ATTACHMENTS,
    strictBatch: true,
    onImportState: setImportError,
    onChange: updateAttachments,
    onStatus: setFeedback,
  });
  async function addCanvasImage(id: string) {
    const item = agent?.canvasImages?.find((image) => image.id === id);
    if (!item?.assetId || readingCanvas || readingFiles) return;
    if (attachments.some((attachment) => attachment.assetId === item.assetId)) {
      setFeedback("这张图片已在草稿中。");
      return;
    }
    if (attachments.length >= MAX_AGENT_ATTACHMENTS) {
      setFeedback("Agent 最多添加 6 张参考图片。");
      setImportError("Agent 最多添加 6 张参考图片，本次画布图片未添加。");
      return;
    }
    const current = generation.current;
    setReadingCanvas(true);
    setFeedback("正在读取画布图片原件…");
    try {
      const asset = await loadStoredAsset(item.assetId);
      if (generation.current !== current) return;
      if (!asset || !/^image\/(png|jpeg|webp|gif)$/.test(asset.mime))
        throw new Error("画布图片原件缺失或格式不支持，请重新导入。");
      const size = decodeBase64ByteLength(asset.preview);
      if (size > MAX_AGENT_IMAGE_BYTES)
        throw new Error("画布图片超过 8 MiB，请选择较小的原件。");
      updateAttachments([
        ...attachments,
        {
          id: "canvas-" + crypto.randomUUID(),
          canvasNodeId: item.id,
          assetId: item.assetId,
          name: item.title,
          mime: asset.mime,
          size,
          dataUrl: asset.preview,
        },
      ]);
      setFeedback("");
      setImportError(null);
    } catch (error) {
      if (generation.current === current) {
        const message =
          error instanceof Error ? error.message : "画布图片读取失败，请重试。";
        setFeedback(message);
        setImportError(message);
      }
    } finally {
      if (generation.current === current) setReadingCanvas(false);
    }
  }
  async function submit() {
    if (
      !agent ||
      agent.sending ||
      sendingRef.current === session ||
      readingFiles ||
      readingCanvas ||
      importError ||
      !input.trim()
    )
      return;
    const sent = input,
      sentAttachments = attachments,
      key = draftKey,
      current = generation.current;
    sendingRef.current = session;
    setSubmitting(agent.connectionRevision);
    setFeedback("");
    try {
      const result = await agent.onSend(
        sent.trim(),
        sentAttachments,
        composer.props.modelSelection,
      );
      if (generation.current !== current) return;
      if (result.ok) {
        const cleared = clearSentDraft(key, sent, !onDraftChange);
        const sentIds = new Set(sentAttachments.map((item) => item.id));
        if (onDraftChange && cleared)
          onDraftChange({
            prompt: "",
            attachments: attachmentsRef.current.filter(
              (item) => !sentIds.has(item.id),
            ),
          });
        setImageDrafts((previous) => ({
          ...previous,
          [key]: (previous[key] ?? initialAttachments).filter(
            (item) => !sentIds.has(item.id),
          ),
        }));
      } else setFeedback(result.error ?? "发送失败，指令已保留。");
    } catch {
      if (generation.current === current)
        setFeedback("发送失败，指令已保留，请检查连接。");
    } finally {
      if (generation.current === current) {
        sendingRef.current = null;
        setSubmitting(null);
      }
    }
  }
  if (!active || !agent) return composer;
  const visibleFeedback =
    importError || (feedback !== agent.error ? feedback : "");
  const busyAttachments =
    agent.sending ||
    readingCanvas ||
    Boolean(readingFiles) ||
    submitting === agent.connectionRevision;
  return (
    <div className="agent-composer-region">
      {(visibleFeedback || importError) && (
        <div className="agent-composer-feedback">
          {visibleFeedback && (
            <p className="agent-action-error" role="alert">
              {visibleFeedback}
            </p>
          )}
          {importError && (
            <button
              type="button"
              className="ui-button"
              onClick={() => {
                setImportError(null);
                setFeedback("");
              }}
            >
              忽略未添加的图片
            </button>
          )}
        </div>
      )}
      <AgentReferenceSection
        canvasImages={agent.canvasImages}
        disabled={readingCanvas || Boolean(readingFiles) || agent.sending}
        onSelect={(id) => void addCanvasImage(id)}
      />
      {cloneElement(composer, {
        input,
        onInputChange: update,
        onVoiceChange: update,
        onSubmitMessage: submit,
        composerDraft: { ...emptyDraft(), attachments },
        onRemoveAttachment: (id) =>
          updateAttachments(attachments.filter((item) => item.id !== id)),
        fileInput,
        onAddFiles: addFiles,
        disabled: false,
        modelDisabled:
          composer.props.modelDisabled || agent.connecting || busyAttachments,
        attachmentDisabled: busyAttachments,
        submitDisabled:
          agent.connecting ||
          agent.preparing ||
          Boolean(importError) ||
          busyAttachments,
        onApplySkill: (record) =>
          appendInstructions(record.instructions, 7500).message,
        onVoiceStatus: setFeedback,
        onStatus: setFeedback,
        readingFiles: readingFiles + (readingCanvas ? 1 : 0),
        voiceSessionKey: `agent-${draftKey}`,
      })}
    </div>
  );
}
