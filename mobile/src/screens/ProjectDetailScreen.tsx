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
  Screen,
} from "../ui/primitives.tsx";
import { Sheet } from "../ui/Sheet.tsx";
import { useAction } from "../ui/useAction.ts";
import { ProjectMetadata } from "./ProjectMetadata.tsx";
import { ProjectRestoreAction } from "./ProjectRestoreAction.tsx";
export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { app, state } = useApplication();
  const { busy, run } = useAction();
  const [fork, setFork] = useState(false);
  const project = state.snapshot?.projects.find((p) => p.id === id),
    scope = state.accountId!;
  if (!project)
    return (
      <Screen>
        <Header title="项目管理" back />
        <Content>
          <Empty title="项目不存在" description="返回项目列表重新读取。" />
        </Content>
      </Screen>
    );
  const retained = state.unsavedDraftProjectIds.includes(id);
  return (
    <Screen>
      <Header title="项目管理" back />
      <Content>
        <Card>
          <Label title>{project.name}</Label>
          <Label muted>
            {project.tasks.length} 个任务 ·{" "}
            {project.messages.filter((m) => m.deletedAt === undefined).length}{" "}
            条消息 · 版本 {project.revision}
          </Label>
          <ProjectMetadata project={project} />
          {project.restoredFrom && (
            <Label muted>
              此项目来自独立恢复，原项目记录保留。历史任务及远端回执只作证据，不会查询或继续原作业。
            </Label>
          )}
          {(project.executionReceipts?.filter((r) => r.readOnly).length ?? 0) >
            0 && <Label muted>包含只读历史作业回执。</Label>}
        </Card>
        <Action
          primary
          label="打开创作"
          busy={busy}
          onPress={() =>
            void run(async () => {
              if (app.context().accountId !== scope)
                throw new Error("会话已变化。");
              await app.openProject(id);
              if (app.getState().accountId === scope) router.replace("/");
            })
          }
        />
        <Action
          label="消息记录与文本导出"
          onPress={() =>
            void run(async () => {
              if (app.context().accountId !== scope)
                throw new Error("会话已变化。");
              await app.openProject(id);
              if (app.getState().accountId === scope) router.push("/messages");
            })
          }
        />
        <Action
          label="画布与有限节点编辑"
          onPress={() => router.push(`/canvas/${id}`)}
        />
        <Action
          label="提案、预览与批准"
          onPress={() => router.push(`/proposals/${id}`)}
        />
        <Action
          label="导出项目包与原件"
          busy={busy}
          disabled={retained}
          reason={
            retained
              ? "先核对并保存保留草稿，以免备份遗漏本次输入。"
              : undefined
          }
          onPress={() =>
            void run(async () => {
              const ctx = app.context();
              if (ctx.accountId !== scope) throw new Error("会话已变化。");
              const payload = await app.projects.backup(id, scope);
              if (app.valid(ctx))
                await sharePortableText(
                  payload,
                  "kk-project.json",
                  () => app.valid(ctx),
                  "application/json",
                  64 * 1024 * 1024,
                );
            })
          }
        />
        <Action
          label="创建独立项目副本"
          disabled={retained}
          onPress={() => setFork(true)}
          reason={retained ? "先恢复保存保留草稿。" : undefined}
        />
        <ProjectRestoreAction />
        <Label muted small>
          项目包在当前设备导出或分享，含项目记录和已引用原件，不含连接凭据。恢复不会自动接入模型或重复生成。
        </Label>
      </Content>
      <Sheet title="创建独立副本" open={fork} onClose={() => setFork(false)}>
        <Label>
          复制当前已保存项目及原件引用。任务和消息采用新身份，远端作业只作历史记录。
        </Label>
        <Action
          primary
          label="确认创建副本"
          busy={busy}
          onPress={() =>
            void run(async () => {
              await app.projects.fork(id, scope);
              setFork(false);
              if (app.getState().accountId === scope)
                router.replace("/projects");
            })
          }
        />
      </Sheet>
    </Screen>
  );
}
