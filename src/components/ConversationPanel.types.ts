import type { ModelSelection } from "../features/models/index.ts";
import type {
  CreationDraft,
  CreationProject,
} from "../features/creation/index.ts";
import type { SkillRecord } from "../features/skills/index.ts";
import type { AgentConversationProps } from "./AgentConversationMessages";
import type { ConversationSend } from "./useConversationSubmit";
import type { ConversationMessageView } from "./ConversationMessages";

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
  onDraftChange?: (draft: CreationDraft, expected?: CreationDraft) => void;
  voiceEnabled?: boolean;
  skills?: SkillRecord[];
  onApplySkill?: (record: SkillRecord) => string;
  agent?: AgentConversationProps;
  onSelectChat?: (chatId: string) => void;
  onCreateChat?: (isTemporary?: boolean) => void;
  executionDisabledReason?: string;
  readOnlyMessages?: ConversationMessageView[];
}
