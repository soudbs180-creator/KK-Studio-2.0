import { useState } from "react";
import { router } from "expo-router";
import { useApplication } from "../application/AppProvider.tsx";
import type { ProjectRestorePlan } from "../application/projectWorkflows.ts";
import { pickBackup } from "../storage/media";
import { Action, Label } from "../ui/primitives.tsx";
import { Sheet } from "../ui/Sheet.tsx";
import { useAction } from "../ui/useAction.ts";
export function ProjectRestoreAction() {
  const { app, state } = useApplication(),
    scope = state.accountId!,
    { busy, run } = useAction();
  const [plan, setPlan] = useState<ProjectRestorePlan>();
  return (
    <>
      <Action
        label="选择项目包并预检恢复"
        busy={busy}
        onPress={() =>
          void run(async () => {
            const payload = await pickBackup();
            if (payload === null) return;
            const checked = await app.projects.preflight(payload, scope);
            if (app.getState().accountId === scope) setPlan(checked);
          })
        }
      />
      <Sheet
        title="独立恢复项目"
        open={Boolean(plan)}
        onClose={() => setPlan(undefined)}
      >
        <Label>
          {plan?.projectName} · {plan?.taskCount} 个任务 · {plan?.assetCount}{" "}
          件原件
        </Label>
        <Label muted>
          原件 {((plan?.originalBytes ?? 0) / 1024 / 1024).toFixed(2)}{" "}
          MB。将创建新项目身份；历史远端作业只读，现有项目保留。
        </Label>
        <Action
          primary
          label="确认创建独立恢复项目"
          busy={busy}
          onPress={() =>
            void run(async () => {
              await app.projects.restore(plan!);
              setPlan(undefined);
              if (app.getState().accountId === scope)
                router.replace("/projects");
            })
          }
        />
      </Sheet>
    </>
  );
}
