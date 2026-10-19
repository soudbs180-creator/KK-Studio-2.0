import { useRef, useState } from "react";
import UiIcon from "./UiIcon";
import type { CreationDraft } from "../features/creation/model";
import UsageStatusBar from "./composer/UsageStatusBar";
import { homeModelSelection } from "../domain/modelSelection";
import { codexHomeValidation } from "../features/agent/codexGeneration";
import StartAttachmentList from "./StartAttachmentList";
import ComposerTextarea from "./ComposerTextarea";
import useConversationAttachments from "./useConversationAttachments";
import ComposerExtensionsMenu from "./ComposerExtensionsMenu";
import StartModelPicker from "./StartModelPicker";
import { StartComposerFeedback, StartModePicker } from "./StartComposerModes";
import VoiceInputButton from "./VoiceInputButton";
import { useComposerMenus } from "./useComposerMenus";
import type { SkillRecord } from "../features/skills/skillRegistry";
import {
  canSubmitGeneration,
  getDisabledReason,
  getGenerationUiState,
} from "../domain/uiGovernance";

export default function StartComposer({
  draft,
  onDraftChange,
  setStatus,
  onSubmit,
  onOpenModel,
  onOpenSkills,
  onOpenExtension,
  modelConfigured = false,
  skills = [],
  onApplySkill,
}: {
  draft: CreationDraft;
  onDraftChange: (
    draft: CreationDraft,
    changes?: Partial<CreationDraft>,
  ) => void;
  setStatus: (status: string) => void;
  onSubmit: (input: CreationDraft) => void | Promise<void>;
  onOpenModel: () => void;
  onOpenSkills: () => void;
  onOpenExtension: (id: string) => void;
  modelConfigured?: boolean;
  skills?: SkillRecord[];
  onApplySkill?: (record: SkillRecord) => string;
}) {
  const [pendingSubmit, setPendingSubmit] = useState<CreationDraft | null>(
    null,
  );
  const pickerRef = useRef<HTMLDivElement>(null);
  const {
    modelMenuOpen,
    skillMenuOpen,
    modeMenuOpen,
    toggleMenu,
    openMenu,
    closeMenus,
  } = useComposerMenus(pickerRef);
  const selection = homeModelSelection(draft);
  const usesCodex = selection.source !== "api";
  const model = selection.model;
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  function commit(patch: Partial<CreationDraft>): void {
    const next = { ...draft, ...patch, updatedAt: Date.now() };
    onDraftChange(next, patch);
  }
  const { fileInput, addFiles, readingFiles } = useConversationAttachments({
    draftKey: "home",
    attachments: draft.attachments,
    onChange: (attachments) => commit({ attachments }),
    onStatus: setStatus,
    ...(usesCodex
      ? {
          maxAttachments: 6,
          strictBatch: true,
          onImportState: setAttachmentError,
        }
      : {}),
  });
  const uiState = getGenerationUiState({
    prompt: draft.prompt,
    inputValid: !readingFiles,
    modelConfigured: usesCodex || modelConfigured,
    quotaAvailable: true,
    online: typeof navigator === "undefined" ? true : navigator.onLine,
    serviceConfigured: usesCodex || modelConfigured,
  });
  const { privacy: privacyReason, count: countReason } = codexHomeValidation(
    draft,
    selection,
  );
  const submitDisabled =
    submitting ||
    (usesCodex && Boolean(attachmentError)) ||
    Boolean(privacyReason) ||
    Boolean(countReason) ||
    !canSubmitGeneration(uiState);
  const disabledReason =
    (usesCodex ? attachmentError : undefined) ??
    privacyReason ??
    countReason ??
    getDisabledReason(uiState);
  async function submitDraft(input: CreationDraft): Promise<void> {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await onSubmit(input);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }
  function submit(): void {
    if (submitDisabled) {
      setStatus(disabledReason ?? "当前无法提交，请检查创作设置。");
      return;
    }
    if (!usesCodex && !model.trim()) {
      setStatus("请选择本次创作使用的模型。");
      closeMenus();
      openMenu("model");
      return;
    }
    const nextDraft = {
      ...draft,
      prompt: draft.prompt.trim(),
      model: model.trim(),
      modelSelection: selection,
      kind: "image",
    } satisfies CreationDraft;
    if (nextDraft.approvalMode === "ask" && pendingSubmit !== draft) {
      setPendingSubmit(draft);
      setStatus("项目准备就绪，确认后才会创建并提交任务。");
      return;
    }
    void submitDraft(nextDraft);
    setPendingSubmit(null);
  }
  return (
    <>
      <form
        className="start-composer composer-surface"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <ComposerTextarea
          aria-label="创作提示词"
          value={draft.prompt}
          onChange={(event) => {
            commit({ prompt: event.target.value });
            // The inline feedback below is the single visible source for a
            // disabled generation reason. Clear transient submit/status text
            // while editing so the page does not render the same reason twice.
            setStatus("");
          }}
          placeholder="描述你想要生成的内容"
          rows={3}
          maxLength={4000}
        />
        <StartAttachmentList
          attachments={draft.attachments}
          onRemove={(id) =>
            commit({
              attachments: draft.attachments.filter((item) => item.id !== id),
            })
          }
        />
        <div className="start-composer-footer composer-toolbar" ref={pickerRef}>
          <div className="start-footer-left">
            <button
              type="button"
              className="start-add-button"
              aria-label="添加参考素材"
              onClick={() => fileInput.current?.click()}
            >
              <UiIcon name="add" size={20} />
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              hidden
              onChange={(event) => {
                addFiles(event.target.files);
                event.currentTarget.value = "";
              }}
            />
            <StartModelPicker
              selection={selection}
              open={modelMenuOpen}
              onToggle={() => toggleMenu("model")}
              onSelect={(choice) => {
                commit({
                  model: choice.model,
                  providerConnectionId: choice.connectionId,
                  modelSelection: choice,
                });
                closeMenus();
              }}
              onConfigure={() => {
                closeMenus();
                onOpenModel();
              }}
            />
            <span
              className="start-composer-divider start-model-divider"
              aria-hidden="true"
            />
            <div className="start-resource-picker composer-ext composer-ext-skill">
              <button
                type="button"
                className="start-tool-button"
                aria-haspopup="menu"
                aria-expanded={skillMenuOpen}
                title="扩展"
                onClick={() => toggleMenu("skill")}
              >
                <img src="/design/figma/composer-puzzle.svg" alt="" />
                <span>扩展</span>
              </button>
              {skillMenuOpen && (
                <ComposerExtensionsMenu
                  skills={skills}
                  onApplySkill={(record) => {
                    const message = onApplySkill?.(record);
                    closeMenus();
                    setStatus(message ?? "当前草稿不可用，未应用技能。");
                  }}
                  onOpen={(id) => {
                    closeMenus();
                    if (id === "skills") onOpenSkills();
                    else onOpenExtension(id);
                  }}
                />
              )}
            </div>
            <span
              className="start-composer-divider start-skill-divider"
              aria-hidden="true"
            />
          </div>
          <div className="start-footer-right">
            <VoiceInputButton
              className="start-mic-button"
              value={draft.prompt}
              onChange={(prompt) => commit({ prompt })}
              onStatus={setStatus}
              maxLength={4000}
            />
            <span className="start-composer-divider" aria-hidden="true" />
            <StartModePicker
              draft={draft}
              open={modeMenuOpen}
              onToggle={() => toggleMenu("mode")}
              onSelect={(value) => {
                commit({ approvalMode: value });
                closeMenus();
              }}
            />
            <button
              type="submit"
              className="start-submit-button"
              aria-label="开始创建项目"
              aria-describedby={
                disabledReason ? "start-submit-reason" : undefined
              }
              disabled={submitDisabled}
              title={disabledReason}
            >
              <img src="/design/figma/composer-send.svg" alt="" />
            </button>
          </div>
        </div>
        <UsageStatusBar
          draft={draft}
          onReasoningEffortChange={(effort) => commit({ reasoningEffort: effort })}
        />
      </form>
      <StartComposerFeedback
        reason={draft.prompt.trim() ? disabledReason : undefined}
        countInvalid={Boolean(countReason)}
        onResetCount={() => commit({ outputCount: 1 })}
        onConfigure={
          uiState === "service-unconfigured" ? onOpenModel : undefined
        }
        pending={pendingSubmit === draft}
        onConfirm={() => {
          if (pendingSubmit === draft) submit();
        }}
        onCancel={() => {
          setPendingSubmit(null);
          setStatus("已取消创建，输入仍保留。");
        }}
      />
    </>
  );
}
