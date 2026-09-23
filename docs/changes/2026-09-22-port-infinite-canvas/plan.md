# Plan

> 阶段：Phase 1（原样搬入 + 最小接线 + 验证）已完成；Phase 2（适配接入）进行中。

## Phase 2（已排期项）

- [x] Agent 接入对话面板（连接层 + SSE + 画布工具桥 + 设置连接卡片）：任务 #8/#9。
- [x] 插件渲染层接入（注册表/store/加载器/PluginNode/添加菜单/设置管理）：任务 #11。
- [ ] Tauri 一键启停（canvas-proxy / canvas-agent）——未排期。
- [ ] features.registry.json 状态更新与任务账本登记——随收尾一起做。

1. 盘点开源模块，对照本项目 features registry 产出搬运/跳过清单（已完成，见 spec）。
2. 建立 `vendor/` 隔离目录：
   - 复制 canvas-proxy（`vendor/canvas-proxy`）；
   - 复制 canvas-agent 源码与配置（`vendor/canvas-agent`）；
   - 复制插件 SDK + 内置插件 + 宿主加载器参考（`vendor/canvas-plugins`）。
3. 服务层移植到本项目结构：
   - `src/features/prompts/promptLibrary.ts`（提示词库，可注入缓存/fetcher）；
   - `src/features/sync/webdav.ts`（WebDAV，支持 localProxyUrl）；
   - `src/features/creation/audioGeneration.ts`（音频选项 + OpenAI 兼容 TTS）。
4. 构建与脚本：
   - `npm run agent:install` 安装 canvas-agent 独立依赖（含 zod v3 隔离）；
   - `npm run agent:build` 编译；插件工作区 `npm run plugins:install` 后构建到
     `public/plugins/`；
   - 根 package.json 增加 proxy/agent/plugins 脚本。
5. UI 最小接线：设置中心「网络」区替换为「本地服务」信息卡（proxy + agent），
   同步更新 page-alignment.spec.ts 断言。
6. 文档：vendor/README.md（出处、差异、使用）、本变更文档。
7. 验证：单测、进程冒烟、全量门禁（typecheck/lint/features/format/test/ui:check/build）。
