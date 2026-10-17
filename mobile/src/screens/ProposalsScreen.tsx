import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useApplication } from "../application/AppProvider.tsx";
import {
  Action,
  Card,
  Content,
  Empty,
  Field,
  Header,
  Label,
  Row,
  Screen,
} from "../ui/primitives.tsx";
import { useProposals } from "../ui/useProposals.ts";
import { useAction } from "../ui/useAction.ts";
import { Sheet } from "../ui/Sheet.tsx";
import { CanvasMap } from "../ui/CanvasMap.tsx";
import { canvasOperationLabels } from "../ui/canvasLabels.ts";
import { errorMessage } from "../application/types.ts";
const statusLabels = {
  pending: "待批准",
  approved: "已批准",
  rejected: "已拒绝",
  withdrawn: "已撤回",
};
export default function ProposalsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { state } = useApplication(),
    actions = useProposals(),
    { busy, run } = useAction();
  const [selected, setSelected] = useState<string>(),
    [title, setTitle] = useState("生成草稿提案");
  const project = state.snapshot?.projects.find((p) => p.id === id),
    scope = state.accountId!;
  const q = project?.canvasProposals?.find((q) => q.id === selected);
  let preview: ReturnType<typeof actions.preview> | undefined,
    previewError: string | undefined;
  if (q)
    try {
      preview = actions.preview(id, q.id, scope);
    } catch (error) {
      previewError = errorMessage(error);
    }
  if (!project)
    return (
      <Screen>
        <Header title="提案与批准" back />
        <Content>
          <Empty title="项目不存在" description="返回项目列表重新读取。" />
        </Content>
      </Screen>
    );
  const retained = state.unsavedDraftProjectIds.includes(id);
  return (
    <Screen>
      <Header title="提案与批准" back />
      <Content>
        <Label title>{project.name}</Label>
        <Label muted>
          本地有限画布操作或生成草稿。批准生成提案只修改草稿，不调用模型；回到创作页明确提交后才发起生成。
        </Label>
        <Field
          label="生成提案名称"
          value={title}
          onChangeText={setTitle}
          maxLength={200}
        />
        <Action
          primary
          label="从当前已保存草稿创建提案"
          busy={busy}
          disabled={retained || !title.trim()}
          reason={retained ? "请先核对保留草稿并恢复保存。" : undefined}
          onPress={() =>
            void run(() => actions.stageGenerationDraft(id, title, scope))
          }
        />
        <Action
          label="编辑画布并暂存提案"
          onPress={() => router.push(`/canvas/${id}`)}
        />
        {!project.canvasProposals?.length && (
          <Empty
            title="还没有提案"
            description="先编辑、预览，再批准本地变更。"
          />
        )}
        {project.canvasProposals?.map((item) => (
          <Card key={item.id}>
            <Label title>{item.title}</Label>
            <Label muted>
              {item.kind === "canvas" ? "画布编辑" : "生成草稿"} ·{" "}
              {statusLabels[item.status]} · 版本 {item.revision}
            </Label>
            <Action
              label="查看提案与变更"
              onPress={() => setSelected(item.id)}
            />
          </Card>
        ))}
      </Content>
      <Sheet
        title={q?.title ?? "提案"}
        open={Boolean(q)}
        onClose={() => setSelected(undefined)}
      >
        {previewError && <Label danger>{previewError}</Label>}
        {preview?.stale && (
          <Label danger>
            项目版本或提案状态变化。待批准的提案须明确刷新并重新预览；已结束提案不能再次执行。
          </Label>
        )}
        {q?.kind === "generation" ? (
          <>
            <Label>提案输入：{q.draft.prompt || "空草稿"}</Label>
            <Label muted>
              模型：{q.draft.model || "未选择"} · 输出数 {q.draft.outputCount} ·
              连接 {q.draft.providerConnectionId ?? "未选择"}
            </Label>
            <Label>
              当前已保存输入：{project.composerDraft.prompt || "空草稿"}
            </Label>
          </>
        ) : (
          preview && <CanvasMap canvas={preview.canvas} />
        )}
        {q?.kind === "canvas" && (
          <Label muted>
            {q.operations
              .map((op) => canvasOperationLabels[op.type])
              .join("、")}
          </Label>
        )}
        <Action
          primary
          label={
            q?.kind === "generation"
              ? "批准更新草稿（不生成）"
              : "批准应用画布变更"
          }
          busy={busy}
          disabled={
            !q ||
            q.status !== "pending" ||
            !preview ||
            preview.stale ||
            Boolean(q.kind === "generation" && retained)
          }
          reason={
            q?.kind === "generation" && retained
              ? "先恢复保存保留草稿。"
              : undefined
          }
          onPress={() =>
            void run(() =>
              actions.approve(
                id,
                q!.id,
                q!.revision,
                q!.baseProjectRevision,
                scope,
              ),
            )
          }
        />
        <Action
          label="明确刷新待批准提案到当前项目版本"
          busy={busy}
          disabled={q?.status !== "pending"}
          onPress={() =>
            void run(() =>
              actions.refresh(id, q!.id, q!.revision, project.revision, scope),
            )
          }
        />
        <Row>
          <Action
            danger
            label="拒绝提案"
            busy={busy}
            disabled={q?.status !== "pending"}
            onPress={() =>
              void run(() =>
                actions.finish(
                  id,
                  q!.id,
                  "rejected",
                  q!.revision,
                  project.revision,
                  scope,
                ),
              )
            }
          />
          <Action
            label="撤回提案"
            busy={busy}
            disabled={q?.status !== "pending"}
            onPress={() =>
              void run(() =>
                actions.finish(
                  id,
                  q!.id,
                  "withdrawn",
                  q!.revision,
                  project.revision,
                  scope,
                ),
              )
            }
          />
        </Row>
      </Sheet>
    </Screen>
  );
}
