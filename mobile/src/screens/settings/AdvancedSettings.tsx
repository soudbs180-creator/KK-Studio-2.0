import { useState } from "react";
import { router } from "expo-router";
import Constants from "expo-constants";
import { useApplication } from "../../application/AppProvider.tsx";
import { Action, Card, Label } from "../../ui/primitives.tsx";
export function AdvancedSettings() {
  const { app, state } = useApplication(),
    [diagnostics, setDiagnostics] = useState(false);
  const project = state.snapshot?.projects.find(
    (p) => p.id === state.snapshot?.activeProjectId,
  );
  return (
    <>
      <Card>
        <Label title>高级</Label>
        <Action
          label="当前项目画布与节点"
          disabled={!project}
          reason={!project ? "先在项目页创建或打开项目。" : undefined}
          onPress={() => router.push(`/canvas/${project!.id}`)}
        />
        <Action
          label="本地提案与批准"
          disabled={!project}
          onPress={() => router.push(`/proposals/${project!.id}`)}
        />
        <Action
          label="批量素材 / 原件与衍生作品"
          onPress={() => router.push("/materials")}
        />
        <Action label="全局搜索" onPress={() => router.push("/search")} />
        <Action
          label={diagnostics ? "收起设备诊断" : "查看设备诊断"}
          onPress={() => setDiagnostics(!diagnostics)}
        />
        {diagnostics && (
          <Label muted small>
            设备标识：{state.deviceId}
            {"\n"}
            {app.deps.allowLoopbackHttp
              ? "开发构建允许本机回环 HTTP 测试；外网 HTTP 仍禁用。"
              : "正式连接仅允许 HTTPS。"}
          </Label>
        )}
      </Card>
      <Card>
        <Label title>更新</Label>
        <Label>
          KK Studio {Constants.expoConfig?.version ?? "未报告"} · Mobile
        </Label>
        <Action
          label="检查应用更新"
          disabled
          reason="当前构建尚未配置更新通道与签名发布，不能报告可安装的新版本。"
        />
        <Label muted small>
          独立手机运行时。原件写入并校验完成后，任务才会显示已保存；未验证的云同步、计费与远程执行能力会明确标示。
        </Label>
      </Card>
    </>
  );
}
