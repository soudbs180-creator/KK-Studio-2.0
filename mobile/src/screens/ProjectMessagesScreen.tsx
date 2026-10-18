import { router } from "expo-router";
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
export default function ProjectMessagesScreen() {
  const { app, state } = useApplication(),
    { busy, run } = useAction();
  const project = state.snapshot?.projects.find(
      (p) => p.id === state.snapshot?.activeProjectId,
    ),
    scope = state.accountId!;
  const messages =
    project?.messages.filter((m) => m.deletedAt === undefined) ?? [];
  return (
    <Screen>
      <Header title="消息记录" back />
      <Content>
        <Label title>{project?.name ?? "未选择项目"}</Label>
        <Action
          primary
          label="导出项目文本"
          disabled={!project || !messages.length}
          busy={busy}
          onPress={() =>
            void run(async () => {
              const ctx = app.context();
              if (ctx.accountId !== scope) throw new Error("会话已变化。");
              const payload = app.projects.exportText(project!.id, scope);
              await sharePortableText(payload, "kk-conversation.txt", () =>
                app.valid(ctx),
              );
            })
          }
        />
        {!messages.length && (
          <Empty
            title="没有可见消息"
            description="生成记录、来源文本和编辑衍生消息会在此出现。"
          />
        )}
        {messages.map((m) => (
          <Card key={m.id}>
            <Label muted small>
              {m.role} · {m.model ?? "用户输入"} ·{" "}
              {new Date(m.createdAt).toLocaleString()}
            </Label>
            {m.editedFromId && (
              <Label muted small>
                由已有消息编辑产生，原记录保留。
              </Label>
            )}
            <Label>
              {m.text.slice(0, 600)}
              {m.text.length > 600 ? "…" : ""}
            </Label>
            <Action
              label="查看全文 / 编辑 / 管理"
              onPress={() => router.push(`/messages/${m.id}`)}
            />
          </Card>
        ))}
      </Content>
    </Screen>
  );
}
