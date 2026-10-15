import { useEffect, useRef, useState } from "react";
import type { AgentDraftAttachment } from "./agentAttachments";
import {
  AGENT_DRAFT_APPEND_EVENT,
  type AgentDraftAppendRequest,
  type AgentDraftAppendResult,
} from "./agentDraftActions";

/** Keep live drafts above the channel panels, without adding persistence. */
export function useAgentDraftState() {
  const text = useState<Record<string, string>>({});
  const images = useState<Record<string, AgentDraftAttachment[]>>({});
  const errors = useState<Record<string, string | null>>({});
  return { text, images, errors };
}
export type AgentDraftState = ReturnType<typeof useAgentDraftState>;

/** Agent text stays separate from the API draft and is scoped to its project. */
export default function useAgentComposerDraft(
  draftKey: string,
  active: boolean,
  draftState: AgentDraftState,
) {
  const [drafts, setDrafts] = draftState.text;
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  const update = (text: string) => {
    draftsRef.current = { ...draftsRef.current, [draftKey]: text };
    setDrafts(draftsRef.current);
  };
  const appendInstructions = (
    instructions: string,
    limit: number,
  ): AgentDraftAppendResult => {
    const text = [draftsRef.current[draftKey]?.trimEnd(), instructions]
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
  }, [active, draftKey]);
  const clearSentDraft = (key: string, sent: string) => {
    if (draftsRef.current[key] !== sent) return;
    draftsRef.current = { ...draftsRef.current, [key]: "" };
    setDrafts(draftsRef.current);
  };
  return {
    input: drafts[draftKey] ?? "",
    update,
    appendInstructions,
    clearSentDraft,
  };
}
