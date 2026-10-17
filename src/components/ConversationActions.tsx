import ComposerExtensionsMenu from "./ComposerExtensionsMenu";
import UiIcon from "./UiIcon";
import type { ModelSelection } from "../features/models/modelSelection";
import type { RefObject, ReactNode } from "react";
import ConversationModelPicker from "./ConversationModelPicker";
import type { CreationDraft } from "../features/creation/model";
import VoiceInputButton from "./VoiceInputButton";
import type { SkillRecord } from "../features/skills/skillRegistry";
import AgentActionButton, { type AgentActionState } from "./AgentActionButton";

export default function ConversationActions({
  actionsRef,
  fileInput,
  onAddFiles,
  composerDraft,
  submitting,
  submitDisabled,
  attachmentDisabled,
  modelDisabled,
  currentModel,
  modelControl,
  modelOptions,
  modelSelection,
  modelMenuOpen,
  onToggleModel,
  onSelectModel,
  onConfigureModel,
  onOpen,
  skillMenuOpen,
  onToggleSkill,
  modeMenuRef,
  modeMenuOpen,
  approvalMode,
  onToggleMode,
  onSelectMode,
  input,
  onVoiceChange,
  onVoiceStatus,
  voiceEnabled,
  voiceSessionKey,
  skills = [],
  onApplySkill,
  agentActionState,
  onPause,
  onResume,
  onSend,
  onAgentPause,
  onAgentResume,
}: {
  actionsRef: RefObject<HTMLDivElement>;
  fileInput: RefObject<HTMLInputElement>;
  onAddFiles: (files: FileList | null) => void;
  composerDraft?: CreationDraft;
  submitting: boolean;
  submitDisabled?: boolean;
  attachmentDisabled?: boolean;
  modelDisabled?: boolean;
  currentModel?: string;
  modelControl?: ReactNode;
  modelOptions: string[];
  modelSelection?: ModelSelection;
  modelMenuOpen: boolean;
  onToggleModel: () => void;
  onSelectModel: (model: string, selection?: ModelSelection) => void;
  onConfigureModel: () => void;
  onOpen: (id: string) => void;
  skillMenuOpen: boolean;
  onToggleSkill: () => void;
  pluginMenuOpen: boolean;
  onTogglePlugin: () => void;
  modeMenuRef: RefObject<HTMLDivElement>;
  modeMenuOpen: boolean;
  approvalMode: "auto" | "ask";
  onToggleMode: () => void;
  onSelectMode: (mode: "auto" | "ask") => void;
  input: string;
  onVoiceChange: (value: string) => void;
  onVoiceStatus: (message: string) => void;
  voiceEnabled: boolean;
  voiceSessionKey: string;
  skills?: SkillRecord[];
  onApplySkill?: (record: SkillRecord) => void;
  agentActionState?: AgentActionState;
  onPause?: () => void | Promise<void>;
  onResume?: () => void | Promise<void>;
  onSend?: () => void | Promise<void>;
  onAgentPause?: () => void | Promise<void>;
  onAgentResume?: () => void | Promise<void>;
}) {
  const hasContent = Boolean(
    input.trim() ||
    (composerDraft?.attachments && composerDraft.attachments.length > 0),
  );
  const resolvedState: AgentActionState =
    agentActionState ?? (submitting ? "executing" : "idle");
  const handlePause = onPause ?? onAgentPause;
  const handleResume = onResume ?? onAgentResume;

  return (
    <div className="composer-toolbar" ref={actionsRef} data-node-id="407:29315">
      <button
        type="button"
        className="chat-attachment-trigger"
        aria-label="添加对话素材"
        disabled={(attachmentDisabled ?? submitting) || !composerDraft}
        onClick={() => fileInput.current?.click()}
      >
        <UiIcon name="add" size={20} />
      </button>
      <input
        ref={fileInput}
        hidden
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        onChange={(event) => {
          onAddFiles(event.target.files);
          event.currentTarget.value = "";
        }}
      />
      <div className="chat-model-picker-wrap">
        {modelControl ?? (
          <ConversationModelPicker
            disabled={modelDisabled}
            currentModel={currentModel}
            options={modelOptions}
            selection={modelSelection}
            open={modelMenuOpen}
            onToggle={onToggleModel}
            onSelect={onSelectModel}
            onConfigure={onConfigureModel}
          />
        )}
      </div>
      <span
        className="chat-footer-separator chat-model-separator"
        aria-hidden="true"
      />
      <div className="chat-resource-picker chat-skill-picker composer-extensions-anchor">
        <button
          type="button"
          className="chat-skill-trigger"
          aria-label="扩展"
          title="扩展"
          aria-haspopup="menu"
          aria-expanded={skillMenuOpen}
          onClick={onToggleSkill}
        >
          <img src="/design/figma/composer-puzzle.svg" alt="" />
          <span>扩展</span>
        </button>
        {skillMenuOpen && (
          <ComposerExtensionsMenu
            skills={skills}
            onApplySkill={onApplySkill}
            onOpen={(id) => {
              onToggleSkill();
              onOpen(id);
            }}
          />
        )}
      </div>
      <div className="composer-trailing-actions">
        <div className="chat-mode-menu" ref={modeMenuRef}>
          <button
            type="button"
            className="chat-mode-trigger"
            aria-label="AI权限模式"
            aria-haspopup="menu"
            aria-expanded={modeMenuOpen}
            onClick={onToggleMode}
          >
            {approvalMode === "auto" ? "自动" : "询问"}
            <img
              className="chat-mode-chevron"
              src="/design/figma/composer-chevron.svg"
              width="10"
              height="5"
              alt=""
            />
          </button>
          {modeMenuOpen && (
            <div className="chat-mode-popover" role="menu">
              {(
                [
                  ["auto", "自动"],
                  ["ask", "询问"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={approvalMode === value}
                  title={
                    value === "auto"
                      ? "AI 可以连续执行，不在每一步询问"
                      : "AI 在执行前询问你的确认"
                  }
                  onClick={() => onSelectMode(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        <VoiceInputButton
          value={input}
          onChange={onVoiceChange}
          onStatus={onVoiceStatus}
          enabled={voiceEnabled}
          sessionKey={voiceSessionKey}
          maxLength={7500}
        />
        <span
          className="chat-footer-separator chat-footer-separator-right"
          aria-hidden="true"
        />
        <AgentActionButton
          className="chat-send"
          state={resolvedState}
          hasDraft={hasContent}
          hasContent={hasContent}
          debounceMs={resolvedState === "idle" && !onSend ? 0 : undefined}
          disabled={Boolean(
            (submitting && !agentActionState) ||
            (resolvedState === "idle" && submitDisabled),
          )}
          onSend={onSend}
          onPause={handlePause}
          onResume={handleResume}
        />
      </div>
    </div>
  );
}
