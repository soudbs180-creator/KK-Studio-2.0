import assert from "node:assert/strict";
import test from "node:test";
import { useActiveProjectConversation } from "../../src/app/useActiveProjectConversation.ts";
import {
  createProject,
  emptySnapshot,
  projectChatView,
} from "../../src/features/creation/index.ts";
for (const state of ["saved", "read_only"])
  for (const mainAgent of ["codex", "google", "direct"] as const)
    for (const channel of [undefined, "codex", "google", "direct"] as const) {
      test(`${state} ${mainAgent} chat owns channel regardless of ${channel} draft alias`, () => {
        const p = createProject({
          prompt: "",
          model: "",
          kind: "text",
          attachments: [],
        });
        const chat = p.chats![p.activeChatId!];
        chat.mainAgent = mainAgent;
        chat.draft = {
          prompt: "canonical prompt",
          attachments: [],
          ...(channel ? { conversationChannel: channel } : {}),
        };
        const project = projectChatView(p);
        const snapshot = {
          ...emptySnapshot(),
          version: 3 as const,
          projects: [project],
          activeProjectId: project.id,
        };
        const result = useActiveProjectConversation(snapshot, state, project);
        assert.equal(result.conversationDraft?.conversationChannel, mainAgent);
        assert.equal(result.conversationDraft?.prompt, "canonical prompt");
      });
    }
