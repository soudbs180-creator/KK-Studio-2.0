import { useState } from "react";
import { router } from "expo-router";
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
import { Sheet } from "../ui/Sheet.tsx";
import { useAction } from "../ui/useAction.ts";
import { ProjectMetadata } from "./ProjectMetadata.tsx";
import { ProjectRestoreAction } from "./ProjectRestoreAction.tsx";
export default function ProjectsScreen() {
  const { app, state } = useApplication(),
    { busy, run } = useAction(),
    [search, setSearch] = useState(""),
    [groupFilter, setGroupFilter] = useState(""),
    [newName, setNewName] = useState(""),
    [editId, setEditId] = useState<string>(),
    [editName, setEditName] = useState(""),
    [deleting, setDeleting] = useState<string>();
  const projects = state.snapshot?.projects ?? [],
    filtered = projects.filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) &&
        (!groupFilter.trim() || p.group === groupFilter.trim()),
    );
  const target = projects.find((p) => p.id === deleting),
    unresolved =
      Boolean(target && state.unsavedDraftProjectIds.includes(target.id)) ||
      target?.tasks.some(
        (t) =>
          [
            "queued",
            "running",
            "unknown",
            "partial",
            "offline",
            "interrupted",
          ].includes(t.status) ||
          ["submitted", "unknown"].includes(t.submissionState ?? ""),
      );
  return (
    <Screen>
      <Header title="项目" back />
      <Content>
        <Field label="搜索项目" value={search} onChangeText={setSearch} />
        <Field
          label="按分组筛选（留空显示全部）"
          value={groupFilter}
          onChangeText={setGroupFilter}
          maxLength={80}
        />
        <Card>
          <Field label="新项目名称" value={newName} onChangeText={setNewName} />
          <Action
            primary
            label="创建项目"
            busy={busy}
            onPress={() =>
              void run(async () => {
                await app.createProject(newName || "新创作");
                setNewName("");
                router.replace("/");
              })
            }
          />
        </Card>
        <ProjectRestoreAction />
        {!filtered.length && (
          <Empty
            title={projects.length ? "没有匹配项目" : "还没有项目"}
            description="创建后，草稿和生成记录保存在设备。"
          />
        )}
        {filtered
          .slice()
          .sort(
            (a, b) =>
              Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) ||
              b.updatedAt - a.updatedAt,
          )
          .map((p) => (
            <Card key={p.id}>
              <Label title>{p.name}</Label>
              {Boolean(p.group) && (
                <Label muted small>
                  分组：{p.group}
                </Label>
              )}
              <Label muted small>
                {p.tasks.length} 个任务 · {p.assetIds.length} 件素材 ·{" "}
                {new Date(p.updatedAt).toLocaleString()}
              </Label>
              <Action
                label="打开创作"
                onPress={() =>
                  void run(async () => {
                    await app.openProject(p.id);
                    router.replace("/");
                  })
                }
              />
              <Row>
                <ProjectMetadata project={p} />
                <Action
                  compact
                  label="项目管理"
                  onPress={() => router.push(`/projects/${p.id}`)}
                />
                <Action
                  compact
                  label="重命名"
                  onPress={() => {
                    setEditId(p.id);
                    setEditName(p.name);
                  }}
                />
                <Action
                  compact
                  danger
                  label="删除项目"
                  onPress={() => setDeleting(p.id)}
                />
              </Row>
            </Card>
          ))}
      </Content>
      <Sheet
        title="重命名项目"
        open={Boolean(editId)}
        onClose={() => setEditId(undefined)}
      >
        <Field label="项目名称" value={editName} onChangeText={setEditName} />
        <Action
          primary
          label="保存名称"
          busy={busy}
          disabled={!editName.trim()}
          onPress={() =>
            void run(async () => {
              await app.renameProject(editId!, editName);
              setEditId(undefined);
            })
          }
        />
      </Sheet>
      <Sheet
        title="删除项目"
        open={Boolean(deleting)}
        onClose={() => setDeleting(undefined)}
      >
        <Label>
          删除“{target?.name}”的项目记录？原件仍保存在素材库。此操作无法撤销。
        </Label>
        <Action
          danger
          label="确认删除项目"
          busy={busy}
          disabled={unresolved}
          reason={
            unresolved
              ? "项目含未完成、未核对任务或未保存草稿，须先处理。"
              : undefined
          }
          onPress={() =>
            void run(async () => {
              await app.deleteProject(deleting!);
              setDeleting(undefined);
            })
          }
        />
      </Sheet>
    </Screen>
  );
}
