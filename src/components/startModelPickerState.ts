export interface StartModelSetupMessage {
  message: string;
  actionLabel: string;
}

export function getStartModelSetupMessage(input: {
  providerModelCount: number;
  agentConnected: boolean;
}): StartModelSetupMessage | null {
  if (input.providerModelCount > 0) return null;
  return input.agentConnected
    ? {
        message:
          "Codex 主 Agent 已连接。首页生成使用供应商图片模型；请在右侧 Agent 面板使用 Codex 内置生图。",
        actionLabel: "打开 Agent 面板",
      }
    : {
        message:
          "Codex 主 Agent 尚未连接。首页生成需要供应商图片模型；也可先打开右侧 Agent 面板连接 Codex。",
        actionLabel: "打开 Agent 面板",
      };
}
