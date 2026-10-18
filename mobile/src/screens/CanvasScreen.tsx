import { useState } from "react";
import { FlatList, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import type {
  MobileCanvasOperation,
  MobileProject,
} from "../core/mobileModel.ts";
import { useApplication } from "../application/AppProvider.tsx";
import { errorMessage } from "../application/types.ts";
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
import { CanvasMap } from "../ui/CanvasMap.tsx";
import { canvasKindLabels, canvasOperationLabels } from "../ui/canvasLabels.ts";
import { useAction } from "../ui/useAction.ts";
import { useProposals } from "../ui/useProposals.ts";
import { useUnsavedExit } from "../ui/useUnsavedExit.tsx";
import { CanvasNodeEditor } from "./CanvasNodeEditor.tsx";
import { CanvasEdgeEditor } from "./CanvasEdgeEditor.tsx";
import { CanvasViewportEditor } from "./CanvasViewportEditor.tsx";
import { CanvasEdges } from "./CanvasEdges.tsx";
export default function CanvasScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { state } = useApplication();
  const project = state.snapshot?.projects.find((p) => p.id === id);
  if (!project)
    return (
      <Screen>
        <Header title="画布" back />
        <Content>
          <Empty title="项目不存在" description="返回项目列表重新读取。" />
        </Content>
      </Screen>
    );
  return <Editor key={`${state.accountId}/${id}`} project={project} />;
}
function Editor({ project }: { project: MobileProject }) {
  const { app, state } = useApplication(),
    scope = state.accountId!,
    actions = useProposals(),
    { busy, run } = useAction();
  const [edit, setEdit] = useState(() =>
      actions.openCanvasEdit(project.id, scope),
    ),
    [form, setForm] = useState<"new" | "node" | "edge" | "viewport">(),
    [selected, setSelected] = useState<string>();
  const exit = useUnsavedExit(Boolean(edit.operations.length), scope, () =>
    actions.discardCanvasEdit(project.id, scope),
  );
  let canvas = project.canvas,
    error: string | undefined,
    stale = true;
  try {
    const preview = actions.previewCanvasEdit(project.id, edit, scope);
    canvas = preview.canvas;
    stale = preview.stale;
  } catch (failure) {
    error = errorMessage(failure);
  }
  function update(next: typeof edit) {
    actions.rememberCanvasEdit(project.id, next, scope);
    setEdit(next);
  }
  function add(ops: MobileCanvasOperation[]) {
    const next = { ...edit, operations: [...edit.operations, ...ops] };
    actions.previewCanvasEdit(project.id, next, scope);
    update(next);
  }
  return (
    <Screen>
      <Header title="画布与节点" back />
      <FlatList
        data={canvas.nodes}
        keyExtractor={(n) => n.id}
        initialNumToRender={6}
        windowSize={3}
        contentContainerStyle={{ padding: 16, gap: 14 }}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            <Label title>{project.name}</Label>
            <CanvasMap
              canvas={canvas}
              selected={selected}
              onSelect={setSelected}
            />
            <Label muted small>
              保存视口：{canvas.viewport.x}, {canvas.viewport.y} · 缩放{" "}
              {canvas.viewport.zoom}
            </Label>
            {error && <Label danger>{error}</Label>}
            {stale && (
              <Label danger>
                本次编辑基于旧项目版本，请比较最新画布并明确刷新基础。
              </Label>
            )}
            <Row>
              <Action label="添加节点" onPress={() => setForm("new")} />
              <Action
                label="连接节点"
                disabled={canvas.nodes.length < 2}
                onPress={() => setForm("edge")}
              />
              <Action label="设置视口" onPress={() => setForm("viewport")} />
            </Row>
            <Field
              label="待批准提案名称"
              value={edit.title}
              onChangeText={(title) => update({ ...edit, title })}
              maxLength={200}
            />
            <Action
              primary
              label={`暂存待批准提案（${edit.operations.length} 项）`}
              busy={busy}
              disabled={
                !edit.operations.length ||
                !edit.title.trim() ||
                stale ||
                Boolean(error)
              }
              onPress={() =>
                void run(async () => {
                  await actions.stageCanvasEdit(project.id, edit, scope);
                  exit.allow();
                  if (app.getState().accountId === scope)
                    router.replace(`/proposals/${project.id}`);
                })
              }
            />
            <Action
              label="查看已保存提案"
              onPress={() => router.push(`/proposals/${project.id}`)}
            />
            {stale && (
              <Action
                label="已比较当前预览，刷新编辑基础"
                disabled={Boolean(error)}
                onPress={() => {
                  try {
                    setEdit(actions.rebaseCanvasEdit(project.id, edit, scope));
                  } catch (failure) {
                    app.report(failure);
                  }
                }}
              />
            )}
            {edit.operations.map((op, i) => (
              <Row key={i}>
                <Label small>
                  {i + 1} · {canvasOperationLabels[op.type]}
                </Label>
                <Action
                  compact
                  label="移除此项编辑"
                  onPress={() => {
                    try {
                      const next = {
                        ...edit,
                        operations: edit.operations.filter(
                          (_, index) => index !== i,
                        ),
                      };
                      actions.previewCanvasEdit(project.id, next, scope);
                      update(next);
                    } catch (failure) {
                      app.report(failure);
                    }
                  }}
                />
              </Row>
            ))}
            <Label muted small>
              未暂存编辑仅留在此账号的当前运行内存中。原件不会被修改；批准本地变更不调用模型或工具。
            </Label>
          </View>
        }
        ListEmptyComponent={
          <Empty
            title="没有节点"
            description="添加文字或设备原件节点，创建提案后明确批准。"
          />
        }
        renderItem={({ item: n, index }) => (
          <Card>
            <Label title>
              {index + 1} · {canvasKindLabels[n.kind]}
            </Label>
            <Label muted small>
              {n.id} · 坐标 {n.x}, {n.y}
            </Label>
            {n.text !== undefined && (
              <Label>
                {n.text.slice(0, 500)}
                {n.text.length > 500 ? "…" : ""}
              </Label>
            )}
            <Row>
              <Action
                selected={selected === n.id}
                label="编辑节点"
                onPress={() => {
                  setSelected(n.id);
                  setForm("node");
                }}
              />
              <Action
                label="暂存移除节点"
                onPress={() => {
                  try {
                    add([{ type: "remove_node", nodeId: n.id }]);
                  } catch (failure) {
                    app.report(failure);
                  }
                }}
              />
              {n.assetId && (
                <Action
                  label="查看原件"
                  onPress={() => router.push(`/materials/${n.assetId}`)}
                />
              )}
            </Row>
          </Card>
        )}
        ListFooterComponent={
          <CanvasEdges
            edges={canvas.edges}
            onRemove={(id) => {
              try {
                add([{ type: "remove_edge", edgeId: id }]);
              } catch (failure) {
                app.report(failure);
              }
            }}
          />
        }
      />
      {(form === "new" || form === "node") && (
        <CanvasNodeEditor
          key={`${scope}/${form}/${selected ?? "new"}`}
          node={
            form === "node"
              ? canvas.nodes.find((n) => n.id === selected)
              : undefined
          }
          onApply={add}
          onClose={() => setForm(undefined)}
        />
      )}
      {form === "edge" && (
        <CanvasEdgeEditor
          nodes={canvas.nodes}
          onApply={add}
          onClose={() => setForm(undefined)}
        />
      )}
      {form === "viewport" && (
        <CanvasViewportEditor
          viewport={canvas.viewport}
          onApply={add}
          onClose={() => setForm(undefined)}
        />
      )}
      {exit.dialog}
    </Screen>
  );
}
