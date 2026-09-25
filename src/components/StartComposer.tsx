import { useRef, useState } from "react";
import type { CreationDraft } from "../features/creation/model";
import StartAttachmentList from "./StartAttachmentList";
import ComposerTextarea from "./ComposerTextarea";
import useConversationAttachments from "./useConversationAttachments";
import StartComposerExtensions from "./StartComposerExtensions";
import { StartApproval, StartModePicker } from "./StartComposerModes";
import VoiceInputButton from "./VoiceInputButton";
import GenerationPrivacyNotice from "./GenerationPrivacyNotice";
import StartAddPicker from "./StartAddPicker";
import StartModelPicker from "./StartModelPicker";
import { useComposerMenus } from "./useComposerMenus";
import type { SkillRecord } from "../features/skills/skillRegistry";

export default function StartComposer({
  draft,
  onDraftChange,
  setStatus,
  onSubmit,
  onOpenModel,
  onOpenSkills,
  onOpenPlugins,
  onOpenPartners,
  defaultModel = "",
  skills = [],
  onApplySkill,
}: {
  draft: CreationDraft;
  onDraftChange: (draft: CreationDraft) => void;
  setStatus: (status: string) => void;
  onSubmit: (input: CreationDraft) => void;
  onOpenModel: () => void;
  onOpenSkills: () => void;
  onOpenPlugins: () => void;
  onOpenPartners: () => void;
  defaultModel?: string;
  skills?: SkillRecord[];
  onApplySkill?: (record: SkillRecord) => string;
}) {
  const [pendingSubmit, setPendingSubmit] = useState<CreationDraft | null>(
    null,
  );
  const pickerRef = useRef<HTMLDivElement>(null);
  const {
    addMenuOpen,
    modelMenuOpen,
    skillMenuOpen,
    modeMenuOpen,
    toggleMenu,
    openMenu,
    closeMenus,
  } = useComposerMenus(pickerRef);
  const model = draft.model || defaultModel || "kk-image-2";
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
  function submit(): void {
    if (readingFiles) {
      setStatus("正在读取参考素材，请稍候再提交。");
      return;
    }
    if (!draft.prompt.trim()) {
      setStatus("");
      pickerRef.current
        ?.closest("form")
        ?.querySelector<HTMLTextAreaElement>(".composer-textarea")
        ?.focus();
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
            <StartAddPicker
              open={addMenuOpen}
              onToggle={() => toggleMenu("add")}
              onClose={closeMenus}
              onAddFile={() => fileInput.current?.click()}
              onOpenPlugins={onOpenPlugins}
              onOpenPartners={onOpenPartners}
              draft={draft}
              onChange={commit}
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
              draft={draft}
              defaultModel={defaultModel}
              model={model}
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
            <StartComposerExtensions
              skillMenuOpen={skillMenuOpen}
              onToggleMenu={toggleMenu}
              onCloseMenus={closeMenus}
              onOpenSkills={onOpenSkills}
              skills={skills}
              onApplySkill={onApplySkill}
              onStatus={setStatus}
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
            >
              <img src="/design/figma/composer-send.svg" alt="" />
            </button>
          </div>
        </div>
      </form>
      <GenerationPrivacyNotice mode={draft.privacyMode} />
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
