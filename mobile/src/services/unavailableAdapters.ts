export const unavailableMobileAdapters = Object.freeze({
  agent: { available: false, reason: "手机端 Agent 执行接口尚未接入。" },
  codex: {
    available: false,
    reason: "手机端无法调用桌面 Codex CLI；尚未接入可验证的远程执行接口。",
  },
  comfyui: {
    available: false,
    reason: "尚未接入经过验证的手机可访问 ComfyUI 工作流接口。",
  },
  video: {
    available: false,
    reason:
      "通用视频适配器尚未接入；官方 12ai 连接可选择已接入的文本生视频模型。",
  },
  audio: { available: false, reason: "音频生成接口与结果存档尚未接入。" },
  imageEdit: {
    available: false,
    reason: "图片编辑、蒙版与参考图接口尚未接入，原图保持独立。",
  },
});
