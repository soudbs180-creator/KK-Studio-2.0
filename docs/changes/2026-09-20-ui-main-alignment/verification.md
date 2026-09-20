# Verification

ID：TASK-UI-MAIN-001。执行目录：D:/kk-studio-next/.worktrees/TASK-UI-MAIN-001。

## 本地结果

- npm ci：干净依赖安装 PASS，0 vulnerabilities。
- 原始 origin/main 的 lint/typecheck PASS；三方交互整合首轮完整 verify 为150 Node/186浏览器。
- 最终 npm run verify PASS：lint、typecheck、150 Node、UI119/0、format、build、190 Edge browser；0 failed，0 flaky。定向37项先通过后才完成最终全量检查。
- cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check PASS；cargo test PASS 60/60。
- npm run client:check 与 npm run client:build -- --no-bundle PASS。构建有既有 Rust dead_code 和 Vite chunk size 提示，无失败。
- bundle：assets/index-nhzAw2yS.js。
- release SHA-256：AE5B3E62F70B9CE19AA244D4011D0E09F81F86D4F96C09C4C28198B120705FAD。

## 三种真实运行模式

每种模式运行 scripts/audit/check-composer-runtime.mjs 加 --pages，各覆盖34页面状态；菜单稳定、互斥、外部关闭、Escape回焦、侧栏/工具栏跨弹层行为通过，pageErrors=[]。

| 模式 | 启动命令 / URL | 验证 |
| --- | --- | --- |
| Vite development | node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 1421 --strictPort / http://127.0.0.1:1421/ | development.json + development-page-matrix.json |
| Vite preview | node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 1423 --strictPort / http://127.0.0.1:1423/ | preview.json + preview-page-matrix.json |
| Tauri release | src-tauri/target/release/kk-studio.exe --data-dir <隔离目录> / http://tauri.localhost/ | desktop.json + desktop-page-matrix.json；get_storage_root确认隔离 |

上述JSON、102页面截图和6张composer专项截图均在 ../../evidence/2026-09-20-ui-main-alignment/。运行矩阵记载route状态、viewport、DOM几何、控件、runtime mode/entry；各模式URL使用 /，具体状态从真实导航产生，import链见spec。Desktop全新WebView profile，无用户数据修改。

## Figma核对

读取当前唯一page0:1的顶层节点及当前design context，源码/浏览器同状态对照见spec。设置920×700；搜索900×696；资产900/305×696；账号260×230；快捷键672×480；帮助560×394.34；任务196×240；与现行设计的框架尺寸差异已校正。Settings对应导出图标已下载到public/design/figma并复用tokens。

设计缺口：Landing410:59708不存在，当前唯一page没有其替代页面；项目库/Skill/ComfyUI/其他设置分类无独立现行Frame。它们已做运行检查，不能称Figma视觉验收通过。UI-004保持PARTIAL。新增来源筛选、任务工作台、真实数据/禁用状态为工程补充；没有把示例内容当服务接通。

## 同步与文件范围

基线 origin/main@8aca3ab；提交内容只包括本任务审阅源码、导出SVG、回归、脚本、日期证据和治理文档。历史测试截图已还原；不上传node_modules、dist、target、.tmp、.worktrees、凭据或本地运行数据。

原目录100个已修改、309个未跟踪文件及原index备份到 .tmp/root-before-main-20260920/，409项清单逐项SHA-256校验；约44.9MB，仅本地保留。原main@39f6a6e与origin/main树相同、历史不同；切换需保留历史引用，并让新的main跟踪origin/main，不能合并不相关历史或强推。

PR/CI/merge与最终main回读结果由后续同步记录补充。当前独立治理分支TASK-GOV-002未夹带合并；外部GitHub保护仍protected=false，计划限制的403未解除。

## 最终同步回读

PR #3 已通过双 CI 并 squash 合并，云端与本地 `main` 均为 `fb57529c719924330ec0154f5374df8f5d508e00`。原根目录 100 个 tracked 修改、309 个 untracked 文件、原 index 与一个未被 Git 列出的快捷方式均已保留在 `.tmp/root-before-main-20260920/` 的校验归档中。Figma 缺失的 Landing 等独立稿件仍由 UI-004 记录为 PARTIAL。
