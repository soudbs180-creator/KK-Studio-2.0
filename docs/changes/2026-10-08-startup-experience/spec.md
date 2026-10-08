# Spec：桌面与网页启动体验

- Task ID：TASK-LAUNCH-001；状态：READY；基线：main/origin/main@5dd6e6dddaf00cf2d5c14ae02ef5974c72238232。
- 来源：[intent](intent.md)、[LAUNCHER](../../engineering/LAUNCHER.md)、[UI_INDEX](../../UI_INDEX.md)。

## 桌面入口（AC-1–3）

增加 .NET Framework GUI 启动器，由可重跑脚本编译并生成当前目录与可选桌面快捷方式，图标嵌入当前 icon.ico。启动器只调用既有 start-kk-studio.bat / desktop-release.mjs，新鲜度检查与失败保护保持唯一来源。后台模式不 pause；输出进入本用户 LocalAppData 下按次保存的日志。最新 release 快速启动；耗时启动显示原生进度、取消和可读错误。同目录重复启动构建采用进程期互斥，取消仅回收本启动器的子进程树。

GUI 进度是 Windows 原生工程补充，不改应用页面或设计系统。应用窗口正常显示；后台控制台保持不可见。安装初始化需要 Windows 自带 .NET 编译器；缺少时明确失败，不生成损坏快捷方式。旧批处理保留用于命令行诊断。

## Web 首屏（AC-4–5）

沿用首页布局、语义 tokens 和资源；首次 landing 不挂载隐藏工作区。进入工作区后保持其挂载与现有 project/loadEpoch key，返回首页不清除局部历史。将安全的条件页面拆为按需 chunk，加载态复用既有样式与 role=status；首个画布定位事件不得丢失。根据实际资源与网络证据处理非首屏图片负担，不牺牲首页上方内容。离线或 chunk 失败必须给出恢复入口，不造成功状态。

没有 schema/API/权限改变，项目、记忆、凭据及导出契约保持原样；无需 ADR。Desktop 使用重新构建的 frontendDist，Web 验证 production preview；Mobile 仅现有响应式回归，不代表原生交付。回滚使用本任务前源码及原快捷方式收据，不删除用户数据。最终源码改动和基线变化后重跑相关验证；未签名、干净系统、真实 Provider、托管发布仍由既有任务承担。
