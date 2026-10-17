import { useState } from "react";
import type { CreationDraft } from "@kk-studio/creation-contracts";
import type { MobileProject } from "../core/mobileModel.ts";
import { useApplication } from "../application/AppProvider.tsx";
import { Action, Label } from "../ui/primitives.tsx";
import { Sheet } from "../ui/Sheet.tsx";
import { useAction } from "../ui/useAction.ts";
export function DraftRecovery({
  project,
  draft,
}: {
  project: MobileProject;
  draft: CreationDraft;
}) {
  const { app, state } = useApplication(),
    { busy, run } = useAction(),
    [open, setOpen] = useState(false);
  if (!state.unsavedDraftProjectIds.includes(project.id)) return null;
  return (
    <>
      <Label muted small>
        未保存的输入保留在本次应用内存中，请保持应用打开。重新读取后先比较保存内容，再恢复。
      </Label>
      <Action
        label="核对并保存保留草稿"
        disabled={Boolean(state.storageError)}
        reason={state.storageError ? "请先重新读取设备存储。" : undefined}
        onPress={() => setOpen(true)}
      />
      <Sheet title="恢复草稿保存" open={open} onClose={() => setOpen(false)}>
        <Label>当前设备保存内容</Label>
        <Label muted>{project.composerDraft.prompt || "空草稿"}</Label>
        <Label muted small>
          模型：{project.composerDraft.model || "未选择"}
        </Label>
        <Label>本次保留内容</Label>
        <Label>{draft.prompt || "空草稿"}</Label>
        <Label muted small>
          模型：{draft.model || "未选择"}
        </Label>
        <Label muted small>
          确认后用保留内容更新此项目草稿。不会清空其他项目或重新生成任务。
        </Label>
        <Action
          primary
          label="使用保留草稿保存"
          busy={busy}
          onPress={() =>
            void run(async () => {
              await app.saveDraft(project.id, draft, true, state.accountId!);
              setOpen(false);
            })
          }
        />
      </Sheet>
    </>
  );
}
