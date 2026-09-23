# Design System Pages Implementation Plan

> 执行方式：superpowers:executing-plans，最后一次独立只读review。按AGENTS/AI_RULES已授权技术决策自主推进；用户要求不commit/push，覆盖技能默认提交步骤。

**Goal:** 关闭清单中可本地执行的旧页面组件差异，取得当前Tauri运行证据。
**Architecture:** 延续global/ui-tokens语义拥有者、页面CSS布局、原生控件和既有业务状态；不新增平行设计系统。
**Tech Stack:** React18、TypeScript、Vite、Playwright/Edge、Tauri2/Rust。
**Spec:** [spec.md](spec.md)

## Global Constraints

- TASK-DS-002 / fix/TASK-DS-002-pages；base cf344ddcdf039c6e62aeb9c65106e2a2339c0bb4，来自当前工程882路径dirty候选；初始typecheck/lint通过。
- 仅修改目标页面/控件与验证文档，不接管并发Agent/后端代码。共享颜色不改；已有用户存储和原PDF不改。
- Web严格1423；Desktop使用自己启动的进程、CDP端口、临时数据与profile；不终止别人进程。
- 文件和步骤记录在本change package；无提交时用初始快照与最终指纹绑定，而非伪造commit范围。

## Review Focus

- 目录CSS加载顺序、选择胶囊hover/selected和危险操作的语义覆盖。
- 长名称/中文说明/窄屏操作组，以及输入标签和focus不被裁切。
- Skill取消和保存、ComfyUI仅管理文件的真实边界、模态回焦。
- Desktop实际加载的新bundle、隔离数据身份、重启后的偏好保留。
- 原工程同期改动与回传差异，绝不将完整dirty树当本任务提交。

## Task 1 · 目录与设置组件

- [x] 新增浏览器契约测试，先证明搜索/卡片/Skill字段/筛选语义与1.1有差异。
- [x] 更新catalog-pages、shared控件及SkillEditor/SkillCollection、必要设置CSS；保留行为和布局。
- [x] 两主题8色、390/768/1920及Skill创建/保存/取消/回焦；预期无溢出与颜色失配。

## Task 2 · Desktop与整体验证

- [x] 完整npm verify，修复由本轮引入的回归；适当Rust/client检查与新release构建。
- [x] 使用隔离Tauri/WebView2验证设置、目录、8色与偏好重启；输出DOM/截图/EXE及bundle指纹。
- [x] 独立只读review实际增量，修复阻断项并复验。
- [x] 只合本任务增量回当前工程，复验受影响内容；更新UI-001/UI-004/TASK-DS-001相关证据及remaining，不关闭外部未验收任务。

## 进度记录

Pre-flight：唯一共享接口是既有1.1语义tokens；目录/设置消费与Desktop测试使用同一源码，无新存储协议。
Ruling：按清单顺序先收口UI与Desktop，后端子项目继续使用各自原任务，不将一项UI对齐变成跨子系统混合改造。

收口：TASK-DS-002工程范围DONE/PASS；R1/R2复核关闭，原工程309/229与新Desktop两次启动验证通过。用户视觉、在线设计源、真实生成后端继续保留原任务。
