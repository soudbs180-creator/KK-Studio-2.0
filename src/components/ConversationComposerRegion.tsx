import type { RefObject } from "react";
import type { CreationDraft } from "../features/creation/model";
import type { ModelSelection } from "../features/models/modelSelection";
import type { SkillRecord } from "../features/skills/skillRegistry";
import type { AgentConversationProps } from "./AgentConversationMessages";
import type { AgentDraftState } from "../features/agent/useAgentComposerDraft";
import AgentComposer from "./AgentComposer";
import ConversationComposer from "./ConversationComposer";

export default function ConversationComposerRegion({
  agent,
  draftKey,
  draftState,
  agentActive,
  agentConnecting,
  agentModel,
  input,
  onInputChange,
  onDraftChange,
  onSubmitMessage,
  disabled,
  modelDisabled,
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
  draftState: AgentDraftState;
  agentActive: boolean;
  agentConnecting: boolean;
  agentModel?: string;
  input: string;
  onInputChange: (value: string) => void;
  onDraftChange?: (patch: Partial<CreationDraft>) => void;
  onSubmitMessage: (message: string) => Promise<void>;
  disabled: boolean;
  modelDisabled: boolean;
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
      draftState={draftState}
      active={agentActive}
      onDraftChange={onDraftChange}
      composer={
        <ConversationComposer
          input={input}
          onInputChange={onInputChange}
          onSubmitMessage={onSubmitMessage}
          disabled={disabled || (agentActive && agentConnecting)}
          modelDisabled={modelDisabled}
          submitDisabled={submitDisabled}
          placeholder={placeholder}
          composerDraft={composerDraft}
          onRemoveAttachment={onRemoveAttachment}
          fileInput={fileInput}
          onAddFiles={onAddFiles}
          readingFiles={readingFiles}
          onStatus={onStatus}
          currentModel={
            agentActive ? agentModel || "Codex 账号默认" : currentModel
          }
          modelOptions={
            agentActive
              ? ["Codex 账号默认", ...(agent?.models ?? [])]
              : modelOptions
          }
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
