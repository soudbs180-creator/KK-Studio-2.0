import type {
  CreationTask,
  CreationTaskOutput,
} from "@kk-studio/creation-contracts";
import { View } from "react-native";
import { router } from "expo-router";
import { useApplication } from "../application/AppProvider.tsx";
import { Action, Label } from "./primitives.tsx";
import { OriginalPreview } from "./OriginalPreview.tsx";
import { MediaOriginalPreview } from "./MediaOriginalPreview.tsx";

const outputLabels: Record<CreationTaskOutput["status"], string> = {
  waiting: "等待中",
  running: "生成中",
  unknown: "待核对",
  succeeded: "已保存",
  failed: "失败",
  cancelled: "已确认取消",
};

export function TaskResults({ task }: { task: CreationTask }) {
  return task.outputs?.length ? (
    <View style={{ gap: 16 }}>
      {task.outputs.map((output) => (
        <TaskOutput key={output.index} output={output} />
      ))}
    </View>
  ) : (
    <Label muted>尚无已保存的结果。</Label>
  );
}

export function TaskOutput({ output }: { output: CreationTaskOutput }) {
  const { state } = useApplication();
  const asset = state.snapshot?.assets.find(
    (item) => item.id === output.assetId,
  );
  const text = output.status === "succeeded" && output.text !== undefined;
  return (
    <View style={{ gap: 8 }}>
      {output.status !== "succeeded" && (
        <Label small muted>
          输出 {output.index + 1} · {outputLabels[output.status]}
        </Label>
      )}
      {text ? (
        <Label>{output.text}</Label>
      ) : output.assetId ? (
        asset && !asset.deleting ? (
          asset.mime.startsWith("audio/") || asset.mime.startsWith("video/") ? (
            <MediaOriginalPreview asset={asset} />
          ) : (
            <OriginalPreview asset={asset} />
          )
        ) : (
          <Label muted>原件记录不存在或正在删除，历史任务仍保留。</Label>
        )
      ) : output.status === "succeeded" ? (
        <Label muted>此输出尚无可读取的结果，历史回执仍保留。</Label>
      ) : null}
      {Boolean(output.error) && (
        <Label small danger>
          {output.error}
        </Label>
      )}
      {Boolean(output.assetId) && (
        <Action
          compact
          quiet
          label={`查看原件 ${output.index + 1}`}
          onPress={() =>
            router.push({
              pathname: "/materials/[id]",
              params: { id: output.assetId! },
            })
          }
        />
      )}
    </View>
  );
}
