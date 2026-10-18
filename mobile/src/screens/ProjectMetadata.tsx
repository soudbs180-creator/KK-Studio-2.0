import { useState } from "react";
import type { MobileProject } from "../core/mobileModel.ts";
import { useApplication } from "../application/AppProvider.tsx";
import { Action, Field, Label } from "../ui/primitives.tsx";
import { Sheet } from "../ui/Sheet.tsx";
import { useAction } from "../ui/useAction.ts";
export function ProjectMetadata({ project }: { project: MobileProject }) {
  const { app, state } = useApplication(),
    { busy, run } = useAction(),
    [open, setOpen] = useState(false),
    [group, setGroup] = useState(project.group ?? ""),
    scope = state.accountId!;
  return (
    <>
      <Action
        compact
        selected={project.pinned}
        label={project.pinned ? "已置顶" : "置顶"}
        busy={busy}
        onPress={() =>
          void run(() =>
            app.local.setProjectMetadata(
              project.id,
              { pinned: !project.pinned },
              scope,
            ),
          )
        }
      />
      <Action
        compact
        label="项目分组"
        onPress={() => {
          setGroup(project.group ?? "");
          setOpen(true);
        }}
      />
      <Sheet title="设置项目分组" open={open} onClose={() => setOpen(false)}>
        <Field
          label="分组名称（留空取消分组）"
          value={group}
          onChangeText={setGroup}
          maxLength={80}
        />
        <Label muted small>
          只整理此设备的项目，不改变原件或任务归属。
        </Label>
        <Action
          primary
          label="保存分组"
          busy={busy}
          onPress={() =>
            void run(async () => {
              await app.local.setProjectMetadata(project.id, { group }, scope);
              setOpen(false);
            })
          }
        />
      </Sheet>
    </>
  );
}
