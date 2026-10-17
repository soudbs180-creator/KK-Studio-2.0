import { useState } from "react";
import { router } from "expo-router";
import { useApplication } from "../application/AppProvider.tsx";
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
import { taskLabels } from "../ui/Status.tsx";
export default function ComfyScreen() {
  const { state } = useApplication();
  const [page, setPage] = useState(0);
  const connections =
    state.snapshot?.connections.filter((c) => c.protocol === "comfyui") ?? [];
  const jobs =
    state.snapshot?.projects.flatMap((p) =>
      (p.executionReceipts ?? [])
        .filter((r) => r.protocol === "comfyui")
        .map((r) => ({ p, r })),
    ) ?? [];
  const pages = Math.max(1, Math.ceil(jobs.length / 20)),
    index = Math.min(page, pages - 1);
  return (
    <Screen>
      <Header title="ComfyUI" back />
      <Content>
        <Label muted>
          使用标准 ComfyUI API
          工作流。模型文件在服务设备；连通性检查不代表生成已验证。提交前先保存固定工作流身份，再明确批准网络提交。
        </Label>
        <Action
          primary
          label="添加 ComfyUI 连接"
          onPress={() => router.push("/comfy/new")}
        />
        {!connections.length && (
          <Empty
            title="没有工作流连接"
            description="配置你有权访问的 ComfyUI 服务。正式环境只支持 HTTPS。"
          />
        )}
        {connections.map((c) => (
          <Card key={c.id}>
            <Label title>{c.name}</Label>
            <Label muted small>
              {c.baseUrl}
            </Label>
            <Action
              label="工作流、检查与设置"
              onPress={() => router.push(`/comfy/${c.id}`)}
            />
          </Card>
        ))}
        <Label title>已有作业</Label>
        {!jobs.length && <Label muted>尚未提交工作流。</Label>}
        {jobs
          .slice()
          .reverse()
          .slice(index * 20, index * 20 + 20)
          .map(({ p, r }) => {
            const task = p.tasks.find((t) => t.id === r.taskId);
            return (
              <Card key={r.taskId}>
                <Label>
                  {p.name} · {task ? taskLabels[task.status] : "任务未找到"}
                </Label>
                <Label muted small>
                  {r.readOnly ? "恢复副本 · 历史回执只读" : "已保存工作流身份"}
                </Label>
                <Action
                  label="查看回执与核对原作业"
                  onPress={() => router.push(`/comfy/tasks/${r.taskId}`)}
                />
              </Card>
            );
          })}
        {jobs.length > 0 && (
          <>
            <Label muted>
              第 {index + 1}/{pages} 页 · {jobs.length} 个作业
            </Label>
            <Row>
              <Action
                label="上一页作业"
                disabled={!index}
                onPress={() => setPage(index - 1)}
              />
              <Action
                label="下一页作业"
                disabled={index + 1 >= pages}
                onPress={() => setPage(index + 1)}
              />
            </Row>
          </>
        )}
      </Content>
    </Screen>
  );
}
