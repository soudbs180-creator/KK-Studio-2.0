import { useRef, useState } from "react";
import type { CreationDraft } from "../features/creation/model";
import StartAttachmentList from "./StartAttachmentList";
import ComposerTextarea from "./ComposerTextarea";
import useConversationAttachments from "./useConversationAttachments";
import StartResourcePopover from "./StartResourcePopover";
import StartModelPicker from "./StartModelPicker";
import { StartApproval, StartModePicker } from "./StartComposerModes";
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
  defaultModel = "",
  modelConfigured = false,
  skills = [],
  onApplySkill,
}: {
  draft: CreationDraft;
  onDraftChange: (draft: CreationDraft) => void;
  setStatus: (status: string) => void;
  onSubmit: (input: CreationDraft) => void;
  onOpenModel: () => void;
  onOpenSkills: () => void;
  defaultModel?: string;
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
  const model = draft.model || defaultModel;
  function commit(patch: Partial<CreationDraft>): void {
    onDraftChange({ ...draft, ...patch, updatedAt: Date.now() });
  }
  const { fileInput, addFiles, readingFiles } = useConversationAttachments({
    draftKey: "home",
    attachments: draft.attachments,
    onChange: (attachments) =>
      onDraftChange({ ...draft, attachments, updatedAt: Date.now() }),
    onStatus: setStatus,
  });
  const uiState = getGenerationUiState({
    prompt: draft.prompt,
    inputValid: !readingFiles,
    modelConfigured,
    quotaAvailable: true,
    online: typeof navigator === "undefined" ? true : navigator.onLine,
    serviceConfigured: modelConfigured,
  });
  const submitDisabled = !canSubmitGeneration(uiState);
  const disabledReason = getDisabledReason(uiState);
  function submit(): void {
    if (readingFiles) {
      setStatus("正在读取参考素材，请稍候再提交。");
      return;
    }
    if (!draft.prompt.trim()) {
      setStatus("先写下一句创意，再开始创建项目。");
      return;
    }
    if (!model.trim()) {
      setStatus("请选择本次创作使用的模型。");
      closeMenus();
      openMenu("model");
      return;
    }
    const nextDraft = {
      ...draft,
      prompt: draft.prompt.trim(),
      model: model.trim(),
      kind: "image",
    } satisfies CreationDraft;
    if (nextDraft.approvalMode === "ask" && !pendingSubmit) {
      setPendingSubmit(nextDraft);
      setStatus("项目准备就绪，确认后才会创建并提交任务。");
      return;
    }
    onSubmit(nextDraft);
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
            setStatus(
              event.target.value.trim() && disabledReason ? disabledReason : "",
            );
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
              <img src="/design/figma/composer-plus.svg" alt="" />
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
              draft={draft}
              model={model}
              defaultModel={defaultModel}
              open={modelMenuOpen}
              onToggle={() => toggleMenu("model")}
              onSelect={(choice) => {
                commit({
                  model: choice.model,
                  providerConnectionId: choice.connectionId,
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
                title="技能（Skill）"
                onClick={() => toggleMenu("skill")}
              >
                <img src="/design/figma/composer-puzzle.svg" alt="" />
                <span>Skill</span>
              </button>
              {skillMenuOpen && (
                <StartResourcePopover
                  kind="skill"
                  skills={skills}
                  onApplySkill={(record) => {
                    const message = onApplySkill?.(record);
                    closeMenus();
                    setStatus(message ?? "当前草稿不可用，未应用技能。");
                  }}
                  onOpen={() => {
                    closeMenus();
                    onOpenSkills();
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
      </form>
      {draft.prompt.trim() && disabledReason && (
        <div className="start-composer-feedback" role="status">
          <span id="start-submit-reason">{disabledReason}</span>
          {uiState === "service-unconfigured" && (
            <button type="button" onClick={onOpenModel}>
              前往模型设置
            </button>
          )}
        </div>
      )}
      {pendingSubmit && (
        <StartApproval
          onConfirm={() => {
            onSubmit(pendingSubmit);
            setPendingSubmit(null);
          }}
          onCancel={() => {
            setPendingSubmit(null);
            setStatus("已取消创建，输入仍保留。");
          }}
        />
      )}
    </>
  );
}
