# Verification：2026-10-24 Figma UI 治理

## 已通过

本轮本地证据绑定：`HEAD=1fbac26b33bdabaad682ad398f5292360eb9c66a5`，构建产物为 `dist/assets/index-DNrq-Kj9.js` 与 `dist/assets/index-DdHY4jIP.css`；开发端口保持 1421，Playwright 预览端口保持 1423。

- Figma session `6d9fd38f-bcba-453d-80a1-5350f0735545` 已完成代表性回读和截图：Agent 选择、账号菜单、任务搜索、灯箱重绘、编组卡片、重绘卡片。
- Code Connect 查询已回读，但 Figma 返回当前账号/组织需要 Dev 或 Full seat；因此本轮不能写入 Code Connect 映射，保留为外部权限阻塞。
- `npm run typecheck`：通过。
- `npm test`：最新完整运行 2266 passed、0 failed、20 skipped。
- `npm run lint`：通过；版本漂移、code-health、footguns 为既有 advisory。
- `npm run ui:check`：0 项 UI 标准违规；design check/design lint 仅有既有 orphan-token warnings。
- `npm run build`：通过；仅有依赖注释和大 chunk warning。
- `npm run format:check`：通过；未新增格式漂移。
- `npm run test:design`：设计源/投影 41 项单测与预览 8 项浏览器用例全部通过。
- 资源筛选与媒体引用单测：22 passed，覆盖资源包/日期排序、视频首尾帧交换、音频不占帧槽。
- 定向浏览器验证均绑定固定预览端口 1423，且未调整 timeout/retry：设置导航 2 passed、画布导航 7 passed、Figma 布局 2 passed、响应式桌面/手机 20 passed、素材性能 6 passed、视频上传 2 passed、重绘 15 passed、资源空态 1 passed。
- 重绘新增端到端检查：胶囊输入顺序为上传/输入/模型/录音/发送，“只改选区”切换可用；整图分支复用现有标注图与 image-edit 领域序列化。

## 未完成或未验证

- `npm run verify` 尚未重跑全量浏览器 shard；仓库仍有大量历史浏览器合同用例依赖旧的设置文案，不能把全量浏览器门禁标为全绿。
- 04/05 全页面同状态截图与 Figma master→代码 Code Connect 全量映射仍需后续切片验收；Code Connect 当前受 Dev/Full seat 权限阻塞。
- CanvasGroup、资源包筛选、视频首尾帧交换、灯箱 6 张关系缩略图和重绘工具的本地交互已完成定向验收；跨所有旧页面合同的全量回归仍未宣称完成。
