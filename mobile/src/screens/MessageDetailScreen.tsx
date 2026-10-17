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
import { useAction } from "../ui/useAction.ts";
import { Sheet } from "../ui/Sheet.tsx";
import { MessageEditor } from "./MessageEditor.tsx";
export default function MessageDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { app, state } = useApplication(),
    { busy, run } = useAction(),
    [editing, setEditing] = useState(false),
    [deleting, setDeleting] = useState(false);
  const project = state.snapshot?.projects.find((p) =>
      p.messages.some((m) => m.id === id),
    ),
    message = project?.messages.find((m) => m.id === id),
    scope = state.accountId!;
  if (!message || !project)
    return (
      <Screen>
        <Header title="消息" back />
        <Content>
          <Empty
            title="消息记录不存在"
            description="返回当前账号的搜索或项目重新读取。"
          />
        </Content>
      </Screen>
    );
  return (
    <Screen>
      <Header title="消息详情" back />
      <Content>
        <Card>
          <Label title>{project.name}</Label>
          <Label muted small>
            {message.role} · {new Date(message.createdAt).toLocaleString()}
            {message.deletedAt ? " · 已从消息列表移除" : ""}
          </Label>
          <Label>{message.text}</Label>
        </Card>
        <Action
          primary
          label="编辑为新消息"
          disabled={message.deletedAt !== undefined}
          reason={
            message.deletedAt !== undefined
              ? "已移除的消息只作来源记录。"
              : undefined
          }
          onPress={() => setEditing(true)}
        />
        <Action
          danger
          label="从消息列表移除"
          disabled={message.deletedAt !== undefined}
          onPress={() => setDeleting(true)}
        />
        {message.editedFromId && (
          <Action
            label="查看编辑来源"
            onPress={() => router.push(`/messages/${message.editedFromId}`)}
          />
        )}
        {message.taskId && (
          <Action
            label="查看原任务"
            onPress={() => router.push(`/tasks/${message.taskId}`)}
          />
        )}
        <Action
          label="导出此消息文本"
          busy={busy}
          onPress={() =>
            void run(async () => {
              const ctx = app.context();
              if (ctx.accountId !== scope) throw new Error("会话已变化。");
              await sharePortableText(message.text, "kk-message.txt", () =>
                app.valid(ctx),
              );
            })
          }
        />
        <Action
          label="打开所属创作"
          onPress={() =>
            void run(async () => {
              if (app.context().accountId !== scope)
                throw new Error("会话已变化。");
              await app.openProject(project.id);
              if (app.getState().accountId === scope) router.push("/");
            })
          }
        />
      </Content>
      {editing && (
        <MessageEditor
          key={`${scope}/${message.id}`}
          project={project}
          message={message}
          onClose={() => setEditing(false)}
          onSaved={(newId) => {
            setEditing(false);
            if (app.getState().accountId === scope)
              router.replace(`/messages/${newId}`);
          }}
        />
      )}
      <Sheet
        title="移除消息"
        open={deleting}
        onClose={() => setDeleting(false)}
      >
        <Label>只从可见消息列表移除，原文、编辑来源和任务归档仍保留。</Label>
        <Action
          danger
          label="确认移除此消息"
          busy={busy}
          onPress={() =>
            void run(async () => {
              await app.projects.deleteMessage(
                project.id,
                message.id,
                project.revision,
                scope,
              );
              setDeleting(false);
            })
          }
        />
      </Sheet>
    </Screen>
  );
}
