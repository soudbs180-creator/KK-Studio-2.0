import { useState } from "react";
import {
  unifiedTaskStatuses,
  type CreationTaskStatus,
} from "@kk-studio/creation-contracts";
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
import { Status, taskLabels } from "../ui/Status.tsx";
import { Sheet } from "../ui/Sheet.tsx";
export default function TasksScreen({
  history = false,
}: {
  history?: boolean;
}) {
  const { app, state } = useApplication(),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState<CreationTaskStatus>(),
    [picker, setPicker] = useState(false);
  const tasks = app
    .allTasks()
    .filter(
      ({ task }) =>
        (!history || task.completedOutputs > 0) &&
        (!filter || task.status === filter) &&
        `${task.prompt} ${task.model}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) => b.task.createdAt - a.task.createdAt);
  return (
    <Screen>
      <Header title={history ? "生成历史" : "任务"} back />
      <Content>
        <Field label="搜索任务或模型" value={search} onChangeText={setSearch} />
        <Action
          label={filter ? `状态：${taskLabels[filter]}` : "全部状态"}
          onPress={() => setPicker(true)}
        />
        {!tasks.length && (
          <Empty
            title="没有匹配记录"
            description={
              history
                ? "只有已归档的结果会出现在生成历史中。"
                : "任务会保留排队、执行、故障和受理不明等状态。"
            }
          />
        )}
        {tasks.map(({ projectId, task }) => (
          <Card key={task.id}>
            <Row>
              <Status status={task.status} />
              <Label small muted>
                {state.snapshot?.projects.find((p) => p.id === projectId)?.name}
              </Label>
            </Row>
            <Label>{task.prompt}</Label>
            <Label muted small>
              {task.model} · {task.completedOutputs}/{task.requestedOutputs}{" "}
              已保存
            </Label>
            <Action
              label="查看详情"
              onPress={() =>
                router.push({
                  pathname: "/tasks/[id]",
                  params: { id: task.id },
                })
              }
            />
          </Card>
        ))}
      </Content>
      <Sheet title="任务状态" open={picker} onClose={() => setPicker(false)}>
        <Action
          label="全部"
          onPress={() => {
            setFilter(undefined);
            setPicker(false);
          }}
        />
        {unifiedTaskStatuses.map((status) => (
          <Action
            key={status}
            label={taskLabels[status]}
            onPress={() => {
              setFilter(status);
              setPicker(false);
            }}
          />
        ))}
      </Sheet>
    </Screen>
  );
}
