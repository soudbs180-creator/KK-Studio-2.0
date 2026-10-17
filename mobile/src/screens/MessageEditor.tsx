import { useState } from "react";
import { useApplication } from "../application/AppProvider.tsx";
import type { MobileMessage, MobileProject } from "../core/mobileModel.ts";
import { MAX_MOBILE_TEXT_RESULT_CHARS } from "../core/resultLimits.ts";
import { Action, Field, Label } from "../ui/primitives.tsx";
import { Sheet } from "../ui/Sheet.tsx";
import { useAction } from "../ui/useAction.ts";
import { useUnsavedExit } from "../ui/useUnsavedExit.tsx";
export function MessageEditor({
  project,
  message,
  onClose,
  onSaved,
}: {
  project: MobileProject;
  message: MobileMessage;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const { app, state } = useApplication(),
    scope = state.accountId!,
    { busy, run } = useAction();
  const [edit, setEdit] = useState(() =>
    app.projects.openMessageEdit(project.id, message.id, scope),
  );
  const [compare, setCompare] = useState(false),
    changed = project.revision !== edit.revision;
  const exit = useUnsavedExit(edit.text !== message.text, scope, () =>
    app.projects.discardMessageEdit(project.id, message.id, scope),
  );
  function update(value: typeof edit) {
    app.projects.rememberMessageEdit(project.id, message.id, value, scope);
    setEdit(value);
  }
  return (
    <>
      <Sheet title="编辑为新消息" open onClose={onClose}>
        <Label muted>
          原文和原任务保持不变；保存将新增关联原文的消息，不调用模型。未保存输入仅在此账号的当前运行内存中保留。
        </Label>
        <Field
          label={`新消息文本（${edit.text.length}/${MAX_MOBILE_TEXT_RESULT_CHARS}）`}
          value={edit.text}
          onChangeText={(text) => update({ ...edit, text })}
          multiline
          editable={!busy}
          maxLength={MAX_MOBILE_TEXT_RESULT_CHARS}
          style={{ minHeight: 200, textAlignVertical: "top" }}
        />
        {changed && (
          <>
            <Label danger>项目记录出现新版，请核对原文后再保存。</Label>
            <Action
              label="比较原文与本次输入"
              onPress={() => setCompare(true)}
            />
          </>
        )}
        <Action
          primary
          label="保存独立编辑消息"
          busy={busy}
          disabled={
            changed || !edit.text.trim() || message.deletedAt !== undefined
          }
          onPress={() =>
            void run(async () => {
              const id = await app.projects.saveMessageEdit(
                project.id,
                message.id,
                edit,
                scope,
              );
              exit.allow();
              onSaved(id);
            })
          }
        />
        <Action
          danger
          label="明确放弃本次输入"
          disabled={busy}
          onPress={() => {
            app.projects.discardMessageEdit(project.id, message.id, scope);
            exit.allow();
            onClose();
          }}
        />
      </Sheet>
      <Sheet
        title="核对编辑基础"
        open={compare}
        onClose={() => setCompare(false)}
      >
        <Label>原文</Label>
        <Label>{message.text}</Label>
        <Label>本次输入</Label>
        <Label>{edit.text}</Label>
        <Action
          primary
          label="已核对，保留输入并使用当前版本"
          onPress={() => {
            update({ ...edit, revision: project.revision });
            setCompare(false);
          }}
        />
      </Sheet>
      {exit.dialog}
    </>
  );
}
