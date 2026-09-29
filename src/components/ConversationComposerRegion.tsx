import type { RefObject } from "react";
import type { CreationDraft } from "../features/creation/model";
import type { ModelSelection } from "../features/models/modelSelection";
import type { SkillRecord } from "../features/skills/skillRegistry";
import type { AgentConversationProps } from "./AgentConversationMessages";
import AgentComposer from "./AgentComposer";
import ConversationComposer from "./ConversationComposer";

export default function ConversationComposerRegion({
  agent,
  draftKey,
  agentActive,
  agentConnecting,
  agentModel,
  input,
  onInputChange,
  onSubmitMessage,
  disabled,
  submitDisabled,
  placeholder,
  composerDraft,
  onRemoveAttachment,
  fileInput,
  onAddFiles,
  readingFiles,
  onStatus,
  currentModel,
  modelOptions,
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
  agent?: AgentConversationProps;
  draftKey: string;
  agentActive: boolean;
  agentConnecting: boolean;
  agentModel?: string;
  input: string;
  onInputChange: (value: string) => void;
  onSubmitMessage: (message: string) => Promise<void>;
  disabled: boolean;
  submitDisabled: boolean;
  placeholder: string;
  composerDraft?: CreationDraft;
  onRemoveAttachment: (id: string) => void;
  fileInput: RefObject<HTMLInputElement>;
  onAddFiles: (files: FileList | null) => void;
  readingFiles: number;
  onStatus: (status: string) => void;
  currentModel?: string;
  modelOptions: string[];
  modelSelection?: ModelSelection;
  onSelectModel: (option: string, selection?: ModelSelection) => void;
  onOpen: (id: string) => void;
  skills: SkillRecord[];
  onApplySkill?: (record: SkillRecord) => string;
  approvalMode: "auto" | "ask";
  onSelectMode: (value: "auto" | "ask") => void;
  voiceEnabled: boolean;
  onVoiceChange: (value: string) => void;
  onVoiceStatus: (status: string) => void;
  voiceSessionKey: string;
}) {
  return (
    <AgentComposer
      agent={agent}
      draftKey={draftKey}
      active={agentActive}
      composer={
        <ConversationComposer
          input={input}
          onInputChange={onInputChange}
          onSubmitMessage={onSubmitMessage}
          disabled={disabled || (agentActive && agentConnecting)}
          submitDisabled={submitDisabled}
          placeholder={placeholder}
          composerDraft={composerDraft}
          onRemoveAttachment={onRemoveAttachment}
          fileInput={fileInput}
          onAddFiles={onAddFiles}
          readingFiles={readingFiles}
          onStatus={onStatus}
          currentModel={agentActive ? agentModel || "Codex 账号默认" : currentModel}
          modelOptions={agentActive ? ["Codex 账号默认", ...(agent?.models ?? [])] : modelOptions}
          modelSelection={modelSelection}
          onSelectModel={onSelectModel}
          onOpen={onOpen}
          skills={skills}
          onApplySkill={onApplySkill}
          approvalMode={approvalMode}
          onSelectMode={onSelectMode}
          voiceEnabled={voiceEnabled}
          onVoiceChange={onVoiceChange}
          onVoiceStatus={onVoiceStatus}
          voiceSessionKey={voiceSessionKey}
        />
      }
    />
  );
}

