# 交付范围

- 每张工作流卡保存完整图；正反提示词、Seed、步数、尺寸、采样器和模型可在节点与属性面板同步修改。
- 原生编辑器加载当前卡片，返回时回写图；Host 队列产物经 AssetPort 落盘并连接结果节点。
- 局部重绘、扩图、高清修复和图层拆分默认可见，通过真实任务宿主执行。
- 本地连接仅允许 loopback；项目不存储凭据；外部 ComfyUI 进程不由应用擅自终止。
- 设计来源：[桌面参数与图片编辑](https://www.figma.com/design/ZiadpErDoFweCjG3uHjkM3?node-id=4225-61228)，复用现有 01 Token 与 03 输入、按钮母版。

- [图片工具栏换行状态](https://www.figma.com/design/ZiadpErDoFweCjG3uHjkM3?node-id=4238-604)：最多 380px，随画布宽度换行，保留按钮命中区并跟随卡片中心。
