import { useEffect, useRef, useState } from "react";
import type { AgentDraftAttachment } from "./agentAttachments";
import {
  AGENT_DRAFT_APPEND_EVENT,
  type AgentDraftAppendRequest,
  type AgentDraftAppendResult,
} from "./agentDraftActions";

/** Share transient UI state; ordinary chat content uses the canonical draft. */
export function useAgentDraftState() {
  const text = useState<Record<string, string>>({});
  const images = useState<Record<string, AgentDraftAttachment[]>>({});
  const errors = useState<Record<string, string | null>>({});
  return { text, images, errors };
}
export type AgentDraftState = ReturnType<typeof useAgentDraftState>;

/** The optional persister keeps every channel in the same scoped canonical draft. */
export default function useAgentComposerDraft(
  draftKey: string,
  active: boolean,
  draftState: AgentDraftState,
  initialPrompt = "",
  persist?: (text: string) => void,
) {
  const [drafts, setDrafts] = draftState.text;
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  const promptRef = useRef(initialPrompt);
  promptRef.current = initialPrompt;
  const update = (text: string) => {
    persist?.(text);
    draftsRef.current = { ...draftsRef.current, [draftKey]: text };
    setDrafts(draftsRef.current);
  };
  const appendInstructions = (
    instructions: string,
    limit: number,
  ): AgentDraftAppendResult => {
    const text = [
      (persist
        ? initialPrompt
        : (draftsRef.current[draftKey] ?? initialPrompt)
      ).trimEnd(),
      instructions,
    ]
      .filter(Boolean)
      .join("\n\n");
    if (text.length > limit)
      return {
        handled: true,
        applied: false,
        message: `加入后超过 ${limit.toLocaleString("en-US")} 字符，请先精简指令。`,
      };
    update(text);
    return {
      handled: true,
      applied: true,
      message: "指令已加入 Agent 草稿，尚未发送。",
    };
  };
  useEffect(() => {
    const append = (event: Event) => {
      const request = (event as CustomEvent<AgentDraftAppendRequest>).detail;
      if (
        !active ||
        !request ||
        request.draftKey !== draftKey ||
        typeof request.instructions !== "string" ||
        !request.result ||
        request.result.handled
      )
        return;
      request.result = appendInstructions(request.instructions, 4000);
    };
    window.addEventListener(AGENT_DRAFT_APPEND_EVENT, append);
    return () => window.removeEventListener(AGENT_DRAFT_APPEND_EVENT, append);
  }, [active, draftKey, initialPrompt, persist]);
  const clearSentDraft = (key: string, sent: string, persistDraft = true) => {
    if (
      (persist
        ? promptRef.current
        : (draftsRef.current[key] ?? initialPrompt)) !== sent
    )
      return false;
    if (persistDraft) persist?.("");
    draftsRef.current = { ...draftsRef.current, [key]: "" };
    setDrafts(draftsRef.current);
    return true;
  };
  return {
    input: persist ? initialPrompt : (drafts[draftKey] ?? initialPrompt),
    update,
    appendInstructions,
    clearSentDraft,
  };
}
