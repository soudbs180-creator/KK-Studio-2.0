import { useRef, useState } from "react";
import UiIcon from "./UiIcon";
import { Button } from "./ui";
import type { CreationDraft } from "../features/creation/index.ts";
import {
  homeModelSelection,
  homeDraftForSelection,
} from "../domain/modelSelection";
import { codexHomeValidation } from "../features/agent/index.ts";
import StartAttachmentList from "./StartAttachmentList";
import ComposerTextarea from "./ComposerTextarea";
import useConversationAttachments from "./useConversationAttachments";
import StartModelPicker from "./StartModelPicker";
import { StartComposerFeedback } from "./StartComposerModes";
import StartMediaControls from "./StartMediaControls";
import { VoiceInputButton } from "../features/speech/index.ts";
import { useComposerMenus } from "./useComposerMenus";
import { ExtensionSlot } from "../features/extensions/index.ts";
import type { SkillRecord } from "../features/skills/index.ts";
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
  const menus = useComposerMenus(pickerRef);
  const {
    modelMenuOpen,
    toggleMenu,
    openMenu,
    closeMenus,
  } = menus;
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
    modelConfigured:
      usesCodex || Boolean(selection.connectionId) || modelConfigured,
    quotaAvailable: true,
    online: typeof navigator === "undefined" ? true : navigator.onLine,
    serviceConfigured:
      usesCodex || Boolean(selection.connectionId) || modelConfigured,
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
      ...homeDraftForSelection(draft, selection),
      prompt: draft.prompt.trim(),
      model: model.trim(),
    } satisfies CreationDraft;
    if (nextDraft.approvalMode === "ask" && pendingSubmit !== draft) {
      setPendingSubmit(draft);
      setStatus("项目准备就绪，确认后才会创建并提交任务。");
      return;
    }
    void submitDraft(nextDraft);
    setPendingSubmit(null);
  }
  const toolbarControls = {
    draft, selection, menus, disabled: submitting || readingFiles > 0,
    onChange: commit,
    onSelectModel: (choice: typeof selection) => {
      commit(homeDraftForSelection(draft, choice));
      closeMenus();
    },
    skills, onApplySkill, onStatus: setStatus,
    onOpen: (id: string) => {
      if (id === "skills") onOpenSkills();
      else onOpenExtension(id);
    },
  };
  return (
    <>
      <form
        className="start-composer composer-surface"
        data-composer-variant={draft.kind === "text" ? "conversation" : "media"}
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
            <Button
              type="button"
              heightTier="32px"
              variant="ghost"
              isPill
              prefixIcon={<UiIcon name="add" size={16} />}
              className="start-add-button"
              aria-label="添加参考素材"
              onClick={() => fileInput.current?.click()}
            />
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
                commit(homeDraftForSelection(draft, choice));
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
            <StartMediaControls {...toolbarControls} placement="left" />
            <span
              className="start-composer-divider start-skill-divider"
              aria-hidden="true"
            />
          </div>
          <div className="start-footer-right">
            {draft.kind !== "text" && <StartMediaControls {...toolbarControls} placement="right" />}
            <VoiceInputButton
              className="start-mic-button"
              value={draft.prompt}
              onChange={(prompt) => commit({ prompt })}
              onStatus={setStatus}
              maxLength={4000}
              idleIcon={<UiIcon name="mic" size={16} />}
              activeIcon={<UiIcon name="mic-off" size={16} />}
            />
            <span className="start-composer-divider" aria-hidden="true" />
            {draft.kind === "text" && <StartMediaControls {...toolbarControls} placement="right" />}
            <Button
              type="submit"
              heightTier="44px"
              variant="primary"
              isPill
              prefixIcon={<UiIcon name="send" size={28} />}
              className="start-submit-button"
              aria-label="开始创建项目"
              aria-describedby={
                disabledReason ? "start-submit-reason" : undefined
              }
              disabled={submitDisabled}
              title={disabledReason}
            />
          </div>
        </div>
        <ExtensionSlot id="composer.below" />
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
