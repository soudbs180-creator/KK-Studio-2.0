# 验证记录

任务：TASK-CHERRY-RED-001。基线 HEAD：51fccfc7879cf90f7caaf3ae8e10af4d97a2aa2c。

- 隔离初始状态 clean；共享主工作区未提交内容未复制/覆盖。
- npm run typecheck：PASS（基线源码 2.1.13）。
- 首次 npm test：1031 tests，1015 pass，14 skip，2 fail，耗时约 26.3s。失败为 desktopAgentRuntime 两项；执行前新 checkout 缺 vendor/canvas-agent/dist。
- npm run agent:build：PASS，正式脚本校验桌面配置与临时端口/内存凭据并生成 dist；失败测试与完整 baseline 待复跑。
- 默认 worktree 预算拒绝与本任务受控环境创建的具体参数见 [意图](intent.md)。未修改默认门禁。
- WSL 未安装；本机 macOS/Linux 原生运行尚无证据。产品行为、真实 Provider、真实第三方 MCP、三平台安装与签名：NOT VERIFIED。

后续追加每项实际命令、结果与工件，不改写上述首轮失败。

## 当前实现与本地证据

- 正式 `agent:build` 后基线完整复跑：1031 tests，1017 PASS、14 SKIP、0 FAIL；基线生产构建 PASS。
- 实现后的完整 `npm test`：1103 tests，1089 PASS、14 SKIP、0 FAIL（约34s）。之后新增 Native/浏览器验收与版本同步需最终回归，不用本记录替代最新检查。
- 定向生产浏览器：10/10 PASS，固定1423、单worker，覆盖五个助手/自定义/只读导入保护、深浅主题 Markdown/危险URL/复制拒绝、Unicode导出、两模型多轮身份及单路401无重试。Provider均为拦截的loopback fixture，未调用云服务。
- Windows Rust完整测试：136/136 PASS；新增空ref免密契约测试 RED→GREEN，当前137项待最终完整复跑。`cargo check --locked`、原生格式检查 PASS。
- 实际 Windows Tauri TaskHost lifecycle：11步 PASS；UUID隔离数据/profile，仅测试进程被清理，旧用户数据未读写。此前构建标签为2.1.13；最新2.1.16候选须另行构建/绑定，不能当已发布或已安装。
- 新三协议/透明窗口 Native fixture `tests/desktop/cherry-red-native.mjs` 已编写，实际运行待回收。
- 新任务工作区依赖最初为本任务创建的junction，仅用于开发基线。正式Desktop校验不接受linked依赖；已仅移除三个任务创建的junction并安装现有锁定依赖，主目录 `.package-lock.json` hash保持，未删除其真实依赖目录。
- JSX/CSS接线后的 typecheck PASS；UI组件门禁已拆按渠道/回复/分享职责，最近检查231文件、0违规。
- 一次完整lint到governance步骤因新账本生成视图滞后失败；按正式 `governance:write` 修复生成视图，最终完整lint仍待回收。既有CHANGELOG发布版本滞后警告未隐藏。
- 完整lint已在仓库正式支持的 `KK_CONTAINER_ROOT=D:/kk-studio` 配置下PASS，外部容器快照仍按原位置检查，没有复制/屏蔽/删除快照；未配置时任务worktree的parent不是容器，记录的missing不是产品源码失败。format:check全量PASS。发布CHANGELOG滞后仍为既有warn。

## 审查纠错

独立预检实际复现并修复：比较任务污染原画布账号、恢复误标原节点与结果边、离线loopback被拦、取消flush窗口被改为失败、无ref本地Native契约、助手过长及内置导入覆盖、guardian stdout/EPIPE。OpenAI单输出新增拒非0索引/多choices；兼容旧服务省略index。具体快照见[审查](review.md)。

## 未验证边界

Mac/Linux标准Hosted矩阵、新Windows三协议/透明UI fixture、签名/安装、真实系统凭据持久化和第三方MCP/Provider、用户产品验收按实际后续回执填写。Unix runtime门禁暂保持false，不能把workflow YAML/纯函数/Windows结果当三平台通过。
