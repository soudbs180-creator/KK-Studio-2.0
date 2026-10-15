import type {
  CreationProject,
  CreationDraft,
} from "../features/creation/model";
import type { SkillRegistry } from "../features/skills/skillRegistry";
import type { ConversationPanelProps } from "./ConversationPanel.types";
import GoogleConversationPanel from "./GoogleConversationPanel";
import ProviderConversationPanel from "./ProviderConversationPanel";
import type { AgentDraftState } from "../features/agent/useAgentComposerDraft";
export default function ConversationAlternateChannel({
  channel,
  project,
  draftState,
  onClose,
  onOpen,
  overlay,
  onChannelChange,
  channelBusy,
  assistantRegistry,
  onProviderConversation,
  onCancelTask,
  onPatch,
}: Pick<
  ConversationPanelProps,
  "onClose" | "onOpen" | "overlay" | "onProviderConversation" | "onCancelTask"
> & {
  channel: string;
  project: CreationProject;
  draftState: AgentDraftState;
  onChannelChange: (channel: string) => void;
  channelBusy: boolean;
  assistantRegistry?: SkillRegistry;
  onPatch: (patch: Partial<CreationDraft>) => void;
}) {
  if (channel === "models" && onProviderConversation && onCancelTask)
    return (
      <ProviderConversationPanel
        project={project}
        onClose={onClose}
        onOpen={onOpen}
        onChannelChange={onChannelChange}
        onSubmit={onProviderConversation}
        onCancelTask={onCancelTask}
        registry={assistantRegistry}
        onDraftChange={onPatch}
        channelBusy={channelBusy}
      />
    );
  return (
    <GoogleConversationPanel
      project={project}
      draftState={draftState}
      onClose={onClose}
      onOpen={onOpen}
      onChannelChange={onChannelChange}
      overlay={overlay}
      codexBusy={channelBusy}
      assistantRegistry={assistantRegistry}
      assistantId={project.composerDraft.assistantId}
      onAssistantChange={(assistantId) => onPatch({ assistantId })}
    />
  );
}
