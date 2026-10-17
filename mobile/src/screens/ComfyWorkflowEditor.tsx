import { useEffect, useState } from "react";
import { router } from "expo-router";
import type { MobileConnectionMetadata } from "../core/mobileModel.ts";
import type { ComfyPlan } from "../application/comfyWorkflows.ts";
import { useApplication } from "../application/AppProvider.tsx";
import { pickPortableJson } from "../application/portableFiles";
import { Action, Card, Field, Label } from "../ui/primitives.tsx";
import { Sheet } from "../ui/Sheet.tsx";
import { LocalOptionPicker } from "../ui/LocalOptionPicker.tsx";
import { useComfy } from "../ui/useComfy.ts";
import { useScopedRequest } from "../ui/useScopedRequest.ts";
import { useUnsavedExit } from "../ui/useUnsavedExit.tsx";
export function ComfyWorkflowEditor({
  connection,
  onLeave,
}: {
  connection: MobileConnectionMetadata;
  onLeave?: (request: (proceed: () => void) => void) => void;
}) {
  const { state } = useApplication(),
    scope = state.accountId!,
    flow = useComfy(),
    request = useScopedRequest();
  const [json, setJson] = useState(""),
    [revision, setRevision] = useState("0"),
    [count, setCount] = useState("1"),
    [projectId, setProjectId] = useState(state.snapshot?.activeProjectId ?? ""),
    [picking, setPicking] = useState(false),
    [plan, setPlan] = useState<ComfyPlan>(),
    [attempted, setAttempted] = useState(false);
  const exit = useUnsavedExit(Boolean(json.trim()), scope);
  useEffect(() => {
    onLeave?.(exit.requestClose);
  }, [onLeave, exit.requestClose]);
  const project = state.snapshot?.projects.find((p) => p.id === projectId);
  return (
    <>
      <Card>
        <Label title>API 工作流</Label>
        <Label muted small>
          导入 ComfyUI 的 API 格式 JSON，包含节点 class_type 与
          inputs。可视编辑器格式不能直接执行。模型、文件和节点路径需存在于该服务设备。
        </Label>
        <Action
          label={project ? `保存到：${project.name}` : "选择所属项目"}
          disabled={request.busy}
          onPress={() => setPicking(true)}
        />
        <Field
          label="工作流 JSON"
          multiline
          value={json}
          onChangeText={(value) => {
            setJson(value);
            setPlan(undefined);
          }}
          editable={!request.busy}
        />
        <Action
          label="从设备导入工作流 JSON"
          busy={request.busy}
          onPress={() =>
            void request.run(
              async () => {
                const text = await pickPortableJson();
                if (text && text.length > 512 * 1024)
                  throw new Error("工作流超过 512 Ki 字符，原文件保持不变。");
                return text;
              },
              (value) => {
                if (value !== null) {
                  setJson(value);
                  setPlan(undefined);
                }
              },
            )
          }
        />
        <Field
          label="工作流版本（非负整数）"
          value={revision}
          onChangeText={(value) => {
            setRevision(value);
            setPlan(undefined);
          }}
          keyboardType="number-pad"
          editable={!request.busy}
        />
        <Field
          label="预期图片原件数量（1–32）"
          value={count}
          onChangeText={(value) => {
            setCount(value);
            setPlan(undefined);
          }}
          keyboardType="number-pad"
          editable={!request.busy}
        />
        <Label muted small>
          输出数量须与真实工作流对应，原件全部校验并持久保存后任务才能显示完成。预检会访问节点定义，不提交生成。
        </Label>
      </Card>
      <Action
        primary
        label="预检并查看提交计划"
        busy={request.busy}
        disabled={!project || !json.trim()}
        onPress={() =>
          void request.run(
            async (signal) => {
              if (json.length > 512 * 1024)
                throw new Error("工作流超过 512 Ki 字符，输入仍保留。");
              if (!/^\d+$/.test(revision) || !/^\d+$/.test(count))
                throw new Error("版本与输出数量须为整数。");
              return flow.prepare(
                projectId,
                connection.id,
                JSON.parse(json),
                Number(revision),
                Number(count),
                scope,
                signal,
              );
            },
            (value) => {
              setAttempted(false);
              setPlan(value);
            },
          )
        }
      />
      <Action
        label="停止当前网络请求"
        disabled={!request.busy}
        onPress={request.stop}
      />
      {picking && (
        <LocalOptionPicker
          title="工作流所属项目"
          options={(state.snapshot?.projects ?? []).map((p) => ({
            id: p.id,
            label: p.name,
          }))}
          selected={projectId}
          onSelect={(id) => {
            setProjectId(id);
            setPlan(undefined);
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      )}
      <Sheet
        title="批准工作流提交"
        open={Boolean(plan) && !exit.confirming}
        onClose={() => {
          if (!request.busy) setPlan(undefined);
        }}
      >
        {plan && (
          <>
            <Label>
              项目：
              {
                state.snapshot?.projects.find((p) => p.id === plan.projectId)
                  ?.name
              }
            </Label>
            <Label small>
              地址：{plan.connection.baseUrl}
              {"\n"}节点：{Object.keys(plan.workflow).length} · 预期原件：
              {plan.requestedOutputs}
              {"\n"}版本：{plan.workflowRevision}
              {"\n"}提交身份：{plan.submissionId}
            </Label>
            <Label muted>
              以下为已固定工作流的预览。明确提交可能产生服务费用；停止本地连接不代表上游已取消或退款。未知状态应核对原任务，不能再提交新任务。
            </Label>
            <Label small>
              {JSON.stringify(plan.workflow, null, 2).slice(0, 12000)}
            </Label>
            <Label muted small>
              大工作流显示前 12000 字，执行和存档使用完整固定内容。
            </Label>
            <Action
              primary
              label={attempted ? "本计划已经尝试提交" : "确认提交固定工作流"}
              busy={request.busy}
              disabled={attempted}
              onPress={() => {
                setAttempted(true);
                void request.run(
                  (signal) => flow.submit(plan, signal),
                  (id) => {
                    exit.allow();
                    setPlan(undefined);
                    router.replace(`/comfy/tasks/${id}`);
                  },
                );
              }}
            />
            {attempted &&
              state.snapshot?.projects.some((p) =>
                p.tasks.some((t) => t.id === plan.submissionId),
              ) && (
                <Action
                  label="查看已保存的原任务"
                  onPress={() => {
                    exit.allow();
                    router.replace(`/comfy/tasks/${plan.submissionId}`);
                  }}
                />
              )}
            <Action
              label="停止当前请求"
              disabled={!request.busy}
              onPress={request.stop}
            />
            {request.busy && (
              <Label muted small>
                正在提交，先停止本次连接后才能关闭此确认页。停止不代表服务取消，原任务仍须核对。
              </Label>
            )}
          </>
        )}
      </Sheet>
      {exit.dialog}
    </>
  );
}
