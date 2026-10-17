import { radii } from "./geometry.ts";
import type { CreationTaskStatus } from "@kk-studio/creation-contracts";
import { Text, View } from "react-native";
import { useTheme } from "./theme.tsx";
export const taskLabels: Record<CreationTaskStatus, string> = {
  queued: "排队中",
  running: "生成中",
  unknown: "待核对",
  partial: "部分完成",
  succeeded: "已保存",
  failed: "失败",
  cancelled: "已确认取消",
  offline: "离线",
  interrupted: "已中断",
};
export function Status({ status }: { status: CreationTaskStatus }) {
  const t = useTheme();
  return (
    <View
      style={{
        alignSelf: "flex-start",
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: radii.control,
        backgroundColor: t.surface,
      }}
    >
      <Text
        style={{
          fontSize: 13,
          color:
            status === "failed" || status === "unknown"
              ? t.danger
              : status === "succeeded"
                ? t.success
                : t.muted,
        }}
      >
        {taskLabels[status]}
      </Text>
    </View>
  );
}
