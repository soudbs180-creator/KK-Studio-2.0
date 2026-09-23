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
import { emptyDraft } from "../features/creation/model";
import { loadStoredAsset } from "../features/creation/assetRepository";
import {
  MAX_AGENT_ATTACHMENTS,
  MAX_AGENT_IMAGE_BYTES,
  type AgentDraftAttachment,
} from "../features/agent/agentAttachments";

/** Share the composer while isolating Agent text and attachments from API drafts. */
export default function AgentComposer({
  agent,
  draftKey,
  active,
  composer,
}: {
  agent?: AgentConversationProps;
  draftKey: string;
  active: boolean;
  composer: ReactElement<ComponentProps<typeof ConversationComposer>>;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [imageDrafts, setImageDrafts] = useState<
    Record<string, AgentDraftAttachment[]>
  >({});
  const attachments = imageDrafts[draftKey] ?? [];
  const [readingCanvas, setReadingCanvas] = useState(false);
  const [importErrors, setImportErrors] = useState<
    Record<string, string | null>
  >({});
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
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  const sendingRef = useRef<string | null>(null);
  useEffect(() => {
    sendingRef.current = null;
    setSubmitting(null);
    setFeedback("");
    setReadingCanvas(false);
  }, [session]);
  const input = drafts[draftKey] ?? "";
  const update = (text: string) =>
    setDrafts((current) => ({ ...current, [draftKey]: text }));
  const { fileInput, addFiles, readingFiles } = useConversationAttachments({
    draftKey: session,
    attachments,
    maxAttachments: MAX_AGENT_ATTACHMENTS,
    strictBatch: true,
    onImportState: setImportError,
    onChange: (next) =>
      setImageDrafts((current) => ({ ...current, [draftKey]: next })),
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
      const encoded = asset.preview.split(",")[1] ?? "";
      const size =
        encoded.length * 0.75 -
        (encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0);
      if (size > MAX_AGENT_IMAGE_BYTES)
        throw new Error("画布图片超过 8 MiB，请选择较小的原件。");
      const attachment: AgentDraftAttachment = {
        id: "canvas-" + crypto.randomUUID(),
        canvasNodeId: item.id,
        assetId: item.assetId,
        name: item.title,
        mime: asset.mime,
        size,
        dataUrl: asset.preview,
      };
      setImageDrafts((previous) => ({
        ...previous,
        [draftKey]: [...(previous[draftKey] ?? []), attachment],
      }));
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
      const result = await agent.onSend(sent.trim(), sentAttachments);
      if (generation.current !== current) return;
      if (result.ok) {
        setDrafts((previous) =>
          previous[key] === sent ? { ...previous, [key]: "" } : previous,
        );
        setImageDrafts((previous) => ({
          ...previous,
          [key]: (previous[key] ?? []).filter(
            (item) =>
              !sentAttachments.some((sentItem) => sentItem.id === item.id),
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
  return (
    <>
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
      <div className="agent-reference-picker">
        <select
          className="ui-select"
          aria-label="引用画布图片"
          value=""
          disabled={
            readingCanvas ||
            Boolean(readingFiles) ||
            agent.sending ||
            !agent.canvasImages?.length
          }
          onChange={(event) => void addCanvasImage(event.target.value)}
        >
          <option value="">
            {agent.canvasImages?.length
              ? "引用画布图片…"
              : "画布暂无已归档图片"}
          </option>
          {agent.canvasImages?.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
        <span>最多 6 张 · 单张 8 MiB</span>
      </div>
      {cloneElement(composer, {
        input,
        onInputChange: update,
        onVoiceChange: update,
        onSubmitMessage: submit,
        composerDraft: { ...emptyDraft(), attachments },
        onRemoveAttachment: (id) =>
          setImageDrafts((previous) => ({
            ...previous,
            [draftKey]: (previous[draftKey] ?? []).filter(
              (item) => item.id !== id,
            ),
          })),
        fileInput,
        onAddFiles: addFiles,
        disabled: false,
        attachmentDisabled:
          agent.sending ||
          readingCanvas ||
          Boolean(readingFiles) ||
          submitting === agent.connectionRevision,
        submitDisabled:
          agent.connecting ||
          agent.preparing ||
          agent.sending ||
          Boolean(importError) ||
          readingCanvas ||
          Boolean(readingFiles) ||
          submitting === agent.connectionRevision,
        onApplySkill: (record) => {
          const text = [input.trimEnd(), record.instructions]
            .filter(Boolean)
            .join("\n\n");
          if (text.length > 7500)
            return "加入后超过 7,500 字符，请先精简指令。";
          update(text);
          return "Skill 指令已加入 Agent 草稿，尚未发送。";
        },
        onVoiceStatus: setFeedback,
        onStatus: setFeedback,
        readingFiles: readingFiles + (readingCanvas ? 1 : 0),
        voiceSessionKey: `agent-${draftKey}`,
      })}
    </>
  );
}
