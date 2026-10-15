export const AGENT_DRAFT_APPEND_EVENT = "kk:agent-draft-append";

export interface AgentDraftAppendResult {
  handled: boolean;
  applied: boolean;
  message: string;
}

export interface AgentDraftAppendRequest {
  draftKey: string;
  instructions: string;
  result: AgentDraftAppendResult;
}

/** Only a mounted, active Agent composer for this project may accept the append. */
export function appendToActiveAgentDraft(
  draftKey: string,
  instructions: string,
): AgentDraftAppendResult {
  const request: AgentDraftAppendRequest = {
    draftKey,
    instructions,
    result: {
      handled: false,
      applied: false,
      message: "当前项目没有激活的 Agent 草稿。",
    },
  };
  if (typeof window !== "undefined")
    window.dispatchEvent(
      new CustomEvent(AGENT_DRAFT_APPEND_EVENT, { detail: request }),
    );
  return request.result;
}
