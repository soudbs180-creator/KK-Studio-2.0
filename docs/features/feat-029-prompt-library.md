# 提示词库（FEAT-029）

- 状态：PARTIAL
- 领域：creation
- 最近更新：2026-09-22
- 关联任务：TASK-UI-005、BACKEND-PLATFORM

## 用户可见入口

- 首页和图片对话的提示词库；顶部文件菜单提供统一入口。

## 代码位置

- src/features/prompts/promptLibrary.ts：来源解析、缓存、搜索。
- src/components/PromptLibraryPanel.tsx：浏览、预览、应用、加载及错误状态；App.tsx 负责草稿接线。

## 测试与证据

- tests/unit/promptLibrary.test.ts。
- tests/browser/ui-feature-parity.spec.ts；docs/changes/2026-09-22-ui-feature-parity/verification.md。

## 当前能力

- 浏览与应用入口已实现。不会自动向来源发送项目数据或自动执行生成。

## 差距与后端化

- UI 验证由本轮 verification 记录，真实远端目录/CORS 仍需环境验收；账号云端提示词同步属于 BACKEND-PLATFORM。

## TASK-UI-005 更新

已补首页/图片对话/文件菜单入口、主动加载、缓存/搜索/分页/预览/取消、异常恢复与保留原文追加；来源测试用受控目录，真实远端 CORS 可用性保留单独验收。 见 [核对与验证](../changes/2026-09-22-ui-feature-parity/verification.md)。
