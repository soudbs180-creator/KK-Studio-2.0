# KK Studio 2.0 同步清单

目标仓库：<https://github.com/soudbs180-creator/KK-Studio-2.0>

本文件是唯一的同步入口。云端 `main` 的文件树应与本地已验证 `main` 的 Git tree 完全一致；同步通过一个从云端 `main` 建立的替换分支和 PR 完成。旧 v1.6.1 文件在候选分支中删除，旧提交历史保留在 Git 中供追溯。

## 最终目录职责

```text
src/                     React/Vite 页面、领域、features、integrations、runtime、styles
src-tauri/               Tauri 2 壳、IPC、原生存储和生成的 schema
public/                  Figma 导出资源与固定本地演示素材
design/                  Figma 插件源
tests/                   单元与浏览器回归
docs/                    当前架构、治理、change records 和脱敏证据
config/                  应用配置与存储布局契约
scripts/                 治理、验证和桌面启动脚本
package.json             唯一 npm workspace/脚本事实
package-lock.json        唯一依赖锁
```

`docs/evidence/` 和 `docs/reference/` 是本地审计证据与设计参考，保留在本地树中，但不单独发布成第二套产品目录；它们随本地 tree 一起同步时必须通过大小、敏感信息和重复内容扫描。

## 本次 main 替换范围

- 从云端 `main` 创建 `chore/TASK-KK2-MAIN-SYNC`。
- 用本地已验证 `main` 的完整 Git tree 作为候选提交 tree；不使用 `merge --allow-unrelated-histories`、force push、mirror push 或直接写云端 `main`。
- 候选分支只在 PR 中合并。合并前检查 tree equality、路径白名单、secret/path 扫描、工作流和 CI 结果。
- 合并后回读云端 `main` 的 commit/tree，与本地 `main` 重新比较；不一致时保持任务未完成。

## 禁止进入仓库

API key、OAuth token、系统凭据、`.env`、用户项目/素材、localStorage/IndexedDB 导出、`node_modules/`、`target/`、`dist/`、`test-results/`、`.tmp/`、临时 profile、安装包和个人路径。

## 后续增量变更

GPT-6 Astra 先按 `docs/changes/2026-09-20-gpt-6-astra/` 的 intent/spec/plan/verification 实施。任何源码增量都从最新云端 `main` 建立独立 task branch，按模块提交并单独运行验证；禁止把 dirty checkout 的全部内容直接上传。
