import type React from "react";
import type { CanvasReferenceSlot } from "../../domain/canvasItems.ts";
import type { ComposerReference } from "../../features/prompts/index.ts";
import type { CreationAttachment } from "../../features/creation/index.ts";
import type { AgentDraftAttachment } from "../../features/agent/index.ts";
import type {
  ModelSelection,
  UserCapability,
} from "../../features/models/index.ts";
import type { AvailableNodeCandidate } from "./composerKeyHandlers.ts";

export interface TokenizedComposerInputProps {
  ariaLabel?: string;
  maxLength?: number;
  referenceEntries?: readonly ComposerReference[];
  onReferenceSlotChange?: (id: string, slot: CanvasReferenceSlot) => void;
  onRemoveReference?: (id: string) => void;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSubmit?: () => void;
  submitShortcut?: "enter" | "ctrlEnter";
  modelSelection?: ModelSelection;
  capability?: UserCapability;
  onSelectModel?: (selection: ModelSelection) => void;
  onCapabilityChange?: (capability: UserCapability) => void;
  onDispatch?: (payload: {
    prompt: string;
    capability: UserCapability;
    modelSelection?: ModelSelection;
  }) => void | Promise<void>;
  availableNodes?: AvailableNodeCandidate[];
  attachments?: (CreationAttachment | AgentDraftAttachment)[];
  onAddAttachment?: (item: AvailableNodeCandidate) => void;
  onOpenModal?: (modalId: string) => void;
  setStatus?: (status: string) => void;
  minRows?: number;
}
