import { useRef, type RefObject } from "react";
import StartAttachmentList from "./StartAttachmentList";
import ComposerTextarea from "./ComposerTextarea";
import ConversationActions from "./ConversationActions";
import ModelVariantControl from "./ModelVariantControl";
import { useComposerMenus } from "./useComposerMenus";
import type { CreationDraft } from "../features/creation/model";
import type { ModelSelection } from "../features/models/modelSelection";
import type { SkillRecord } from "../features/skills/skillRegistry";

export default function ConversationComposer({
  input,
  onInputChange,
  onSubmitMessage,
  disabled,
  submitDisabled,
  attachmentDisabled,
  placeholder,
  composerDraft,
  onRemoveAttachment,
  fileInput,
  onAddFiles,
  readingFiles,
  onStatus,
  currentModel,
  modelOptions = [],
  modelSelection,
  onSelectModel,
  onOpen,
  skills,
  onApplySkill,
  approvalMode,
  onSelectMode,
  voiceEnabled,
  onVoiceChange,
  onVoiceStatus,
  voiceSessionKey,
}: {
  input: string;
  onInputChange: (value: string) => void;
  onSubmitMessage: (message: string) => Promise<void>;
  disabled: boolean;
  submitDisabled?: boolean;
  attachmentDisabled?: boolean;
  placeholder: string;
  composerDraft?: CreationDraft;
  onRemoveAttachment: (id: string) => void;
  fileInput: RefObject<HTMLInputElement>;
  onAddFiles: (files: FileList | null) => void;
  readingFiles: number;
  onStatus: (status: string) => void;
  currentModel?: string;
  modelOptions?: string[];
  modelSelection?: ModelSelection;
  onSelectModel: (model: string, selection?: ModelSelection) => void;
  onOpen: (id: string) => void;
  skills?: SkillRecord[];
  onApplySkill?: (record: SkillRecord) => string;
  approvalMode: "auto" | "ask";
  onSelectMode: (value: "auto" | "ask") => void;
  voiceEnabled: boolean;
  onVoiceChange: (value: string) => void;
  onVoiceStatus: (status: string) => void;
  voiceSessionKey: string;
}) {
  const actionsRef = useRef<HTMLDivElement>(null);
  const modeMenuRef = useRef<HTMLDivElement>(null);
  const {
    modelMenuOpen,
    skillMenuOpen,
    pluginMenuOpen,
    modeMenuOpen,
    toggleMenu,
    closeMenus,
  } = useComposerMenus(actionsRef);
  return (
    <form
      className="chat-composer composer-surface"
      data-node-id="407:29310"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        if (readingFiles) {
          onStatus("正在读取参考素材，请稍候再提交。");
          return;
        }
        await onSubmitMessage(input.trim());
      }}
    >
      <ComposerTextarea
        aria-label="对话内容"
        maxLength={7500}
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
      />
      <StartAttachmentList
        attachments={composerDraft?.attachments ?? []}
        onRemove={onRemoveAttachment}
      />
      <ModelVariantControl
        selection={modelSelection}
        onSelect={(selection) => onSelectModel(selection.model, selection)}
      />
      <ConversationActions
        actionsRef={actionsRef}
        fileInput={fileInput}
        onAddFiles={onAddFiles}
        composerDraft={composerDraft}
        submitting={submitDisabled ?? disabled}
        attachmentDisabled={attachmentDisabled}
        currentModel={currentModel}
        modelOptions={modelOptions}
        modelSelection={modelSelection}
        modelMenuOpen={modelMenuOpen}
        onToggleModel={() => toggleMenu("model")}
        onSelectModel={(option, selection) => {
          onSelectModel(option, selection);
          closeMenus();
        }}
        onConfigureModel={() => {
          closeMenus();
          onOpen("settings/providers");
        }}
        onOpen={onOpen}
        skillMenuOpen={skillMenuOpen}
        onToggleSkill={() => toggleMenu("skill")}
        pluginMenuOpen={pluginMenuOpen}
        onTogglePlugin={() => toggleMenu("plugin")}
        modeMenuRef={modeMenuRef}
        modeMenuOpen={modeMenuOpen}
        skills={skills}
        onApplySkill={(record) => {
          const message = onApplySkill?.(record);
          closeMenus();
          onStatus(message ?? "当前草稿不可用，未应用 Skill。");
        }}
        approvalMode={approvalMode}
        onToggleMode={() => toggleMenu("mode")}
        onSelectMode={(value) => {
          onSelectMode(value);
          closeMenus();
          onStatus(
            value === "auto"
              ? "自动模式：执行当前任务；需要的权限、成本与外传审批仍会保留。"
              : "询问模式：提交或执行操作前请求确认。",
          );
        }}
        input={input}
        onVoiceChange={onVoiceChange}
        onVoiceStatus={onVoiceStatus}
        voiceEnabled={voiceEnabled}
        voiceSessionKey={voiceSessionKey}
      />
    </form>
  );
}
