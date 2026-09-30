import type { ModelSelection } from "../features/models/modelSelection";
import type {
  CreationDraft,
  CreationProject,
} from "../features/creation/model";
import type { SkillRecord } from "../features/skills/skillRegistry";
import type { AgentConversationProps } from "./AgentConversationMessages";
import type { ConversationSend } from "./useConversationSubmit";

export interface ConversationPanelProps {
  overlay?: boolean;
  onClose: () => void;
  onOpen: (id: string) => void;
  project?: CreationProject;
  currentModel?: string;
  modelConfigured?: boolean;
  onModelChange?: (model: string, selection?: ModelSelection) => void;
  modelOptions?: string[];
  onSend?: ConversationSend;
  onDeleteMessage?: (messageId: string) => void;
  composerDraft?: CreationDraft;
  onDraftChange?: (draft: CreationDraft) => void;
  voiceEnabled?: boolean;
  skills?: SkillRecord[];
  onApplySkill?: (record: SkillRecord) => string;
  agent?: AgentConversationProps;
}
