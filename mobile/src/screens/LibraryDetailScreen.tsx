import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useApplication } from "../application/AppProvider.tsx";
import { sharePortableText } from "../application/portableFiles";
import {
  Action,
  Card,
  Content,
  Empty,
  Header,
  Label,
  Row,
  Screen,
} from "../ui/primitives.tsx";
import { Sheet } from "../ui/Sheet.tsx";
import { libraryLabels } from "../ui/localLabels.ts";
import { useAction } from "../ui/useAction.ts";
export default function LibraryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { app, state } = useApplication(),
    { busy, run } = useAction(),
    [apply, setApply] = useState(false),
    [deleting, setDeleting] = useState(false),
    [mode, setMode] = useState<"append" | "replace">("append");
  const entry = state.snapshot?.library?.find((e) => e.id === id),
    project = state.snapshot?.projects.find(
      (p) => p.id === state.snapshot?.activeProjectId,
    ),
    scope = state.accountId!;
  if (!entry)
    return (
      <Screen>
        <Header title="库条目" back />
        <Content>
          <Empty title="条目不存在" description="返回创作库重新查看。" />
        </Content>
      </Screen>
    );
  return (
    <Screen>
      <Header title={entry.name} back />
      <Content>
        <Card>
          <Label muted>
            {libraryLabels[entry.kind]} · 版本 {entry.revision}
          </Label>
          <Label>{entry.content}</Label>
        </Card>
        <Action
          primary
          label={project ? "应用到当前草稿" : "新创作中使用"}
          disabled={Boolean(
            project && state.unsavedDraftProjectIds.includes(project.id),
          )}
          reason={
            project && state.unsavedDraftProjectIds.includes(project.id)
              ? "当前项目有未保存的保留输入，请先核对并恢复保存。"
              : undefined
          }
          onPress={() => setApply(true)}
        />
        <Row>
          <Action
            label="编辑"
            onPress={() => router.push(`/library/${entry.id}/edit`)}
          />
          <Action
            label="导出条目"
            busy={busy}
            onPress={() =>
              void run(async () => {
                const ctx = app.context();
                if (ctx.accountId !== scope) throw new Error("会话已变化。");
                const payload = await app.local.exportLibrary(
                  [entry.id],
                  scope,
                );
                if (app.valid(ctx))
                  await sharePortableText(
                    payload,
                    "kk-library-entry.json",
                    () => app.valid(ctx),
                    "application/json",
                  );
              })
            }
          />
          <Action danger label="删除条目" onPress={() => setDeleting(true)} />
        </Row>
      </Content>
      <Sheet title="预览草稿更新" open={apply} onClose={() => setApply(false)}>
        <Label>目标：{project?.name ?? "新建创作"}</Label>
        <Label muted>
          当前输入：
          {project ? app.getDraft(project.id).prompt || "空草稿" : "空草稿"}
        </Label>
        <Row>
          <Action
            compact
            selected={mode === "append"}
            label="追加文字"
            onPress={() => setMode("append")}
          />
          <Action
            compact
            selected={mode === "replace"}
            label="替换输入"
            onPress={() => setMode("replace")}
          />
        </Row>
        <Label>{entry.content}</Label>
        <Label muted small>
          只修改草稿，不调用模型或工具。生成仍须回到创作页明确提交。
        </Label>
        <Action
          primary
          label="确认应用到草稿"
          busy={busy}
          onPress={() =>
            void run(async () => {
              if (project)
                await app.local.applyLibrary(entry.id, project.id, mode, scope);
              else await app.local.newProjectFromLibrary(entry.id, mode, scope);
              setApply(false);
              if (app.getState().accountId === scope) router.replace("/");
            })
          }
        />
      </Sheet>
      <Sheet
        title="删除库条目"
        open={deleting}
        onClose={() => setDeleting(false)}
      >
        <Label>删除“{entry.name}”？已应用的草稿和项目记录仍保留。</Label>
        <Action
          danger
          label="确认删除条目"
          busy={busy}
          onPress={() =>
            void run(async () => {
              await app.local.deleteLibrary(entry.id, entry.revision, scope);
              setDeleting(false);
              if (app.getState().accountId === scope)
                router.replace("/library");
            })
          }
        />
      </Sheet>
    </Screen>
  );
}
